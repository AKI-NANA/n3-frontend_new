'use client'

import React, { useState, useEffect } from 'react'
import { Database, RefreshCw, Search, Filter, ArrowUpDown, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface HTSCode {
  hts_code: string
  description: string
  category: string
  base_duty: number
  section301: boolean
  section301_rate: number
  total_tariff_rate: number
}

export function DatabaseViewTab() {
  const [activeDataset, setActiveDataset] = useState<'hts' | 'ebay_fees' | 'origins' | 'exchange'>('hts')
  const [data, setData] = useState<any[]>([])
  const [filteredData, setFilteredData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dbStatus, setDbStatus] = useState<any>({
    success: true,
    table_counts: {
      hts_codes: 0,
      ebay_fees: 0,
      origin_countries: 0,
      exchange_rates: 0
    }
  })

  // HTSコード用の追加フィルタ
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [tariffRangeFilter, setTariffRangeFilter] = useState('all')
  const [section301Filter, setSection301Filter] = useState('all')
  const [sortField, setSortField] = useState<'hts_code' | 'total_tariff_rate'>('hts_code')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    loadDatabaseStatus()
    loadData()
  }, [activeDataset])

  useEffect(() => {
    applyFilters()
  }, [data, searchTerm, categoryFilter, tariffRangeFilter, section301Filter, sortField, sortDirection])

  const loadDatabaseStatus = async () => {
    try {
      // Supabaseから直接件数取得
      const [htsCount, feesCount, countriesCount, ratesCount] = await Promise.all([
        supabase.from('hs_codes').select('*', { count: 'exact', head: true }),
        supabase.from('ebay_pricing_category_fees').select('*', { count: 'exact', head: true }),
        supabase.from('hts_countries').select('*', { count: 'exact', head: true }),
        supabase.from('exchange_rates').select('*', { count: 'exact', head: true })
      ])

      setDbStatus({
        success: true,
        table_counts: {
          hts_codes: htsCount.count || 0,
          ebay_fees: feesCount.count || 0,
          origin_countries: countriesCount.count || 0,
          exchange_rates: ratesCount.count || 0
        }
      })
    } catch (error) {
      console.error('DB状態取得エラー:', error)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      let result: any
      switch (activeDataset) {
        case 'hts':
          result = await supabase
            .from('hs_codes')
            .select('*')
            .limit(100)
            .order('code')
          if (result.data) {
            // データ形式を変換
            setData(result.data.map((item: any) => ({
              hts_code: item.code,
              description: item.description,
              category: item.category,
              base_duty: item.base_duty,
              section301: item.section301,
              section301_rate: item.section301_rate || 0,
              total_tariff_rate: item.base_duty + (item.section301 ? (item.section301_rate || 0) : 0)
            })))
          }
          break
        case 'ebay_fees':
          result = await supabase
            .from('ebay_pricing_category_fees')
            .select('*')
            .eq('active', true)
            .limit(100)
          if (result.data) setData(result.data)
          break
        case 'origins':
          result = await supabase
            .from('hts_countries')
            .select('*')
            .order('country_code')
          if (result.data) setData(result.data)
          break
        case 'exchange':
          result = await supabase
            .from('exchange_rates')
            .select('*')
            .order('rate_date', { ascending: false })
            .limit(10)
          if (result.data) setData(result.data)
          break
      }
    } catch (error) {
      console.error('データ取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...data]

    // 検索フィルタ
    if (searchTerm) {
      filtered = filtered.filter(item =>
        JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // HTSコード専用フィルタ
    if (activeDataset === 'hts') {
      // カテゴリフィルタ
      if (categoryFilter !== 'all') {
        filtered = filtered.filter(item => item.category === categoryFilter)
      }

      // 関税率範囲フィルタ
      if (tariffRangeFilter !== 'all') {
        filtered = filtered.filter(item => {
          const rate = item.total_tariff_rate || 0
          switch (tariffRangeFilter) {
            case 'zero': return rate === 0
            case '0-5': return rate > 0 && rate <= 0.05
            case '5-10': return rate > 0.05 && rate <= 0.10
            case '10+': return rate > 0.10
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
        if (sortField === 'hts_code') {
          comparison = (a.hts_code || '').localeCompare(b.hts_code || '')
        } else {
          comparison = (a.total_tariff_rate || 0) - (b.total_tariff_rate || 0)
        }
        return sortDirection === 'asc' ? comparison : -comparison
      })
    }

    setFilteredData(filtered)
  }

  const toggleSort = (field: 'hts_code' | 'total_tariff_rate') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const exportToCSV = () => {
    if (activeDataset === 'hts') {
      const csv = [
        ['HTSコード', '説明', 'カテゴリ', '基本関税率(%)', 'Section301', '301税率(%)', '合計関税率(%)'],
        ...filteredData.map(item => [
          item.hts_code || '',
          item.description || '',
          item.category || '',
          ((item.base_duty || 0) * 100).toFixed(2),
          item.section301 ? 'Yes' : 'No',
          ((item.section301_rate || 0) * 100).toFixed(2),
          ((item.total_tariff_rate || 0) * 100).toFixed(2)
        ])
      ].map(row => row.join(',')).join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `hts_codes_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
    } else {
      // 他のデータセット用の汎用CSV出力
      const headers = Object.keys(filteredData[0] || {})
      const csv = [
        headers,
        ...filteredData.map(item => headers.map(h => item[h]))
      ].map(row => row.join(',')).join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${activeDataset}_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
    }
  }

  const uniqueCategories = activeDataset === 'hts' 
    ? Array.from(new Set(data.map(item => item.category).filter(Boolean)))
    : []

  return (
    <div className="space-y-6">
      {/* データベース状態カード */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">データベース状態</h3>
            {dbStatus?.success && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-white/20 rounded-lg p-3">
                  <div className="text-sm opacity-90">HTSコード</div>
                  <div className="text-2xl font-bold">{dbStatus.table_counts?.hts_codes || 0}</div>
                </div>
                <div className="bg-white/20 rounded-lg p-3">
                  <div className="text-sm opacity-90">eBay手数料</div>
                  <div className="text-2xl font-bold">{dbStatus.table_counts?.ebay_fees || 0}</div>
                </div>
                <div className="bg-white/20 rounded-lg p-3">
                  <div className="text-sm opacity-90">原産国</div>
                  <div className="text-2xl font-bold">{dbStatus.table_counts?.origin_countries || 0}</div>
                </div>
                <div className="bg-white/20 rounded-lg p-3">
                  <div className="text-sm opacity-90">為替レート</div>
                  <div className="text-2xl font-bold">{dbStatus.table_counts?.exchange_rates || 0}</div>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={loadDatabaseStatus}
            className="bg-white text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>更新</span>
          </button>
        </div>
      </div>

      {/* 説明カード */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-bold text-blue-900 mb-2">📚 データベース項目の説明</h4>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div>
            <strong className="text-blue-800">HTSコード:</strong> 
            <span className="text-gray-700"> 米国関税品目分類コード。商品カテゴリごとに関税率が決定されます。</span>
          </div>
          <div>
            <strong className="text-blue-800">eBay手数料:</strong> 
            <span className="text-gray-700"> カテゴリ別の販売手数料率。通常12.9%〜15%程度です。</span>
          </div>
          <div>
            <strong className="text-blue-800">原産国:</strong> 
            <span className="text-gray-700"> 商品の製造国。関税率の判定に使用されます。</span>
          </div>
          <div>
            <strong className="text-blue-800">為替レート:</strong> 
            <span className="text-gray-700"> JPY→USD変換レート。価格計算に使用されます。</span>
          </div>
        </div>
      </div>

      {/* データセット選択タブ */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveDataset('hts')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeDataset === 'hts'
              ? 'bg-indigo-100 text-indigo-700 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          📋 HTSコード ({filteredData.length > 0 && activeDataset === 'hts' ? filteredData.length : dbStatus?.table_counts?.hts_codes || 0})
        </button>
        <button
          onClick={() => setActiveDataset('ebay_fees')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeDataset === 'ebay_fees'
              ? 'bg-indigo-100 text-indigo-700 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          💳 eBay手数料 ({filteredData.length > 0 && activeDataset === 'ebay_fees' ? filteredData.length : dbStatus?.table_counts?.ebay_fees || 0})
        </button>
        <button
          onClick={() => setActiveDataset('origins')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeDataset === 'origins'
              ? 'bg-indigo-100 text-indigo-700 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          🌍 原産国 ({filteredData.length > 0 && activeDataset === 'origins' ? filteredData.length : dbStatus?.table_counts?.origin_countries || 0})
        </button>
        <button
          onClick={() => setActiveDataset('exchange')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeDataset === 'exchange'
              ? 'bg-indigo-100 text-indigo-700 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          💱 為替レート ({filteredData.length > 0 && activeDataset === 'exchange' ? filteredData.length : dbStatus?.table_counts?.exchange_rates || 0})
        </button>
      </div>

      {/* HTSコード用の詳細フィルタ */}
      {activeDataset === 'hts' && (
        <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800">高度なフィルタ</h3>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              CSV出力
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">カテゴリ</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="all">すべて</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">関税率範囲</label>
              <select
                value={tariffRangeFilter}
                onChange={(e) => setTariffRangeFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="all">すべて</option>
                <option value="zero">0% (関税なし)</option>
                <option value="0-5">0% - 5%</option>
                <option value="5-10">5% - 10%</option>
                <option value="10+">10%以上</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Section 301</label>
              <select
                value={section301Filter}
                onChange={(e) => setSection301Filter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="all">すべて</option>
                <option value="yes">適用あり</option>
                <option value="no">適用なし</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 検索バー */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>更新</span>
        </button>
      </div>

      {/* データテーブル */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-gray-600">データを読み込み中...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center">
            <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">データがありません</p>
          </div>
        ) : activeDataset === 'hts' ? (
          // HTSコード専用の詳細テーブル
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => toggleSort('hts_code')}
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
                      onClick={() => toggleSort('total_tariff_rate')}
                      className="flex items-center gap-2 font-medium text-gray-700 hover:text-gray-900 ml-auto bg-green-50 px-2 py-1 rounded"
                    >
                      合計関税率 (%)
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm">{item.hts_code || '-'}</td>
                    <td className="px-4 py-3 text-sm max-w-md truncate">{item.description || '-'}</td>
                    <td className="px-4 py-3 text-sm">{item.category || '-'}</td>
                    <td className="px-4 py-3 text-right font-bold bg-yellow-50">
                      {((item.base_duty || 0) * 100).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-center bg-red-50">
                      {item.section301 ? (
                        <span className="text-red-600 font-bold">●</span>
                      ) : (
                        <span className="text-gray-300">○</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold bg-red-50">
                      {item.section301 ? ((item.section301_rate || 0) * 100).toFixed(2) + '%' : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold px-2 py-1 rounded ${
                        (item.total_tariff_rate || 0) === 0
                          ? 'bg-green-100 text-green-800'
                          : (item.total_tariff_rate || 0) <= 0.05
                          ? 'bg-blue-100 text-blue-800'
                          : (item.total_tariff_rate || 0) <= 0.10
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {((item.total_tariff_rate || 0) * 100).toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // 他のデータセット用の汎用テーブル
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(filteredData[0] || {}).map(key => (
                    <th
                      key={key}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    {Object.values(row).map((value: any, vidx) => (
                      <td key={vidx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* HTSコード用の凡例・説明 */}
      {activeDataset === 'hts' && filteredData.length > 0 && (
        <>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-bold mb-2">📌 色分けの説明</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="bg-yellow-100 px-2 py-1 rounded">黄色</span>
                <span>基本関税率（MFN税率）</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-red-100 px-2 py-1 rounded">赤色</span>
                <span>Section 301追加関税（対中国）</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-green-100 px-2 py-1 rounded">緑色</span>
                <span>合計関税率（最終計算値）</span>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <h3 className="font-bold text-red-900 mb-2">⚠️ Section 301追加関税とは？</h3>
            <p className="text-sm text-red-800">
              米国の通商法301条に基づき、中国からの特定商品に追加で課される関税です。
              <strong className="ml-1">合計関税率 = 基本関税率 + Section 301追加関税</strong>となります。
              輸入時の実際の関税額は、この合計関税率を商品価格に掛けた金額になります。
            </p>
          </div>
        </>
      )}
    </div>
  )
}
