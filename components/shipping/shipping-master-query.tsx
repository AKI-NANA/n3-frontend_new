'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Package, Truck, Clock, DollarSign, Globe, 
  Search, TrendingDown, Zap, AlertCircle, Loader2,
  CheckCircle2, XCircle
} from 'lucide-react'

// レスポンス型定義
interface ShippingMasterRecord {
  id: number
  service_type: string
  carrier_name: string
  service_code: string
  service_name: string | null
  data_source: string
  country_code: string
  country_name_en: string | null
  country_name_ja: string | null
  weight_from_kg: number
  weight_to_kg: number
  base_rate_jpy: number
  base_rate_usd: number
  fuel_surcharge_jpy: number | null
  fuel_surcharge_usd: number | null
  total_actual_cost_usd: number
  shipping_cost_with_margin_usd: number
  additional_item_usd: number
  delivery_days_min: number | null
  delivery_days_max: number | null
  max_item_value_usd: number | null
  max_weight_kg: number | null
}

interface ServiceTypeResults {
  service_type: string
  records: ShippingMasterRecord[]
  cheapest: ShippingMasterRecord | null
  count: number
}

interface QueryResults {
  economy: ServiceTypeResults
  standard: ServiceTypeResults
  express: ServiceTypeResults
}

const POPULAR_COUNTRIES = [
  { code: 'US', name: 'アメリカ', flag: '🇺🇸', zone: 'North America' },
  { code: 'GB', name: 'イギリス', flag: '🇬🇧', zone: 'Europe' },
  { code: 'DE', name: 'ドイツ', flag: '🇩🇪', zone: 'Europe' },
  { code: 'AU', name: 'オーストラリア', flag: '🇦🇺', zone: 'Oceania' },
  { code: 'CA', name: 'カナダ', flag: '🇨🇦', zone: 'North America' },
  { code: 'FR', name: 'フランス', flag: '🇫🇷', zone: 'Europe' },
  { code: 'KR', name: '韓国', flag: '🇰🇷', zone: 'Asia' },
  { code: 'SG', name: 'シンガポール', flag: '🇸🇬', zone: 'Asia' },
  { code: 'TH', name: 'タイ', flag: '🇹🇭', zone: 'Asia' },
  { code: 'MY', name: 'マレーシア', flag: '🇲🇾', zone: 'Asia' },
  { code: 'TW', name: '台湾', flag: '🇹🇼', zone: 'Asia' },
  { code: 'HK', name: '香港', flag: '🇭🇰', zone: 'Asia' }
]

const SERVICE_TYPE_INFO = {
  Economy: {
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: '💰',
    description: '最安値・長距離配送'
  },
  Standard: {
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: '📦',
    description: 'バランス型'
  },
  Express: {
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: '⚡',
    description: '高速配送'
  }
}

export function ShippingMasterQuery() {
  const [countryCode, setCountryCode] = useState('US')
  const [weightKg, setWeightKg] = useState('0.5')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<QueryResults | null>(null)
  const [overallCheapest, setOverallCheapest] = useState<ShippingMasterRecord | null>(null)

  const executeQuery = useCallback(async () => {
    setLoading(true)
    setError(null)
    setResults(null)
    setOverallCheapest(null)

    try {
      const params = new URLSearchParams({
        country_code: countryCode,
        weight_kg: weightKg
      })

      const response = await fetch(`/api/shipping/master-query?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'クエリの実行に失敗しました')
      }

      if (data.success) {
        setResults(data.results)
        setOverallCheapest(data.overall_cheapest)
      } else {
        setError(data.error || '不明なエラー')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      console.error('Master query error:', err)
    } finally {
      setLoading(false)
    }
  }, [countryCode, weightKg])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price)
  }

  const formatPriceJPY = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(price)
  }

  const selectedCountry = POPULAR_COUNTRIES.find(c => c.code === countryCode)

  const renderServiceTypeCard = (type: keyof QueryResults) => {
    if (!results) return null
    
    const data = results[type]
    const info = SERVICE_TYPE_INFO[data.service_type as keyof typeof SERVICE_TYPE_INFO]
    
    return (
      <Card key={type} className="border-2">
        <CardHeader className={`${info.color} border-b-2`}>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="text-2xl">{info.icon}</span>
              {data.service_type}
            </span>
            <Badge variant="outline" className="bg-white">
              {data.count}件
            </Badge>
          </CardTitle>
          <p className="text-sm mt-1">{info.description}</p>
        </CardHeader>
        <CardContent className="p-4">
          {data.count === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <XCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>このサービスタイプは利用できません</p>
            </div>
          ) : (
            <>
              {/* 最安値カード */}
              {data.cheapest && (
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-2 border-yellow-400 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-5 w-5 text-yellow-700" />
                    <span className="font-bold text-yellow-900 dark:text-yellow-100">最安値</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-lg">
                          {data.cheapest.carrier_name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {data.cheapest.service_name || data.cheapest.service_code}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {formatPrice(data.cheapest.shipping_cost_with_margin_usd)}
                        </div>
                        <div className="text-xs text-gray-500">
                          実費: {formatPrice(data.cheapest.total_actual_cost_usd)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {data.cheapest.delivery_days_min}-{data.cheapest.delivery_days_max}日
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {data.cheapest.weight_from_kg}-{data.cheapest.weight_to_kg}kg
                      </div>
                      <div className="flex items-center gap-1" title="2個目以降の商品を同梱する場合の追加料金">
                        <DollarSign className="h-3 w-3" />
                        追加商品: {formatPrice(data.cheapest.additional_item_usd)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs pt-2 border-t border-yellow-300">
                      <Badge variant="outline" className="text-xs">
                        {data.cheapest.data_source === 'cpass' ? 'C-PASS' : '日本郵便'}
                      </Badge>
                      <span className="text-gray-600">
                        基本: {formatPriceJPY(data.cheapest.base_rate_jpy)}
                      </span>
                      {data.cheapest.fuel_surcharge_jpy && (
                        <span className="text-orange-600">
                          +燃油: {formatPriceJPY(data.cheapest.fuel_surcharge_jpy)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* その他のオプション */}
              {data.records.length > 1 && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    その他のオプション ({data.records.length - 1}件)
                  </div>
                  {data.records.slice(1, 4).map((record) => (
                    <div 
                      key={record.id}
                      className="border rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-sm">
                            {record.carrier_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {record.service_code}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-600">
                            {formatPrice(record.shipping_cost_with_margin_usd)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {record.delivery_days_min}-{record.delivery_days_max}日
                        </span>
                        <span title="2個目以降の商品">
                          追加商品: {formatPrice(record.additional_item_usd)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {data.records.length > 4 && (
                    <div className="text-center text-sm text-gray-500 py-2">
                      他 {data.records.length - 4} 件のオプションあり
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 検索フォーム */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-6 w-6" />
            配送料金マスター検索
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            34,995件のデータから最適な配送方法を検索 | 231カ国対応 | Economy/Standard/Express
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* 国選択 */}
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                <Globe className="inline h-4 w-4 mr-1" />
                配送先国
              </label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full px-4 py-3 border-2 rounded-lg bg-background focus:ring-2 focus:ring-blue-500"
              >
                {POPULAR_COUNTRIES.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.name} ({country.zone})
                  </option>
                ))}
              </select>
            </div>

            {/* 重量入力 */}
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                <Package className="inline h-4 w-4 mr-1" />
                重量（kg）
              </label>
              <Input
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                step="0.1"
                min="0.001"
                max="30"
                placeholder="0.5"
                className="text-lg h-12 border-2"
              />
              <div className="flex gap-2">
                {['0.1', '0.5', '1.0', '2.0', '5.0'].map(weight => (
                  <Button
                    key={weight}
                    variant="outline"
                    size="sm"
                    onClick={() => setWeightKg(weight)}
                    className="flex-1"
                  >
                    {weight}kg
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* 検索ボタン */}
          <Button
            onClick={executeQuery}
            disabled={loading || !countryCode || !weightKg}
            className="w-full h-12 text-lg"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                検索中...
              </>
            ) : (
              <>
                <Search className="h-5 w-5 mr-2" />
                料金を検索
              </>
            )}
          </Button>

          {/* 検索条件表示 */}
          {(countryCode || weightKg) && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              検索条件: {selectedCountry?.flag} {selectedCountry?.name} / {weightKg}kg
            </div>
          )}
        </CardContent>
      </Card>

      {/* エラー表示 */}
      {error && (
        <Card className="border-red-300 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertCircle className="h-5 w-5" />
              <span className="font-semibold">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 全体最安値サマリー */}
      {overallCheapest && (
        <Card className="border-4 border-green-400 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <Zap className="h-6 w-6" />
              🏆 総合最安値
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-gray-600 dark:text-gray-400">配送業者</div>
                <div className="text-xl font-bold">{overallCheapest.carrier_name}</div>
                <div className="text-sm text-gray-500">{overallCheapest.service_name || overallCheapest.service_code}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-gray-600 dark:text-gray-400">料金</div>
                <div className="text-3xl font-bold text-green-600">
                  {formatPrice(overallCheapest.shipping_cost_with_margin_usd)}
                </div>
                <div className="text-xs text-gray-500">
                  実費: {formatPrice(overallCheapest.total_actual_cost_usd)}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-gray-600 dark:text-gray-400">配送日数</div>
                <div className="text-2xl font-bold">
                  {overallCheapest.delivery_days_min}-{overallCheapest.delivery_days_max}日
                </div>
                <Badge className={SERVICE_TYPE_INFO[overallCheapest.service_type as keyof typeof SERVICE_TYPE_INFO].color}>
                  {overallCheapest.service_type}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* サービスタイプ別結果 */}
      {results && (
        <div className="grid md:grid-cols-3 gap-6">
          {renderServiceTypeCard('economy')}
          {renderServiceTypeCard('standard')}
          {renderServiceTypeCard('express')}
        </div>
      )}

      {/* 結果がない場合 */}
      {!loading && !results && !error && (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            <Search className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">検索条件を入力して「料金を検索」ボタンをクリックしてください</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
