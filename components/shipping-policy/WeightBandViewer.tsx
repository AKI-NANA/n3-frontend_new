'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2, Package } from 'lucide-react'

interface WeightBandSummary {
  weight_band_no: number
  weight_from_kg: number
  weight_to_kg: number
  policy_count: number
  min_price: number
  max_price: number
  avg_base_shipping: number
  sample_policy_name: string
}

export function WeightBandViewer() {
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [weightBands, setWeightBands] = useState<WeightBandSummary[]>([])
  const [selectedBand, setSelectedBand] = useState<number | null>(null)
  const [detailPolicies, setDetailPolicies] = useState<any[]>([])

  useEffect(() => {
    loadWeightBandSummary()
  }, [])

  const loadWeightBandSummary = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // 総数取得
      const { count } = await supabase
        .from('ebay_shipping_policies_final')
        .select('*', { count: 'exact', head: true })

      setTotalCount(count || 0)

      // 重量帯ごとの集計
      const { data, error } = await supabase
        .from('ebay_shipping_policies_final')
        .select('*')
        .order('weight_band_no', { ascending: true })

      if (error) throw error

      // グループ化
      const bandMap = new Map<number, any[]>()
      data?.forEach(policy => {
        const bandNo = policy.weight_band_no
        if (!bandMap.has(bandNo)) {
          bandMap.set(bandNo, [])
        }
        bandMap.get(bandNo)!.push(policy)
      })

      // サマリー作成
      const summary: WeightBandSummary[] = []
      bandMap.forEach((policies, bandNo) => {
        const prices = policies.map(p => p.product_price_usd)
        const baseShippings = policies.map(p => parseFloat(p.usa_base_shipping_usd))

        summary.push({
          weight_band_no: bandNo,
          weight_from_kg: policies[0].weight_from_kg,
          weight_to_kg: policies[0].weight_to_kg,
          policy_count: policies.length,
          min_price: Math.min(...prices),
          max_price: Math.max(...prices),
          avg_base_shipping: baseShippings[0], // 同じ重量帯なら全て同じ
          sample_policy_name: policies[0].policy_name
        })
      })

      summary.sort((a, b) => a.weight_band_no - b.weight_band_no)
      setWeightBands(summary)

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBandDetail = async (bandNo: number) => {
    setSelectedBand(bandNo)
    const supabase = createClient()

    const { data } = await supabase
      .from('ebay_shipping_policies_final')
      .select('*')
      .eq('weight_band_no', bandNo)
      .order('product_price_usd', { ascending: true })

    setDetailPolicies(data || [])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const isComplete = totalCount === 1200
  const missingBands = 60 - weightBands.length

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Package className="w-8 h-8" />
          60重量帯ポリシー一覧
        </h1>
        <p className="text-sm opacity-90">
          eBay配送ポリシーの重量帯別サマリー（0-120kg）
        </p>
      </div>

      {/* ステータスカード */}
      <Card>
        <CardHeader>
          <CardTitle>📊 データベース状態</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="border rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">総ポリシー数</div>
              <div className="text-3xl font-bold">{totalCount}</div>
              <div className="text-xs text-gray-400 mt-1">期待値: 1,200</div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">重量帯数</div>
              <div className="text-3xl font-bold">{weightBands.length}</div>
              <div className="text-xs text-gray-400 mt-1">期待値: 60</div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">価格帯数</div>
              <div className="text-3xl font-bold">20</div>
              <div className="text-xs text-gray-400 mt-1">$50-$1,000</div>
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
                    <span className="text-lg font-bold text-orange-600">不足</span>
                  </>
                )}
              </div>
              {!isComplete && (
                <div className="text-xs text-orange-400 mt-1">
                  {missingBands > 0 && `${missingBands}重量帯不足`}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 重量帯リスト */}
      <Card>
        <CardHeader>
          <CardTitle>📦 重量帯一覧（全{weightBands.length}帯）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {weightBands.map(band => (
              <button
                key={band.weight_band_no}
                onClick={() => loadBandDetail(band.weight_band_no)}
                className={`
                  border rounded-lg p-3 text-left transition-all hover:shadow-md
                  ${selectedBand === band.weight_band_no ? 'bg-blue-50 border-blue-500' : 'hover:border-blue-300'}
                  ${band.weight_band_no > 50 ? 'bg-green-50' : ''}
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-lg font-bold text-gray-700">
                    Band {band.weight_band_no}
                  </div>
                  {band.weight_band_no > 50 && (
                    <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">
                      NEW
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  {band.weight_from_kg}-{band.weight_to_kg}kg
                </div>
                <div className="text-xs text-gray-500">
                  Base: ${band.avg_base_shipping.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {band.policy_count}ポリシー
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 詳細表示 */}
      {selectedBand && detailPolicies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              📋 Band {selectedBand} の詳細 
              ({detailPolicies[0].weight_from_kg}-{detailPolicies[0].weight_to_kg}kg)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">ポリシー名</th>
                    <th className="px-4 py-2 text-right">商品価格</th>
                    <th className="px-4 py-2 text-right">Base送料</th>
                    <th className="px-4 py-2 text-right">DDP追加</th>
                    <th className="px-4 py-2 text-right">合計送料</th>
                    <th className="px-4 py-2 text-center">状態</th>
                  </tr>
                </thead>
                <tbody>
                  {detailPolicies.map(policy => (
                    <tr key={policy.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs">
                        {policy.policy_name}
                      </td>
                      <td className="px-4 py-2 text-right">
                        ${policy.product_price_usd}
                      </td>
                      <td className="px-4 py-2 text-right">
                        ${parseFloat(policy.usa_base_shipping_usd).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right text-green-600">
                        ${parseFloat(policy.usa_ddp_additional_usd).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right font-bold">
                        ${parseFloat(policy.usa_total_shipping_usd).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`
                          text-xs px-2 py-1 rounded
                          ${policy.ebay_policy_status === 'created' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-600'}
                        `}>
                          {policy.ebay_policy_status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* アクション */}
      {!isComplete && (
        <Card className="bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-orange-900 mb-1">
                  ⚠️ データが不完全です
                </h3>
                <p className="text-sm text-orange-700">
                  {missingBands > 0 && `${missingBands}個の重量帯が不足しています。`}
                  スクリプトを実行して完成させてください。
                </p>
              </div>
              <Button
                onClick={() => {
                  window.open('/api/generate-weight-bands', '_blank')
                }}
                className="bg-orange-600 hover:bg-orange-700"
              >
                データ生成を実行
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
