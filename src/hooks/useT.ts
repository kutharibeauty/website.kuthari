'use client'

import en from '@/locales/en.json'

type LocaleKey = keyof typeof en

/**
 * Copy lookup. The site is English-only.
 *
 * `t` / `tField` are kept (rather than inlining English everywhere) because
 * they are called from ~50 components, and `tField` still serves a real
 * purpose: rows carry legacy `*_or` translation columns, and this is the one
 * place that decides they are ignored.
 */
export function useT() {
  function t(key: LocaleKey): string {
    return en[key] ?? key
  }

  /** Returns the English value. The second argument is the legacy Odia column,
   *  still accepted so the ~50 existing call sites keep compiling, and
   *  deliberately ignored. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function tField(enValue: string, _orValue?: string | null): string {
    return enValue
  }

  return { t, tField, language: 'en' as const }
}
