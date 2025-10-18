'use client'

import React, { useState, useEffect } from 'react'
import { Calculator, TrendingUp, DollarSign, Package, Globe, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface PricingCalculatorV2Props {
  formData: any
  onInputChange: (field: string, value: any) => void
}

export function PricingCalculatorV2({ formData, onInputChange }: PricingCalculatorV2Props) {
  const [targetProfitMargin, setTargetProfitMargin] = useState(30) // 目標利益率
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null)
  const [calculationResult, setCalculationResult] = useState<any>(null)
  const [policies, setPolicies] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadPolicies()
  }, [])

  const loadPolicies = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('ebay_shipping_policies_v2')
        .select('*')
        .order('policy_number')

      if (error) throw error
      setPolicies(data || [])
    } catch (error) {
      console.error('Failed to load policies:', error)
    }
  }

  // ポリシー自動選択
  const autoSelectPolicy = (weight: number, tariffRate: number, targetMargin: number) => {
    // 重量帯で絞り込み
    const filtered = policies.filter(p => 
      weight >= p.weight_min_kg && weight < p.weight_max_kg
    )

    // 関税率で絞り込み
    const tariffFiltered = filtered.filter(p => {
      if (tariffRate <= 0.3) return p.tariff_sample <= 0.3
      if (tariffRate <= 0.5) return p.tariff_sample > 0.3 && p.tariff_sample <= 0.5
      return p.tariff_sample > 0.5
    })

    // DDP優先（目標利益率が低い場合）、DDU優先（高い場合）
    const sorted = tariffFiltered.sort((a, b) => {
      if (targetMargin < 25) {
        // 低利益率 → DDU優先（コスト削減）
        if (a.pricing_basis === 'DDU' && b.pricing_basis === 'DDP') return -1
        if (a.pricing_basis === 'DDP' && b.pricing_basis === 'DDU') return 1
      } else {
        // 高利益率 → DDP優先（顧客満足度）
        if (a.pricing_basis === 'DDP' && b.pricing_basis === 'DDU') return -1
        if (a.pricing_basis === 'DDU' && b.pricing_basis === 'DDP') return 1
      }
      return 0
    })

    return sorted[0] || null
  }

  // 商品価格を逆算
  const calculateProductPrice = async () => {
    if (!formData.costJPY || !formData.weight || !formData.hsCode) {
      alert('仕入れ値、重量、HSコードを入力してください')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // 為替レート取得
      const { data: exchangeData } = await supabase
        .from('ebay_exchange_rates')
        .select('rate_jpy_to_usd')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const exchangeRate = exchangeData?.rate_jpy_to_usd || 150

      // HSコードから関税率取得
      const { data: hsData } = await supabase
        .from('hts_codes_details')
        .select('general_rate_value')
        .eq('hts_code', formData.hsCode)
        .single()

      const tariffRate = parseFloat(hsData?.general_rate_value || '0') / 100

      // ポリシー自動選択
      const policy = autoSelectPolicy(formData.weight, tariffRate, targetProfitMargin)
      
      if (!policy) {
        alert('適切な配送ポリシーが見つかりません')
        setLoading(false)
        return
      }

      setSelectedPolicy(policy)

      // USA ZONEデータ取得
      const { data: usaZone } = await supabase
        .from('ebay_policy_zone_rates_v2')
        .select('*')
        .eq('policy_id', policy.id)
        .eq('zone_type', 'USA')
        .single()

      // OTHER ZONE代表データ取得（FM - Major Europe）
      const { data: otherZone } = await supabase
        .from('ebay_policy_zone_rates_v2')
        .select('*')
        .eq('policy_id', policy.id)
        .eq('zone_code', 'FM')
        .single()

      if (!usaZone || !otherZone) {
        alert('ZONEデータが見つかりません')
        setLoading(false)
        return
      }

      // 仕入れ値（USD）
      const costUSD = formData.costJPY / exchangeRate

      // 消費税還付（概算）
      const taxRefundJPY = (formData.costJPY * 10) / 110
      const taxRefundUSD = taxRefundJPY / exchangeRate

      // 目標利益率から商品価格を逆算
      // 利益率 = (商品価格 - 仕入れ値 - 回収不足額 + 消費税還付) / 商品価格
      // → 商品価格 = (仕入れ値 + 回収不足額 - 消費税還付) / (1 - 利益率)

      // USA ZONEの回収不足額
      const usaUnrecovered = usaZone.actual_cost_usd - (usaZone.display_shipping_usd + usaZone.handling_fee_usd)

      // 商品価格計算
      const productPriceUSD = (costUSD + usaUnrecovered - taxRefundUSD) / (1 - targetProfitMargin / 100)

      // OTHER ZONEの回収不足額（商品価格確定後）
      const otherUnrecovered = otherZone.actual_cost_usd - (otherZone.display_shipping_usd + otherZone.handling_fee_usd)

      // 実際の利益計算
      const usaProfit = productPriceUSD - costUSD - usaUnrecovered + taxRefundUSD
      const usaProfitMargin = (usaProfit / productPriceUSD) * 100

      const otherProfit = productPriceUSD - costUSD - otherUnrecovered + taxRefundUSD
      const otherProfitMargin = (otherProfit / productPriceUSD) * 100

      setCalculationResult({
        productPriceUSD: productPriceUSD.toFixed(2),
        productPriceJPY: (productPriceUSD * exchangeRate).toFixed(0),
        
        usa: {
          actualShipping: usaZone.actual_cost_usd,
          displayShipping: usaZone.display_shipping_usd,
          handling: usaZone.handling_fee_usd,
          unrecovered: usaUnrecovered.toFixed(2),
          profit: usaProfit.toFixed(2),
          profitJPY: (usaProfit * exchangeRate).toFixed(0),
          profitMargin: usaProfitMargin.toFixed(1),
          ddpCosts: usaZone.ddp_costs
        },

        other: {
          actualShipping: otherZone.actual_cost_usd,
          displayShipping: otherZone.display_shipping_usd,
          handling: otherZone.handling_fee_usd,
          unrecovered: otherUnrecovered.toFixed(2),
          profit: otherProfit.toFixed(2),
          profitJPY: (otherProfit * exchangeRate).toFixed(0),
          profitMargin: otherProfitMargin.toFixed(1)
        },

        costUSD: costUSD.toFixed(2),
        costJPY: formData.costJPY,
        taxRefundUSD: taxRefundUSD.toFixed(2),
        taxRefundJPY: taxRefundJPY.toFixed(0),
        exchangeRate
      })

    } catch (error) {
      console.error('Calculation failed:', error)
      alert('計算に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold flex items-center gap-3">
          <Calculator className="w-8 h-8" />
          利益率ベース価格計算エンジン v2.0
        </h2>
        <p className="text-indigo-100 mt-2">
          目標利益率を設定 → 最適ポリシー自動選択 → 商品価格を自動計算
        </p>
      </div>

      {/* 入力フォーム */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基本情報 */}
        <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            基本情報
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                仕入れ値（円）
              </label>
              <input
                type="number"
                value={formData.costJPY || ''}
                onChange={(e) => onInputChange('costJPY', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
                placeholder="50000"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                重量（kg）
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.weight || ''}
                onChange={(e) => onInputChange('weight', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
                placeholder="1.5"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                HSコード
              </label>
              <input
                type="text"
                value={formData.hsCode || ''}
                onChange={(e) => onInputChange('hsCode', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
                placeholder="9023.00.0000"
              />
            </div>
          </div>
        </div>

        {/* 目標利益率設定 */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg shadow-lg border-2 border-green-300 p-6">
          <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            目標利益率設定
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-green-800 mb-2">
                目標利益率（%）
              </label>
              <input
                type="range"
                min="10"
                max="50"
                step="1"
                value={targetProfitMargin}
                onChange={(e) => setTargetProfitMargin(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-center mt-2">
                <span className="text-5xl font-bold text-green-700">
                  {targetProfitMargin}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <button
                onClick={() => setTargetProfitMargin(20)}
                className="px-3 py-2 bg-white border-2 border-green-300 rounded-lg hover:bg-green-50 font-semibold text-sm"
              >
                20%
              </button>
              <button
                onClick={() => setTargetProfitMargin(30)}
                className="px-3 py-2 bg-white border-2 border-green-300 rounded-lg hover:bg-green-50 font-semibold text-sm"
              >
                30%
              </button>
              <button
                onClick={() => setTargetProfitMargin(40)}
                className="px-3 py-2 bg-white border-2 border-green-300 rounded-lg hover:bg-green-50 font-semibold text-sm"
              >
                40%
              </button>
            </div>

            <button
              onClick={calculateProductPrice}
              disabled={loading}
              className="w-full mt-6 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-bold text-lg shadow-lg transform transition hover:scale-105"
            >
              {loading ? '計算中...' : '💰 商品価格を計算'}
            </button>
          </div>
        </div>
      </div>

      {/* 選択されたポリシー */}
      {selectedPolicy && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">📦 選択された配送ポリシー</h4>
          <div className="text-blue-700">
            <strong>No.{selectedPolicy.policy_number}</strong>: {selectedPolicy.policy_name}
          </div>
        </div>
      )}

      {/* 計算結果 */}
      {calculationResult && (
        <div className="space-y-6">
          {/* 商品価格 */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg shadow-xl p-6">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <DollarSign className="w-7 h-7" />
              算出された商品価格
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-purple-200 text-sm">USD</div>
                <div className="text-5xl font-bold">${calculationResult.productPriceUSD}</div>
              </div>
              <div>
                <div className="text-purple-200 text-sm">JPY</div>
                <div className="text-5xl font-bold">¥{calculationResult.productPriceJPY}</div>
              </div>
            </div>
          </div>

          {/* USA vs OTHER比較 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* USA (DDP) */}
            <div className="bg-white rounded-lg shadow-lg border-2 border-indigo-300 p-6">
              <h4 className="text-xl font-bold text-indigo-800 mb-4">🇺🇸 USA (DDP)</h4>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">実費送料:</span>
                  <span className="font-semibold">${calculationResult.usa.actualShipping}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">表示送料:</span>
                  <span className="font-semibold text-blue-600">${calculationResult.usa.displayShipping}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">手数料:</span>
                  <span className="font-semibold text-blue-600">${calculationResult.usa.handling}</span>
                </div>
                <div className="border-t-2 border-gray-200 pt-2 flex justify-between">
                  <span className="text-gray-600">回収不足額:</span>
                  <span className="font-semibold text-red-600">${calculationResult.usa.unrecovered}</span>
                </div>
              </div>

              <div className="mt-6 bg-green-50 rounded-lg p-4 border-2 border-green-300">
                <div className="text-sm text-green-700 mb-1">純利益</div>
                <div className="text-3xl font-bold text-green-800">
                  ¥{calculationResult.usa.profitJPY}
                </div>
                <div className="text-xl font-bold text-green-700 mt-2">
                  利益率: {calculationResult.usa.profitMargin}%
                </div>
              </div>
            </div>

            {/* OTHER (DDU) */}
            <div className="bg-white rounded-lg shadow-lg border-2 border-green-300 p-6">
              <h4 className="text-xl font-bold text-green-800 mb-4">🌍 OTHER (DDU)</h4>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">実費送料:</span>
                  <span className="font-semibold">${calculationResult.other.actualShipping}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">表示送料:</span>
                  <span className="font-semibold text-blue-600">${calculationResult.other.displayShipping}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">手数料:</span>
                  <span className="font-semibold text-blue-600">${calculationResult.other.handling}</span>
                </div>
                <div className="border-t-2 border-gray-200 pt-2 flex justify-between">
                  <span className="text-gray-600">回収不足額:</span>
                  <span className="font-semibold text-red-600">${calculationResult.other.unrecovered}</span>
                </div>
              </div>

              <div className="mt-6 bg-green-50 rounded-lg p-4 border-2 border-green-300">
                <div className="text-sm text-green-700 mb-1">純利益</div>
                <div className="text-3xl font-bold text-green-800">
                  ¥{calculationResult.other.profitJPY}
                </div>
                <div className="text-xl font-bold text-green-700 mt-2">
                  利益率: {calculationResult.other.profitMargin}%
                </div>
              </div>
            </div>
          </div>

          {/* 利益率チェック */}
          {Math.abs(parseFloat(calculationResult.usa.profitMargin) - parseFloat(calculationResult.other.profitMargin)) > 0.1 && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h5 className="font-semibold text-yellow-800">⚠️ 利益率に差異があります</h5>
                <p className="text-sm text-yellow-700 mt-1">
                  USA: {calculationResult.usa.profitMargin}% vs OTHER: {calculationResult.other.profitMargin}%
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  差額調整ロジックの見直しが必要な可能性があります。
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
