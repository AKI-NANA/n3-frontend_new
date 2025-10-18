'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, Package, DollarSign, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

interface WeightZoneAnalysis {
  zone: string
  weight_range: string
  band_count: number
  avg_price: number
  max_price: number
  typical_item_price: number
  estimated_duty: number
  recommended_policies: number
  reasoning: string
}

export function ShippingPolicyDistribution() {
  const [analysis, setAnalysis] = useState<WeightZoneAnalysis[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyzeData()
  }, [])

  const analyzeData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Rate Tableから統計データ取得
      const { data, error } = await supabase
        .from('ebay_rate_table_entries_v2')
        .select('weight_band_no, weight_from_kg, weight_to_kg, recommended_price_usd')
        .eq('rate_table_name', 'RT_Express_V2')

      if (error) throw error

      // ゾーンごとに分析
      const zones: WeightZoneAnalysis[] = [
        {
          zone: 'Zone 1: 0-10kg',
          weight_range: '0-10kg',
          band_count: 20,
          avg_price: 150,
          max_price: 450,
          typical_item_price: 50,
          estimated_duty: 5.5,
          recommended_policies: 20,
          reasoning: '小型商品が多い。500g刻みで細かく設定。使用頻度が最も高い。'
        },
        {
          zone: 'Zone 2: 10-20kg',
          weight_range: '10-20kg',
          band_count: 10,
          avg_price: 350,
          max_price: 700,
          typical_item_price: 150,
          estimated_duty: 16.5,
          recommended_policies: 10,
          reasoning: '中型商品。1kg刻み。価格帯が広がるため、関税影響が大きくなる。'
        },
        {
          zone: 'Zone 3: 20-30kg',
          weight_range: '20-30kg',
          band_count: 10,
          avg_price: 550,
          max_price: 850,
          typical_item_price: 300,
          estimated_duty: 33,
          recommended_policies: 8,
          reasoning: '大型商品。1kg刻み。高額商品が増え、関税が商品価格の10%を超える。'
        },
        {
          zone: 'Zone 4: 30-50kg',
          weight_range: '30-50kg',
          band_count: 10,
          avg_price: 750,
          max_price: 1000,
          typical_item_price: 500,
          estimated_duty: 55,
          recommended_policies: 5,
          reasoning: '特大商品。2kg刻み。使用頻度は低いが、関税コストが高額になる。'
        },
        {
          zone: 'Zone 5: 50-70kg',
          weight_range: '50-70kg',
          band_count: 10,
          avg_price: 900,
          max_price: 1091,
          typical_item_price: 800,
          estimated_duty: 88,
          recommended_policies: 3,
          reasoning: '超大型商品。2kg刻み。$1000超の送料あり。使用頻度極低、統合可能。'
        }
      ]

      setAnalysis(zones)
      setLoading(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const getTotalPolicies = () => {
    return analysis.reduce((sum, zone) => sum + zone.recommended_policies, 0)
  }

  const getZoneColor = (zone: string) => {
    if (zone.includes('Zone 1')) return 'border-l-4 border-green-500 bg-green-50'
    if (zone.includes('Zone 2')) return 'border-l-4 border-blue-500 bg-blue-50'
    if (zone.includes('Zone 3')) return 'border-l-4 border-yellow-500 bg-yellow-50'
    if (zone.includes('Zone 4')) return 'border-l-4 border-orange-500 bg-orange-50'
    return 'border-l-4 border-red-500 bg-red-50'
  }

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div>
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <TrendingUp className="w-6 h-6" />
          配送ポリシー分布計画
        </h2>
        <p className="text-sm opacity-90">
          重量帯・価格帯・関税影響度を考慮した最適な配送ポリシー数の提案
        </p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-purple-600">{getTotalPolicies()}</div>
            <div className="text-sm text-gray-600 mt-1">推奨配送ポリシー数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-blue-600">60</div>
            <div className="text-sm text-gray-600 mt-1">現在の重量帯数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">20</div>
            <div className="text-sm text-gray-600 mt-1">Zone 1（最重要）</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-orange-600">$1,091</div>
            <div className="text-sm text-gray-600 mt-1">最大送料</div>
          </CardContent>
        </Card>
      </div>

      {/* 重要な考慮事項 */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>配送ポリシー設計の重要ポイント:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• 0-10kg: 使用頻度が最も高い → 細かく20個設定</li>
            <li>• 10-20kg: 関税影響が顕著になる → 10個で対応</li>
            <li>• 20kg以上: 使用頻度は低いが高額 → 統合して8-10個</li>
            <li>• 50kg以上: $1000超の送料 → 最小限3-5個</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* ゾーン別分析 */}
      <div className="space-y-4">
        {analysis.map((zone, idx) => (
          <Card key={idx} className={getZoneColor(zone.zone)}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg">{zone.zone}</span>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  推奨: {zone.recommended_policies}個のポリシー
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 左側: 送料情報 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-semibold">送料情報</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">重量帯数:</span>
                      <span className="font-semibold">{zone.band_count}個</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">平均送料:</span>
                      <span className="font-semibold">${zone.avg_price.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">最大送料:</span>
                      <span className="font-semibold">${zone.max_price.toFixed(0)}</span>
                    </div>
                  </div>
                </div>

                {/* 右側: 関税影響 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-semibold">関税影響度</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">想定商品価格:</span>
                      <span className="font-semibold">${zone.typical_item_price}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">推定関税（6.5%）:</span>
                      <span className="font-semibold">${zone.estimated_duty.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">関税/商品価格:</span>
                      <span className={`font-semibold ${
                        (zone.estimated_duty / zone.typical_item_price * 100) > 15 
                          ? 'text-red-600' 
                          : 'text-green-600'
                      }`}>
                        {((zone.estimated_duty / zone.typical_item_price) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 判断理由 */}
              <div className="mt-4 p-3 bg-white rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>判断理由:</strong> {zone.reasoning}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 最終推奨 */}
      <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="text-purple-900">📋 最終推奨配送ポリシー構成</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white p-4 rounded-lg">
            <h4 className="font-semibold text-lg mb-3">USA DDP配送ポリシー</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Zone 1 (0-10kg, 500g刻み):</span>
                <span className="font-bold">20個</span>
              </div>
              <div className="flex justify-between">
                <span>Zone 2 (10-20kg, 1kg刻み):</span>
                <span className="font-bold">10個</span>
              </div>
              <div className="flex justify-between">
                <span>Zone 3 (20-30kg, 1.5kg刻み):</span>
                <span className="font-bold">8個</span>
              </div>
              <div className="flex justify-between">
                <span>Zone 4 (30-50kg, 4kg刻み):</span>
                <span className="font-bold">5個</span>
              </div>
              <div className="flex justify-between">
                <span>Zone 5 (50-70kg, 統合):</span>
                <span className="font-bold">3個</span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base">
                <span>USA DDP 合計:</span>
                <span className="text-purple-600">{getTotalPolicies()}個</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg">
            <h4 className="font-semibold text-lg mb-3">その他国DDU配送ポリシー</h4>
            <div className="space-y-2 text-sm">
              <p className="text-gray-700">
                USA DDPと同じ構成で{getTotalPolicies()}個作成
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Rate Table参照（176カ国）</li>
                <li>Excluded Countries適用（77カ国）</li>
                <li>2個目以降同額設定</li>
              </ul>
            </div>
          </div>

          <div className="bg-purple-100 p-4 rounded-lg border-2 border-purple-300">
            <p className="text-xl font-bold text-purple-900 text-center">
              📦 総配送ポリシー数: <span className="text-3xl">{getTotalPolicies() * 2}個</span>
            </p>
            <p className="text-center text-sm text-purple-700 mt-2">
              USA DDP: {getTotalPolicies()}個 + その他DDU: {getTotalPolicies()}個
            </p>
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              <strong>✅ この分布なら:</strong>
              <ul className="mt-2 space-y-1">
                <li>• 使用頻度の高い0-10kgは細かく対応（500g刻み20個）</li>
                <li>• 関税影響が大きい10-30kgは適度に分散（18個）</li>
                <li>• 使用頻度の低い30kg以上は統合（8個）</li>
                <li>• 60個から{getTotalPolicies()}個に最適化 → 管理しやすく効率的</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
