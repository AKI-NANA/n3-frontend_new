'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Download } from 'lucide-react'

interface MatrixData {
  id: number
  weight_band_number: number
  weight_min: number
  weight_max: number
  weight_label: string
  price_band_number: number
  price_min: number
  price_max: number
  price_label: string
  shipping_cost: number
  policy_name: string
}

export function DdpMatrixExcelView() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<MatrixData[]>([])
  const [error, setError] = useState<string | null>(null)

  // 60重量帯のヘッダー
  const weightBands = Array.from({ length: 60 }, (_, i) => ({
    number: i + 1,
    min: i * 0.5,
    max: (i + 1) * 0.5,
    label: `${(i * 0.5).toFixed(1)}-${((i + 1) * 0.5).toFixed(1)}`
  }))

  // 20価格帯のヘッダー
  const priceBands = Array.from({ length: 20 }, (_, i) => {
    const min = 50 + (i * 175)
    const max = 50 + ((i + 1) * 175)
    return {
      number: i + 1,
      min,
      max,
      label: `$${min}-${max}`
    }
  })

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/supabase/table-detail?table=ebay_ddp_surcharge_matrix')
      const result = await response.json()

      if (result.success) {
        // 全データを取得（サンプルではなく）
        const fullResponse = await fetch('/api/shipping-policy/get-matrix-data')
        const fullResult = await fullResponse.json()
        
        if (fullResult.success) {
          setData(fullResult.data)
        } else {
          setError('データ取得に失敗しました')
        }
      } else {
        setError(result.error || 'データ取得に失敗しました')
      }
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  // 特定の重量帯と価格帯の送料を取得
  const getShippingCost = (weightBand: number, priceBand: number): number | null => {
    const record = data.find(
      d => d.weight_band_number === weightBand && d.price_band_number === priceBand
    )
    return record ? record.shipping_cost : null
  }

  // ヒートマップの色を計算
  const getCellColor = (cost: number | null): string => {
    if (!cost) return 'bg-gray-100'
    if (cost < 20) return 'bg-green-100'
    if (cost < 30) return 'bg-yellow-100'
    if (cost < 50) return 'bg-orange-100'
    return 'bg-red-100'
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">USA DDP配送コストマトリックス（Excel風）</h2>
          <p className="text-gray-600">縦: 60重量帯 × 横: 20価格帯 = 1,200通りの送料</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            更新
          </button>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            CSV出力
          </button>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-300 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* 統計情報 */}
      {data.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <div className="text-sm text-gray-600">総レコード数</div>
            <div className="text-2xl font-bold">{data.length}</div>
          </div>
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <div className="text-sm text-gray-600">重量帯</div>
            <div className="text-2xl font-bold">60帯</div>
          </div>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <div className="text-sm text-gray-600">価格帯</div>
            <div className="text-2xl font-bold">20帯</div>
          </div>
          <div className="p-4 bg-purple-50 border border-purple-200 rounded">
            <div className="text-sm text-gray-600">送料範囲</div>
            <div className="text-2xl font-bold">
              ${Math.min(...data.map(d => d.shipping_cost)).toFixed(0)}-
              ${Math.max(...data.map(d => d.shipping_cost)).toFixed(0)}
            </div>
          </div>
        </div>
      )}

      {/* マトリックス表 */}
      {data.length > 0 && (
        <div className="border rounded-lg overflow-hidden bg-white">
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-100 z-10">
                <tr>
                  <th className="sticky left-0 z-20 bg-gray-200 border p-2 min-w-[100px]">
                    重量 \ 価格
                  </th>
                  {priceBands.map(price => (
                    <th key={price.number} className="border p-2 min-w-[80px] text-center">
                      <div className="font-semibold">{price.label}</div>
                      <div className="text-gray-500 font-normal">P{price.number}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weightBands.map(weight => (
                  <tr key={weight.number} className="hover:bg-gray-50">
                    <th className="sticky left-0 bg-gray-100 border p-2 text-left">
                      <div className="font-semibold">{weight.label} lbs</div>
                      <div className="text-gray-500 font-normal">W{weight.number}</div>
                    </th>
                    {priceBands.map(price => {
                      const cost = getShippingCost(weight.number, price.number)
                      return (
                        <td
                          key={`${weight.number}-${price.number}`}
                          className={`border p-2 text-center ${getCellColor(cost)}`}
                        >
                          {cost ? (
                            <div>
                              <div className="font-semibold">${cost.toFixed(2)}</div>
                            </div>
                          ) : (
                            <div className="text-gray-400">-</div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 凡例 */}
      {data.length > 0 && (
        <div className="p-4 bg-gray-50 border rounded">
          <h3 className="font-bold mb-2">ヒートマップ凡例</h3>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border"></div>
              <span>&lt; $20</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border"></div>
              <span>$20-$30</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-100 border"></div>
              <span>$30-$50</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border"></div>
              <span>&gt; $50</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
