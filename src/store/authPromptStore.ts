'use client'

import { create } from 'zustand'

/** Controls the "please log in" popup shown when a guest tries to add to cart. */
interface AuthPromptStore {
  open: boolean
  show: () => void
  hide: () => void
}

export const useAuthPromptStore = create<AuthPromptStore>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}))
