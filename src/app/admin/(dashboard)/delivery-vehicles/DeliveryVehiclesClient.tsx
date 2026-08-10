'use client'

import { useState } from 'react'
import { Plus, Trash2, Truck, Loader2, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/store/toastStore'
import type { DeliveryVehicle } from '@/types/database.types'

const inputCls = 'w-full px-3 py-2.5 bg-surface border-2 border-table-border rounded-xl font-bold text-sm text-primary placeholder:font-medium placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary hover:border-primary/40 focus:shadow-[0_0_0_4px_rgba(27,44,61,0.07)] transition-all duration-200'

export default function DeliveryVehiclesClient({ initial }: { initial: DeliveryVehicle[] }) {
  const [vehicles, setVehicles] = useState<DeliveryVehicle[]>(initial)
  const [form, setForm] = useState({ number: '', name: '', phone: '' })
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const showToast = useToastStore((s) => s.show)

  async function addVehicle() {
    if (!form.number.trim()) { showToast('Vehicle number is required', 'error'); return }
    setAdding(true)
    const res = await fetch('/api/delivery-vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const v = await res.json() as DeliveryVehicle
      setVehicles((prev) => [...prev, v])
      setForm({ number: '', name: '', phone: '' })
      showToast('Vehicle added', 'success')
    } else {
      const d = await res.json().catch(() => ({})) as { error?: string }
      showToast(d.error ?? 'Could not add vehicle', 'error')
    }
    setAdding(false)
  }

  async function patch(id: string, changes: Partial<DeliveryVehicle>) {
    setBusy(id)
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...changes } : v)))
    const res = await fetch(`/api/delivery-vehicles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    })
    if (!res.ok) showToast('Could not save changes', 'error')
    setBusy(null)
  }

  async function remove(id: string) {
    if (!confirm('Remove this vehicle?')) return
    setBusy(id)
    const res = await fetch(`/api/delivery-vehicles/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setVehicles((prev) => prev.filter((v) => v.id !== id))
      showToast('Vehicle removed', 'success')
    } else {
      showToast('Could not remove vehicle', 'error')
    }
    setBusy(null)
  }

  const setField = (id: string, field: 'number' | 'name' | 'phone', value: string) =>
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)))

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-8">
      <div className="border-b-2 border-table-border pb-6">
        <h1 className="text-3xl md:text-4xl font-black text-primary tracking-tight flex items-center gap-3">
          <Truck size={30} /> Delivery Vehicles.
        </h1>
        <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mt-2">
          Buses customers can pick at checkout
        </p>
      </div>

      {/* Add */}
      <section className="bg-surface-card rounded-2xl border-2 border-table-border p-5 space-y-4">
        <p className="font-black text-xs text-primary uppercase tracking-widest">Add a vehicle</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} placeholder="Bus number *" className={inputCls} />
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Transporter / driver name" className={inputCls} />
          <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Contact phone" className={inputCls} />
        </div>
        <button
          onClick={addVehicle}
          disabled={adding}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 disabled:opacity-60 transition-opacity active:scale-95"
        >
          {adding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Add Vehicle
        </button>
      </section>

      {/* List */}
      <section className="space-y-3">
        {vehicles.length === 0 ? (
          <p className="text-center py-12 font-black text-sm text-on-surface-variant uppercase tracking-widest">
            No vehicles yet.
          </p>
        ) : (
          vehicles.map((v) => (
            <div key={v.id} className="bg-surface-card rounded-2xl border-2 border-table-border p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                <input value={v.number} onChange={(e) => setField(v.id, 'number', e.target.value)} onBlur={(e) => patch(v.id, { number: e.target.value.trim() })} className={inputCls} placeholder="Number" />
                <input value={v.name ?? ''} onChange={(e) => setField(v.id, 'name', e.target.value)} onBlur={(e) => patch(v.id, { name: e.target.value.trim() || null })} className={inputCls} placeholder="Name" />
                <input value={v.phone ?? ''} onChange={(e) => setField(v.id, 'phone', e.target.value)} onBlur={(e) => patch(v.id, { phone: e.target.value.trim() || null })} className={inputCls} placeholder="Phone" />
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Active toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={v.is_active}
                  onClick={() => patch(v.id, { is_active: !v.is_active })}
                  title={v.is_active ? 'Active — shown at checkout' : 'Inactive — hidden'}
                  className={cn('relative w-11 h-6 rounded-full transition-colors flex-shrink-0', v.is_active ? 'bg-primary' : 'bg-outline-variant')}
                >
                  <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform', v.is_active ? 'translate-x-[22px]' : 'translate-x-0.5')} />
                </button>
                {busy === v.id ? (
                  <Loader2 size={16} className="animate-spin text-on-surface-variant" />
                ) : (
                  <Save size={16} className="text-on-surface-variant/30" />
                )}
                <button onClick={() => remove(v.id)} aria-label="Remove" className="p-2 rounded-xl border-2 border-table-border text-on-surface-variant hover:border-error/40 hover:text-error hover:bg-error/5 transition-colors active:scale-95">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
