'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, LogOut, Package, MapPin, ChevronRight } from 'lucide-react'

interface Props {
  initialName: string
  initialEmail: string
  phone: string
}

export default function ProfileForm({ initialName, initialEmail, phone }: Props) {
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setSaving(true)
    try {
      const res = await fetch('/api/auth/save-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: email || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Could not save profile.')
        return
      }
      setMessage('Profile updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    // Store and admin are separate sessions now — this ends only the store one.
    setSigningOut(true)
    window.location.href = '/api/auth/signout'
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/orders"
        className="flex items-center justify-between p-4 rounded-2xl border-2 border-table-border bg-surface-card hover:border-primary/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Package size={18} />
          </span>
          <span className="font-black text-sm text-primary">My Orders</span>
        </div>
        <ChevronRight size={18} className="text-on-surface-variant/40" />
      </Link>

      <Link
        href="/addresses"
        className="flex items-center justify-between p-4 rounded-2xl border-2 border-table-border bg-surface-card hover:border-primary/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <MapPin size={18} />
          </span>
          <span className="font-black text-sm text-primary">Saved Addresses</span>
        </div>
        <ChevronRight size={18} className="text-on-surface-variant/40" />
      </Link>

      <form onSubmit={handleSave} className="flex flex-col gap-4 p-5 rounded-2xl border-2 border-table-border bg-surface-card">
        <h2 className="font-black text-primary text-base border-b border-table-border pb-2 mb-1 uppercase tracking-wide">
          Account Details
        </h2>

        <div>
          <label className="font-black text-xs uppercase tracking-wider text-primary mb-1.5 block">Mobile Number</label>
          <input
            type="text"
            value={phone}
            disabled
            className="w-full px-4 py-2.5 rounded-xl border-2 border-table-border bg-surface-container-low font-medium text-on-surface-variant"
          />
        </div>

        <div>
          <label className="font-black text-xs uppercase tracking-wider text-primary mb-1.5 block">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border-2 border-table-border focus:border-primary bg-surface-card font-medium text-on-surface outline-none transition-colors"
          />
        </div>

        <div>
          <label className="font-black text-xs uppercase tracking-wider text-primary mb-1.5 block">Email (optional)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-2.5 rounded-xl border-2 border-table-border focus:border-primary bg-surface-card font-medium text-on-surface outline-none transition-colors"
          />
        </div>

        {error && <p className="text-sm font-medium text-error">{error}</p>}
        {message && <p className="text-sm font-medium text-success">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="self-start flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all duration-200 shadow-sm active:scale-95 px-6 py-3 disabled:opacity-50"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          Save Changes
        </button>
      </form>

      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="flex items-center justify-center gap-2 border-2 border-table-border text-on-surface font-black text-xs uppercase tracking-widest rounded-xl hover:border-error/40 hover:text-error transition-all duration-200 px-6 py-3 disabled:opacity-50"
      >
        {signingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
        Sign Out
      </button>
    </div>
  )
}
