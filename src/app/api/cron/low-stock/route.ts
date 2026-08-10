/**
 * GET /api/cron/low-stock
 *
 * Runs daily at 08:00 IST (02:30 UTC) via Vercel Cron.
 * Protected by CRON_SECRET — Vercel sends "Authorization: Bearer <CRON_SECRET>".
 *
 * Checks all active products where stock_qty <= low_stock_threshold
 * and emails super_admin + admins with manage_products permission.
 */
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type ProductRow = {
  id: string
  name: string
  sku: string | null
  stock_qty: number
  low_stock_threshold: number
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('products')
    .select('id, name, sku, stock_qty, low_stock_threshold')
    .eq('is_active', true)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const lowStock = ((data ?? []) as ProductRow[]).filter(
    (p) => p.stock_qty <= p.low_stock_threshold,
  )

  if (lowStock.length === 0) {
    return NextResponse.json({ success: true, checked: (data ?? []).length, alerted: 0 })
  }

  const { getLowStockAlertAdmins, sendLowStockAlert } = await import('@/lib/resend')
  const admins = await getLowStockAlertAdmins()

  if (admins.length > 0) {
    await sendLowStockAlert(
      {
        products: lowStock.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          stockQty: p.stock_qty,
          lowStockThreshold: p.low_stock_threshold,
        })),
      },
      admins,
    )
  }

  return NextResponse.json({
    success: true,
    checked: (data ?? []).length,
    alerted: lowStock.length,
    products: lowStock.map((p) => p.name),
  })
}
