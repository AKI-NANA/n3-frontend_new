'use client'

import React, { useState, useEffect } from 'react'
import { Filter, ArrowUpDown, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface HTSCode {
  code: string
  description: string
  category: string
  base_duty: number
  section301: boolean
  section301_rate: number
  notes?: string
}

const ITEMS_PER_PAGE = 50

export default function DatabaseViewEnhanced() {
  const [htsCodes, setHtsCodes] = useState<HTSCode[]>([])
  const [filteredCodes, setFilteredCodes] = useState<HTSCode[]>([])
  const [loading, setLoading] = useState(true)
  
  // ページネーション
  const [currentPage, setCurrentPage] = useState(1)
  
  // フィルタ状態
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [tariffRangeFilter, setTariffRangeFilter] = useState('all')
  const [section301Filter, setSection301Filter] = useState('all')
  
  // ソート状態
  const [sortField, setSortField] = useState<'code' | 'total_tariff'>('code')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // データ取得
  useEffect(() => {
    fetchHTSCodes()
  }, [])

  // フィルタリング＆ソート
  useEffect(() => {
    let filtered = [...htsCodes]

    // 検索フィルタ
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // カテゴリフィルタ
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter)
    }

    // 関税率範囲フィルタ
    if (tariffRangeFilter !== 'all') {
      filtered = filtered.filter(item => {
        const total = item.base_duty + (item.section301 ? item.section301_rate : 0)
        const ratePercent = total * 100
        
        switch (tariffRangeFilter) {
          case 'zero': return ratePercent === 0
          case '0-5': return ratePercent > 0 && ratePercent <= 5
          case '5-10': return ratePercent > 5 && ratePercent <= 10
          case '10+': return ratePercent > 10
          default: return true
        }
      })
    }

    // Section 301フィルタ
    if (section301Filter !== 'all') {
      filtered = filtered.filter(item =>
        section301Filter === 'yes' ? item.section301 : !item.section301
      )
    }

    // ソート
    filtered.sort((a, b) => {
      let comparison = 0
      if (sortField === 'code') {
        comparison = a.code.localeCompare(b.code)
      } else {
        const aTotal = a.base_duty + (a.section301 ? a.section301_rate : 0)
        const bTotal = b.base_duty + (b.section301 ? b.section301_rate : 0)
        comparison = aTotal - bTotal
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    setFilteredCodes(filtered)
    setCurrentPage(1) // フィルタ変更時は1ページ目に戻る
  }, [htsCodes, searchTerm, categoryFilter, tariffRangeFilter, section301Filter, sortField, sortDirection])

  const fetchHTSCodes = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('hs_codes')
        .select('*')
        .order('code')

      if (error) throw error
      
      setHtsCodes(data || [])
      setFilteredCodes(data || [])
    } catch (error) {
      console.error('HTSコード取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSort = (field: 'code' | 'total_tariff') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const exportToCSV = () => {
    const csv = [
      ['HTSコード', '説明', 'カテゴリ', '基本関税率(%)', 'Section301', '301税率(%)', '合計関税率(%)'],
      ...filteredCodes.map(item => {
        const total = item.base_duty + (item.section301 ? item.section301_rate : 0)
        return [
          item.code,
          item.description,
          item.category || '',
          (item.base_duty * 100).toFixed(2),
          item.section301 ? 'Yes' : 'No',
          (item.section301_rate * 100).toFixed(2),
          (total * 100).toFixed(2)
        ]
      })
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `hts_codes_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const uniqueCategories = Array.from(new Set(htsCodes.map(item => item.category).filter(Boolean)))
  
  // ページネーション計算
  const totalPages = Math.ceil(filteredCodes.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentPageData = filteredCodes.slice(startIndex, endIndex)

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">HTSコードデータベース</h2>
          <p className="text-sm text-gray-600 mt-1">
            {filteredCodes.length.toLocaleString()}件 / {htsCodes.length.toLocaleString()}件
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Download className="w-4 h-4" />
          CSV出力
        </button>
      </div>

      {/* フィルタバー */}
      <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
        {/* 検索 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="HTSコードまたは説明で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* フィルタ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">カテゴリ</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべて</option>
              {uniqueCategories.sort().map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">関税率範囲</label>
            <select
              value={tariffRangeFilter}
              onChange={(e) => setTariffRangeFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべて</option>
              <option value="zero">0% (完全無税) 🎉</option>
              <option value="0-5">0% - 5% (低関税)</option>
              <option value="5-10">5% - 10%</option>
              <option value="10+">10%以上</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Section 301</label>
            <select
              value={section301Filter}
              onChange={(e) => setSection301Filter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべて</option>
              <option value="yes">適用あり ⚠️</option>
              <option value="no">適用なし</option>
            </select>
          </div>
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => toggleSort('code')}
                    className="flex items-center gap-2 font-medium text-gray-700 hover:text-gray-900"
                  >
                    HTSコード
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">説明</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">カテゴリ</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 bg-yellow-50">
                  基本関税率 (%)
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 bg-red-50">
                  301適用
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 bg-red-50">
                  301税率 (%)
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggleSort('total_tariff')}
                    className="flex items-center gap-2 font-medium text-gray-700 hover:text-gray-900 ml-auto bg-green-50 px-2 py-1 rounded"
                  >
                    合計関税率 (%)
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    読み込み中...
                  </td>
                </tr>
              ) : filteredCodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    該当するデータがありません
                  </td>
                </tr>
              ) : (
                currentPageData.map((item, index) => {
                  const totalTariff = item.base_duty + (item.section301 ? item.section301_rate : 0)
                  const totalPercent = totalTariff * 100
                  
                  return (
                    <tr key={item.code} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-sm font-medium">{item.code}</td>
                      <td className="px-4 py-3 text-sm max-w-md">
                        <div className="line-clamp-2" title={item.description}>
                          {item.description}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                          {item.category || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold bg-yellow-50">
                        {(item.base_duty * 100).toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-center bg-red-50">
                        {item.section301 ? (
                          <span className="text-red-600 font-bold text-lg">●</span>
                        ) : (
                          <span className="text-gray-300 text-lg">○</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold bg-red-50">
                        {item.section301 ? (item.section301_rate * 100).toFixed(2) + '%' : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold px-3 py-1 rounded text-sm ${
                          totalPercent === 0
                            ? 'bg-green-100 text-green-800'
                            : totalPercent <= 5
                            ? 'bg-blue-100 text-blue-800'
                            : totalPercent <= 10
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {totalPercent.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <div className="text-sm text-gray-600">
              {startIndex + 1} - {Math.min(endIndex, filteredCodes.length)} / {filteredCodes.length}件
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 凡例 */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <span>📌</span>
          <span>色分けの説明</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="bg-yellow-100 px-3 py-1 rounded font-semibold">黄色</span>
            <span>基本関税率（MFN税率）</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-red-100 px-3 py-1 rounded font-semibold">赤色</span>
            <span>Section 301追加関税（対中国）</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-green-100 px-3 py-1 rounded font-semibold">緑色</span>
            <span>合計関税率（0% = 完全無税）</span>
          </div>
        </div>
      </div>

      {/* Section 301説明カード */}
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
        <h3 className="font-bold text-red-900 mb-2 flex items-center gap-2">
          <span>⚠️</span>
          <span>Section 301追加関税とは？</span>
        </h3>
        <p className="text-sm text-red-800 leading-relaxed">
          米国の通商法301条に基づき、中国からの特定商品に追加で課される関税です。
          <strong className="mx-1">合計関税率 = 基本関税率 + Section 301追加関税</strong>
          となります。輸入時の実際の関税額は、この合計関税率を商品価格に掛けた金額になります。
        </p>
      </div>
    </div>
  )
}
