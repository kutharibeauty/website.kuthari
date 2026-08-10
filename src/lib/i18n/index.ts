export type SupportedLanguage = 'en' | 'od'

export function getLocalizedField(
  obj: Record<string, unknown>,
  field: string,
  lang: SupportedLanguage
): string {
  if (lang === 'od') {
    const orValue = obj[`${field}_or`]
    if (typeof orValue === 'string' && orValue.trim()) return orValue
  }
  const base = obj[field]
  return typeof base === 'string' ? base : ''
}
