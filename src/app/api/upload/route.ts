import { auth } from '@/lib/auth/server'
import { uploadImage, sniffImageType } from '@/lib/media'
import { NextRequest, NextResponse } from 'next/server'
import type { AuthMetadata } from '@/types'
import { nanoid } from 'nanoid'
import { requirePermission } from '@/lib/auth/guard'

export async function POST(req: NextRequest) {
  const noPerm = await requirePermission('manage_products', 'manage_banners', 'manage_categories'); if (noPerm) return noPerm
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

  try {
    const url = await uploadImage(filename, buffer, sniffed.mime)
    return NextResponse.json({ url })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Upload failed' }, { status: 500 })
  }
}

