import { Suspense } from 'react'
import { auth } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import PhoneAuthForm from '@/components/auth/PhoneAuthForm'
import Logo from '@/components/layout/Logo'
import { isDeliveryEnabled } from '@/lib/settings/delivery'
import { PackageX } from 'lucide-react'

export default async function DeliveryLoginPage() {
  const { userId, sessionClaims } = await auth()

  // Delivery panel disabled by admin — don't allow sign-in.
  if (!(await isDeliveryEnabled())) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center gap-5">
        <Logo className="h-14 w-auto" />
        <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center">
          <PackageX size={30} className="text-on-surface-variant/50" />
        </div>
        <div className="max-w-sm">
          <h1 className="text-xl font-bold text-primary tracking-tight">Delivery panel unavailable</h1>
          <p className="text-sm font-medium text-on-surface-variant/70 mt-2 leading-relaxed">
            The delivery portal is currently turned off. Please contact your administrator.
          </p>
        </div>
      </main>
    )
  }

  if (userId && sessionClaims?.publicMetadata.role === 'delivery') {
    redirect('/delivery/dashboard')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 gap-6">
      <div className="text-center flex flex-col items-center">
        <Logo className="h-16 w-auto mb-3" />
        <h1 className="font-headline-md text-headline-md text-primary">Delivery Login</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">Kuthari Beauty Store · Delivery Portal</p>
      </div>
      <Suspense fallback={null}>
        <PhoneAuthForm
          portal="delivery"
          allowSignup={false}
          title="Delivery Sign In"
          subtitle="Enter your registered mobile number"
        />
      </Suspense>
    </main>
  )
}
