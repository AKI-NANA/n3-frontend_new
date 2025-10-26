import { InventoryFilter, ProductType, ConditionType } from '@/types/inventory'

interface FilterPanelProps {
  filter: InventoryFilter
  onFilterChange: (filter: InventoryFilter) => void
  categories: string[]
}

export function FilterPanel({ filter, onFilterChange, categories }: FilterPanelProps) {
  const handleChange = (key: keyof InventoryFilter, value: any) => {
    onFilterChange({ ...filter, [key]: value })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 検索 */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <i className="fas fa-search mr-2"></i>
            商品名・SKU検索
          </label>
          <input
            type="text"
            value={filter.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            placeholder="商品名またはSKUを入力..."
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 商品タイプ */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <i className="fas fa-tag mr-2"></i>
            商品タイプ
          </label>
          <select
            value={filter.product_type || 'all'}
            onChange={(e) => handleChange('product_type', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">すべて</option>
            <option value="stock">有在庫</option>
            <option value="dropship">無在庫</option>
            <option value="set">セット商品</option>
            <option value="hybrid">ハイブリッド</option>
          </select>
        </div>

        {/* 在庫状態 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <i className="fas fa-box mr-2"></i>
            在庫状態
          </label>
          <select
            value={filter.stock_status || 'all'}
            onChange={(e) => handleChange('stock_status', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">すべて</option>
            <option value="in_stock">在庫あり</option>
            <option value="out_of_stock">欠品</option>
          </select>
        </div>

        {/* カテゴリ */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <i className="fas fa-folder mr-2"></i>
            カテゴリ
          </label>
          <select
            value={filter.category || ''}
            onChange={(e) => handleChange('category', e.target.value || undefined)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">すべて</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 商品状態フィルター（2行目） */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <i className="fas fa-certificate mr-2"></i>
            商品状態
          </label>
          <select
            value={filter.condition || 'all'}
            onChange={(e) => handleChange('condition', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">すべて</option>
            <option value="new">新品</option>
            <option value="used">中古</option>
            <option value="refurbished">整備済</option>
          </select>
        </div>

        {/* クリアボタン */}
        <div className="flex items-end">
          <button
            onClick={() => onFilterChange({
              product_type: 'all',
              stock_status: 'all',
              condition: 'all'
            })}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <i className="fas fa-redo mr-2"></i>
            フィルタークリア
          </button>
        </div>
      </div>
    </div>
  )
}
