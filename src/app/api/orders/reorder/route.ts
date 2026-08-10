/**
 * POST /api/orders/reorder
 * Body: { product_ids: string[] }
 *
 * Returns current stock & price for each product so the client
 * can add available items to the cart and warn about skipped ones.
 */
import { createAdminClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { product_ids } = await req.json() as { product_ids: string[] }
  if (!Array.isArray(product_ids) || product_ids.length === 0) {
    return NextResponse.json({ error: 'product_ids required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('products')
    .select('id, name, slug, price, mrp, unit, images, stock_qty, is_active, delivery_charge, delivery_charge_enabled')
    .in('id', product_ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ products: data ?? [] })
}
