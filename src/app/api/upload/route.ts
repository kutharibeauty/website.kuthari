import { auth } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'
import { nanoid } from 'nanoid'

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meta = sessionClaims?.publicMetadata as AuthMetadata | undefined
  if (meta?.role !== 'super_admin' && meta?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // §1.10: cap size and validate the file is really an image by its magic bytes
  // — never trust the client-supplied filename/MIME. Prevents storage abuse and
  // non-image (e.g. HTML/SVG-with-script) payloads landing in a public bucket.
  const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image must be 5 MB or smaller' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const sniffed = sniffImageType(buffer)
  if (!sniffed) {
    return NextResponse.json({ error: 'File is not a valid JPEG, PNG, WebP, GIF or AVIF image' }, { status: 400 })
  }

  const filename = `${nanoid()}.${sniffed.ext}`

  const supabase = createAdminClient()
  const { error } = await supabase.storage
    .from('product-images')
    .upload(filename, buffer, { contentType: sniffed.mime, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(filename)

  return NextResponse.json({ url: publicUrl })
}

/** Identify an image by its header bytes. Returns null for anything that isn't a
 *  supported raster image, so text/HTML/SVG payloads are rejected outright. */
function sniffImageType(buf: Buffer): { ext: string; mime: string } | null {
  if (buf.length < 12) return null
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ext: 'png', mime: 'image/png' }
  // GIF: "GIF8"
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return { ext: 'gif', mime: 'image/gif' }
  // RIFF....WEBP
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return { ext: 'webp', mime: 'image/webp' }
  // AVIF / HEIF: "....ftyp" then a brand containing "avif"/"heic"
  if (buf.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buf.toString('ascii', 8, 12)
    if (brand.includes('avif') || brand.includes('avis')) return { ext: 'avif', mime: 'image/avif' }
    if (brand.includes('heic') || brand.includes('heif') || brand.includes('mif1')) return { ext: 'heic', mime: 'image/heic' }
  }
  return null
}
