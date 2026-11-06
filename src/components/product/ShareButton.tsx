'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Check, Link2, Mail, Share2 } from 'lucide-react'

/**
 * Share a product. Where the browser has a share sheet (phones, most tablets,
 * Windows/macOS Chrome and Safari) that opens; otherwise a small menu offers
 * WhatsApp, Facebook, X, email and "Copy link".
 */
export default function ShareButton({ name, price, path }: { name: string; price: number; path: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  const title = name.replace(/\s+/g, ' ').trim().replace(/(^|\s)(\p{L})/gu, (_m, sp, ch) => sp + ch.toUpperCase())
  const text = `${title}, ₹${Math.round(price).toLocaleString('en-IN')} at Kuthari Beauty Store`
  const url = () => `${window.location.origin}${path}`

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  async function share() {
    const data = { title, text, url: url() }
    if (typeof navigator !== 'undefined' && navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      try { await navigator.share(data) } catch { /* closed the sheet */ }
      return
    }
    setOpen((v) => !v)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url())
      setCopied(true)
      setTimeout(() => { setCopied(false); setOpen(false) }, 1500)
    } catch { /* clipboard blocked: the user can still use the other options */ }
  }

  const enc = encodeURIComponent
  const item = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-semibold text-ink hover:bg-paper-sunk'

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={share}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-raised px-4 py-2 text-[14px] font-semibold text-ink transition-colors hover:border-ink/40 active:scale-95"
      >
        <Share2 size={16} strokeWidth={2.25} aria-hidden="true" />
        Share
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-60 rounded-2xl border border-line bg-paper-raised p-1.5 shadow-[var(--shadow-modal)]">
          <a role="menuitem" className={item} href={`https://wa.me/?text=${enc(`${text}\n${url()}`)}`} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
            <Image src="/images/whatsapp.webp" alt="" width={20} height={20} className="h-5 w-5" /> WhatsApp
          </a>
          <a role="menuitem" className={item} href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url())}`} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[#1877F2] text-[12px] font-bold text-white" aria-hidden="true">f</span> Facebook
          </a>
          <a role="menuitem" className={item} href={`https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url())}`} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
            <span className="flex h-5 w-5 items-center justify-center rounded bg-black text-[12px] font-bold text-white" aria-hidden="true">X</span> X (Twitter)
          </a>
          <a role="menuitem" className={item} href={`mailto:?subject=${enc(title)}&body=${enc(`${text}\n${url()}`)}`} onClick={() => setOpen(false)}>
            <Mail size={20} className="text-indigo" aria-hidden="true" /> Email
          </a>
          <button role="menuitem" type="button" className={item} onClick={copy}>
            {copied ? <Check size={20} className="text-success" aria-hidden="true" /> : <Link2 size={20} className="text-indigo" aria-hidden="true" />}
            {copied ? 'Link copied' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  )
}
