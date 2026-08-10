import { useEffect, useMemo, useState } from 'react'

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

/**
 * Client-side pagination over an already-filtered list. Defaults to 10 per page.
 * Pass a `resetKey` derived from the active filters/search so the page jumps
 * back to 1 whenever the result set changes; the current page is always clamped
 * so it can never point past the end.
 */
export function usePagination<T>(items: T[], resetKey: unknown = null) {
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [resetKey, pageSize])

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * pageSize
  const paged = useMemo(
    () => items.slice(pageStart, pageStart + pageSize),
    [items, pageStart, pageSize],
  )

  return { paged, page, setPage, pageSize, setPageSize, totalPages, currentPage, pageStart }
}
