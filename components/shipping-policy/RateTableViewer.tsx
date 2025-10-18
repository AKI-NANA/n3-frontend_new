'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Loader2, Globe, ChevronDown, ChevronRight } from 'lucide-react'

interface RateTableSummary {
  rate_table_name: string
  weight_band_no: number
  weight_from_kg: number
  weight_to_kg: number
  country_count: number
  min_cost: number
  max_cost: number
  avg_cost: number
}

interface RateDetail {
  id: number
  rate_table_name: string
  country_code: string
  country_name: string
  shipping_cost_usd: number
  base_rate_jpy: number
  carrier_name: string
  service_type: string
}

// eBayの地域グループ定義
const EBAY_REGIONS = {
  'Africa': ['DZ', 'EG', 'MA', 'NG', 'ZA', 'TR', 'SA', 'ZW', 'CI', 'SL', 'SN', 'TG', 'TN', 'TZ', 'UG', 'RW', 'SD'],
  'Asia': ['CN', 'HK', 'TW', 'KR', 'JP', 'SG', 'MY', 'TH', 'VN', 'ID', 'PH', 'IN', 'PK', 'LK', 'MM', 'MN', 'MO', 'MV', 'NP'],
  'Central America and Caribbean': ['CR', 'PA', 'HN', 'SV', 'NI', 'MX', 'BS', 'TT', 'MQ', 'MS', 'AW', 'LC', 'KN', 'VC', 'VG', 'DO', 'SR', 'TC'],
  'Europe (including UK)': ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'PT', 'GR', 'HU', 'IE', 'RO', 'BG', 'HR', 'LT', 'LV', 'EE', 'SI', 'SK', 'LU', 'MT', 'CY', 'IS', 'AD', 'MC', 'LI', 'SM', 'GI', 'MD', 'ME', 'MK', 'RS', 'UA', 'UZ'],
  'Middle East': ['AE', 'IL', 'JO', 'KW', 'LB', 'OM', 'QA', 'SY'],
  'North America': ['CA', 'PR', 'VI'],
  'Oceania': ['AU', 'NZ', 'PG', 'NC', 'SB', 'FM', 'TO', 'VU', 'WS', 'PW', 'MH', 'MP', 'WF', 'MN'],
  'South America': ['BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'PY', 'UY'],
  'Southeast Asia': [] // 既にAsiaに含まれている
}

function getRegionForCountry(countryCode: string): string {
  for (const [region, countries] of Object.entries(EBAY_REGIONS)) {
    if (countries.includes(countryCode)) {
      return region
    }
  }
  return 'Other'
}

export function RateTableViewer() {
  const [loading, setLoading] = useState(true)
  const [totalRates, setTotalRates] = useState(0)
  const [rateTables, setRateTables] = useState<RateTableSummary[]>([])
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [detailRates, setDetailRates] = useState<RateDetail[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadRateTableSummary()
  }, [])

  const loadRateTableSummary = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      console.log('🔍 データ取得開始...')

      // 総数取得（US特殊コード除外）
      const { count } = await supabase
        .from('ebay_rate_table_data')
        .select('*', { count: 'exact', head: true })
        .not('country_code', 'in', '("US_48","US_OTHER")')

      setTotalRates(count || 0)
      console.log('📊 総レート数:', count)

      // 全データを取得
      let allData: any[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('ebay_rate_table_data')
          .select('*')
          .not('country_code', 'in', '("US_48","US_OTHER")')
          .order('weight_band_no', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) {
          console.error('Supabase error:', error)
          throw error
        }

        if (data && data.length > 0) {
          allData = [...allData, ...data]
          console.log(`📦 ページ ${page + 1}: ${data.length}件取得（累計: ${allData.length}）`)
          page++
          hasMore = data.length === pageSize
        } else {
          hasMore = false
        }
      }

      console.log('✅ 全データ取得完了:', allData.length, 'レコード')

      // グループ化してサマリー作成
      const tableMap = new Map<string, any[]>()
      allData.forEach(rate => {
        const tableName = rate.rate_table_name
        if (!tableMap.has(tableName)) {
          tableMap.set(tableName, [])
        }
        tableMap.get(tableName)!.push(rate)
      })

      // サマリー作成
      const summary: RateTableSummary[] = []
      tableMap.forEach((rates, tableName) => {
        const costs = rates.map(r => parseFloat(r.shipping_cost_usd))
        summary.push({
          rate_table_name: tableName,
          weight_band_no: rates[0].weight_band_no,
          weight_from_kg: parseFloat(rates[0].weight_from_kg),
          weight_to_kg: parseFloat(rates[0].weight_to_kg),
          country_count: rates.length,
          min_cost: Math.min(...costs),
          max_cost: Math.max(...costs),
          avg_cost: costs.reduce((a, b) => a + b, 0) / costs.length
        })
      })

      summary.sort((a, b) => a.weight_band_no - b.weight_band_no)
      setRateTables(summary)

    } catch (error) {
      console.error('❌ Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTableDetail = async (tableName: string) => {
    setSelectedTable(tableName)
    setDetailLoading(true)
    const supabase = createClient()

    try {
      const { data } = await supabase
        .from('ebay_rate_table_data')
        .select('*')
        .eq('rate_table_name', tableName)
        .not('country_code', 'in', '("US_48","US_OTHER")')
        .order('country_code', { ascending: true })

      setDetailRates(data || [])
    } catch (error) {
      console.error('Error loading detail:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  const toggleRegion = (region: string) => {
    const newExpanded = new Set(expandedRegions)
    if (newExpanded.has(region)) {
      newExpanded.delete(region)
    } else {
      newExpanded.add(region)
    }
    setExpandedRegions(newExpanded)
  }

  // 地域別にグループ化
  const groupedRates = detailRates.reduce((acc, rate) => {
    const region = getRegionForCountry(rate.country_code)
    if (!acc[region]) {
      acc[region] = []
    }
    acc[region].push(rate)
    return acc
  }, {} as Record<string, RateDetail[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <div className="text-sm text-gray-600">データ読み込み中...</div>
        </div>
      </div>
    )
  }

  const isComplete = rateTables.length === 60
  const totalCountries = rateTables.length > 0 
    ? Math.max(...rateTables.map(t => t.country_count))
    : 0

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Globe className="w-8 h-8" />
          60個のRate Table一覧
        </h1>
        <p className="text-sm opacity-90">
          eBay配送料金テーブル（重量帯別 × 約160カ国）
        </p>
      </div>

      {/* ステータスカード */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Rate Table状態</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="border rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">総レート数</div>
              <div className="text-3xl font-bold">{totalRates.toLocaleString()}</div>
              <div className="text-xs text-gray-400 mt-1">約8,000-10,000</div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Rate Table数</div>
              <div className="text-3xl font-bold text-green-600">{rateTables.length}</div>
              <div className="text-xs text-gray-400 mt-1">期待値: 60</div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">最大対象国数</div>
              <div className="text-3xl font-bold">{totalCountries}</div>
              <div className="text-xs text-gray-400 mt-1">USA除く</div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">完成度</div>
              <div className="flex items-center gap-2">
                {isComplete ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <span className="text-lg font-bold text-green-600">完了</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-orange-500" />
                    <span className="text-lg font-bold text-orange-600">
                      {rateTables.length}/60
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rate Tableリスト */}
      <Card>
        <CardHeader>
          <CardTitle>📦 Rate Table一覧（全{rateTables.length}個）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {rateTables.map(table => (
              <button
                key={table.rate_table_name}
                onClick={() => loadTableDetail(table.rate_table_name)}
                className={`
                  border rounded-lg p-3 text-left transition-all hover:shadow-md
                  ${selectedTable === table.rate_table_name 
                    ? 'bg-purple-50 border-purple-500' 
                    : 'hover:border-purple-300'
                  }
                  ${table.weight_band_no > 50 ? 'bg-green-50' : ''}
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-lg font-bold text-gray-700">
                    {table.rate_table_name}
                  </div>
                  {table.weight_band_no > 50 && (
                    <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">
                      NEW
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  {table.weight_from_kg}-{table.weight_to_kg}kg
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <div>{table.country_count}カ国</div>
                  <div>
                    ${table.min_cost.toFixed(2)} - ${table.max_cost.toFixed(2)}
                  </div>
                  <div className="text-gray-400">
                    平均: ${table.avg_cost.toFixed(2)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 詳細表示（地域別） */}
      {selectedTable && (
        <Card>
          <CardHeader>
            <CardTitle>
              📋 {selectedTable} の詳細（地域別）
              {detailRates.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({detailRates[0].weight_from_kg}-{detailRates[0].weight_to_kg}kg、{detailRates.length}カ国)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedRates)
                  .sort(([a], [b]) => {
                    // eBayの地域順にソート
                    const order = Object.keys(EBAY_REGIONS)
                    const aIndex = order.indexOf(a)
                    const bIndex = order.indexOf(b)
                    if (aIndex === -1) return 1
                    if (bIndex === -1) return -1
                    return aIndex - bIndex
                  })
                  .map(([region, rates]) => (
                    <div key={region} className="border rounded-lg overflow-hidden">
                      {/* 地域ヘッダー */}
                      <button
                        onClick={() => toggleRegion(region)}
                        className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 px-4 py-3 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {expandedRegions.has(region) ? (
                            <ChevronDown className="w-5 h-5 text-gray-600" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                          )}
                          <span className="font-bold text-lg">{region}</span>
                          <span className="text-sm text-gray-500">
                            ({rates.length}カ国)
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          ${Math.min(...rates.map(r => r.shipping_cost_usd)).toFixed(2)} 
                          {' - '}
                          ${Math.max(...rates.map(r => r.shipping_cost_usd)).toFixed(2)}
                        </div>
                      </button>

                      {/* 国リスト */}
                      {expandedRegions.has(region) && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 text-left">国コード</th>
                                <th className="px-4 py-2 text-left">国名</th>
                                <th className="px-4 py-2 text-right">送料(USD)</th>
                                <th className="px-4 py-2 text-right">基本料金(JPY)</th>
                                <th className="px-4 py-2 text-left">サービス</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rates.map(rate => (
                                <tr key={rate.id} className="border-t hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-xs font-bold">
                                    {rate.country_code}
                                  </td>
                                  <td className="px-4 py-2">{rate.country_name}</td>
                                  <td className="px-4 py-2 text-right font-bold text-green-600">
                                    ${parseFloat(rate.shipping_cost_usd.toString()).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-2 text-right text-gray-600">
                                    ¥{parseFloat(rate.base_rate_jpy.toString()).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-2">
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                      {rate.service_type}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
