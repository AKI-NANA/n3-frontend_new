/**
 * 承認システム - 商品グリッド
 * NAGANO-3 v2.0
 */

'use client'

import { ApprovalProduct, CompletenessCheck } from '@/types/approval'
import { ProductCard } from './ProductCard'

interface ProductGridProps {
  products: ApprovalProduct[]
  selectedIds: Set<number>
  onToggleSelect: (id: number) => void
  onApprove: (id: number) => void
  onReject: (id: number) => void
  getCompleteness: (id: number) => CompletenessCheck | null
  loading: boolean
}

export function ProductGrid({
  products,
  selectedIds,
  onToggleSelect,
  onApprove,
  onReject,
  getCompleteness,
  loading,
}: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-100 rounded-xl h-96 animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-xl font-bold text-gray-700 mb-2">
          商品が見つかりませんでした
        </h3>
        <p className="text-gray-500">
          フィルター条件を変更してみてください
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          selected={selectedIds.has(product.id)}
          onToggleSelect={onToggleSelect}
          onApprove={onApprove}
          onReject={onReject}
          completeness={getCompleteness(product.id)}
        />
      ))}
    </div>
  )
}
