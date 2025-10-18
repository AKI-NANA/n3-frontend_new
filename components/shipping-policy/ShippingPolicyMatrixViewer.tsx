'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Package, RefreshCw, Filter, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface MatrixRow {
  band_no: number
  weight_from: number
  weight_to: number
  zone: string
  prices: { [priceRange: string]: number }
}

export function ShippingPolicyMatrixViewer() {
  const [matrixData, setMatrixData] = useState<MatrixRow[]>([])
  const [priceColumns, setPriceColumns] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    let debugLog = ''

    try {
      const supabase = createClient()
      debugLog += 'データ取得開始\n'

      const { data: rateData, error: rateError } = await supabase
        .from('ebay_rate_table_entries_v2')
        .select('weight_band_no, weight_from_kg, weight_to_kg, country_code, recommended_price_usd')
        .eq('rate_table_name', 'RT_Express_V2')
        .order('weight_band_no')

      if (rateError) throw rateError
      if (!rateData || rateData.length === 0) throw new Error('データなし')

      debugLog += `取得: ${rateData.length}件\n`

      // 価格範囲
      const prices = rateData.map(r => parseFloat(r.recommended_price_usd.toString()))
      const maxPrice = Math.max(...prices)
      const priceRanges: number[] = []
      for (let p = 0; p <= Math.ceil(maxPrice / 10) * 10; p += 10) {
        priceRanges.push(p)
      }
      setPriceColumns(priceRanges)
      debugLog += `価格カラム: ${priceRanges.length}個\n`

      // 重量帯ごとにグループ化
      const bandMap = new Map<number, any[]>()
      rateData.forEach(entry => {
        const bandNo = entry.weight_band_no
        if (!bandMap.has(bandNo)) {
          bandMap.set(bandNo, [])
        }
        bandMap.get(bandNo)!.push({
          ...entry,
          recommended_price_usd: parseFloat(entry.recommended_price_usd.toString())
        })
      })
      debugLog += `重量帯グループ: ${bandMap.size}個\n`

      // 全60個のマトリックス生成
      const matrix: MatrixRow[] = []
      for (let bandNo = 1; bandNo <= 60; bandNo++) {
        const entries = bandMap.get(bandNo)
        
        if (!entries || entries.length === 0) {
          debugLog += `警告: Band ${bandNo} データなし\n`
          continue
        }

        const firstEntry = entries[0]
        const zone = getZoneLabel(parseFloat(firstEntry.weight_to_kg))

        // 価格分布を計算
        const priceDistribution: { [key: string]: number } = {}
        priceRanges.forEach((priceThreshold, idx) => {
          const nextThreshold = idx < priceRanges.length - 1 ? priceRanges[idx + 1] : Infinity
          const count = entries.filter(e => {
            const price = e.recommended_price_usd
            return price >= priceThreshold && price < nextThreshold
          }).length
          priceDistribution[priceThreshold.toString()] = count
        })

        matrix.push({
          band_no: bandNo,
          weight_from: parseFloat(firstEntry.weight_from_kg),
          weight_to: parseFloat(firstEntry.weight_to_kg),
          zone,
          prices: priceDistribution
        })
      }

      debugLog += `マトリックス生成: ${matrix.length}行\n`
      setDebugInfo(debugLog)
      setMatrixData(matrix)
      setLoading(false)

    } catch (err: any) {
      console.error('エラー:', err)
      debugLog += `エラー: ${err.message}\n`
      setDebugInfo(debugLog)
      setError(err.message)
      setLoading(false)
    }
  }

  const getZoneLabel = (weightTo: number): string => {
    if (weightTo <= 10) return 'Zone 1'
    if (weightTo <= 20) return 'Zone 2'
    if (weightTo <= 30) return 'Zone 3'
    if (weightTo <= 50) return 'Zone 4'
    return 'Zone 5'
  }

  const getZoneColor = (zone: string) => {
    if (zone === 'Zone 1') return 'bg-green-50'
    if (zone === 'Zone 2') return 'bg-blue-50'
    if (zone === 'Zone 3') return 'bg-yellow-50'
    if (zone === 'Zone 4') return 'bg-orange-50'
    return 'bg-red-50'
  }

  const getZoneBadgeColor = (zone: string) => {
    if (zone === 'Zone 1') return 'bg-green-600'
    if (zone === 'Zone 2') return 'bg-blue-600'
    if (zone === 'Zone 3') return 'bg-yellow-600'
    if (zone === 'Zone 4') return 'bg-orange-600'
    return 'bg-red-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">データ読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div>{error}</div>
          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded">{debugInfo}</pre>
          <Button onClick={loadData} variant="outline" size="sm" className="mt-2">
            再読み込み
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">
          Rate Table マトリックス
        </h2>
        <p className="text-sm">
          {matrixData.length}重量帯 × {priceColumns.length}価格帯
        </p>
      </div>

      {/* デバッグ情報 */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>読み込み完了:</strong> {matrixData.length}行のデータ
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-blue-600">デバッグ情報</summary>
            <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">{debugInfo}</pre>
          </details>
        </AlertDescription>
      </Alert>

      {/* マトリックステーブル */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Rate Table マトリックス（縦: {matrixData.length}重量帯、横: {priceColumns.length}価格帯）</span>
            <Button onClick={loadData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              再読み込み
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 sticky left-0 bg-gray-100 z-10">重量帯</th>
                  <th className="border p-2 sticky left-[70px] bg-gray-100 z-10">ゾーン</th>
                  {priceColumns.map((price, idx) => (
                    <th key={idx} className="border p-1 text-center">
                      ${price}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixData.map((row) => (
                  <tr key={row.band_no} className={getZoneColor(row.zone)}>
                    <td className="border p-1 sticky left-0 z-10 font-medium bg-inherit text-xs whitespace-nowrap">
                      {row.weight_from}-{row.weight_to}kg
                    </td>
                    <td className="border p-1 sticky left-[70px] z-10 bg-inherit">
                      <Badge className={`${getZoneBadgeColor(row.zone)} text-xs py-0 px-1`}>
                        {row.zone}
                      </Badge>
                    </td>
                    {priceColumns.map((price, idx) => {
                      const count = row.prices?.[price.toString()] || 0
                      return (
                        <td key={idx} className="border p-1 text-center">
                          {count > 0 ? (
                            <span className="font-semibold text-green-700 text-xs">{count}</span>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 説明 */}
          <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
            <p><strong>📊 このマトリックスは:</strong></p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• 縦軸: 60個の重量帯（0-70kg）</li>
              <li>• 横軸: 価格帯（$0, $10, $20...）</li>
              <li>• 数値: その価格帯に該当する国数</li>
              <li>• 各行の合計 = 176カ国</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 配送ポリシー推奨 */}
      <Card className="border-2 border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="text-purple-900">🎯 次のステップ: 配送ポリシー生成</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="bg-white p-3 rounded">
              <p className="font-semibold">USA DDP: 60個</p>
              <p className="text-xs text-gray-600">各重量帯ごと、DDP上乗せあり</p>
            </div>
            <div className="bg-white p-3 rounded">
              <p className="font-semibold">その他DDU: 60個</p>
              <p className="text-xs text-gray-600">Rate Table参照、除外国77カ国</p>
            </div>
            <div className="bg-white p-3 rounded border-2 border-purple-300">
              <p className="text-lg font-bold text-purple-900">
                📦 合計: <span className="text-2xl">120個</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
