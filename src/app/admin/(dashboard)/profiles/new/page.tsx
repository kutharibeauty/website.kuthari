import type { Metadata } from 'next'
import Link from 'next/link'
import AdminProfileForm from '@/components/admin/AdminProfileForm'

export const metadata: Metadata = { title: 'Add Admin Profile | Kuthari Admin' }

export default function NewProfilePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-16 z-30 bg-surface border-b border-outline-variant/30 px-margin-mobile md:px-margin-desktop py-4 flex items-center gap-3">
        <Link
          href="/admin/profiles"
          className="p-2 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>
        <div>
          <h1 className="font-headline-md text-headline-md text-primary leading-tight">New Admin Profile</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Create a new admin or delivery person account</p>
        </div>
      </div>
      <div className="p-margin-mobile md:p-margin-desktop">
        <AdminProfileForm />
      </div>
    </div>
  )
}
