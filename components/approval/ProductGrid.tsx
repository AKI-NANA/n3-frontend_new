// components/approval/ProductGrid.tsx
'use client'

import { ProductCard } from './ProductCard'
import type { Product } from '@/types/approval'

interface ProductGridProps {
  products: Product[]
  selectedIds: Set<number>
  onToggleSelect: (id: number) => void
}

export function ProductGrid({ products, selectedIds, onToggleSelect }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-6xl mb-4">📦</div>
        <h3 className="text-lg font-semibold mb-2">商品が見つかりません</h3>
        <p className="text-sm text-muted-foreground">
          フィルター条件を変更してください
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          selected={selectedIds.has(product.id)}
          onSelect={onToggleSelect}
        />
      ))}
    </div>
  )
}
