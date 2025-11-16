interface ApprovalFiltersProps {
  filters: any
  onFilterChange: (filters: any) => void
}

export function ApprovalFilters({ filters, onFilterChange }: ApprovalFiltersProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <i className="fas fa-filter text-blue-600"></i>
          フィルター
        </h3>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          <i className="fas fa-redo mr-1"></i>
          リセット
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* ステータスフィルター */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            承認ステータス
          </label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">すべて</option>
            <option value="pending">承認待ち</option>
            <option value="approved">承認済み</option>
            <option value="rejected">否認済み</option>
          </select>
        </div>

        {/* データ完全性フィルター */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            データ完全性
          </label>
          <select
            value={filters.dataCompleteness}
            onChange={(e) => onFilterChange({ ...filters, dataCompleteness: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">すべて</option>
            <option value="complete">完全 (100%)</option>
            <option value="incomplete">不完全 (&lt;100%)</option>
          </select>
        </div>

        {/* スコア範囲 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            最低スコア
          </label>
          <input
            type="number"
            value={filters.minScore}
            onChange={(e) => onFilterChange({ ...filters, minScore: e.target.value })}
            placeholder="0"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* 検索 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            商品検索
          </label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            placeholder="商品名、SKU..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>
    </div>
  )
}
