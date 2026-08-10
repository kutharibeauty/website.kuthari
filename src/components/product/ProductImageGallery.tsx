'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Package, ZoomIn } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  images: string[]
  productName: string
}

export default function ProductImageGallery({ images, productName }: Props) {
  const [selected, setSelected] = useState(0)
  const hasImages = images.length > 0

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative w-full aspect-square bg-gradient-to-br from-surface-container-low to-surface-container-highest rounded-2xl overflow-hidden shadow-[0_2px_14px_rgba(27, 44, 61,0.06)] border border-table-border/70 group cursor-zoom-in">
        {hasImages ? (
          <Image
            src={images[selected]}
            alt={productName}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-container">
            <Package size={64} className="text-outline" />
          </div>
        )}

        {/* Zoom hint */}
        <div className="absolute bottom-3 right-3 bg-surface/80 backdrop-blur-sm p-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn size={18} className="text-on-surface" />
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={cn(
                'relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors',
                i === selected
                  ? 'border-primary shadow-sm'
                  : 'border-outline-variant/50 hover:border-outline',
              )}
              aria-label={`Image ${i + 1}`}
            >
              <Image
                src={src}
                alt={`${productName} ${i + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
