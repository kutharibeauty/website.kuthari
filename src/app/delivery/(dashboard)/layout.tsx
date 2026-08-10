import { auth } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { isDeliveryEnabled } from '@/lib/settings/delivery'
import DeliveryDisabled from './DeliveryDisabled'

export default async function DeliveryLayout({ children }: { children: React.ReactNode }) {
  const { userId, sessionClaims } = await auth()

  if (!userId) redirect('/delivery/login')

  if (sessionClaims?.publicMetadata.role !== 'delivery') redirect('/delivery/login')

  // The whole delivery panel can be toggled off by an admin (no code removed).
  if (!(await isDeliveryEnabled())) {
    return <DeliveryDisabled />
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
