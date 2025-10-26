import { InventoryStats } from '@/types/inventory'

interface StatsHeaderProps {
  stats: InventoryStats
  selectedCount: number
}

export function StatsHeader({ stats, selectedCount }: StatsHeaderProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 総商品数 */}
      <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 mb-1">総商品数</p>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-boxes text-blue-600 text-xl"></i>
          </div>
        </div>
        <div className="mt-3 flex gap-3 text-xs">
          <span className="text-green-600">
            <i className="fas fa-check-circle mr-1"></i>
            在庫あり: {stats.in_stock}
          </span>
          <span className="text-red-600">
            <i className="fas fa-times-circle mr-1"></i>
            欠品: {stats.out_of_stock}
          </span>
        </div>
      </div>

      {/* 商品タイプ別 */}
      <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 mb-1">商品タイプ</p>
            <div className="flex gap-2 mt-2">
              <div className="text-center">
                <p className="text-xl font-bold text-green-700">{stats.stock_count}</p>
                <p className="text-xs text-slate-500">有在庫</p>
              </div>
              <div className="border-l border-slate-200 mx-2"></div>
              <div className="text-center">
                <p className="text-xl font-bold text-purple-700">{stats.dropship_count}</p>
                <p className="text-xs text-slate-500">無在庫</p>
              </div>
              <div className="border-l border-slate-200 mx-2"></div>
              <div className="text-center">
                <p className="text-xl font-bold text-amber-700">{stats.set_count}</p>
                <p className="text-xs text-slate-500">セット</p>
              </div>
            </div>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-layer-group text-green-600 text-xl"></i>
          </div>
        </div>
      </div>

      {/* 在庫総額 */}
      <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-amber-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 mb-1">在庫総額</p>
            <p className="text-3xl font-bold text-slate-900">
              ${stats.total_value.toFixed(0)}
            </p>
          </div>
          <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-dollar-sign text-amber-600 text-xl"></i>
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          <i className="fas fa-info-circle mr-1"></i>
          原価ベースの評価額
        </div>
      </div>

      {/* 選択中 */}
      <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 mb-1">選択中</p>
            <p className="text-3xl font-bold text-slate-900">{selectedCount}</p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-check-square text-purple-600 text-xl"></i>
          </div>
        </div>
        {selectedCount >= 2 && (
          <div className="mt-3 text-xs text-purple-600 font-semibold">
            <i className="fas fa-layer-group mr-1"></i>
            セット商品作成が可能
          </div>
        )}
      </div>
    </div>
  )
}
