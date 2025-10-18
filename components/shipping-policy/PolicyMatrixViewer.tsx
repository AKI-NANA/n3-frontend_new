'use client'

import { useState, useEffect } from 'react'
import { Package, Globe, Search, Filter, CheckCircle, Info, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface WeightBand {
  min: number
  max: number
  label: string
}

interface RateTable {
  id: string
  name: string
  weight_band: WeightBand
  country_rates: Array<{
    country: string
    rate: number
    fallback?: boolean
  }>
}

interface ShippingPolicy {
  id: string
  name: string
  type: string // 'DDP' | 'DDU'
  service: string // 'Express' | 'Standard' | 'Economy'
  weight_band?: WeightBand
  rate_table_id?: string
}

interface Summary {
  rate_tables: number
  policies: number
  weight_bands: number
  excluded_countries: number
}

export function PolicyMatrixViewer() {
  const [rateTables, setRateTables] = useState<RateTable[]>([])
  const [policies, setPolicies] = useState<ShippingPolicy[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterService, setFilterService] = useState('all')
  const [selectedTable, setSelectedTable] = useState<RateTable | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // APIからデータを取得
      const [rateTablesRes, policiesRes] = await Promise.all([
        fetch('/api/shipping/rate-tables'),
        fetch('/api/shipping/policies')
      ])

      if (!rateTablesRes.ok || !policiesRes.ok) {
        throw new Error('データの取得に失敗しました')
      }

      const rateTablesData = await rateTablesRes.json()
      const policiesData = await policiesRes.json()

      setRateTables(rateTablesData.data || [])
      setPolicies(policiesData.data || [])
      
      // サマリーを計算
      const weightBands = new Set(rateTablesData.data?.map((rt: RateTable) => rt.weight_band.label) || [])
      setSummary({
        rate_tables: rateTablesData.data?.length || 0,
        policies: policiesData.data?.length || 0,
        weight_bands: weightBands.size,
        excluded_countries: 77 // 固定値（USA除く77カ国）
      })

      setLoading(false)
    } catch (err) {
      console.error('データ読み込みエラー:', err)
      setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
      setLoading(false)
    }
  }

  // フィルタリング
  const filteredTables = rateTables.filter(table => {
    const matchesSearch = 
      table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      table.weight_band.label.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesService = 
      filterService === 'all' || table.name.includes(filterService)
    return matchesSearch && matchesService
  })

  // 配送ポリシー数の計算
  const calculatePolicyCount = () => {
    const weightBands = rateTables.length
    
    // USA向けDDP: 各重量帯ごとに1つ
    const usaDdpPolicies = weightBands
    
    // その他国向けDDU: Express, Standard, Economyで各重量帯ごと
    // Express: 全重量帯
    const expressDduPolicies = weightBands
    // Standard: 全重量帯（Express×80%のフラットレート）
    const standardDduPolicies = weightBands
    // Economy: 4カ国のみ、全重量帯（Express×60%のフラットレート）
    const economyDduPolicies = weightBands
    
    const totalPolicies = usaDdpPolicies + expressDduPolicies + standardDduPolicies + economyDduPolicies
    
    return {
      usaDdp: usaDdpPolicies,
      expressDdu: expressDduPolicies,
      standardDdu: standardDduPolicies,
      economyDdu: economyDduPolicies,
      total: totalPolicies
    }
  }

  const policyCount = calculatePolicyCount()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">データを読み込んでいます...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-blue-600 text-sm font-semibold mb-2">Rate Tables</div>
                <div className="text-3xl font-bold text-blue-900">{summary.rate_tables}</div>
                <div className="text-xs text-blue-600 mt-1">Express専用</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-green-600 text-sm font-semibold mb-2">Shipping Policies</div>
                <div className="text-3xl font-bold text-green-900">{policyCount.total}</div>
                <div className="text-xs text-green-600 mt-1">予定生成数</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-purple-600 text-sm font-semibold mb-2">Weight Bands</div>
                <div className="text-3xl font-bold text-purple-900">{summary.weight_bands}</div>
                <div className="text-xs text-purple-600 mt-1">0g - 50kg+</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-orange-600 text-sm font-semibold mb-2">Excluded Countries</div>
                <div className="text-3xl font-bold text-orange-900">{summary.excluded_countries}</div>
                <div className="text-xs text-orange-600 mt-1">USA除く</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ポリシー生成計画 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            配送ポリシー生成計画
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="font-semibold text-blue-900 mb-2">1. USA向けDDP配送ポリシー</div>
              <div className="text-sm text-gray-700 space-y-1">
                <p>• 基本送料 + 関税（6.5%） + 消費税（8%）</p>
                <p>• 2個目以降: 1個目と同額請求</p>
                <p>• 各重量帯ごとに作成</p>
                <p className="font-semibold text-blue-600 mt-2">生成数: {policyCount.usaDdp}個</p>
              </div>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <div className="font-semibold text-green-900 mb-2">2. その他国向けDDU配送ポリシー</div>
              <div className="text-sm text-gray-700 space-y-1">
                <p>• Rate Table参照（国別料金）</p>
                <p>• 2個目以降: 1個目と同額請求</p>
                <p>• 除外国リスト適用（77カ国、USA除く）</p>
                <p className="font-semibold text-green-600 mt-2">生成数: {policyCount.expressDdu + policyCount.standardDdu + policyCount.economyDdu}個</p>
              </div>
            </div>
          </div>

          <div className="border-l-4 border-purple-500 pl-4">
            <div className="font-semibold text-purple-900 mb-2">3. サービスタイプ別ポリシー</div>
            <div className="text-sm text-gray-700 space-y-1">
              <div className="flex items-center justify-between">
                <span>• Express: Rate Table参照</span>
                <Badge variant="secondary">{policyCount.expressDdu}個</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>• Standard: フラットレート（Express×80%）</span>
                <Badge variant="secondary">{policyCount.standardDdu}個</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>• Economy: フラットレート（Express×60%、4カ国のみ）</span>
                <Badge variant="secondary">{policyCount.economyDdu}個</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rate Table構造の説明 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Rate Table構造の確認
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-gray-900 mb-2">Q: 1つのRate Tableに全ての国・全ての重量帯が入っているか？</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-800 font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  A: いいえ。現在の実装では：
                </p>
                <ul className="mt-2 space-y-1 text-green-700">
                  <li>• 1つのRate Table = 1つの重量帯</li>
                  <li>• {summary?.rate_tables || 60}個のRate Table = {summary?.weight_bands || 60}個の重量帯</li>
                  <li>• 各Rate Tableには全ての国の料金が含まれる</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="font-semibold text-blue-900 mb-2">つまり:</p>
              <ul className="space-y-1 text-blue-700 text-sm">
                <li>• RT_Express_1 = 0-250gの全ての国の料金</li>
                <li>• RT_Express_2 = 251-500gの全ての国の料金</li>
                <li>• ...</li>
                <li>• RT_Express_{summary?.rate_tables || 60} = 50kg+の全ての国の料金</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 検索・フィルター */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="重量帯またはテーブル名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterService} onValueChange={setFilterService}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="サービス選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全サービス</SelectItem>
                <SelectItem value="Express">Express</SelectItem>
                <SelectItem value="Standard">Standard</SelectItem>
                <SelectItem value="Economy">Economy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Rate Tables リスト */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Rate Tables ({filteredTables.length}個)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredTables.map((table) => (
              <div
                key={table.id}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition"
                onClick={() => setSelectedTable(selectedTable?.id === table.id ? null : table)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Package className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{table.name}</div>
                      <div className="text-sm text-gray-600">
                        重量帯: {table.weight_band.label} ({table.weight_band.min}g - {table.weight_band.max}g)
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        対応国数: {table.country_rates.length}カ国
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">ID: {table.id}</div>
                    {selectedTable?.id === table.id && (
                      <div className="text-xs text-blue-600 mt-1">▼ 詳細表示中</div>
                    )}
                  </div>
                </div>

                {/* 詳細表示 */}
                {selectedTable?.id === table.id && (
                  <div className="mt-4 bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Globe size={16} />
                      国別料金 (最初の10カ国)
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {table.country_rates.slice(0, 10).map((rate, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded">
                          <span className="text-sm font-medium text-gray-700">{rate.country}</span>
                          <span className="text-sm font-bold text-green-600">
                            ${rate.rate.toFixed(2)}
                            {rate.fallback && (
                              <span className="ml-2 text-xs text-orange-500">(FB)</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                    {table.country_rates.length > 10 && (
                      <div className="text-center text-sm text-gray-500 mt-2">
                        ...他 {table.country_rates.length - 10} カ国
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
