'use client'

import React, { useState, useEffect } from 'react'
import { Calculator, Loader2, TrendingUp, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ProfitCalculation {
  policy_number: number
  policy_name: string
  pricing_basis: string
  zone_code: string
  zone_name: string
  product_price: number
  cost_price_jpy: number
  cost_price_usd: number
  actual_shipping_cost: number
  display_shipping: number
  handling_fee: number
  total_revenue: number
  unrecovered_cost: number
  final_profit: number
  profit_margin_percent: number
}

export function ProfitAnalysisTab() {
  const [calculations, setCalculations] = useState<ProfitCalculation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPolicy, setSelectedPolicy] = useState<number>(1)

  useEffect(() => {
    loadProfitAnalysis()
  }, [])

  const loadProfitAnalysis = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // 仕入れ値を5,000円、為替レート150円と仮定
      const COST_PRICE_JPY = 5000
      const EXCHANGE_RATE = 150
      const COST_PRICE_USD = COST_PRICE_JPY / EXCHANGE_RATE

      const { data: zones, error: zonesError } = await supabase
        .from('ebay_policy_zone_rates_v2')
        .select(`
          *,
          policy:ebay_shipping_policies_v2(policy_number, policy_name, sample_product_price, pricing_basis)
        `)
        .eq('zone_type', 'OTHER')
        .order('policy_id')
        .order('zone_code')

      if (zonesError) throw zonesError

      const calcs: ProfitCalculation[] = zones.map(z => {
        const productPrice = z.policy.sample_product_price
        const totalRevenue = z.display_shipping_usd + z.handling_fee_usd
        const unrecoveredCost = z.actual_cost_usd - totalRevenue
        const finalProfit = productPrice - COST_PRICE_USD - unrecoveredCost
        const profitMarginPercent = (finalProfit / productPrice) * 100

        return {
          policy_number: z.policy.policy_number,
          policy_name: z.policy.policy_name,
          pricing_basis: z.policy.pricing_basis,
          zone_code: z.zone_code,
          zone_name: z.zone_name,
          product_price: productPrice,
          cost_price_jpy: COST_PRICE_JPY,
          cost_price_usd: COST_PRICE_USD,
          actual_shipping_cost: z.actual_cost_usd,
          display_shipping: z.display_shipping_usd,
          handling_fee: z.handling_fee_usd,
          total_revenue: totalRevenue,
          unrecovered_cost: unrecoveredCost,
          final_profit: finalProfit,
          profit_margin_percent: profitMarginPercent
        }
      })

      setCalculations(calcs)
    } catch (error) {
      console.error('Failed to load profit analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  // ポリシー番号でフィルター
  const filteredCalcs = calculations.filter(c => c.policy_number === selectedPolicy)

  // ユニークなポリシーリスト（DDP優先、その後DDU、番号順）
  const uniquePolicies = Array.from(
    new Map(calculations.map(c => [c.policy_number, c])).values()
  ).sort((a, b) => {
    if (a.pricing_basis === 'DDP' && b.pricing_basis !== 'DDP') return -1
    if (a.pricing_basis !== 'DDP' && b.pricing_basis === 'DDP') return 1
    return a.policy_number - b.policy_number
  })

  // 統計情報
  const stats = filteredCalcs.length > 0 ? {
    avgProfit: filteredCalcs.reduce((sum, c) => sum + c.final_profit, 0) / filteredCalcs.length,
    minProfit: Math.min(...filteredCalcs.map(c => c.final_profit)),
    maxProfit: Math.max(...filteredCalcs.map(c => c.final_profit)),
    avgMargin: filteredCalcs.reduce((sum, c) => sum + c.profit_margin_percent, 0) / filteredCalcs.length,
    minMargin: Math.min(...filteredCalcs.map(c => c.profit_margin_percent)),
    maxMargin: Math.max(...filteredCalcs.map(c => c.profit_margin_percent))
  } : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-600">利益率を計算中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calculator className="w-7 h-7 text-indigo-600" />
            全ZONE利益率シミュレーション
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            22 ZONE × 各ポリシーの詳細利益計算
          </p>
        </div>
      </div>

      {/* ポリシー選択 */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          ポリシーを選択
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {uniquePolicies.map(policy => (
            <button
              key={policy.policy_number}
              onClick={() => setSelectedPolicy(policy.policy_number)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPolicy === policy.policy_number
                  ? 'bg-indigo-600 text-white'
                  : policy.pricing_basis === 'DDP'
                  ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              }`}
            >
              No.{policy.policy_number}
              <div className="text-xs mt-0.5">
                {policy.pricing_basis}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* サマリー統計 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">平均利益</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              ${stats.avgProfit.toFixed(2)}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              範囲: ${stats.minProfit.toFixed(2)} 〜 ${stats.maxProfit.toFixed(2)}
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-2 border-green-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold text-green-800">平均利益率</span>
            </div>
            <div className="text-2xl font-bold text-green-900">
              {stats.avgMargin.toFixed(2)}%
            </div>
            <div className="text-xs text-green-600 mt-1">
              範囲: {stats.minMargin.toFixed(2)}% 〜 {stats.maxMargin.toFixed(2)}%
            </div>
          </div>

          <div className={`rounded-lg border-2 p-4 ${
            Math.abs(stats.maxMargin - stats.minMargin) < 0.01
              ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'
              : 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200'
          }`}>
            <div className="text-sm font-semibold mb-2">
              利益率の統一性
            </div>
            <div className="text-2xl font-bold">
              {Math.abs(stats.maxMargin - stats.minMargin) < 0.01 ? '✅ 完全統一' : '⚠️ 変動あり'}
            </div>
            <div className="text-xs mt-1">
              差異: {Math.abs(stats.maxMargin - stats.minMargin).toFixed(4)}%
            </div>
          </div>
        </div>
      )}

      {/* 詳細計算表 */}
      <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 border-b-2 border-gray-300">
              <tr>
                <th className="px-3 py-3 text-left font-semibold text-gray-700 sticky left-0 bg-gray-100 z-10 border-r-2 border-gray-300">
                  ZONE
                </th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700 min-w-[180px]">
                  国/地域名
                </th>
                <th className="px-3 py-3 text-right font-semibold text-gray-700">
                  商品価格
                </th>
                <th className="px-3 py-3 text-right font-semibold text-gray-700">
                  仕入れ値
                </th>
                <th className="px-3 py-3 text-right font-semibold text-gray-700 bg-red-50">
                  実費送料
                </th>
                <th className="px-3 py-3 text-right font-semibold text-gray-700 bg-blue-50">
                  表示送料
                </th>
                <th className="px-3 py-3 text-right font-semibold text-gray-700 bg-blue-50">
                  手数料
                </th>
                <th className="px-3 py-3 text-right font-semibold text-gray-700 bg-blue-50">
                  回収合計
                </th>
                <th className="px-3 py-3 text-right font-semibold text-gray-700 bg-orange-50">
                  回収不足
                </th>
                <th className="px-3 py-3 text-right font-semibold text-gray-700 bg-green-50">
                  最終利益
                </th>
                <th className="px-3 py-3 text-right font-semibold text-gray-700 bg-green-100">
                  利益率
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCalcs.map((calc, idx) => (
                <tr key={`${calc.zone_code}-${idx}`} className={`border-b border-gray-200 ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                } hover:bg-indigo-50`}>
                  <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 z-10 bg-inherit border-r-2 border-gray-300">
                    {calc.zone_code}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {calc.zone_name}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-700">
                    ${calc.product_price.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    ${calc.cost_price_usd.toFixed(2)}
                    <div className="text-xs text-gray-500">¥{calc.cost_price_jpy}</div>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-red-700 bg-red-50">
                    ${calc.actual_shipping_cost.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-blue-700 bg-blue-50">
                    ${calc.display_shipping.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right text-blue-700 bg-blue-50">
                    ${calc.handling_fee.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-blue-800 bg-blue-50">
                    ${calc.total_revenue.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-orange-700 bg-orange-50">
                    ${calc.unrecovered_cost.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-green-700 bg-green-50">
                    ${calc.final_profit.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-green-800 bg-green-100">
                    {calc.profit_margin_percent.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 計算式の説明 */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-3">📊 計算ロジック</h4>
        <div className="text-sm text-blue-700 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded p-3">
              <div className="font-semibold mb-1">① 回収合計</div>
              <code className="text-xs">表示送料 + 手数料</code>
            </div>
            <div className="bg-white rounded p-3">
              <div className="font-semibold mb-1">② 回収不足額</div>
              <code className="text-xs">実費送料 - 回収合計</code>
            </div>
            <div className="bg-white rounded p-3">
              <div className="font-semibold mb-1">③ 最終利益</div>
              <code className="text-xs">商品価格 - 仕入れ値 - 回収不足額</code>
            </div>
            <div className="bg-white rounded p-3">
              <div className="font-semibold mb-1">④ 利益率</div>
              <code className="text-xs">(最終利益 / 商品価格) × 100</code>
            </div>
          </div>
          <div className="mt-3 p-3 bg-green-100 rounded">
            <p className="font-semibold text-green-800">✅ 重要ポイント</p>
            <p className="text-green-700 text-xs mt-1">
              差額調整により、「回収不足額」が全ZONE同額になるため、
              <strong>最終利益率も全ZONE統一</strong>されます。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
