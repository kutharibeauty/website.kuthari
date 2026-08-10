'use client'

import { useLanguageStore } from '@/store/languageStore'
import { motion } from 'framer-motion'

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguageStore()
  const isEn = language === 'en'

  return (
    <div
      className="relative inline-flex items-center rounded-xl border border-table-border/60 bg-surface-container-low/50 p-0.5 text-[11px] font-black select-none shadow-3xs hover:shadow-sm transition-shadow duration-300"
      role="group"
      aria-label="Language selector"
    >
      {/* Single sliding pill — both buttons are equal width, so it only ever
          translates (never resizes), which removes the switch glitch. */}
      <motion.span
        aria-hidden
        className="absolute left-0.5 top-0.5 bottom-0.5 w-10 rounded-lg bg-primary shadow-sm"
        initial={false}
        animate={{ x: isEn ? '0%' : '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      />

      <button
        onClick={() => setLanguage('en')}
        className={`relative z-10 w-10 py-1.5 text-center leading-none rounded-lg active:scale-95 transition-colors duration-200 ${
          isEn ? 'text-on-primary' : 'text-on-surface-variant hover:text-primary'
        }`}
        aria-pressed={isEn}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('od')}
        className={`relative z-10 w-10 py-1.5 text-center leading-none font-odia rounded-lg active:scale-95 transition-colors duration-200 ${
          !isEn ? 'text-on-primary' : 'text-on-surface-variant hover:text-primary'
        }`}
        aria-pressed={!isEn}
      >
        ଓ
      </button>
    </div>
  )
}
