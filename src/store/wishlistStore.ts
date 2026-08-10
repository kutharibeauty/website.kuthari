'use client'

import { create } from 'zustand'

interface WishlistStore {
  ids: string[]
  hydrated: boolean
  hydrate: () => Promise<void>
  toggle: (productId: string) => Promise<void>
}

// Module-level guard so the wishlist is fetched once per session even though
// many heart buttons mount.
let didHydrate = false

export const useWishlistStore = create<WishlistStore>((set, get) => ({
  ids: [],
  hydrated: false,

  hydrate: async () => {
    if (didHydrate) return
    didHydrate = true
    try {
      const res = await fetch('/api/wishlist')
      if (res.ok) {
        const { ids } = (await res.json()) as { ids: string[] }
        set({ ids: ids ?? [], hydrated: true })
      }
    } catch {
      didHydrate = false // allow a retry on the next mount
    }
  },

  toggle: async (productId) => {
    const has = get().ids.includes(productId)
    // Optimistic update.
    set({ ids: has ? get().ids.filter((x) => x !== productId) : [...get().ids, productId] })
    try {
      const res = await fetch('/api/wishlist', {
        method: has ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId }),
      })
      if (!res.ok) throw new Error('failed')
    } catch {
      // Revert on failure.
      set({ ids: has ? [...get().ids, productId] : get().ids.filter((x) => x !== productId) })
    }
  },
}))
