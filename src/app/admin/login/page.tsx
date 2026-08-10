import { Suspense } from 'react'
import PhoneAuthForm from '@/components/auth/PhoneAuthForm'
import Logo from '@/components/layout/Logo'

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-dim p-4 font-sans">
      <div className="w-full max-w-md bg-surface-card border-2 border-primary rounded-2xl shadow-modal p-8">
        <div className="mb-8 text-center border-b-2 border-outline-variant pb-6 flex flex-col items-center">
          <Logo className="h-16 w-auto mb-4" />
          <h1 className="text-3xl font-black uppercase tracking-tight text-primary">
            Admin Portal.
          </h1>
          <p className="font-bold text-xs uppercase tracking-widest mt-2 text-on-surface-variant">
            Kuthari Beauty Store Management
          </p>
        </div>
        <div className="flex justify-center">
          <Suspense fallback={null}>
            <PhoneAuthForm
              portal="admin"
              allowSignup={false}
              title="Staff Sign In"
              subtitle="Enter your registered mobile number"
            />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
