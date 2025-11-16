import { ApprovalProductCard } from './ApprovalProductCard'

interface Product {
  id: number
  sku: string
  title: string
  title_en: string
  images: string[]
  yahoo_price: number
  ebay_price: number
  profit_jpy: number
  profit_rate: number
  final_score: number
  category_name: string
  hts_code: string
  hts_duty_rate: number
  origin_country: string
  approval_status: string
  ai_confidence_score: number
  data_completeness: number
}

interface ApprovalGridProps {
  products: Product[]
  selectedIds: Set<number>
  onSelectProduct: (id: number) => void
}

export function ApprovalGrid({ products, selectedIds, onSelectProduct }: ApprovalGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ApprovalProductCard
          key={product.id}
          product={product}
          isSelected={selectedIds.has(product.id)}
          onSelect={() => onSelectProduct(product.id)}
        />
      ))}
    </div>
  )
}
