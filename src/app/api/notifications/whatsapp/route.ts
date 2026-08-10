/**
 * POST /api/notifications/whatsapp
 *
 * Future integration point for WhatsApp Business API notifications.
 * Currently returns 501 — wire up a provider (Twilio / Meta Cloud API)
 * when ready. The `whatsapp_opt_in` flag on `profiles` controls consent.
 *
 * Expected body:
 *   { profile_id: string, template: string, variables: Record<string, string> }
 */
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'WhatsApp integration not yet configured', code: 'NOT_IMPLEMENTED' },
    { status: 501 },
  )
}
