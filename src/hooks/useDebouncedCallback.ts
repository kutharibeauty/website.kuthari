import { useCallback, useEffect, useRef } from 'react'

/**
 * Returns a debounced version of `fn`: it only runs once `delay` ms have passed
 * without another call, and the most recent arguments win. Used to hold back a
 * search's network request until the user pauses typing, instead of firing one
 * per keystroke.
 *
 * The pending timer is cancelled on unmount so a late call can't fire after the
 * component is gone.
 */
export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delay = 350,
): (...args: A) => void {
  // Keep the latest fn without re-creating the debounced callback each render.
  const fnRef = useRef(fn)
  useEffect(() => {
    fnRef.current = fn
  }, [fn])

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  return useCallback(
    (...args: A) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => fnRef.current(...args), delay)
    },
    [delay],
  )
}
