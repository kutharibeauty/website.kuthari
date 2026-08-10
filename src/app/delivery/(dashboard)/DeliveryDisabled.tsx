import Logo from '@/components/layout/Logo'
import { PackageX } from 'lucide-react'

/** Shown when the delivery panel is turned off from Admin → Settings. */
export default function DeliveryDisabled() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center gap-5">
      <Logo className="h-14 w-auto" />
      <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center">
        <PackageX size={30} className="text-on-surface-variant/50" />
      </div>
      <div className="max-w-sm">
        <h1 className="text-xl font-black text-primary tracking-tight">Delivery panel unavailable</h1>
        <p className="text-sm font-medium text-on-surface-variant/70 mt-2 leading-relaxed">
          The delivery portal is currently turned off. Please contact your administrator — it can be re-enabled at any time.
        </p>
      </div>
    </main>
  )
}
