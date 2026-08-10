import { Package } from 'lucide-react'
import ProductCard from './ProductCard'
import type { Product } from '@/types/database.types'

interface Props {
  products: Product[]
  emptyMessage?: string
}

export default function ProductGrid({ products, emptyMessage = 'No products found.' }: Props) {
  if (!products.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center">
          <Package size={36} className="text-outline" />
        </div>
        <p className="text-on-surface-variant text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} className="w-full" />
      ))}
    </div>
  )
}
