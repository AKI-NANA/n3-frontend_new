/**
 * 商品カードコンポーネント
 */

'use client'

import Image from 'next/image'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Product } from '@/types/approval'
import {
  getAIScoreBadgeVariant,
  getStatusBadgeVariant,
  getStatusLabel,
  formatPrice,
  formatDate,
  getImageUrl,
  truncateTitle
} from '@/lib/approval/utils'

interface ProductCardProps {
  product: Product
  selected: boolean
  onSelect: (id: number) => void
}

export function ProductCard({ product, selected, onSelect }: ProductCardProps) {
  const aiVariant = getAIScoreBadgeVariant(product.ai_confidence_score)
  const statusVariant = getStatusBadgeVariant(product.approval_status)

  return (
    <Card
      className={`transition-all hover:shadow-lg cursor-pointer ${
        selected ? 'ring-2 ring-primary bg-primary/5' : ''
      }`}
      onClick={() => onSelect(product.id)}
    >
      <CardContent className="p-3">
        {/* ヘッダー: チェックボックス + バッジ */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onSelect(product.id)}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex gap-1">
            <Badge variant={aiVariant} className="text-xs">
              AI {product.ai_confidence_score}%
            </Badge>
            <Badge variant={statusVariant} className="text-xs">
              {getStatusLabel(product.approval_status)}
            </Badge>
          </div>
        </div>

        {/* 商品画像 */}
        <div className="relative aspect-square mb-2 bg-muted rounded-md overflow-hidden">
          <Image
            src={getImageUrl(product.image_url)}
            alt={product.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>

        {/* 商品情報 */}
        <h3
          className="text-sm font-semibold line-clamp-2 min-h-[2.5rem] mb-2"
          title={product.title}
        >
          {truncateTitle(product.title, 80)}
        </h3>

        {/* 価格とカテゴリー */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-lg font-bold text-primary">
            {formatPrice(product.current_price)}
          </span>
          {product.category && (
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
              {product.category}
            </span>
          )}
        </div>

        {/* 入札数と終了日時 */}
        <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
          <span>入札: {product.bid_count}件</span>
          <span>{formatDate(product.end_date)}</span>
        </div>

        {/* AI推奨理由 */}
        {product.ai_recommendation && (
          <div className="mt-2 p-2 bg-muted rounded text-xs">
            <p className="text-muted-foreground line-clamp-2">
              💡 {product.ai_recommendation}
            </p>
          </div>
        )}

        {/* 承認/否認情報 */}
        {product.approved_at && (
          <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>
                {product.approval_status === 'approved' ? '承認' : '否認'}:
              </span>
              <span>{product.approved_by}</span>
            </div>
            <div className="text-right">{formatDate(product.approved_at)}</div>
            {product.rejection_reason && (
              <div className="mt-1 text-destructive">
                理由: {product.rejection_reason}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
