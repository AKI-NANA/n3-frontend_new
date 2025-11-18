import { InventoryProduct } from '@/types/inventory'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, ExternalLink, Package } from 'lucide-react'

interface ProductCardProps {
  product: InventoryProduct
  onEdit: () => void
  onDelete: () => void
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const getMarketplaceBadge = () => {
    if (product.marketplace === 'ebay') {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          eBay {product.account?.toUpperCase()}
        </Badge>
      )
    }
    return null
  }

  const getStockBadge = () => {
    const qty = product.physical_quantity || 0
    if (qty === 0) {
      return <Badge variant="destructive">在庫なし</Badge>
    } else if (qty < 5) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
        少量 ({qty})
      </Badge>
    } else {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        在庫 {qty}
      </Badge>
    }
  }

  const imageUrl = Array.isArray(product.images) && product.images.length > 0
    ? product.images[0]
    : '/placeholder-product.jpg'

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border">
      {/* 画像 */}
      <div className="relative h-48 bg-slate-100 rounded-t-lg overflow-hidden">
        <img
          src={imageUrl}
          alt={product.product_name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = 'https://placehold.co/400x400/e2e8f0/64748b?text=No+Image'
          }}
        />
        <div className="absolute top-2 right-2 flex gap-1">
          {getMarketplaceBadge()}
        </div>
        <div className="absolute bottom-2 right-2">
          {getStockBadge()}
        </div>
      </div>

      {/* 商品情報 */}
      <div className="p-4 space-y-3">
        {/* タイトル */}
        <h3 className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">
          {product.product_name}
        </h3>

        {/* SKU */}
        {product.sku && (
          <div className="text-xs text-muted-foreground font-mono">
            SKU: {product.sku}
          </div>
        )}

        {/* 価格情報 */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-muted-foreground">販売価格</div>
            <div className="font-bold text-green-600">
              ${(product.selling_price || 0).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">出品数</div>
            <div className="font-semibold">
              {product.listing_quantity || 0}
            </div>
          </div>
        </div>

        {/* バッジ */}
        <div className="flex flex-wrap gap-1">
          {product.condition_name && (
            <Badge variant="secondary" className="text-xs">
              {product.condition_name}
            </Badge>
          )}
          {product.ebay_data?.listing_id && (
            <Badge variant="outline" className="text-xs">
              出品中
            </Badge>
          )}
        </div>

        {/* アクションボタン */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="flex-1"
          >
            <Edit className="w-3 h-3 mr-1" />
            詳細
          </Button>
          {product.ebay_data?.listing_id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                window.open(`https://www.ebay.com/itm/${product.ebay_data?.listing_id}`, '_blank')
              }}
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
