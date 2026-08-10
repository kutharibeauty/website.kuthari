'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Secret staff shortcut to the admin login. Nothing renders / is linked, so a
 * casual visitor or bot won't find it. Two triggers:
 *   1. Ctrl/Cmd + Alt + A  (may be swallowed by OS apps on some machines)
 *   2. Type "admin" anywhere on the page (no modifiers) — always reliable.
 * You can also just visit /admin/login directly.
 */
export default function AdminShortcut() {
  const router = useRouter()
  const buffer = useRef('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      if (isTyping) return

      // 1. Modifier combo.
      if (e.altKey && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        router.push('/admin/login')
        return
      }

      // 2. Type-the-word fallback — "admin".
      if (/^[a-zA-Z]$/.test(e.key)) {
        buffer.current = (buffer.current + e.key.toLowerCase()).slice(-5)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => { buffer.current = '' }, 1500)
        if (buffer.current === 'admin') {
          buffer.current = ''
          router.push('/admin/login')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timer.current)
    }
  }, [router])

  return null
}
