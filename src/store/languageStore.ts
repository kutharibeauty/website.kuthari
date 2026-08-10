'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Language = 'en' | 'od'

interface LanguageStore {
  language: Language
  setLanguage: (lang: Language) => void
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => set({ language }),
    }),
    { name: 'bcr-language' }
  )
)
