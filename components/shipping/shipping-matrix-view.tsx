'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Table, Loader2, Download, Filter, Search,
  TrendingDown, Package, Zap
} from 'lucide-react'
import { REGIONS, getRegionName, filterByRegion, type Region } from '@/lib/regions'

interface MatrixCell {
  carrier_name: string
  service_code: string
  price_usd: number
  base_rate_jpy: number
  shipping_cost_with_margin_usd: number  // 推奨価格（全込み）
  country_code: string
  weight_kg: number
}

interface MatrixRow {
  country_code: string
  country_name_en: string
  country_name_ja: string
  region: string
  weights: {
    [key: string]: MatrixCell | null
  }
}

interface MatrixData {
  success: boolean
  service_type: string
  weights: number[]
  countries_count: number
  matrix: MatrixRow[]
}

// キャリア別の色定義
const CARRIER_COLORS: { [key: string]: string } = {
  'UPS': 'bg-amber-800 border-amber-900 text-white',  // 茶色
  'FedEx (C-PASS)': 'bg-purple-100 border-purple-300 text-purple-900',
  'FedEx (Eloji)': 'bg-cyan-100 border-cyan-300 text-cyan-900',  // 水色
  'DHL (C-PASS)': 'bg-yellow-300 border-yellow-400 text-yellow-900',  // 黄色
  'DHL (Eloji)': 'bg-orange-100 border-orange-200 text-orange-800',  // オレンジ薄め
  'eBay SpeedPAK': 'bg-orange-400 border-orange-500 text-white',  // オレンジ
  '日本郵便': 'bg-red-500 border-red-600 text-white'  // 赤
}

// サービス選択オプション
const SERVICE_OPTIONS = [
  { value: 'Express', label: 'Express（最安値）', type: 'service_type' },
  { value: 'Standard', label: 'Standard（最安値）', type: 'service_type' },
  { value: 'Economy', label: 'Economy（最安値）', type: 'service_type' },
  { value: 'JPPOST_EMS', label: '🇯🇵 日本郵便EMS', type: 'service' },
  { value: 'ELOJI_DHL_EXPRESS', label: '🔵 Eloji DHL Express', type: 'service' },
  { value: 'SPEEDPAK_EXPRESS_DHL', label: '⚡ SpeedPAK Express DHL', type: 'service' },
  { value: 'FEDEX_INTL_PRIORITY', label: '💜 FedEx International Priority', type: 'service' },
  { value: 'UPS_EXPRESS_SAVER', label: '🤎 UPS Express Saver', type: 'service' },
]

export function ShippingMatrixView() {
  const [selectedService, setSelectedService] = useState('Express')
  const [priceMode, setPriceMode] = useState<'base' | 'recommended'>('base') // 新規追加
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<MatrixData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRegions, setSelectedRegions] = useState<Region[]>([])
  const [showFilters, setShowFilters] = useState(false)

  // 重量配列: APIレスポンスから取得するため初期値は空
  const [weights, setWeights] = useState<number[]>([
    // デフォルト: 0.5kg〜70kg（主要重量のみ）
    0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
    32, 34, 36, 38, 40, 42, 44, 46, 48, 50,
    52, 54, 56, 58, 60, 62, 64, 66, 68, 70
  ])

  console.log('Matrix data loaded:', data ? `${data.matrix.length} countries` : 'no data')
  console.log('Matrix first 5 countries:', data?.matrix.slice(0, 5).map(r => r.country_code))
  console.log('Matrix last 5 countries:', data?.matrix.slice(-5).map(r => r.country_code))

  // フィルタリングされたマトリックス
  const filteredMatrix = useMemo(() => {
    if (!data) return []
    
    let filtered = data.matrix
    
    // 地域フィルター（DBの地域を使用）
    if (selectedRegions.length > 0) {
      filtered = filtered.filter(row => selectedRegions.includes(row.region as Region))
    }
    
    // 検索フィルター
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(row =>
        row.country_code.toLowerCase().includes(term) ||
        row.country_name_en.toLowerCase().includes(term) ||
        row.country_name_ja.includes(term) ||
        row.region.includes(term)
      )
    }
    
    return filtered
  }, [data, selectedRegions, searchTerm])

  // 地域切り替え
  const toggleRegion = (region: Region) => {
    setSelectedRegions(prev =>
      prev.includes(region)
        ? prev.filter(r => r !== region)
        : [...prev, region]
    )
  }

  // すべての地域を選択/解除
  const toggleAllRegions = () => {
    if (selectedRegions.length === Object.keys(REGIONS).length) {
      setSelectedRegions([])
    } else {
      setSelectedRegions(Object.keys(REGIONS) as Region[])
    }
  }

  const loadMatrix = useCallback(async (serviceValue: string) => {
    console.log('🚀 Loading matrix:', { serviceValue, priceMode })
    setLoading(true)
    setError(null)

    try {
      const option = SERVICE_OPTIONS.find(o => o.value === serviceValue)
      
      // weightsを固定値で使用（依存配列から除外）
      const defaultWeights = [
        0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
        11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
        21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
        32, 34, 36, 38, 40, 42, 44, 46, 48, 50,
        52, 54, 56, 58, 60, 62, 64, 66, 68, 70
      ]
      
      const params = new URLSearchParams({
        [option?.type || 'service_type']: serviceValue,
        weights: defaultWeights.join(','),
        price_mode: priceMode
      })

      console.log('📡 Fetching:', `/api/shipping/matrix?${params}`)
      const response = await fetch(`/api/shipping/matrix?${params}`)
      const result = await response.json()
      
      console.log('📦 Response:', result.success, result.countries_count, 'countries')

      if (!response.ok) {
        throw new Error(result.error || 'データの取得に失敗しました')
      }

      // APIレスポンスから実際の重量配列を取得
      if (result.weights && Array.isArray(result.weights)) {
        setWeights(result.weights)
      }

      setData(result)
      console.log('✅ Matrix loaded successfully')
    } catch (err) {
      console.error('❌ Matrix load error:', err)
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [priceMode])  // weightsを依存配列から除外

  // サービスまたは価格モードが変わったらデータ再読み込み
  useEffect(() => {
    loadMatrix(selectedService)
  }, [loadMatrix, selectedService])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price)
  }

  const getCellColor = (carrierName: string) => {
    return CARRIER_COLORS[carrierName] || 'bg-gray-100 border-gray-300 text-gray-900'
  }

  const exportToCSV = () => {
    if (!data) return

    let csv = 'No.,国コード,国名（英）,国名（日）,地域,'
    csv += weights.map(w => `${w}kg_キャリア,${w}kg_料金(USD)`).join(',')
    csv += '\n'

    filteredMatrix.forEach((row, idx) => {
      csv += `${idx + 1},${row.country_code},${row.country_name_en},${row.country_name_ja},${row.region},`
      
      weights.forEach(weight => {
        const cell = row.weights[weight.toString()]
        if (cell) {
          csv += `${cell.carrier_name},${cell.price_usd},`
        } else {
          csv += ',,,'
        }
      })
      
      csv += '\n'
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `shipping_matrix_${activeServiceType}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Table className="h-6 w-6" />
              配送料金マトリックス
            </span>
            <Button
              onClick={exportToCSV}
              disabled={!data || loading}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV出力
            </Button>
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            全231カ国 × 100重量帯（0.5kg刻み〜70kg）の最安キャリアと料金を一覧表示
          </p>
        </CardHeader>

        <CardContent>
          {/* サービス選択 */}
          <div className="mb-6">
            <label className="text-sm font-medium mb-2 block">配送サービスを選択</label>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  サービスタイプ（最安値）
                </div>
                {SERVICE_OPTIONS.filter(o => o.type === 'service_type').map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
                  個別サービス
                </div>
                {SERVICE_OPTIONS.filter(o => o.type === 'service').map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
                {loading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <span className="ml-3 text-lg">データ読み込み中...</span>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-300 rounded-lg p-4 text-red-800">
                    エラー: {error}
                  </div>
                )}

                {data && !loading && (
                  <>
                    {/* 統計情報 */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm text-gray-600">対応国数</div>
                          <div className="text-2xl font-bold">{data.countries_count}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm text-gray-600">重量帯</div>
                          <div className="text-2xl font-bold">{weights.length}段階</div>
                          <div className="text-xs text-gray-500">0.5kg〜70kg</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm text-gray-600">総セル数</div>
                          <div className="text-2xl font-bold">{(data.countries_count * weights.length).toLocaleString()}</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* 検索とフィルター */}
                    <div className="space-y-4 mb-4">
                      {/* 価格表示モード切り替え */}
                      <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                        <span className="text-sm font-semibold">価格表示:</span>
                        <Button
                          variant={priceMode === 'base' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPriceMode('base')}
                        >
                          基本送料のみ
                        </Button>
                        <Button
                          variant={priceMode === 'recommended' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPriceMode('recommended')}
                        >
                          推奨価格（全込み）
                        </Button>
                        <span className="text-xs text-gray-600 ml-2">
                          {priceMode === 'base' ? '純粋な送料' : '燃油・保険・署名込み'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="text"
                            placeholder="国コードまたは国名で検索..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <Button
                          variant={showFilters ? "default" : "outline"}
                          onClick={() => setShowFilters(!showFilters)}
                          className="flex items-center gap-2"
                        >
                          <Filter className="h-4 w-4" />
                          地域フィルター
                          {selectedRegions.length > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              {selectedRegions.length}
                            </Badge>
                          )}
                        </Button>
                        <div className="text-sm text-gray-600">
                          {filteredMatrix.length}カ国 / {data.countries_count}カ国
                        </div>
                      </div>

                      {/* 地域フィルターパネル */}
                      {showFilters && (
                        <Card>
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold">地域で絞り込む</h4>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={toggleAllRegions}
                                >
                                  {selectedRegions.length === Object.keys(REGIONS).length ? 'すべて解除' : 'すべて選択'}
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {(Object.entries(REGIONS) as [Region, string][]).map(([key, name]) => (
                                  <div key={key} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`region-${key}`}
                                      checked={selectedRegions.includes(key)}
                                      onCheckedChange={() => toggleRegion(key)}
                                    />
                                    <Label
                                      htmlFor={`region-${key}`}
                                      className="text-sm cursor-pointer"
                                    >
                                      {name}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* キャリア凡例 */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
                      <div className="text-sm font-semibold mb-2">キャリア凡例</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(CARRIER_COLORS).map(([carrier, colorClass]) => (
                          <Badge 
                            key={carrier}
                            className={`${colorClass} border-2`}
                          >
                            {carrier}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* マトリックステーブル */}
                    <div className="overflow-x-auto border rounded-lg">
                      <div className="text-sm text-gray-600 mb-2 px-4 py-2 bg-yellow-50 border-b">
                        ⚠️ 横スクロールで{weights.length}個の重量帯を表示します。Shift+マウスホイールで横スクロールできます。
                      </div>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
                          <tr>
                            <th className="px-2 py-3 text-center font-semibold border-r sticky left-0 bg-gray-100 dark:bg-gray-800 z-20 min-w-[50px]">
                              No.
                            </th>
                            <th className="px-2 py-3 text-left font-semibold border-r sticky left-[50px] bg-gray-100 dark:bg-gray-800 z-20 min-w-[80px]">
                              国コード
                            </th>
                            <th className="px-2 py-3 text-left font-semibold border-r sticky left-[130px] bg-gray-100 dark:bg-gray-800 z-20 min-w-[150px]">
                              国名
                            </th>
                            <th className="px-2 py-3 text-center font-semibold border-r sticky left-[280px] bg-gray-100 dark:bg-gray-800 z-20 min-w-[100px]">
                              地域
                            </th>
                            {weights.map(weight => (
                              <th 
                                key={weight}
                                className="px-2 py-3 text-center font-semibold border-r min-w-[120px]"
                              >
                                {weight}kg
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMatrix.map((row, idx) => (
                            <tr 
                              key={row.country_code}
                              className={idx % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-gray-50 dark:bg-gray-900'}
                            >
                              <td className="px-2 py-2 text-center font-mono text-xs border-r sticky left-0 bg-inherit z-10">
                                {idx + 1}
                              </td>
                              <td className="px-2 py-2 font-mono text-xs border-r sticky left-[50px] bg-inherit z-10">
                                {row.country_code}
                              </td>
                              <td className="px-2 py-2 border-r sticky left-[130px] bg-inherit z-10">
                                <div className="font-semibold text-xs">{row.country_name_en}</div>
                                <div className="text-xs text-gray-500">{row.country_name_ja}</div>
                              </td>
                              <td className="px-2 py-2 border-r sticky left-[280px] bg-inherit z-10">
                                <Badge variant="outline" className="text-xs">
                                  {row.region}
                                </Badge>
                              </td>
                              {weights.map(weight => {
                                const cell = row.weights[weight.toString()]
                                
                                if (!cell) {
                                  return (
                                    <td 
                                      key={weight}
                                      className="px-1 py-2 text-center border-r bg-gray-200 dark:bg-gray-800"
                                    >
                                      <span className="text-xs text-gray-400">N/A</span>
                                    </td>
                                  )
                                }

                                return (
                                  <td 
                                    key={weight}
                                    className={`px-1 py-2 border-r ${getCellColor(cell.carrier_name)}`}
                                  >
                                    <div className="text-center">
                                      <div className="font-bold text-xs">
                                        {priceMode === 'base' 
                                          ? formatPrice(cell.price_usd)
                                          : `${cell.shipping_cost_with_margin_usd.toFixed(2)}`
                                        }
                                      </div>
                                      <div className="text-xs font-semibold mt-0.5 truncate" title={cell.carrier_name}>
                                        {cell.carrier_name.replace(' (C-PASS)', '').replace(' (Eloji)', '')}
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        ¥{priceMode === 'base'
                                          ? cell.base_rate_jpy.toLocaleString()
                                          : Math.round(cell.shipping_cost_with_margin_usd * 154.32).toLocaleString()
                                        }
                                      </div>
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* フッター統計 */}
                    <div className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                      表示中: {data.countries_count}カ国 × {weights.length}重量 = {data.countries_count * weights.length}セル
                    </div>
                  </>
                )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
