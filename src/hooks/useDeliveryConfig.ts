'use client'

import { useState, useEffect } from 'react'
import { DEFAULT_DELIVERY_CONFIG, parseDeliveryConfig, type DeliveryConfig } from '@/lib/cart/delivery'

// Cached for the session so the cart and checkout don't each re-fetch it.
let cached: DeliveryConfig | null = null

/**
 * The admin-set free-delivery threshold + flat fee, read from the public
 * `settings` CMS row. Used by the cart and checkout so both show exactly what
 * the order route will charge. Starts from the defaults and updates once loaded.
 */
export function useDeliveryConfig(): DeliveryConfig {
  const [config, setConfig] = useState<DeliveryConfig>(cached ?? DEFAULT_DELIVERY_CONFIG)

  useEffect(() => {
    if (cached) return
    let active = true
    fetch('/api/cms?key=settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((row) => {
        const parsed = parseDeliveryConfig(row?.value)
        cached = parsed
        if (active) setConfig(parsed)
      })
      .catch(() => {
        /* keep defaults on failure */
      })
    return () => {
      active = false
    }
  }, [])

  return config
}
