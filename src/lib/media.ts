import 'server-only'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Where uploaded images live.
 *
 * With NEXT_PUBLIC_MEDIA_URL and MEDIA_UPLOAD_SECRET set, images go to the
 * Cloudflare R2 bucket `kuthari-media` through its Worker
 * (cloudflare/media-worker), which serves them with a year-long cache. Without
 * them, uploads fall back to the Supabase `product-images` bucket, so a missing
 * variable never breaks the admin.
 */
// Tolerates a value saved without the scheme ("media.kutharibeauty.com"),
// which once made every upload fail with "Failed to parse URL".
const MEDIA_URL = (() => {
  const raw = process.env.NEXT_PUBLIC_MEDIA_URL?.trim().replace(/\/+$/, '')
  if (!raw) return undefined
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
})()
const UPLOAD_SECRET = process.env.MEDIA_UPLOAD_SECRET

/**
 * Store an image and return its public URL. `folder` groups files in R2
 * (product-images, claims…); in the Supabase fallback it becomes a filename
 * prefix inside the product-images bucket.
 */
export async function uploadImage(
  filename: string,
  body: Buffer,
  contentType: string,
  folder = 'product-images',
): Promise<string> {
  if (MEDIA_URL && UPLOAD_SECRET) {
    const res = await fetch(`${MEDIA_URL}/${folder}/${encodeURIComponent(filename)}`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${UPLOAD_SECRET}`, 'content-type': contentType },
      body: new Uint8Array(body),
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) throw new Error(`Image upload failed (${res.status})`)
    const { url } = (await res.json()) as { url: string }
    return url
  }

  const name = folder === 'product-images' ? filename : `${folder}-${filename}`
  const supabase = createAdminClient()
  const { error } = await supabase.storage
    .from('product-images')
    .upload(name, body, { contentType, upsert: false })
  if (error) throw new Error(error.message)
  return supabase.storage.from('product-images').getPublicUrl(name).data.publicUrl
}

/** Identify an image by its header bytes. Returns null for anything that isn't a
 *  supported raster image, so text/HTML/SVG payloads are rejected outright. */
export function sniffImageType(buf: Buffer): { ext: string; mime: string } | null {
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
