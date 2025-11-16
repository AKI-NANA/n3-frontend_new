/**
 * 承認システム - ページネーション
 * NAGANO-3 v2.0
 */

'use client'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  total: number
  limit: number
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  total,
  limit,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const startItem = (currentPage - 1) * limit + 1
  const endItem = Math.min(currentPage * limit, total)

  // ページ番号ボタンを生成
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 7

    if (totalPages <= maxVisible) {
      // すべてのページを表示
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // 省略表示
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* 情報表示 */}
        <div className="text-sm text-gray-600">
          <span className="font-semibold">
            {startItem} - {endItem}
          </span>
          <span className="mx-1">件</span>
          <span className="text-gray-400">/ {total}件</span>
        </div>

        {/* ページネーションボタン */}
        <div className="flex items-center gap-2">
          {/* 前へボタン */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← 前へ
          </button>

          {/* ページ番号ボタン */}
          <div className="hidden md:flex items-center gap-2">
            {pageNumbers.map((page, index) => {
              if (page === '...') {
                return (
                  <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-400">
                    ...
                  </span>
                )
              }

              const pageNum = page as number
              const isActive = pageNum === currentPage

              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>

          {/* モバイル用ページ情報 */}
          <div className="md:hidden px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700">
            {currentPage} / {totalPages}
          </div>

          {/* 次へボタン */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            次へ →
          </button>
        </div>

        {/* ページジャンプ */}
        <div className="flex items-center gap-2">
          <label htmlFor="page-jump" className="text-sm text-gray-600">
            ページへ移動:
          </label>
          <input
            id="page-jump"
            type="number"
            min={1}
            max={totalPages}
            defaultValue={currentPage}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const value = parseInt(e.currentTarget.value)
                if (value >= 1 && value <= totalPages) {
                  onPageChange(value)
                }
              }
            }}
            className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  )
}
