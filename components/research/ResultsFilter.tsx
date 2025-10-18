"use client"

import { useState, useEffect } from 'react'
import { Filter, ChevronLeft, ChevronRight } from 'lucide-react'

interface ScoredProduct {
  totalScore: number
  profitCalculation?: {
    isBlackInk: boolean
    profitRate: number
  }
  riskLevel: 'low' | 'medium' | 'high'
  soldCount: number
}

interface ResultsFilterProps {
  results: ScoredProduct[]
  onFilterChange: (filtered: ScoredProduct[], page: number, totalPages: number) => void
}

export default function ResultsFilter({ results, onFilterChange }: ResultsFilterProps) {
  const [filters, setFilters] = useState({
    minScore: 0,
    maxScore: 100,
    minProfitRate: 0,
    riskLevels: ['low', 'medium', 'high'] as ('low' | 'medium' | 'high')[],
    profitableOnly: false
  })

  const [sortBy, setSortBy] = useState<'score' | 'profit' | 'sales'>('score')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  useEffect(() => {
    applyFiltersAndSort()
  }, [filters, sortBy, sortOrder, currentPage, itemsPerPage, results])

  const applyFiltersAndSort = () => {
    // フィルタリング
    let filtered = results.filter(r => {
      if ((r.totalScore || 0) < filters.minScore || (r.totalScore || 0) > filters.maxScore) return false
      if (filters.profitableOnly && !r.profitCalculation?.isBlackInk) return false
      if (!filters.riskLevels.includes(r.riskLevel)) return false
      if (r.profitCalculation && r.profitCalculation.profitRate < filters.minProfitRate) return false
      return true
    })

    // ソート
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'score':
          comparison = (a.totalScore || 0) - (b.totalScore || 0)
          break
        case 'profit':
          comparison = (a.profitCalculation?.profitRate || 0) - (b.profitCalculation?.profitRate || 0)
          break
        case 'sales':
          comparison = a.soldCount - b.soldCount
          break
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })

    const totalPages = Math.ceil(filtered.length / itemsPerPage)
    
    // ページネーション
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginated = filtered.slice(startIndex, startIndex + itemsPerPage)

    onFilterChange(paginated, currentPage, totalPages)
  }

  const totalPages = Math.ceil(results.length / itemsPerPage)
  const filteredCount = results.filter(r => {
    if ((r.totalScore || 0) < filters.minScore || (r.totalScore || 0) > filters.maxScore) return false
    if (filters.profitableOnly && !r.profitCalculation?.isBlackInk) return false
    if (!filters.riskLevels.includes(r.riskLevel)) return false
    if (r.profitCalculation && r.profitCalculation.profitRate < filters.minProfitRate) return false
    return true
  }).length

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Filter className="w-5 h-5 text-blue-600" />
        フィルター＆ソート
      </h3>

      {/* フィルター */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-semibold mb-2 text-slate-700">スコア範囲</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={filters.minScore}
              onChange={(e) => setFilters({ ...filters, minScore: Math.max(0, parseInt(e.target.value) || 0) })}
              className="w-20 px-2 py-1 border-2 border-slate-300 rounded focus:border-blue-500 focus:outline-none"
              min="0"
              max="100"
            />
            <span className="text-slate-600">〜</span>
            <input
              type="number"
              value={filters.maxScore}
              onChange={(e) => setFilters({ ...filters, maxScore: Math.min(100, parseInt(e.target.value) || 100) })}
              className="w-20 px-2 py-1 border-2 border-slate-300 rounded focus:border-blue-500 focus:outline-none"
              min="0"
              max="100"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-slate-700">最低利益率 (%)</label>
          <input
            type="number"
            value={filters.minProfitRate}
            onChange={(e) => setFilters({ ...filters, minProfitRate: Math.max(0, parseInt(e.target.value) || 0) })}
            className="w-full px-3 py-2 border-2 border-slate-300 rounded focus:border-blue-500 focus:outline-none"
            min="0"
            max="100"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-slate-700">リスクレベル</label>
          <div className="flex gap-3">
            {[
              { level: 'low' as const, label: '低', color: 'text-green-600' },
              { level: 'medium' as const, label: '中', color: 'text-yellow-600' },
              { level: 'high' as const, label: '高', color: 'text-red-600' }
            ].map(({ level, label, color }) => (
              <label key={level} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.riskLevels.includes(level)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFilters({ ...filters, riskLevels: [...filters.riskLevels, level] })
                    } else {
                      setFilters({ ...filters, riskLevels: filters.riskLevels.filter(l => l !== level) })
                    }
                  }}
                  className="w-4 h-4"
                />
                <span className={`text-sm font-medium ${color}`}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-slate-700">その他</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.profitableOnly}
              onChange={(e) => setFilters({ ...filters, profitableOnly: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm font-semibold text-green-600">黒字のみ表示</span>
          </label>
        </div>
      </div>

      {/* ソート＆表示設定 */}
      <div className="flex flex-wrap gap-4 mb-4">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
        >
          <option value="score">📊 スコア順</option>
          <option value="profit">💰 利益率順</option>
          <option value="sales">🛒 売上数順</option>
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as any)}
          className="px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
        >
          <option value="desc">⬇️ 降順</option>
          <option value="asc">⬆️ 昇順</option>
        </select>

        <select
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(parseInt(e.target.value))
            setCurrentPage(1)
          }}
          className="px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
        >
          <option value="10">10件表示</option>
          <option value="20">20件表示</option>
          <option value="50">50件表示</option>
          <option value="100">100件表示</option>
        </select>

        <button
          onClick={() => {
            setFilters({
              minScore: 0,
              maxScore: 100,
              minProfitRate: 0,
              riskLevels: ['low', 'medium', 'high'],
              profitableOnly: false
            })
            setCurrentPage(1)
          }}
          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
        >
          🔄 リセット
        </button>
      </div>

      {/* 表示件数とページネーション */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="text-sm text-slate-600">
          {results.length}件中 <span className="font-bold text-blue-600">{filteredCount}件</span>を表示中
          （{(currentPage - 1) * itemsPerPage + 1}〜{Math.min(currentPage * itemsPerPage, filteredCount)}件目）
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 border-2 border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            前へ
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = currentPage <= 3 ? i + 1 : currentPage + i - 2
            if (pageNum > totalPages) return null
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`px-4 py-2 border-2 rounded-lg font-medium transition-colors ${
                  currentPage === pageNum 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'border-slate-300 hover:bg-slate-50'
                }`}
              >
                {pageNum}
              </button>
            )
          })}

          {totalPages > 5 && currentPage < totalPages - 2 && (
            <span className="px-2 py-2 text-slate-500">...</span>
          )}

          {totalPages > 5 && currentPage < totalPages - 1 && (
            <button
              onClick={() => setCurrentPage(totalPages)}
              className="px-4 py-2 border-2 border-slate-300 rounded-lg hover:bg-slate-50"
            >
              {totalPages}
            </button>
          )}

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border-2 border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 flex items-center gap-1"
          >
            次へ
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
