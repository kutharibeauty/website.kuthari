import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import CouponForm from '../CouponForm'
import type { Coupon } from '@/types/database.types'

export const metadata: Metadata = { title: 'Edit Coupon | Kuthari Admin' }

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()
  const { data } = await supabase.from('coupons').select('*').eq('id', id).maybeSingle()
  if (!data) notFound()
  return <CouponForm coupon={data as Coupon} />
}
