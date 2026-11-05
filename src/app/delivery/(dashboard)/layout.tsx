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
      <link
        rel="stylesheet"
        // Icon font for the admin and delivery panels only; the storefront doesn't load it.
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        precedence="default"
      />
      {children}
    </div>
  )
}
