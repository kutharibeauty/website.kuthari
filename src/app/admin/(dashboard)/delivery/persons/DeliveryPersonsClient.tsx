'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, X, Loader2, Bike, UserPlus, FileText, CheckCircle, Clock, Trash2, Edit3, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type DeliveryPerson = {
  id: string
  name: string
  phone: string
  user_id: string
  role: string
  created_at: string
}

const inputCls = 'w-full px-4 py-3 bg-surface border-2 border-table-border rounded-xl font-bold text-sm text-primary placeholder:font-medium placeholder:italic placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function DeliveryPersonsClient({
  initialPersons,
}: {
  initialPersons: DeliveryPerson[]
}) {
  const [persons, setPersons] = useState(initialPersons)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Name and phone are required.')
      return
    }
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin-profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        phone: form.phone.trim(),
        role: 'delivery',
        permissions: [],
      }),
    })
    if (res.ok) {
      const d = await res.json() as DeliveryPerson
      setPersons(prev => [d, ...prev])
      setForm({ name: '', phone: '' })
      setShowAdd(false)
      showToast('Delivery person added')
    } else {
      const d = await res.json() as { error?: string }
      setError(d.error ?? 'Failed to add delivery person')
    }
    setSaving(false)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name} from delivery team?`)) return
    const res = await fetch(`/api/admin-profiles/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setPersons(prev => prev.filter(p => p.id !== id))
      showToast(`${name} removed`)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto w-full space-y-6 md:space-y-8 pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b-2 border-table-border pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-primary tracking-tight capitalize">
            Delivery Team.
          </h1>
          <p className="font-bold text-[10px] text-on-surface-variant uppercase tracking-widest mt-2">
            {persons.length} delivery {persons.length === 1 ? 'person' : 'persons'} registered
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/delivery/assignments"
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant font-black text-[10px] uppercase tracking-widest hover:border-primary/40 hover:text-primary transition-colors active:scale-95 shadow-sm"
          >
            <FileText size={16} strokeWidth={2.5} />
            Assignments
          </Link>
          <button
            onClick={() => { setShowAdd(true); setError('') }}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-colors active:scale-95 shadow-sm"
          >
            <UserPlus size={16} strokeWidth={2.5} />
            Add Person
          </button>
        </div>
      </div>

      {/* Info card */}
      <div className="flex items-start gap-4 px-5 py-4 bg-surface-card rounded-2xl border-2 border-table-border">
        <AlertCircle size={20} strokeWidth={2.5} className="text-primary flex-shrink-0 mt-0.5" />
        <p className="font-bold text-sm text-primary leading-relaxed">
          Delivery persons can log in at{' '}
          <code className="bg-surface border-2 border-table-border px-2 py-1 rounded-lg text-xs mx-1 font-mono tracking-normal">/delivery/dashboard</code>
          {' '}to view and manage their assigned orders.
        </p>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-surface-card rounded-2xl border-2 border-table-border p-6 space-y-6">
          <div className="flex items-center justify-between border-b-2 border-table-border pb-4">
            <h3 className="font-black text-xl text-primary">New Delivery Person.</h3>
            <button onClick={() => setShowAdd(false)} className="p-2 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant hover:bg-surface-card transition-colors active:scale-95">
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="font-black text-[10px] text-primary uppercase tracking-widest flex items-center">
                Full Name <span className="text-error ml-1">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Ravi Kumar"
                className={inputCls}
              />
            </div>
            <div className="space-y-2">
              <label className="font-black text-[10px] text-primary uppercase tracking-widest flex items-center">
                Phone <span className="text-error ml-1">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="+91 XXXXX XXXXX"
                className={inputCls}
              />
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-3 px-4 py-3 bg-error/10 border-2 border-error/20 rounded-xl text-error">
              <AlertCircle size={16} strokeWidth={2.5} className="flex-shrink-0" />
              <p className="font-bold text-sm">{error}</p>
            </div>
          )}
          <div className="flex gap-4 pt-4 border-t-2 border-table-border">
            <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl border-2 border-table-border bg-surface font-black text-xs text-on-surface-variant uppercase tracking-widest hover:border-primary/40 hover:text-primary transition-colors active:scale-95">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 transition-opacity active:scale-95 shadow-sm"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? 'Adding…' : 'Add Person'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {persons.length === 0 && !showAdd ? (
        <div className="py-24 text-center bg-surface-card rounded-2xl border-2 border-table-border">
          <div className="w-16 h-16 mx-auto bg-surface border-2 border-table-border rounded-2xl flex items-center justify-center mb-4">
            <Bike size={24} className="text-on-surface-variant/40" />
          </div>
          <p className="font-black text-sm text-on-surface-variant uppercase tracking-widest">No delivery persons yet.</p>
          <p className="font-bold text-[10px] text-on-surface-variant uppercase tracking-widest mt-2">
            Add delivery persons to enable order assignments.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {persons.map(p => (
            <div
              key={p.id}
              className="flex flex-col p-6 bg-surface-card rounded-2xl border-2 border-table-border transition-all hover:border-primary/40 group"
            >
              <div className="flex items-start gap-4 mb-6">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-xl border-2 border-table-border bg-surface flex items-center justify-center flex-shrink-0">
                  <span className="font-black text-2xl text-primary">
                    {p.name[0]?.toUpperCase() ?? '?'}
                  </span>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-lg text-primary truncate leading-tight mb-1">{p.name}</p>
                  <p className="font-bold text-sm text-on-surface-variant">{p.phone}</p>
                </div>
              </div>

              <div className="mt-auto space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-table-border bg-surface font-black text-[10px] text-on-surface-variant uppercase tracking-widest">
                    <Bike size={12} strokeWidth={2.5} />
                    Delivery
                  </span>
                  
                  {/* Account link status */}
                  <div className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 font-black text-[10px] uppercase tracking-widest',
                    p.user_id
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200',
                  )}>
                    {p.user_id ? <CheckCircle size={12} strokeWidth={3} /> : <Clock size={12} strokeWidth={3} />}
                    {p.user_id ? 'Linked' : 'Pending'}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t-2 border-table-border">
                  <p className="font-bold text-[10px] text-on-surface-variant uppercase tracking-widest">
                    Joined {fmtDate(p.created_at)}
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/profiles/${p.id}`}
                      className="p-2 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all active:scale-95"
                      title="Edit profile"
                    >
                      <Edit3 size={16} strokeWidth={2.5} />
                    </Link>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="p-2 rounded-xl border-2 border-table-border bg-surface text-on-surface-variant hover:border-error/40 hover:text-error hover:bg-error/5 transition-all active:scale-95"
                      title="Remove"
                    >
                      <Trash2 size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-primary text-white border-2 border-primary rounded-xl font-black text-xs uppercase tracking-widest shadow-[0_8px_30px_rgba(44,24,16,0.3)]">
          {toast}
        </div>
      )}
    </div>
  )
}
