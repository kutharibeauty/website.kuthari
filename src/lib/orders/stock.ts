import { createAdminClient } from '@/lib/supabase/server'
import type { OrderItem } from '@/types/database.types'

/**
 * Restore stock for every line of a cancelled/returned order. Best-effort:
 * failures are logged, never thrown, so they can't block the status change.
 * Shared by the admin status route and the customer cancel route.
 */
export async function restoreStockForOrder(orderId: string): Promise<void> {
  try {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data: order } = await db
      .from('orders')
      .select('items')
      .eq('id', orderId)
      .maybeSingle()
    const items = (order?.items ?? []) as OrderItem[]
    if (!items.length) return
    const productIds = items.map((i) => i.product_id)
    const { data: products } = await db
      .from('products')
      .select('id, stock_qty')
      .in('id', productIds)
    if (!products) return
    type StockRow = { id: string; stock_qty: number }
    await Promise.all(
      (products as StockRow[]).map((p) => {
        // Restore the same units that were decremented (spices: total units).
        const qty = items.filter((i) => i.product_id === p.id).reduce((s, i) => s + (i.stock_units ?? i.quantity), 0)
        return db.from('products').update({ stock_qty: p.stock_qty + qty }).eq('id', p.id)
      }),
    )
  } catch (e) {
    console.error('Stock restore failed:', e)
  }
}
