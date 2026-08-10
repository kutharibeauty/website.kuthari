import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@/lib/auth/server'
import ShoppingListClient from './ShoppingListClient'

export const metadata: Metadata = {
  title: 'My Shopping List — Kuthari Beauty Store',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function ShoppingListPage() {
  const { userId } = await auth()
  if (!userId) redirect('/login?next=/shopping-list')
  return <ShoppingListClient />
}
