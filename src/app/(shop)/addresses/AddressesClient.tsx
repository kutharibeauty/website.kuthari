'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MapPin, Plus, Pencil, Trash2, Star, Loader2 } from 'lucide-react'
import AddressForm from '@/components/checkout/AddressForm'
import { cn } from '@/lib/utils'
import type { Address } from '@/types/database.types'

export default function AddressesClient({
  profileId,
  initialAddresses,
}: {
  profileId: string
  initialAddresses: Address[]
}) {
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Address | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const remove = async (id: string) => {
    setBusy(id)
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: 'DELETE' })
      if (res.ok) setAddresses((a) => a.filter((x) => x.id !== id))
    } finally {
      setBusy(null)
    }
  }

  const setDefault = async (id: string) => {
    setBusy(id)
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      })
      if (res.ok) setAddresses((a) => a.map((x) => ({ ...x, is_default: x.id === id })))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero strip */}
      <div className="relative overflow-hidden bg-primary border-b-2 border-primary mb-6">
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none" />
        <div className="relative z-10 px-4 max-w-2xl mx-auto py-7 md:py-9">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors mb-2"
          >
            <ArrowLeft size={12} strokeWidth={2.5} /> Back to Profile
          </Link>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Saved Addresses</h1>
          <p className="text-xs text-white/45 font-medium mt-0.5">Manage where we deliver your orders</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-16">
        <button
          onClick={() => setShowForm(true)}
          className="w-full mb-5 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-table-border text-primary font-black text-xs uppercase tracking-widest hover:border-primary hover:bg-primary/5 transition-colors active:scale-[0.99]"
        >
          <Plus size={16} strokeWidth={3} /> Add New Address
        </button>

        {addresses.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 gap-3">
            <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center">
              <MapPin size={24} className="text-on-surface-variant/50" />
            </div>
            <p className="font-bold text-on-surface-variant/70 max-w-xs">
              No saved addresses yet. Add one so checkout is faster next time.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {addresses.map((addr) => (
              <div key={addr.id} className="rounded-2xl border-2 border-table-border bg-surface-card p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {addr.label && (
                      <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-black text-[10px] uppercase tracking-widest">
                        {addr.label}
                      </span>
                    )}
                    {addr.is_default && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-success/10 text-success font-black text-[10px] uppercase tracking-widest">
                        <Star size={11} className="fill-success" /> Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditing(addr)}
                      disabled={busy === addr.id}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant/50 hover:text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
                      aria-label="Edit address"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => remove(addr.id)}
                      disabled={busy === addr.id}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant/50 hover:text-error hover:bg-error/5 transition-colors disabled:opacity-50"
                      aria-label="Delete address"
                    >
                      {busy === addr.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>

                <p className="font-black text-sm text-primary">{addr.name}</p>
                <p className="text-sm font-medium text-on-surface-variant/80 leading-relaxed mt-0.5">
                  {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
                  {addr.city}, {addr.state} — {addr.pincode}
                </p>
                <p className="text-xs font-bold text-on-surface-variant/60 mt-1">{addr.phone}</p>

                {!addr.is_default && (
                  <button
                    onClick={() => setDefault(addr.id)}
                    disabled={busy === addr.id}
                    className={cn(
                      'mt-3 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-on-surface-variant/70 hover:text-primary transition-colors disabled:opacity-50',
                    )}
                  >
                    <Star size={13} /> Set as default
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <AddressForm
          profileId={profileId}
          onSaved={(addr) => {
            setAddresses((prev) => [
              addr,
              ...(addr.is_default ? prev.map((x) => ({ ...x, is_default: false })) : prev),
            ])
            setShowForm(false)
          }}
          onClose={() => setShowForm(false)}
        />
      )}

      {editing && (
        <AddressForm
          profileId={profileId}
          address={editing}
          onSaved={(addr) => {
            setAddresses((prev) =>
              prev.map((x) =>
                x.id === addr.id
                  ? addr
                  : addr.is_default
                    ? { ...x, is_default: false }
                    : x,
              ),
            )
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
