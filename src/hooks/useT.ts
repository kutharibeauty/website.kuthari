'use client'

import { useLanguageStore } from '@/store/languageStore'
import en from '@/locales/en.json'
import or from '@/locales/or.json'

type LocaleKey = keyof typeof en

const locales = { en, od: or } as const

export function useT() {
  const language = useLanguageStore((s) => s.language)
  const locale = locales[language]

  function t(key: LocaleKey): string {
    return locale[key] ?? en[key] ?? key
  }

  function tField(enValue: string, orValue: string | null | undefined): string {
    if (language === 'od' && orValue) return orValue
    return enValue
  }

  return { t, tField, language }
}
