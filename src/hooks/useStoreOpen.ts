'use client'

import { useEffect, useState } from 'react'
import { isOrderingOpen } from '@/lib/store-hours'
import { useDeliveryConfig } from '@/hooks/useDeliveryConfig'

/**
 * Whether ordering is currently open, using the admin-set window (IST business
 * hours) from Settings. Re-checks every 30s so a customer sitting on the
 * cart/checkout across the open/close boundary sees it flip without a reload.
 *
 * Starts `true` and corrects on mount/config-load: the server and first client
 * render agree (no hydration mismatch), and the order route enforces the real
 * rule anyway, so a brief optimistic "open" can never let a late order through.
 */
export function useStoreOpen(): boolean {
  const { orderHours } = useDeliveryConfig()
  const [open, setOpen] = useState(true)

  useEffect(() => {
    const check = () => setOpen(isOrderingOpen(orderHours))
    check()
    const id = setInterval(check, 30_000)
    return () => clearInterval(id)
  }, [orderHours.enabled, orderHours.openMinute, orderHours.closeMinute])

  return open
}
