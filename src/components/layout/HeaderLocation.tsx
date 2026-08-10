'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  MapPin, ChevronDown, CheckCircle2, Loader2, X, LocateFixed,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import {
  readSavedPincode, writeSavedPincode, clearSavedPincode,
  type SavedPincode, type SavedPincodeResult as PincodeResult,
} from '@/lib/cart/pincode-storage'
import { DEFAULT_PINCODE_DELIVERY_FEE } from '@/lib/cart/delivery'
import { useDeliveryConfig } from '@/hooks/useDeliveryConfig'

function useSavedPincode() {
  const [saved, setSaved] = useState<SavedPincode | null>(null)
  useEffect(() => {
    setSaved(readSavedPincode())
  }, [])
  const save = (pincode: string, result: PincodeResult) => {
    const entry = { pincode, result }
    setSaved(entry)
    writeSavedPincode(entry)
  }
  const clear = () => {
    setSaved(null)
    clearSavedPincode()
  }
  return { saved, save, clear }
}

export default function HeaderLocation({ className = '' }: { className?: string }) {
  const { saved, save, clear } = useSavedPincode()
  const freeDeliveryMin = useDeliveryConfig().freeDeliveryMin
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'checking' | 'done'>('idle')
  const [result, setResult] = useState<PincodeResult | null>(null)
  const [geoStatus, setGeoStatus] = useState<'idle' | 'locating'>('idle')
  const [geoError, setGeoError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
    else { setInput(''); setStatus('idle'); setResult(null); setGeoStatus('idle'); setGeoError(null) }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const checkPincode = useCallback(async (pin: string) => {
    if (!/^\d{6}$/.test(pin)) return
    setStatus('checking')
    setResult(null)
    try {
      const res = await fetch(`/api/pincodes/check?pincode=${pin}`)
      const data: PincodeResult = await res.json()
      setResult(data)
      setStatus('done')
      save(pin, data)
    } catch {
      setStatus('idle')
    }
  }, [save])

  const detectLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('Location is not supported on this device. Please enter your pincode.')
      return
    }
    // Geolocation only works in a secure context (HTTPS or localhost). Over a
    // plain-HTTP LAN address (e.g. 192.168.x.x) the browser blocks it outright.
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setGeoError('Auto-location needs a secure (https) connection. Open the site on https or localhost, or enter your pincode below.')
      return
    }
    setGeoStatus('locating')
    setGeoError(null)
    setStatus('idle')
    setResult(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          // Reverse-geocode via our own proxy, which tries multiple providers so
          // an Indian pincode reliably comes back (BigDataCloud alone often omits it).
          const res = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`)
          const data = await res.json() as { pincode?: string | null }
          const pin = String(data?.pincode ?? '').replace(/\D/g, '').slice(0, 6)
          setGeoStatus('idle')
          if (/^\d{6}$/.test(pin)) {
            setInput(pin)
            checkPincode(pin)
          } else {
            setGeoError("Couldn't detect your pincode from your location. Please enter it manually.")
          }
        } catch {
          setGeoStatus('idle')
          setGeoError("Couldn't detect your location. Please enter your pincode manually.")
        }
      },
      (err) => {
        setGeoStatus('idle')
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location is blocked. Tap the 🔒 / ⓘ icon in your browser address bar → allow Location, then try again — or just enter your pincode below.')
        } else if (err.code === err.TIMEOUT) {
          setGeoError('Location timed out. Please try again or enter your pincode below.')
        } else {
          setGeoError("Couldn't get your location. Please enter your pincode manually.")
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [checkPincode])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
    setInput(val)
    setStatus('idle')
    setResult(null)
    setGeoError(null)
    if (val.length === 6) checkPincode(val)
  }

  const handleClearSaved = (e: React.MouseEvent) => {
    e.stopPropagation()
    clear()
    setOpen(false)
  }

  // Delivery is all-India, so a saved pincode is always deliverable.
  const titleLine = saved
    ? `Delivering to ${saved.result.city ?? saved.result.area ?? 'your area'}`
    : 'Select delivery location'

  const subLine = saved
    ? `${[saved.result.area, saved.result.city, saved.result.state].filter(Boolean).join(', ') || 'Pincode'} — ${saved.pincode}`
    : 'Tap to check your pincode'

  return (
    <div ref={panelRef} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-left group"
        aria-expanded={open}
      >
        <MapPin size={20} strokeWidth={2.5} className="text-primary flex-shrink-0" />
        <span className="flex flex-col leading-tight max-w-[220px]">
          <span className="text-sm font-black text-primary truncate">{titleLine}</span>
          {/* /80 not /70: over the white header this is 4.94:1 vs 3.85:1, which
              failed WCAG AA. Same colour token, just less transparent. */}
          <span className="text-xs font-medium text-on-surface-variant/80 truncate">{subLine}</span>
        </span>
        <ChevronDown
          size={16}
          className={`text-on-surface-variant/60 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute left-0 top-full mt-3 bg-white border border-outline-variant/50 rounded-2xl p-5 shadow-xl flex flex-col gap-4 z-50 w-[320px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-primary">Enter your pincode</span>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant hover:text-primary transition-colors"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>

            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                value={input}
                onChange={handleChange}
                placeholder="e.g. 760002"
                className="w-full px-4 py-3 pr-12 border border-table-border/80 rounded-xl text-sm font-bold text-primary placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 transition-colors bg-surface-container-low"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {status === 'checking' && <Loader2 size={18} className="animate-spin text-primary" />}
                {status === 'done' && <CheckCircle2 size={18} className="text-emerald-500" />}
              </div>
            </div>

            {/* ── Auto-detect location ── */}
            <button
              onClick={detectLocation}
              disabled={geoStatus === 'locating'}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-[12px] font-black tracking-wide transition-colors disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {geoStatus === 'locating' ? (
                <Loader2 size={15} className="animate-spin" strokeWidth={2.5} />
              ) : (
                <LocateFixed size={15} strokeWidth={2.5} />
              )}
              {geoStatus === 'locating' ? 'Detecting your location…' : 'Use my current location'}
            </button>

            {geoError && (
              <p className="text-[11px] font-medium text-error/80 leading-relaxed px-1 -mt-1">{geoError}</p>
            )}

            {status === 'done' && result && (
              <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-xs bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-600 text-[13px]">Delivery available!</p>
                  <p className="text-[11px] font-medium text-emerald-600/80 mt-1">
                    {[result.area, result.city, result.state].filter(Boolean).length > 0 ? (
                      <>We deliver to <span className="font-bold">{[result.area, result.city, result.state].filter(Boolean).join(', ')}</span></>
                    ) : (
                      <>We deliver to pincode <span className="font-bold">{input}</span></>
                    )}
                  </p>
                  <p className="text-[11px] font-medium text-emerald-600/80 mt-1">
                    Delivery charge:{' '}
                    <span className="font-bold">
                      {result.delivery_charge === 0
                        ? 'Free'
                        : `₹${(result.delivery_charge ?? DEFAULT_PINCODE_DELIVERY_FEE).toLocaleString('en-IN')}`}
                    </span>
                    {' '}· free above ₹{freeDeliveryMin.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            )}

            {status === 'idle' && (
              <p className="text-[11px] font-medium text-on-surface-variant/70 leading-relaxed px-1">
                Enter your 6-digit pincode to check delivery availability in your area.
              </p>
            )}

            {saved && (
              <button
                onClick={handleClearSaved}
                className="text-[11px] font-black tracking-wide text-primary hover:text-secondary underline underline-offset-4 self-start px-1 transition-colors"
              >
                Reset saved location
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
