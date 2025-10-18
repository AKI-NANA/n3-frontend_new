'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Package, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface MatrixRow {
  band_no: number
  weight_from: number
  weight_to: number
  zone: string
  prices: { [price: string]: number }
}

export function RateTableMatrix60() {
  const [matrixData, setMatrixData] = useState<MatrixRow[]>([])
  const [priceColumns, setPriceColumns] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // 全データを取得（10,560件）
      let allData: any[] = []
      let from = 0
      const pageSize = 1000

      while (true) {
        const { data, error } = await supabase
          .from('ebay_rate_table_entries_v2')
          .select('weight_band_no, weight_from_kg, weight_to_kg, recommended_price_usd')
          .eq('rate_table_name', 'RT_Express_V2')
          .range(from, from + pageSize - 1)
          .order('weight_band_no')

        if (error) throw error
        if (!data || data.length === 0) break

        allData = [...allData, ...data]
        if (data.length < pageSize) break
        from += pageSize
      }

      console.log('全データ取得:', allData.length, '件')

      // 価格カラム生成（$0から$1000まで）
      const priceRanges: number[] = []
      // $0-$100: $10刻み
      for (let p = 0; p <= 100; p += 10) {
        priceRanges.push(p)
      }
      // $100-$200: $20刻み
      for (let p = 120; p <= 200; p += 20) {
        priceRanges.push(p)
      }
      // $200-$500: $50刻み
      for (let p = 250; p <= 500; p += 50) {
        priceRanges.push(p)
      }
      // $500-$1000: $100刻み
      for (let p = 600; p <= 1000; p += 100) {
        priceRanges.push(p)
      }
      setPriceColumns(priceRanges)
      console.log('価格カラム:', priceRanges.length, '個')

      // 重量帯ごとにグループ化
      const bandMap = new Map<number, any[]>()
      allData.forEach(entry => {
        const bandNo = entry.weight_band_no
        if (!bandMap.has(bandNo)) {
          bandMap.set(bandNo, [])
        }
        bandMap.get(bandNo)!.push(entry)
      })
      console.log('重量帯数:', bandMap.size)

      // マトリックス生成
      const matrix: MatrixRow[] = []
      for (let bandNo = 1; bandNo <= 60; bandNo++) {
        const entries = bandMap.get(bandNo)
        if (!entries || entries.length === 0) {
          console.warn(`Band ${bandNo}: データなし`)
          continue
        }

        const firstEntry = entries[0]
        const zone = getZoneLabel(parseFloat(firstEntry.weight_to_kg))

        // 価格分布を計算
        const priceDistribution: { [key: string]: number } = {}
        priceRanges.forEach((priceThreshold, idx) => {
          const nextThreshold = idx < priceRanges.length - 1 ? priceRanges[idx + 1] : Infinity
          const count = entries.filter((e: any) => {
            const price = parseFloat(e.recommended_price_usd)
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

      console.log('マトリックス:', matrix.length, '行')
      setMatrixData(matrix)
      setLoading(false)
    } catch (err: any) {
      console.error(err)
      setError(err.message)
      setLoading(false)
    }
  }

  const getZoneLabel = (weightTo: number): string => {
    if (weightTo <= 10) return 'Z1'
    if (weightTo <= 20) return 'Z2'
    if (weightTo <= 30) return 'Z3'
    if (weightTo <= 50) return 'Z4'
    return 'Z5'
  }

  const getZoneColor = (zone: string) => {
    const colors: Record<string, string> = {
      'Z1': 'bg-green-50',
      'Z2': 'bg-blue-50',
      'Z3': 'bg-yellow-50',
      'Z4': 'bg-orange-50',
      'Z5': 'bg-red-50'
    }
    return colors[zone] || 'bg-gray-50'
  }

  const getZoneBadgeColor = (zone: string) => {
    const colors: Record<string, string> = {
      'Z1': 'bg-green-600',
      'Z2': 'bg-blue-600',
      'Z3': 'bg-yellow-600',
      'Z4': 'bg-orange-600',
      'Z5': 'bg-red-600'
    }
    return colors[zone] || 'bg-gray-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">10,560件のデータを読み込んでいます...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          エラー: {error}
          <Button onClick={loadData} variant="outline" size="sm" className="ml-2">
            再読み込み
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Package className="w-6 h-6" />
          Rate Table マトリックス（60重量帯 × 価格分布）
        </h2>
        <p className="text-sm">
          60重量帯 × 176カ国 = 10,560レート
        </p>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-purple-600">{matrixData.length}</div>
            <div className="text-sm text-gray-600">重量帯</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-blue-600">176</div>
            <div className="text-sm text-gray-600">カ国</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">{priceColumns.length}</div>
            <div className="text-sm text-gray-600">価格帯</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-orange-600">10,560</div>
            <div className="text-sm text-gray-600">総レート</div>
          </CardContent>
        </Card>
      </div>

      {/* マトリックス */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Rate Table マトリックス（縦: 60、横: {priceColumns.length}）</span>
            <Button onClick={loadData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              再読み込み
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-[800px] overflow-y-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-white z-20">
                <tr className="bg-gray-100">
                  <th className="border p-1 sticky left-0 bg-gray-100 z-30 text-xs">重量帯</th>
                  <th className="border p-1 sticky left-[60px] bg-gray-100 z-30 text-xs">ゾーン</th>
                  {priceColumns.map((price, idx) => (
                    <th key={idx} className="border p-1 text-center text-xs whitespace-nowrap">
                      ${price}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixData.map((row) => (
                  <tr key={row.band_no} className={getZoneColor(row.zone)}>
                    <td className="border p-1 sticky left-0 z-10 font-medium bg-inherit text-xs whitespace-nowrap">
                      {row.weight_from.toFixed(1)}-{row.weight_to.toFixed(1)}kg
                    </td>
                    <td className="border p-1 sticky left-[60px] z-10 bg-inherit">
                      <Badge className={`${getZoneBadgeColor(row.zone)} text-xs py-0 px-1`}>
                        {row.zone}
                      </Badge>
                    </td>
                    {priceColumns.map((price, idx) => {
                      const count = row.prices[price.toString()] || 0
                      return (
                        <td key={idx} className="border p-1 text-center">
                          {count > 0 ? (
                            <span className="font-semibold text-green-700 text-xs">{count}</span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 配送ポリシー推奨 */}
      <Card className="border-2 border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="text-purple-900">🎯 配送ポリシー生成案</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-white p-3 rounded">
            <p className="font-semibold">USA DDP: 60個</p>
            <p className="text-xs text-gray-600">各重量帯 × DDP上乗せ、2個目同額</p>
          </div>
          <div className="bg-white p-3 rounded">
            <p className="font-semibold">その他DDU: 60個</p>
            <p className="text-xs text-gray-600">Rate Table参照、除外国77カ国、2個目同額</p>
          </div>
          <div className="bg-white p-4 rounded border-2 border-purple-300">
            <p className="text-xl font-bold text-purple-900">
              📦 合計: <span className="text-3xl">120個</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
