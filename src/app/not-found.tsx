import EmptyState from '@/components/ui/EmptyState'

export default function NotFound() {
  return (
    <EmptyState
      art="mirror"
      title="Not on this shelf"
      accent="(page not found)"
      text="The page may have moved, or the product is no longer listed."
      action={{ href: '/', label: 'Back to the store' }}
      secondary={{ href: '/search', label: 'Search products' }}
    />
  )
}
