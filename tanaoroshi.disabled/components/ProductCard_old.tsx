import { InventoryProduct } from '@/types/inventory'
import { Button } from '@/components/ui/button'

interface ProductCardProps {
  product: InventoryProduct
  selected: boolean
  onToggleSelect: () => void
  onEdit: () => void
  onSendToEditing: () => void
}

export function ProductCard({
  product,
  selected,
  onToggleSelect,
  onEdit,
  onSendToEditing
}: ProductCardProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'stock': return 'bg-green-100 text-green-700'
      case 'dropship': return 'bg-purple-100 text-purple-700'
      case 'set': return 'bg-amber-100 text-amber-700'
      case 'hybrid': return 'bg-cyan-100 text-cyan-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'stock': return '有在庫'
      case 'dropship': return '無在庫'
      case 'set': return 'セット'
      case 'hybrid': return 'ハイブリッド'
      default: return type
    }
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-lg ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      {/* チェックボックス */}
      <div className="absolute top-3 left-3 z-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
        />
      </div>

      {/* 画像 */}
      <div className="relative h-48 bg-slate-100">
        {product.images && product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.product_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <i className="fas fa-image text-slate-300 text-4xl"></i>
          </div>
        )}

        {/* 商品タイプバッジ */}
        <div className="absolute top-3 right-3">
          <span className={`px-2 py-1 rounded text-xs font-semibold ${getTypeColor(product.product_type)}`}>
            {getTypeLabel(product.product_type)}
          </span>
        </div>

        {/* 在庫状態 */}
        <div className="absolute bottom-3 right-3">
          <span className={`px-2 py-1 rounded text-xs font-bold ${
            product.physical_quantity > 0
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}>
            在庫: {product.physical_quantity}個
          </span>
        </div>
      </div>

      {/* 商品情報 */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2 min-h-[3rem]">
          {product.product_name}
        </h3>

        {/* SKU */}
        {product.sku && (
          <div className="text-xs text-slate-500 font-mono mb-2">
            SKU: {product.sku}
          </div>
        )}

        {/* 価格情報 */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <p className="text-xs text-slate-500">原価</p>
            <p className="text-sm font-bold text-slate-900">${product.cost_price.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">販売価格</p>
            <p className="text-sm font-bold text-green-600">${product.selling_price.toFixed(2)}</p>
          </div>
        </div>

        {/* カテゴリと状態 */}
        <div className="flex gap-2 mb-3 text-xs">
          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded">
            {product.category}
          </span>
          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded">
            {product.condition_name === 'new' ? '新品' :
             product.condition_name === 'used' ? '中古' : '整備済'}
          </span>
        </div>

        {/* セット商品の場合、構成要素表示 */}
        {product.product_type === 'set' && product.set_components && product.set_components.length > 0 && (
          <div className="mb-3 p-2 bg-amber-50 rounded border border-amber-200">
            <p className="text-xs font-semibold text-amber-800 mb-1">
              <i className="fas fa-layer-group mr-1"></i>
              セット構成 ({product.set_components.length}個)
            </p>
            <div className="text-xs text-amber-700 space-y-1">
              {product.set_components.slice(0, 2).map((comp) => (
                <div key={comp.id} className="flex justify-between">
                  <span className="truncate">{comp.component?.product_name || 'Loading...'}</span>
                  <span className="ml-2">×{comp.quantity_required}</span>
                </div>
              ))}
              {product.set_components.length > 2 && (
                <p className="text-amber-600">他{product.set_components.length - 2}個...</p>
              )}
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="flex-1"
          >
            <i className="fas fa-edit mr-1"></i>
            編集
          </Button>
          <Button
            size="sm"
            onClick={onSendToEditing}
            disabled={product.physical_quantity === 0}
            className="flex-1"
          >
            <i className="fas fa-arrow-right mr-1"></i>
            出品へ
          </Button>
        </div>

        {/* 注記 */}
        {product.notes && (
          <div className="mt-2 text-xs text-slate-500 italic">
            <i className="fas fa-sticky-note mr-1"></i>
            {product.notes}
          </div>
        )}
      </div>
    </div>
  )
}
