/**
 * POST /api/products/bulk-import
 *
 * Accepts multipart/form-data with a "file" field (CSV). Supports two header
 * styles, aliased onto the same canonical fields:
 *
 *   Legacy:  name, category_slug, price, mrp, unit, stock_qty, description, sku
 *   Client catalogue: Full Product Name, Brand, Product Category,
 *     Size / Weight, Packaging Form, Pack Type, Units per Pack, Unit Type,
 *     Price per Pack, Price per Unit
 *
 * "Product Category" is matched against category name OR slug. "Price per
 * Unit" is always recomputed server-side from Price per Pack ÷ Units per
 * Pack when both are present (never trusts a stale spreadsheet formula) —
 * otherwise a plain `price`/`Price per Unit` column is used directly.
 *
 * Returns:
 *   { created, failed, errors: [{ row, reason }], error_csv: base64 }
 * The error_csv is a base64-encoded CSV of failed rows for the admin to download.
 */
import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { AuthMetadata } from '@/types'

const RowSchema = z.object({
  name:           z.string().min(1, 'name / Full Product Name required'),
  category_slug:  z.string().optional(),
  category_name:  z.string().optional(),
  price:          z.coerce.number().nonnegative('price must be ≥ 0').optional(),
  mrp:            z.coerce.number().nonnegative().optional(),
  unit:           z.string().min(1, 'unit / Size-Weight required'),
  stock_qty:      z.coerce.number().int().nonnegative().default(0),
  description:    z.string().optional(),
  sku:            z.string().optional(),
  brand:          z.string().optional(),
  packaging_form: z.string().optional(),
  pack_type:      z.string().optional(),
  units_per_pack: z.coerce.number().int().positive().optional(),
  unit_type:      z.string().optional(),
  price_per_pack: z.coerce.number().nonnegative().optional(),
  // Box → pack → unit (non-spice) and spices (hanger/pack).
  packs_per_box:    z.coerce.number().int().positive().optional(),
  units_per_hanger: z.coerce.number().int().positive().optional(),
  hangers_per_pack: z.coerce.number().int().positive().optional(),
  // Optional explicit image filename/URL; otherwise matched by product name.
  image:          z.string().optional(),
}).refine((d) => !!(d.category_slug || d.category_name), {
  message: 'category_slug or Product Category is required',
}).refine((d) => d.price !== undefined || (d.price_per_pack !== undefined && d.units_per_pack !== undefined), {
  message: 'price / Price per Unit, or Price per Pack + Units per Pack, is required',
})

// Normalizes a raw CSV header into a canonical field key, e.g.
// "Size / Weight" -> "size_weight" -> "unit"
const HEADER_ALIASES: Record<string, string> = {
  name: 'name',
  full_product_name: 'name',
  product_name: 'name',
  brand: 'brand',
  category: 'category_name',
  category_name: 'category_name',
  product_category: 'category_name',
  category_slug: 'category_slug',
  unit: 'unit',
  size: 'unit',
  weight: 'unit',
  size_weight: 'unit',
  packaging_form: 'packaging_form',
  pack_type: 'pack_type',
  units_per_pack: 'units_per_pack',
  packs_per_box: 'packs_per_box',
  units_per_hanger: 'units_per_hanger',
  hangers_per_pack: 'hangers_per_pack',
  unit_type: 'unit_type',
  price: 'price',
  selling_price: 'price',
  price_per_unit: 'price',
  price_per_pack: 'price_per_pack',
  mrp: 'mrp',
  stock_qty: 'stock_qty',
  stock: 'stock_qty',
  stock_quantity: 'stock_qty',
  description: 'description',
  sku: 'sku',
  image: 'image',
  image_name: 'image',
  image_file: 'image',
  image_url: 'image',
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

// Strips currency symbols/commas so "₹1,385" / "1,385" parse as numbers.
function cleanNumeric(v: string): string {
  return v.replace(/[₹,\s]/g, '')
}

const NUMERIC_FIELDS = new Set(['price', 'mrp', 'stock_qty', 'units_per_pack', 'price_per_pack', 'packs_per_box', 'units_per_hanger', 'hangers_per_pack'])

// Normalise a name/filename for image ↔ product matching: strip extension,
// lowercase, and drop every non-alphanumeric char so "Freedom Rice Bran 1ltr
// Pouch.jpg" and "freedom-rice-bran-1ltr-pouch" collapse to the same key.
function normalizeForMatch(s: string): string {
  return s.replace(/\.[a-z0-9]+$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const rawHeaders = lines[0].split(',').map((h) => h.trim())
  const headers = rawHeaders.map((h) => HEADER_ALIASES[normalizeHeader(h)] ?? normalizeHeader(h))
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      const raw = values[i] ?? ''
      row[h] = NUMERIC_FIELDS.has(h) ? cleanNumeric(raw) : raw
    })
    return row
  })
}

// §1.11: neutralize CSV/formula injection — a cell starting with = + - @ (or a
// tab/CR) is treated as a formula by Excel/Sheets. Prefix a single quote so the
// re-downloaded error report can never execute anything.
function csvCell(v: string): string {
  const s = v ?? ''
  const guarded = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return `"${guarded.replace(/"/g, '""')}"`
}

function toCSV(rows: Array<Record<string, string>>): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => csvCell(r[h] ?? '')).join(',')),
  ].join('\n')
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let csvText: string
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    csvText = await file.text()
  } catch {
    return NextResponse.json({ error: 'Failed to parse form data' }, { status: 400 })
  }

  const rawRows = parseCSV(csvText)
  if (rawRows.length === 0) {
    return NextResponse.json({ error: 'CSV is empty or has no data rows' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Cache category slug/name → id (case-insensitive name match)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: categories } = await (supabase as any).from('categories').select('id, slug, name')
  const slugMap: Record<string, string> = {}
  const nameMap: Record<string, string> = {}
  for (const c of (categories ?? []) as { id: string; slug: string; name: string }[]) {
    slugMap[c.slug] = c.id
    nameMap[c.name.trim().toLowerCase()] = c.id
  }

  // Build an image lookup from the product-images bucket. Images uploaded with a
  // filename matching the product's item name (e.g. "Freedom Rice Bran 1ltr
  // Pouch.jpg") are auto-attached — normalised so spaces/case/punctuation don't
  // matter. Paginates through the whole bucket.
  const imageMap: Record<string, string> = {}
  try {
    for (let offset = 0; ; offset += 1000) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: files } = await (supabase as any).storage
        .from('product-images')
        .list('', { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } })
      const list = (files ?? []) as Array<{ name: string; id?: string | null }>
      for (const f of list) {
        if (!f.name || f.id === null) continue // skip folders
        const key = normalizeForMatch(f.name)
        if (!key || imageMap[key]) continue
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(f.name)
        imageMap[key] = publicUrl
      }
      if (list.length < 1000) break
    }
  } catch { /* bucket unavailable — proceed without auto image matching */ }

  // Resolve a product row to an image URL: explicit `image` cell wins (a full URL
  // is used as-is, otherwise treated as a filename), else match by product name.
  const resolveImage = (row: { name: string; image?: string }): string | null => {
    if (row.image && row.image.trim()) {
      const v = row.image.trim()
      if (/^https?:\/\//i.test(v)) return v
      return imageMap[normalizeForMatch(v)] ?? null
    }
    return imageMap[normalizeForMatch(row.name)] ?? null
  }

  let created = 0
  let imagesMatched = 0
  const errors: Array<{ row: number; reason: string; data: Record<string, string> }> = []

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i]
    const rowNum = i + 2 // row 1 = header

    const parsed = RowSchema.safeParse(raw)
    if (!parsed.success) {
      errors.push({ row: rowNum, reason: parsed.error.issues.map((e) => e.message).join('; '), data: raw })
      continue
    }

    const row = parsed.data
    const categoryId = row.category_slug
      ? slugMap[row.category_slug]
      : nameMap[(row.category_name ?? '').trim().toLowerCase()]

    if (!categoryId) {
      errors.push({
        row: rowNum,
        reason: `Unknown category: "${row.category_slug ?? row.category_name}"`,
        data: raw,
      })
      continue
    }

    // Price per Unit is always derived from Price per Pack ÷ Units per Pack
    // when both are given — never trusts a stale spreadsheet formula.
    const price = row.price_per_pack !== undefined && row.units_per_pack
      ? Math.round((row.price_per_pack / row.units_per_pack) * 100) / 100
      : row.price!

    const imageUrl = resolveImage(row)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any).from('products').insert({
      name:             row.name,
      slug:             slugify(row.name),
      category_id:      categoryId,
      price,
      mrp:              row.mrp ?? null,
      unit:             row.unit,
      stock_qty:        row.stock_qty,
      description:      row.description ?? null,
      sku:              row.sku ?? null,
      brand:            row.brand ?? null,
      packaging_form:   row.packaging_form ?? null,
      pack_type:        row.pack_type ?? null,
      units_per_pack:   row.units_per_pack ?? null,
      packs_per_box:    row.packs_per_box ?? null,
      units_per_hanger: row.units_per_hanger ?? null,
      hangers_per_pack: row.hangers_per_pack ?? null,
      unit_type:        row.unit_type ?? null,
      price_per_pack:   row.price_per_pack ?? null,
      images:           imageUrl ? [imageUrl] : [],
      is_active:        true,
      is_featured:      false,
    })

    if (insertError) {
      errors.push({ row: rowNum, reason: insertError.message, data: raw })
    } else {
      created++
      if (imageUrl) imagesMatched++
    }
  }

  const errorCsvRows = errors.map((e) => ({ row: String(e.row), error: e.reason, ...e.data }))
  const errorCsvB64 = Buffer.from(toCSV(errorCsvRows)).toString('base64')

  return NextResponse.json({
    created,
    images_matched: imagesMatched,
    failed:    errors.length,
    errors:    errors.map(({ row, reason }) => ({ row, reason })),
    error_csv: errorCsvB64,
  })
}
