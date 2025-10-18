'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileSpreadsheet, Download, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ShippingRate {
  weight_band_no: number
  weight_from_kg: number
  weight_to_kg: number
  usa_shipping_usd: number
}

export function DDPCostMatrix() {
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([])
  const [loading, setLoading] = useState(true)

  // 商品価格帯（DDP費用計算用）
  // $100-$500: $50刻み、$500-$1000: $100刻み、$1000-$3500: $500刻み
  const productPrices = [
    50, 100, 150, 200, 250, 300, 350, 400, 450, 500, // $50-$500: $50刻み (10個)
    600, 700, 800, 900, 1000, // $500-$1000: $100刻み (5個)
    1500, 2000, 2500, 3000, 3500 // $1000-$3500: $500刻み (5個)
  ]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // USA送料データを取得（60重量帯）
      // 実際のUSA送料データがない場合は推定値を使用
      const rates: ShippingRate[] = []
      
      // Zone 1: 0-10kg (500g刻み) - 20個
      for (let i = 0; i < 20; i++) {
        const weightFrom = i * 0.5
        const weightTo = (i + 1) * 0.5
        rates.push({
          weight_band_no: i + 1,
          weight_from_kg: weightFrom,
          weight_to_kg: weightTo,
          usa_shipping_usd: 20 + (i * 2) // 推定: $20から$2ずつ増加
        })
      }

      // Zone 2: 10-20kg (1kg刻み) - 10個
      for (let i = 0; i < 10; i++) {
        const weightFrom = 10 + i
        const weightTo = 11 + i
        rates.push({
          weight_band_no: 21 + i,
          weight_from_kg: weightFrom,
          weight_to_kg: weightTo,
          usa_shipping_usd: 60 + (i * 5) // 推定: $60から$5ずつ増加
        })
      }

      // Zone 3: 20-30kg (1kg刻み) - 10個
      for (let i = 0; i < 10; i++) {
        const weightFrom = 20 + i
        const weightTo = 21 + i
        rates.push({
          weight_band_no: 31 + i,
          weight_from_kg: weightFrom,
          weight_to_kg: weightTo,
          usa_shipping_usd: 110 + (i * 6) // 推定: $110から$6ずつ増加
        })
      }

      // Zone 4: 30-50kg (2kg刻み) - 10個
      for (let i = 0; i < 10; i++) {
        const weightFrom = 30 + (i * 2)
        const weightTo = 32 + (i * 2)
        rates.push({
          weight_band_no: 41 + i,
          weight_from_kg: weightFrom,
          weight_to_kg: weightTo,
          usa_shipping_usd: 170 + (i * 10) // 推定: $170から$10ずつ増加
        })
      }

      // Zone 5: 50-70kg (2kg刻み) - 10個
      for (let i = 0; i < 10; i++) {
        const weightFrom = 50 + (i * 2)
        const weightTo = 52 + (i * 2)
        rates.push({
          weight_band_no: 51 + i,
          weight_from_kg: weightFrom,
          weight_to_kg: weightTo,
          usa_shipping_usd: 270 + (i * 15) // 推定: $270から$15ずつ増加
        })
      }

      setShippingRates(rates)
      setLoading(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const calculateDDP = (productPrice: number) => {
    const duty = productPrice * 0.065 // 関税6.5%
    const tax = productPrice * 0.08 // 消費税8%
    return duty + tax
  }

  const getZoneColor = (weightTo: number) => {
    if (weightTo <= 10) return 'bg-green-50'
    if (weightTo <= 20) return 'bg-blue-50'
    if (weightTo <= 30) return 'bg-yellow-50'
    if (weightTo <= 50) return 'bg-orange-50'
    return 'bg-red-50'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>データ読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6" />
          USA DDP配送コスト マトリックス（Excel風）
        </h2>
        <p className="text-sm opacity-90">
          縦: 60重量帯 × 横: 商品価格$50-$3,500（$3,000の110%までカバー）
        </p>
      </div>

      {/* 説明 */}
      <Alert>
        <AlertDescription>
          <strong>マトリックスの見方:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• <strong>縦軸</strong>: 60個の重量帯（0-70kg）</li>
            <li>• <strong>横軸</strong>: 商品価格（$50-$3,500）→ $3,000の110%までカバー</li>
            <li>• <strong>上段</strong>: USA基本送料</li>
            <li>• <strong>下段</strong>: 総配送コスト（送料 + DDP費用）</li>
            <li>• <strong>DDP費用</strong>: 関税6.5% + 消費税8% = 商品価格の14.5%</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* コントロール */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {shippingRates.length}重量帯 × {productPrices.length}価格帯 = {shippingRates.length * productPrices.length}セル
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            再読み込み
          </Button>
          <Button variant="default" size="sm">
            <Download className="w-4 h-4 mr-2" />
            CSVダウンロード
          </Button>
        </div>
      </div>

      {/* Excel風マトリックステーブル */}
      <Card>
        <CardHeader>
          <CardTitle>USA DDP総配送コスト表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-[700px] overflow-y-auto border rounded-lg">
            <table className="w-full border-collapse bg-white" style={{ fontSize: '11px' }}>
              {/* ヘッダー */}
              <thead className="sticky top-0 bg-gray-100 z-20">
                <tr>
                  <th className="border border-gray-300 p-1 sticky left-0 bg-gray-100 z-30 min-w-[80px]">
                    <div className="font-bold">重量帯</div>
                  </th>
                  {productPrices.map((price, idx) => (
                    <th key={idx} className="border border-gray-300 p-1 text-center min-w-[100px]">
                      <div className="font-bold text-purple-700">
                        商品価格
                      </div>
                      <div className="font-bold text-lg">
                        ${price}
                      </div>
                      <div className="text-xs text-gray-500">
                        DDP: ${calculateDDP(price).toFixed(0)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* ボディ */}
              <tbody>
                {shippingRates.map((rate) => (
                  <tr key={rate.weight_band_no} className={getZoneColor(rate.weight_to_kg)}>
                    {/* 重量帯（固定列） */}
                    <td className="border border-gray-300 p-1 sticky left-0 bg-inherit z-10 font-medium">
                      <div className="text-xs">
                        {rate.weight_from_kg.toFixed(1)}-
                      </div>
                      <div className="text-xs">
                        {rate.weight_to_kg.toFixed(1)}kg
                      </div>
                    </td>

                    {/* 各商品価格での配送コスト */}
                    {productPrices.map((price, idx) => {
                      const ddpCost = calculateDDP(price)
                      const totalCost = rate.usa_shipping_usd + ddpCost

                      return (
                        <td key={idx} className="border border-gray-300 p-1 text-center">
                          {/* 上段: USA送料 */}
                          <div className="text-blue-600 font-semibold">
                            ${rate.usa_shipping_usd.toFixed(2)}
                          </div>
                          {/* 区切り線 */}
                          <div className="border-t border-gray-300 my-0.5"></div>
                          {/* 下段: 総配送コスト */}
                          <div className={`font-bold ${
                            totalCost > 100 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            ${totalCost.toFixed(2)}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 凡例 */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">📖 凡例</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-blue-600">上段（青）: USA基本送料</p>
                <p className="text-xs text-gray-600">重量のみで決まる送料</p>
              </div>
              <div>
                <p className="font-semibold text-green-600">下段（緑/赤）: 総配送コスト</p>
                <p className="text-xs text-gray-600">基本送料 + DDP費用（関税6.5% + 消費税8%）</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-2 text-xs">
              <div className="bg-green-50 p-2 rounded">Zone 1: 0-10kg</div>
              <div className="bg-blue-50 p-2 rounded">Zone 2: 10-20kg</div>
              <div className="bg-yellow-50 p-2 rounded">Zone 3: 20-30kg</div>
              <div className="bg-orange-50 p-2 rounded">Zone 4: 30-50kg</div>
              <div className="bg-red-50 p-2 rounded">Zone 5: 50-70kg</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 使用例 */}
      <Card className="border-2 border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-900">💡 使用例</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>例1:</strong> 重量0.5kg、商品価格$100の場合</p>
            <div className="bg-white p-3 rounded ml-4">
              <p>→ USA送料: ${shippingRates[0]?.usa_shipping_usd.toFixed(2)}</p>
              <p>→ DDP費用: ${calculateDDP(100).toFixed(2)} (関税$6.50 + 消費税$8.00)</p>
              <p className="font-bold text-green-600">→ 総配送コスト: ${(shippingRates[0]?.usa_shipping_usd + calculateDDP(100)).toFixed(2)}</p>
            </div>

            <p className="mt-3"><strong>例2:</strong> 重量10kg、商品価格$500の場合</p>
            <div className="bg-white p-3 rounded ml-4">
              <p>→ USA送料: ${shippingRates[19]?.usa_shipping_usd.toFixed(2)}</p>
              <p>→ DDP費用: ${calculateDDP(500).toFixed(2)} (関税$32.50 + 消費税$40.00)</p>
              <p className="font-bold text-green-600">→ 総配送コスト: ${(shippingRates[19]?.usa_shipping_usd + calculateDDP(500)).toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
