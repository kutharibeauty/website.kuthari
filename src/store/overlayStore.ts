'use client'

import { create } from 'zustand'

/**
 * Tracks how many full-screen overlays (bottom sheets / modals) are open, so
 * floating UI like the WhatsApp button can hide itself while one is showing.
 * A counter (not a boolean) so nested/overlapping overlays behave correctly.
 */
interface OverlayStore {
  count: number
  push: () => void
  pop: () => void
}

export const useOverlayStore = create<OverlayStore>((set) => ({
  count: 0,
  push: () => set((s) => ({ count: s.count + 1 })),
  pop: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
}))
