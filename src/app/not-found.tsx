import Link from 'next/link'
import { Search, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 py-20 relative overflow-hidden">
      {/* Soft brand glow, echoing the hero */}
      <div className="absolute inset-0 pointer-events-none radial-glow-gold opacity-60" aria-hidden />

      <div className="relative z-10 flex flex-col items-center">
        <span className="eyebrow">404 — Not found</span>
        <div className="rule-gold w-24 mt-4 mb-7" />

        <h1 className="display text-3xl md:text-5xl">This page doesn&apos;t exist</h1>

        <p className="mt-4 max-w-lg text-sm md:text-base leading-relaxed text-on-surface-variant/75">
          The page you&apos;re looking for may have been moved, or the product is no
          longer listed. Try a search, or head back to the store.
        </p>

        <div className="mt-9 flex flex-wrap gap-3 justify-center">
          <Link
            href="/"
            className="press gold-sheen relative overflow-hidden flex items-center gap-2 px-7 py-3.5 rounded-full bg-primary text-white text-[11px] font-bold uppercase tracking-[0.14em] hover:bg-primary/90 transition-colors"
          >
            <Home size={14} strokeWidth={2.5} /> Back to store
          </Link>
          <Link
            href="/search"
            className="press flex items-center gap-2 px-7 py-3.5 rounded-full border-[1.5px] border-table-border text-primary text-[11px] font-bold uppercase tracking-[0.14em] hover:border-primary transition-colors"
          >
            <Search size={14} strokeWidth={2.5} /> Browse products
          </Link>
        </div>
      </div>
    </div>
  )
}
