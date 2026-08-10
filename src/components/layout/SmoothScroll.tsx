'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ReactLenis, useLenis } from 'lenis/react'

/**
 * Put the new page at the top on every navigation.
 *
 * Lenis drives the scroll itself. Next calls window.scrollTo(0, 0) when the
 * route changes, but Lenis keeps its own animated offset and writes that back
 * on the next frame — so the browser's reset is immediately undone and you
 * arrive at whatever offset the PREVIOUS page was at. Clicking a product from
 * far down a listing therefore landed you in that product page's footer.
 *
 * `immediate` jumps rather than animating, so it reads as a normal page load
 * instead of a visible scroll-up. It also means the route's loading skeleton is
 * actually in view while the page streams in.
 */
function ScrollToTopOnNavigate() {
  const pathname = usePathname()
  const lenis = useLenis()

  useEffect(() => {
    if (!lenis) {
      window.scrollTo(0, 0)
      return
    }
    lenis.scrollTo(0, { immediate: true })
  }, [pathname, lenis])

  return null
}

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis root options={{ lerp: 0.08, duration: 1.5, smoothWheel: true }}>
      <ScrollToTopOnNavigate />
      {children}
    </ReactLenis>
  )
}
