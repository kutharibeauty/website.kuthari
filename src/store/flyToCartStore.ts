'use client'

import { create } from 'zustand'
import { nanoid } from 'nanoid'

export interface FlyToCartFlight {
  id: string
  image: string
  fromRect: DOMRect
}

interface FlyToCartStore {
  flight: FlyToCartFlight | null
  /** Kick off a fly-to-cart animation from `fromEl`'s current position. No-ops
   *  without an image or element — purely decorative, never blocks the add. */
  launch: (image: string | null | undefined, fromEl: HTMLElement | null) => void
  clear: () => void
}

export const useFlyToCartStore = create<FlyToCartStore>((set) => ({
  flight: null,
  launch: (image, fromEl) => {
    if (!image || !fromEl) return
    set({ flight: { id: nanoid(6), image, fromRect: fromEl.getBoundingClientRect() } })
  },
  clear: () => set({ flight: null }),
}))
