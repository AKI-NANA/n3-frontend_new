/**
 * 全パターン計算結果の一覧表示（テーブル形式）
 * 
 * Excelライクな表示で見やすく
 */

'use client'

import { useState } from 'react'
import { Calculator, AlertTriangle, CheckCircle, Download, Play, ChevronDown, ChevronUp } from 'lucide-react'
import { getShippingFromDB, getAllWeightRanges } from '@/lib/ebay-pricing/shipping-from-db'
import { calculateSimpleUsaPrice } from '@/lib/ebay-pricing/simple-usa-calculator'
import { STORE_FEES } from '@/lib/ebay-pricing/usa-price-calculator-v3'

interface PatternTestResult {
  id: number
  costJPY: number
  weight_kg: number
  targetMargin: number
  originCountry: string
  hsCode: string
  // 計算結果
  success: boolean
  error?: string
  productPrice?: number
  shipping?: number
  totalRevenue?: number
  profitMargin?: number
  profitUSD?: number
  productPriceRatio?: number
  // 警告
  warnings: string[]
  isProfit: boolean
}

export function BulkPatternCalculator() {
  const [results, setResults] = useState<PatternTestResult[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [sortColumn, setSortColumn] = useState<string>('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'warning'>('all')

  const runBulkCalculation = async () => {
    setLoading(true)
    setResults([])
    setProgress(0)

    console.log('📊 DBから重量帯を取得中...')
    let availableWeights = await getAllWeightRanges()
    
    if (availableWeights.length === 0) {
      console.warn('⚠️ DBにデータがありません。デフォルト重量を使用します。')
      availableWeights = [0.5, 1.0, 2.0, 3.0, 4.0, 5.0]
      console.log('🔧 フォールバック重量を使用:', availableWeights)
    }
    
    console.log(`✅ 利用可能な重量帯: ${availableWeights.length}件`, availableWeights.slice(0, 5))
    
    let testWeights = availableWeights.slice(0, 3)
    testWeights = testWeights.filter(w => w > 0)
    
    if (testWeights.length === 0) {
      testWeights = [0.5, 1.0, 2.0]
      console.log('🔧 デフォルト重量を使用:', testWeights)
    }

    const costs = [5000, 10000, 15000]
    const margins = [10, 15, 20]
    const countries = ['JP', 'CN', 'US']

    const patterns = []
    let id = 1
    for (const cost of costs) {
      for (const weight of testWeights) {
        for (const margin of margins) {
          for (const country of countries) {
            patterns.push({
              id: id++,
              costJPY: cost,
              weight_kg: weight,
              targetMargin: margin,
              hsCode: '9620.00.20.00',
              originCountry: country,
              storeType: 'none' as keyof typeof STORE_FEES,
              fvfRate: 0.1315,
              exchangeRate: 154.32
            })
          }
        }
      }
    }

    console.log(`📊 ${patterns.length}パターンの計算を開始`)

    const calculatedResults: PatternTestResult[] = []

    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i]
      
      try {
        const result = await calculateSimpleUsaPrice({
          costJPY: pattern.costJPY,
          weight_kg: pattern.weight_kg,
          targetMargin: pattern.targetMargin,
          hsCode: pattern.hsCode,
          originCountry: pattern.originCountry,
          fvfRate: pattern.fvfRate,
          exchangeRate: pattern.exchangeRate
        })
        
        const warnings: string[] = []
        let success = result.success
        let productPrice, shipping, totalRevenue, profitMargin, profitUSD, productPriceRatio

        if (result.success) {
          productPrice = result.productPrice
          shipping = result.shipping
          totalRevenue = result.totalRevenue
          profitMargin = result.profitMargin
          profitUSD = result.profitUSD
          productPriceRatio = productPrice / totalRevenue

          if (profitMargin < 0) {
            warnings.push('赤字')
          }
          if (profitMargin < pattern.targetMargin - 3) {
            warnings.push(`目標未達(${profitMargin.toFixed(1)}% < ${pattern.targetMargin}%)`)
          }
          if (productPriceRatio < 0.3) {
            warnings.push(`商品価格比率低(${(productPriceRatio * 100).toFixed(0)}%)`)
          }
          if (productPriceRatio > 0.9) {
            warnings.push(`送料が低すぎる(${(productPriceRatio * 100).toFixed(0)}%)`)
          }
          if (result.breakdown.ddpCosts > productPrice * 0.5) {
            warnings.push(`DDP費用高($${result.breakdown.ddpCosts.toFixed(0)})`)
          }
          if (pattern.originCountry === 'CN' && result.breakdown.tariffRate < 0.5) {
            warnings.push(`CN関税要確認(${(result.breakdown.tariffRate * 100).toFixed(0)}%)`)
          }
          if (productPrice < 10) {
            warnings.push(`商品価格低($${productPrice.toFixed(0)})`)
          }
          // USA出品不可の警告
          if (result.isViable === false) {
            warnings.push(`⚠️ USA出品不可`)
            if (result.minAchievableMargin !== undefined) {
              warnings.push(`最大利益率${result.minAchievableMargin.toFixed(1)}%`)
            }
          }
        } else {
          warnings.push(result.error || '計算エラー')
        }

        calculatedResults.push({
          id: pattern.id,
          costJPY: pattern.costJPY,
          weight_kg: pattern.weight_kg,
          targetMargin: pattern.targetMargin,
          originCountry: pattern.originCountry,
          hsCode: pattern.hsCode,
          success,
          error: result.error,
          productPrice,
          shipping,
          totalRevenue,
          profitMargin,
          profitUSD,
          productPriceRatio,
          warnings,
          isProfit: success && profitMargin! > 0
        })

        console.log(`✅ ${i + 1}/${patterns.length} 完了`)
      } catch (error) {
        console.error(`❌ パターン${pattern.id}でエラー:`, error)
        calculatedResults.push({
          id: pattern.id,
          costJPY: pattern.costJPY,
          weight_kg: pattern.weight_kg,
          targetMargin: pattern.targetMargin,
          originCountry: pattern.originCountry,
          hsCode: pattern.hsCode,
          success: false,
          error: error instanceof Error ? error.message : '不明なエラー',
          warnings: ['計算失敗'],
          isProfit: false
        })
      }
      
      setProgress(Math.round(((i + 1) / patterns.length) * 100))
    }

    setResults(calculatedResults)
    setLoading(false)
    console.log('🎉 全計算完了')
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const sortedResults = [...results].sort((a, b) => {
    let aVal: any = a[sortColumn as keyof PatternTestResult]
    let bVal: any = b[sortColumn as keyof PatternTestResult]
    
    if (aVal === undefined) aVal = 0
    if (bVal === undefined) bVal = 0
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  })

  const filteredResults = sortedResults.filter(r => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'success') return r.isProfit && r.warnings.length === 0
    if (filterStatus === 'warning') return !r.isProfit || r.warnings.length > 0
    return true
  })

  const exportToCSV = () => {
    const csv = [
      ['ID', '仕入値(円)', '重量(kg)', '目標利益率(%)', '原産国', '商品価格($)', '送料($)', '価格比率(%)', '総売上($)', '利益($)', '利益率(%)', '警告'].join(',')
    ]

    results.forEach(r => {
      csv.push([
        r.id,
        r.costJPY,
        r.weight_kg,
        r.targetMargin,
        r.originCountry,
        r.productPrice?.toFixed(2) || 'N/A',
        r.shipping?.toFixed(2) || 'N/A',
        r.productPriceRatio ? (r.productPriceRatio * 100).toFixed(0) : 'N/A',
        r.totalRevenue?.toFixed(2) || 'N/A',
        r.profitUSD?.toFixed(2) || 'N/A',
        r.profitMargin?.toFixed(2) || 'N/A',
        r.warnings.join(' | ')
      ].join(','))
    })

    const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bulk-calculation-${Date.now()}.csv`
    a.click()
  }

  const problemCount = results.filter(r => !r.isProfit || r.warnings.length > 0).length
  const successCount = results.filter(r => r.isProfit && r.warnings.length === 0).length

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">全パターン一括計算（テーブル表示）</h2>
            <p className="text-gray-600 text-sm mt-1">
              81パターン（3仕入値 × 3重量 × 3利益率 × 3原産国）
            </p>
          </div>
          
          {results.length > 0 && (
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              CSV出力
            </button>
          )}
        </div>

        <button
          onClick={runBulkCalculation}
          disabled={loading}
          className="w-full bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              計算中... {progress}%
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              一括計算を実行
            </>
          )}
        </button>
      </div>

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow p-6">
              <div className="text-sm text-gray-600">総計算数</div>
              <div className="text-3xl font-bold text-gray-900">{results.length}</div>
            </div>
            
            <div className="bg-green-50 rounded-xl shadow p-6 border-2 border-green-200">
              <div className="text-sm text-green-700">✅ 問題なし</div>
              <div className="text-3xl font-bold text-green-600">{successCount}</div>
              <div className="text-xs text-green-600">{((successCount / results.length) * 100).toFixed(1)}%</div>
            </div>
            
            <div className="bg-red-50 rounded-xl shadow p-6 border-2 border-red-200">
              <div className="text-sm text-red-700">⚠️ 要確認</div>
              <div className="text-3xl font-bold text-red-600">{problemCount}</div>
              <div className="text-xs text-red-600">{((problemCount / results.length) * 100).toFixed(1)}%</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded ${filterStatus === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
              >
                全て ({results.length})
              </button>
              <button
                onClick={() => setFilterStatus('success')}
                className={`px-4 py-2 rounded ${filterStatus === 'success' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
              >
                問題なし ({successCount})
              </button>
              <button
                onClick={() => setFilterStatus('warning')}
                className={`px-4 py-2 rounded ${filterStatus === 'warning' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
              >
                要確認 ({problemCount})
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-gray-200">
                  <tr>
                    {[
                      { key: 'id', label: 'ID' },
                      { key: 'costJPY', label: '仕入値(円)' },
                      { key: 'weight_kg', label: '重量(kg)' },
                      { key: 'targetMargin', label: '目標(%)' },
                      { key: 'originCountry', label: '原産国' },
                      { key: 'productPrice', label: '商品価格($)' },
                      { key: 'shipping', label: '送料($)' },
                      { key: 'productPriceRatio', label: '価格比率' },
                      { key: 'totalRevenue', label: '総売上($)' },
                      { key: 'profitUSD', label: '利益($)' },
                      { key: 'profitMargin', label: '利益率(%)' },
                      { key: 'warnings', label: '警告' }
                    ].map(col => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          {sortColumn === col.key && (
                            sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredResults.map((r) => (
                    <tr
                      key={r.id}
                      className={`hover:bg-gray-50 ${
                        !r.isProfit || r.warnings.length > 0 ? 'bg-red-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm">{r.id}</td>
                      <td className="px-4 py-3 text-sm">¥{r.costJPY.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">{r.weight_kg}</td>
                      <td className="px-4 py-3 text-sm">{r.targetMargin}%</td>
                      <td className="px-4 py-3 text-sm font-mono">{r.originCountry}</td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        {r.productPrice ? `$${r.productPrice.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {r.shipping ? `$${r.shipping.toFixed(2)}` : '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm font-semibold ${
                        r.productPriceRatio && r.productPriceRatio >= 0.6 && r.productPriceRatio <= 0.85
                          ? 'text-green-600'
                          : 'text-orange-600'
                      }`}>
                        {r.productPriceRatio ? `${(r.productPriceRatio * 100).toFixed(0)}%` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        {r.totalRevenue ? `$${r.totalRevenue.toFixed(2)}` : '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm font-bold ${
                        r.profitUSD && r.profitUSD > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {r.profitUSD ? `$${r.profitUSD.toFixed(2)}` : '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm font-bold ${
                        r.profitMargin && r.profitMargin >= r.targetMargin ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {r.profitMargin ? `${r.profitMargin.toFixed(1)}%` : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {r.warnings.length > 0 ? (
                          <div className="space-y-1">
                            {r.warnings.map((w, i) => (
                              <div key={i} className="text-red-600 bg-red-100 px-2 py-1 rounded">
                                {w}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-green-600">✓</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
