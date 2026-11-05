import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { SITE_URL } from '@/lib/site-url'

export const dynamic = 'force-dynamic'


// Google taxonomy path fallback by category slug
const CAT_GPC: Record<string, string> = {
  'skincare':              'Health & Beauty > Personal Care > Cosmetics > Skin Care',
  'haircare':              'Health & Beauty > Personal Care > Hair Care',
  'hair-colour':           'Health & Beauty > Personal Care > Hair Care > Hair Color',
  'makeup':                'Health & Beauty > Personal Care > Cosmetics > Makeup',
  'nail-care':             'Health & Beauty > Personal Care > Cosmetics > Nail Care',
  'fragrances-deodorants': 'Health & Beauty > Personal Care > Cosmetics > Perfume & Cologne',
  'mens-grooming':         'Health & Beauty > Personal Care > Shaving & Grooming',
  'bath-body':             'Health & Beauty > Personal Care > Cosmetics > Bath & Body',
  'salon-parlour':         'Health & Beauty > Personal Care > Cosmetics',
  'beauty-tools':          'Health & Beauty > Personal Care > Cosmetics > Cosmetic Tools',
}

function xe(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtPrice(n: number) {
  return `${n.toFixed(2)} INR`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildItem(p: Record<string, any>): string {
  const cat = p.categories as { slug: string } | null
  const catSlug = cat?.slug ?? ''

  const stockQty: number = p.stock_qty ?? p.stock_qty ?? 0
  const availability = stockQty > 0 ? 'in stock' : 'out of stock'

  const price: number = p.price ?? 0
  const mrp: number | null = p.mrp ?? null
  const hasSale = (p.show_strikethrough ?? false) && mrp != null && mrp > price

  const gpc = xe(p.google_product_category || CAT_GPC[catSlug] || 'Health & Beauty > Personal Care > Cosmetics')
  const images: string[] = p.images ?? []
  const hasGtin = Boolean(p.gtin)
  const hasMpn = Boolean(p.mpn)

  const lines: string[] = [
    `    <item>`,
    `      <g:id>${xe(p.sku ?? p.id)}</g:id>`,
    `      <g:title>${xe((p.name ?? '').slice(0, 150))}</g:title>`,
    `      <g:description>${xe((p.description ?? p.name ?? '').slice(0, 5000))}</g:description>`,
    `      <g:link>${SITE_URL}/product/${xe(p.slug)}</g:link>`,
    `      <g:image_link>${xe(images[0])}</g:image_link>`,
  ]

  for (const img of images.slice(1, 10)) {
    lines.push(`      <g:additional_image_link>${xe(img)}</g:additional_image_link>`)
  }

  lines.push(`      <g:availability>${availability}</g:availability>`)
  // g:price is the regular/reference price; g:sale_price is the discounted price
  lines.push(`      <g:price>${fmtPrice(hasSale ? mrp! : price)}</g:price>`)
  if (hasSale) {
    lines.push(`      <g:sale_price>${fmtPrice(price)}</g:sale_price>`)
  }

  lines.push(`      <g:brand>${xe(p.brand ?? 'KUTHARI BEAUTY STORE')}</g:brand>`)
  lines.push(`      <g:condition>${xe(p.condition ?? 'new')}</g:condition>`)
  lines.push(`      <g:google_product_category>${gpc}</g:google_product_category>`)

  if (hasGtin) lines.push(`      <g:gtin>${xe(p.gtin)}</g:gtin>`)
  if (hasMpn)  lines.push(`      <g:mpn>${xe(p.mpn)}</g:mpn>`)

  lines.push(`      <g:identifier_exists>${hasGtin || hasMpn ? 'yes' : 'no'}</g:identifier_exists>`)
  lines.push(`      <g:shipping>`)
  lines.push(`        <g:country>IN</g:country>`)
  lines.push(`        <g:service>Standard Delivery</g:service>`)
  lines.push(`        <g:price>0.00 INR</g:price>`)
  lines.push(`      </g:shipping>`)
  lines.push(`    </item>`)

  return lines.join('\n')
}

export async function GET() {
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('products')
    .select('*, categories(id, slug, name)')
    .eq('is_active', true)
    .order('display_order')

  if (error) {
    return new NextResponse('Feed generation failed', { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const products = (data ?? []) as Record<string, any>[]

  // Google requires image_link — skip products with no images
  const items = products
    .filter(p => Array.isArray(p.images) && p.images.length > 0)
    .map(buildItem)
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Kuthari Beauty Store</title>
    <link>${SITE_URL}</link>
    <description>Kuthari Beauty Store: cosmetics, skincare, haircare and salon products, by the piece or by the box</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/atom+xml; charset=UTF-8',
      'Cache-Control': 'public, max-age=21600, s-maxage=21600',
    },
  })
}
