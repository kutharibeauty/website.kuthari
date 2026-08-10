import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import CouponsClient from './CouponsClient'
import type { Coupon } from '@/types/database.types'

export const metadata: Metadata = { title: 'Coupons | Kuthari Admin' }
export const revalidate = 0

export default async function CouponsPage() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })

  return <CouponsClient initialCoupons={(data ?? []) as Coupon[]} />
}
