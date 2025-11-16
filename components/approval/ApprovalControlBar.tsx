interface ApprovalControlBarProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onApprove: () => void
  onReject: () => void
  onExport: () => void
}

export function ApprovalControlBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onApprove,
  onReject,
  onExport,
}: ApprovalControlBarProps) {
  return (
    <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6 shadow-md backdrop-blur-sm bg-white/95 dark:bg-gray-800/95">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onSelectAll}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <i className={`fas ${selectedCount === totalCount ? 'fa-check-square' : 'fa-square'}`}></i>
            <span className="font-medium">全選択</span>
          </button>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-blue-600 dark:text-blue-400">{selectedCount}</span>
            <span> / {totalCount} 件選択中</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onApprove}
            disabled={selectedCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <i className="fas fa-check"></i>
            <span>一括承認</span>
          </button>
          
          <button
            onClick={onReject}
            disabled={selectedCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <i className="fas fa-times"></i>
            <span>一括否認</span>
          </button>
          
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            <i className="fas fa-download"></i>
            <span>CSV出力</span>
          </button>
        </div>
      </div>
    </div>
  )
}
