// components/ebay-pricing/calculator-tab-complete.tsx
'use client'

import { Calculator, CheckCircle, XCircle, AlertTriangle, HelpCircle, TrendingUp, DollarSign, ArrowRight, Settings, Percent } from 'lucide-react'
import { STORE_FEES } from '@/lib/constants/ebay'
import { useState, useMemo, useEffect } from 'react'

interface CalculatorTabProps {
  formData: any
  onInputChange: (field: string, value: any) => void
  onCalculate: (adjustments?: {
    targetProfitMargin: number
    costAdjustmentPercent: number
    shippingAdjustmentPercent: number
    otherCostAdjustmentPercent: number
    adjustedCostJPY: number
  }) => void
  resultDDP: any
  resultDDU: any
  hsCodes: any[]
  countries: any[]
  categoryFees: any[]
}

// 税率でグループ化
const TAX_RATE_GROUPS = [
  { rate: 0, label: '0% (無税)', color: 'text-green-600' },
  { rate: 2.5, label: '2.5%', color: 'text-blue-600' },
  { rate: 4.5, label: '4.5%', color: 'text-indigo-600' },
  { rate: 5.3, label: '5.3%', color: 'text-purple-600' },
  { rate: 6.5, label: '6.5%', color: 'text-pink-600' },
  { rate: 10, label: '10%', color: 'text-orange-600' },
  { rate: 15, label: '15%以上', color: 'text-red-600' },
]

export function CalculatorTabComplete({
  formData,
  onInputChange,
  onCalculate,
  resultDDP,
  resultDDU,
  hsCodes,
  countries,
  categoryFees,
}: CalculatorTabProps) {
  const [selectedTaxRate, setSelectedTaxRate] = useState<number | null>(null)
  const [fvfRates, setFvfRates] = useState<number[]>([0.035, 0.0635, 0.1315, 0.1495, 0.15])

  // 🆕 目標利益率・調整％
  const [targetProfitMargin, setTargetProfitMargin] = useState<number>(15) // デフォルト15%
  const [costAdjustmentPercent, setCostAdjustmentPercent] = useState<number>(0) // 仕入れ原価調整
  const [shippingAdjustmentPercent, setShippingAdjustmentPercent] = useState<number>(0) // 送料調整
  const [otherCostAdjustmentPercent, setOtherCostAdjustmentPercent] = useState<number>(0) // その他費用調整

  // 🆕 詳細設定表示切り替え
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)

  // 🆕 配送ポリシー関連
  const [shippingPolicies, setShippingPolicies] = useState<any[]>([])
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | null>(null)
  const [policyZoneRates, setPolicyZoneRates] = useState<any[]>([])
  const [loadingPolicies, setLoadingPolicies] = useState(false)
  // 🆕 配送ポリシー自動選択用のstate追加
  const [autoSelectedPolicy, setAutoSelectedPolicy] = useState<any>(null)
  const [policyDebugInfo, setPolicyDebugInfo] = useState<string>('')

  // FVF率をAPIから取得
  useEffect(() => {
    fetch('/api/ebay/get-unique-fvf-rates')
      .then(r => r.json())
      .then(data => {
        if (data.rates && data.rates.length > 0) {
          setFvfRates(data.rates)
        }
      })
      .catch(err => console.error('FVF率取得エラー:', err))
  }, [])

  // 🆕 配送ポリシー取得
  useEffect(() => {
    setLoadingPolicies(true)
    fetch('/api/ebay/get-shipping-policies')
      .then(r => r.json())
      .then(data => {
        if (data.policies) {
          setShippingPolicies(data.policies)
        }
      })
      .catch(err => console.error('配送ポリシー取得エラー:', err))
      .finally(() => setLoadingPolicies(false))
  }, [])

  // 🆕 選択されたポリシーのZONE別送料を取得
  useEffect(() => {
    if (selectedPolicyId) {
      console.log('📦 ポリシー選択:', selectedPolicyId)
      fetch(`/api/ebay/get-policy-zone-rates?policyId=${selectedPolicyId}`)
        .then(r => r.json())
        .then(data => {
          console.log('📍 ZONE別送料取得:', data)
          if (data.rates) {
            setPolicyZoneRates(data.rates)
            // USA送料とOTHER送料を自動設定
            const usaRate = data.rates.find((r: any) => r.zone_code === 'US')
            const otherRate = data.rates.find((r: any) => r.zone_type === 'OTHER' || r.zone_code === 'FA')
            
            if (usaRate) {
              const usaShipping = usaRate.first_item_shipping_usd || usaRate.display_shipping_usd
              console.log('💵 USA送料設定:', usaShipping)
              onInputChange('shippingFeeUSD', usaShipping)
            }
            if (otherRate) {
              const otherShipping = otherRate.first_item_shipping_usd || otherRate.display_shipping_usd
              console.log('🌍 OTHER送料設定:', otherShipping)
              onInputChange('otherShippingFeeUSD', otherShipping)
            }
          }
        })
        .catch(err => console.error('❌ ZONE別送料取得エラー:', err))
    }
  }, [selectedPolicyId])

  // ✅ 重量 + 商品価格で最適なポリシーを自動選択 (一旦無効化)
  // 配送ポリシーAPIは404エラーのためスキップ
  /*
  useEffect(() => {
    if (!formData.actualWeight || !formData.costJPY || !formData.exchangeRate) {
      setPolicyDebugInfo('')
      return
    }

    const weight = formData.actualWeight
    const estimatedPriceUSD = (formData.costJPY / formData.exchangeRate) * 1.5

    fetch('/api/ebay/select-shipping-policy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight, itemPriceUSD: estimatedPriceUSD, quantity: 1 })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setAutoSelectedPolicy(data.policy)
          setSelectedPolicyId(data.policy.id)
          
          // 送料を自動設定
          if (data.shipping?.usa?.total) {
            onInputChange('shippingFeeUSD', data.shipping.usa.total)
          }
          if (data.shipping?.other?.total) {
            onInputChange('otherShippingFeeUSD', data.shipping.other.total)
          }

          // ZONE別送料も取得してstateに保存
          fetch(`/api/ebay/get-policy-zone-rates?policyId=${data.policy.id}`)
            .then(r2 => r2.json())
            .then(zoneData => {
              if (zoneData.rates) {
                setPolicyZoneRates(zoneData.rates)
              }
            })
            .catch(err => console.error('ZONE別送料取得エラー:', err))

          const debugMsg = `✅ ${data.policy.pricing_basis} ${data.policy.price_band || ''} | ${weight}kg | ${estimatedPriceUSD.toFixed(0)}`
          setPolicyDebugInfo(debugMsg)
        } else {
          setPolicyDebugInfo(`❌ ${data.error || 'エラー'}`)
        }
      })
      .catch(err => {
        setPolicyDebugInfo(`❌ ${err.message}`)
      })
  }, [formData.actualWeight, formData.costJPY, formData.exchangeRate, onInputChange])
  */

  // 税率でフィルタリングされたHTSコード
  const filteredHsCodes = useMemo(() => {
    if (selectedTaxRate === null) return hsCodes
    
    if (selectedTaxRate === 15) {
      return hsCodes.filter((hs: any) => (hs.base_duty || 0) >= 0.15)
    }
    
    const tolerance = 0.001
    return hsCodes.filter((hs: any) => 
      Math.abs((hs.base_duty || 0) - selectedTaxRate / 100) < tolerance
    )
  }, [hsCodes, selectedTaxRate])

  // 選択されたHTSコード情報
  const selectedHsCode = hsCodes.find((hs: any) => hs.code === formData.hsCode)
  
  const selectedStore = STORE_FEES[formData.storeType as keyof typeof STORE_FEES]

  // 選択された原産国情報
  const selectedCountry = countries.find((c: any) => c.code === formData.originCountry)

  // 🆕 調整後の原価計算
  const adjustedCostJPY = useMemo(() => {
    const base = formData.costJPY
    return base * (1 + costAdjustmentPercent / 100)
  }, [formData.costJPY, costAdjustmentPercent])

  // 🆕 調整後の送料計算
  const adjustedShippingUSD = useMemo(() => {
    if (!selectedPolicyId || policyZoneRates.length === 0) {
      return { usa: formData.shippingFeeUSD || 0, other: formData.otherShippingFeeUSD || 0 }
    }
    const usaRate = policyZoneRates.find((r: any) => r.zone_code === 'US')
    const otherRate = policyZoneRates.find((r: any) => r.zone_type === 'OTHER' || r.zone_code === 'FA')
    
    const baseUsaShipping = usaRate ? (usaRate.first_item_shipping_usd || usaRate.display_shipping_usd) : formData.shippingFeeUSD || 0
    const baseOtherShipping = otherRate ? (otherRate.first_item_shipping_usd || otherRate.display_shipping_usd) : formData.otherShippingFeeUSD || 0
    
    return {
      usa: baseUsaShipping * (1 + shippingAdjustmentPercent / 100),
      other: baseOtherShipping * (1 + shippingAdjustmentPercent / 100)
    }
  }, [selectedPolicyId, policyZoneRates, shippingAdjustmentPercent, formData.shippingFeeUSD, formData.otherShippingFeeUSD])

  // 🆕 送料調整を自動反映
  useEffect(() => {
    if (adjustedShippingUSD.usa !== formData.shippingFeeUSD) {
      onInputChange('shippingFeeUSD', adjustedShippingUSD.usa)
    }
    if (adjustedShippingUSD.other !== formData.otherShippingFeeUSD) {
      onInputChange('otherShippingFeeUSD', adjustedShippingUSD.other)
    }
  }, [adjustedShippingUSD])

  // 消費税還付を自動計算
  const calculateTaxRefund = (costJPY: number, estimatedRevenueUSD: number, exchangeRateValue: number) => {
    // 🔴 eBay手数料を含めた消費税還付計算
    // 仕入れ原価 + eBay手数料（売上の約15%）を対象
    const estimatedEbayFees = estimatedRevenueUSD * formData.fvfRate // FVF
    const estimatedPayoneerFees = estimatedRevenueUSD * 0.02 // Payoneer 2%
    const totalDeductibleExpensesJPY = costJPY + (estimatedEbayFees + estimatedPayoneerFees) * exchangeRateValue
    
    // 消費税還付額 = (仕入れ原価 + eBay手数料等) × 10/110
    return (totalDeductibleExpensesJPY * 10) / 110
  }

  const estimatedRevenueUSD = ((adjustedCostJPY / 150) * 1.5) || 100
  const taxRefund = calculateTaxRefund(adjustedCostJPY, estimatedRevenueUSD, 150)

  // DDP/DDU判定ロジック
  const getRecommendation = () => {
    if (!resultDDP?.success || !resultDDU?.success) return null

    const ddpProfit = resultDDP.profitJPY_NoRefund
    const dduProfit = resultDDU.profitJPY_NoRefund
    const profitDiff = ddpProfit - dduProfit
    const profitDiffPercent = (profitDiff / Math.max(ddpProfit, dduProfit)) * 100

    // 判定ロジック
    let recommendation = 'DDP'
    let reason = ''
    let confidence = 'high'

    // 1. 利益差が大きい場合（10%以上）
    if (Math.abs(profitDiffPercent) > 10) {
      recommendation = profitDiff > 0 ? 'DDP' : 'DDU'
      reason = `利益差が大きい（${Math.abs(profitDiff).toFixed(0)}円、${Math.abs(profitDiffPercent).toFixed(1)}%）`
      confidence = 'high'
    }
    // 2. 送料が高い場合（DDU検討）
    else if (resultDDU.shipping > 30) {
      recommendation = 'DDU'
      reason = `送料が高額（$${resultDDU.shipping}）のためDDU着払いが自然`
      confidence = 'medium'
    }
    // 3. 関税が高い場合（DDU検討）
    else if (parseFloat(resultDDP.breakdown?.tariff || 0) > 20) {
      recommendation = 'DDU'
      reason = `関税が高額（$${resultDDP.breakdown?.tariff}）のため購入者負担が自然`
      confidence = 'medium'
    }
    // 4. 利益率が低い場合（DDP検討）
    else if (resultDDP.profitMargin_NoRefund < 0.15) {
      recommendation = 'DDP'
      reason = '利益率が低いため関税込みで確実に利益確保'
      confidence = 'medium'
    }
    // 5. デフォルト（DDP推奨）
    else {
      recommendation = 'DDP'
      reason = '基本的にDDP（関税込み）が推奨、USA市場での標準'
      confidence = 'low'
    }

    return {
      recommendation,
      reason,
      confidence,
      profitDiff,
      profitDiffPercent,
    }
  }

  const recommendation = getRecommendation()

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="w-7 h-7" />
          eBay DDP/DDU 価格計算エンジン（完全版 + 利益率最適化）
        </h2>
        <p className="text-indigo-100 text-sm mt-1">
          HTSコード・税率・手数料詳細表示 | 自動DDP/DDU判定 | 配送ポリシー自動適用 | 目標利益率設定
        </p>
      </div>

      {/* 🆕 目標利益率・詳細設定 */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg shadow border border-purple-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-purple-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            目標利益率 & 詳細調整
          </h3>
          <button
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1 text-sm"
          >
            <Settings className="w-4 h-4" />
            {showAdvancedSettings ? '非表示' : '詳細設定'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 目標利益率 */}
          <div className="bg-white p-3 rounded-lg border border-purple-300">
            <label className="text-sm font-semibold text-purple-700 flex items-center gap-1">
              <Percent className="w-4 h-4" />
              目標利益率
            </label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                value={targetProfitMargin}
                onChange={(e) => setTargetProfitMargin(parseFloat(e.target.value) || 15)}
                className="w-full px-2 py-1.5 border rounded text-sm"
                step="1"
                min="0"
                max="100"
              />
              <span className="text-xl font-bold text-purple-700">%</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              デフォルト: 15%
            </div>
          </div>

          {/* 調整後原価表示 */}
          <div className="bg-white p-3 rounded-lg border border-green-300">
            <label className="text-sm font-semibold text-green-700">
              調整後原価
            </label>
            <div className="text-xl font-bold text-green-700 mt-1">
              ¥{Math.round(adjustedCostJPY).toLocaleString()}
            </div>
            <div className="text-xs text-gray-600">
              {costAdjustmentPercent !== 0 && (
                <span className={costAdjustmentPercent > 0 ? 'text-red-600' : 'text-green-600'}>
                  {costAdjustmentPercent > 0 ? '+' : ''}{costAdjustmentPercent}%
                </span>
              )}
              {costAdjustmentPercent === 0 && '調整なし'}
            </div>
          </div>

          {/* 🆕 配送ポリシー選択 */}
          <div className="bg-white p-3 rounded-lg border border-blue-300">
            <label className="text-sm font-semibold text-blue-700 flex items-center gap-1">
              📦 配送ポリシー
              {loadingPolicies && <span className="text-xs text-gray-500">(読込中...)</span>}
            </label>
            <select
              value={selectedPolicyId || ''}
              onChange={(e) => {
                const newId = e.target.value ? parseInt(e.target.value) : null
                setSelectedPolicyId(newId)
                setAutoSelectedPolicy(null) // 手動選択時は自動選択をクリア
                setPolicyDebugInfo('') // デバッグ情報もクリア
              }}
              className="w-full px-2 py-1.5 border rounded text-xs mt-1"
              disabled={loadingPolicies}
            >
              <option value="">選択してください</option>
              {shippingPolicies.map((policy: any) => (
                <option key={policy.id} value={policy.id}>
                  {policy.policy_name} ({policy.weight_min_kg}-{policy.weight_max_kg}kg)
                </option>
              ))}
            </select>
            
            {selectedPolicyId && policyZoneRates.length > 0 && (
              <div className="mt-2 text-xs space-y-1">
                <div className="font-semibold text-blue-800 mb-1">送料情報</div>
                {policyZoneRates.filter((r: any) => r.zone_code === 'US').slice(0, 1).map((r: any) => (
                  <div key={r.id} className="bg-blue-50 p-1.5 rounded border border-blue-200">
                    <div className="font-semibold">🇺🇸 USA (DDP)</div>
                    <div className="flex justify-between">
                      <span>1個目:</span>
                      <span className="font-bold">${(r.first_item_shipping_usd || r.display_shipping_usd).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>2個目以降:</span>
                      <span>+${(r.additional_item_shipping_usd || r.actual_cost_usd).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Handling:</span>
                      <span>${r.handling_fee_usd?.toFixed(2) || '0.00'}</span>
                    </div>
                    {shippingAdjustmentPercent !== 0 && (
                      <div className="flex justify-between text-purple-600 font-semibold mt-1 pt-1 border-t">
                        <span>調整後:</span>
                        <span>${adjustedShippingUSD.usa.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                ))}
                {policyZoneRates.filter((r: any) => r.zone_type === 'OTHER' || r.zone_code === 'FA').slice(0, 1).map((r: any) => (
                  <div key={r.id} className="bg-green-50 p-1.5 rounded border border-green-200">
                    <div className="font-semibold">🌍 その他 (DDU)</div>
                    <div className="flex justify-between">
                      <span>1個目:</span>
                      <span className="font-bold">${(r.first_item_shipping_usd || r.display_shipping_usd).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>2個目以降:</span>
                      <span>+${(r.additional_item_shipping_usd || r.actual_cost_usd).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Handling:</span>
                      <span>${r.handling_fee_usd?.toFixed(2) || '0.00'}</span>
                    </div>
                    {shippingAdjustmentPercent !== 0 && (
                      <div className="flex justify-between text-purple-600 font-semibold mt-1 pt-1 border-t">
                        <span>調整後:</span>
                        <span>${adjustedShippingUSD.other.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* ✅ 自動選択結果表示 */}
            {policyDebugInfo && (
              <div className="mt-2 text-xs bg-blue-50 p-2 rounded border border-blue-200">
                <div className="font-semibold text-blue-800">自動選択結果</div>
                <div className="text-blue-700">{policyDebugInfo}</div>
                {autoSelectedPolicy && (
                  <div className="mt-1 text-gray-600">
                    <div>ポリシー: {autoSelectedPolicy.name}</div>
                    {autoSelectedPolicy.price_band && (
                      <div>価格帯: {autoSelectedPolicy.price_band}</div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {!selectedPolicyId && !policyDebugInfo && (
              <div className="text-xs text-gray-600 mt-1">
                💡 重量と原価を入力すると自動選択されます
              </div>
            )}
          </div>
        </div>

        {/* 🆕 詳細調整パネル（トグル） */}
        {showAdvancedSettings && (
          <div className="mt-4 bg-white p-4 rounded-lg border-2 border-purple-300">
            <h4 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              費用調整パラメータ
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 仕入れ原価調整 */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">
                  仕入れ原価調整 (%)
                </label>
                <input
                  type="number"
                  value={costAdjustmentPercent}
                  onChange={(e) => setCostAdjustmentPercent(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded"
                  step="1"
                  placeholder="0"
                />
                <div className="text-xs text-gray-500 mt-1">
                  + で原価を高く見積もる / - で低く見積もる
                </div>
              </div>

              {/* 送料調整 */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">
                  送料調整 (%)
                </label>
                <input
                  type="number"
                  value={shippingAdjustmentPercent}
                  onChange={(e) => setShippingAdjustmentPercent(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded"
                  step="1"
                  placeholder="0"
                />
                <div className="text-xs text-gray-500 mt-1">
                  配送ポリシーの送料を微調整
                </div>
                {selectedPolicyId && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                    <div className="font-semibold text-blue-800">調整後送料</div>
                    <div className="text-blue-700">
                      🇺🇸 USA: ${adjustedShippingUSD.usa.toFixed(2)}
                    </div>
                    <div className="text-green-700">
                      🌍 その他: ${adjustedShippingUSD.other.toFixed(2)}
                    </div>
                    {shippingAdjustmentPercent !== 0 && (
                      <div className={shippingAdjustmentPercent > 0 ? 'text-red-600' : 'text-green-600'}>
                        {shippingAdjustmentPercent > 0 ? '+' : ''}{shippingAdjustmentPercent}%
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* その他費用調整 */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">
                  その他費用調整 (%)
                </label>
                <input
                  type="number"
                  value={otherCostAdjustmentPercent}
                  onChange={(e) => setOtherCostAdjustmentPercent(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded"
                  step="1"
                  placeholder="0"
                />
                <div className="text-xs text-gray-500 mt-1">
                  梱包材・手数料等の調整
                </div>
              </div>
            </div>

            {/* リセットボタン */}
            <button
              onClick={() => {
                setCostAdjustmentPercent(0)
                setShippingAdjustmentPercent(0)
                setOtherCostAdjustmentPercent(0)
                setTargetProfitMargin(15)
              }}
              className="mt-3 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            >
              調整をリセット
            </button>
          </div>
        )}
      </div>

      {/* 入力フォーム */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-4">入力項目 / Input Parameters</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 基本情報 */}
          <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
            <h4 className="font-bold text-indigo-800 mb-2 text-sm">💰 基本情報</h4>
            <InputField
              label="仕入値（円）"
              type="number"
              value={formData.costJPY}
              onChange={(e) => onInputChange('costJPY', parseFloat(e.target.value) || 0)}
            />
            <div className="mt-2 p-2 bg-purple-100 rounded text-xs">
              <div className="font-semibold text-purple-800">消費税還付</div>
              <div className="text-lg font-bold text-purple-700">
                ¥{Math.round(taxRefund).toLocaleString()}
              </div>
            </div>
            {costAdjustmentPercent !== 0 && (
              <div className="mt-2 p-2 bg-yellow-100 rounded text-xs">
                <div className="font-semibold text-yellow-800">調整後原価</div>
                <div className="text-lg font-bold text-yellow-700">
                  ¥{Math.round(adjustedCostJPY).toLocaleString()}
                </div>
              </div>
            )}
          </div>

          {/* 重量・サイズ */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <h4 className="font-bold text-blue-800 mb-2 text-sm">📦 重量・サイズ</h4>
            <div className="grid grid-cols-3 gap-1 mb-2">
              <InputField
                label="長"
                type="number"
                value={formData.length}
                onChange={(e) => onInputChange('length', parseFloat(e.target.value) || 0)}
              />
              <InputField
                label="幅"
                type="number"
                value={formData.width}
                onChange={(e) => onInputChange('width', parseFloat(e.target.value) || 0)}
              />
              <InputField
                label="高"
                type="number"
                value={formData.height}
                onChange={(e) => onInputChange('height', parseFloat(e.target.value) || 0)}
              />
            </div>
            <InputField
              label="実重量(kg)"
              type="number"
              step="0.1"
              value={formData.actualWeight}
              onChange={(e) => {
                const newWeight = parseFloat(e.target.value) || 0
                console.log('⚖️ 重量変更:', newWeight)
                onInputChange('actualWeight', newWeight)
              }}
            />
          </div>

          {/* 関税設定 */}
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <h4 className="font-bold text-green-800 mb-2 text-sm">🌍 関税設定</h4>
            
            {/* 税率フィルタ */}
            <div className="mb-2">
              <label className="text-xs font-medium text-gray-700">税率で絞り込み</label>
              <select
                value={selectedTaxRate ?? ''}
                onChange={(e) => setSelectedTaxRate(e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full px-2 py-1.5 border rounded text-xs"
              >
                <option value="">全て表示</option>
                {TAX_RATE_GROUPS.map((group) => (
                  <option key={group.rate} value={group.rate}>
                    {group.label}
                  </option>
                ))}
              </select>
            </div>

            {/* HTSコード入力 */}
            <div className="mb-2">
              <label className="text-xs font-medium text-gray-700">
                HTSコード（税率: {selectedHsCode ? (selectedHsCode.base_duty * 100).toFixed(2) : '0.00'}%）
              </label>
              <input
                type="text"
                placeholder="例: 9620.00.20.00"
                value={formData.hsCode}
                onChange={(e) => onInputChange('hsCode', e.target.value)}
                className="w-full px-2 py-1.5 border rounded text-xs font-mono"
              />
              {selectedHsCode && (
                <div className="mt-1 text-xs text-gray-600 bg-white p-1 rounded">
                  {selectedHsCode.description}
                  {selectedHsCode.section301 && (
                    <div className="text-red-600 font-semibold mt-1">
                      ⚠️ Section 301対象（中国原産: +{((selectedHsCode.section301_rate || 0.25) * 100).toFixed(0)}%）
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 原産国 */}
            <div>
              <label className="text-xs font-medium text-gray-700">原産国</label>
              <select
                value={formData.originCountry}
                onChange={(e) => onInputChange('originCountry', e.target.value)}
                className="w-full px-2 py-1.5 border rounded text-xs"
              >
                {countries.map((c: any) => (
                  <option key={c.code} value={c.code}>
                    {c.name_ja} ({c.code}) {c.section301 ? ` +${((c.section301_rate || c.tariff_rate || 0) * 100).toFixed(0)}%` : ''}
                  </option>
                ))}
              </select>
              {selectedCountry && (
                <div className="mt-1 text-xs bg-white p-1 rounded">
                  {selectedCountry.section301 && (
                    <div className="text-red-600 font-semibold bg-red-50 p-1 rounded">
                      ⚠️ Section 301対象国<br/>
                      追加関税: +{((selectedCountry.section301_rate || selectedCountry.tariff_rate || 0.25) * 100).toFixed(0)}%
                    </div>
                  )}
                  {!selectedCountry.section301 && selectedCountry.tariff_rate > 0 && (
                    <div className="text-orange-600">
                      基本関税: {(selectedCountry.tariff_rate * 100).toFixed(1)}%
                    </div>
                  )}
                  {selectedHsCode && selectedHsCode.section301 && formData.originCountry === 'CN' && (
                    <div className="mt-1 text-xs text-red-600 bg-red-50 p-1 rounded font-semibold">
                      💰 合計関税: {((selectedHsCode.base_duty + (selectedHsCode.section301_rate || 0.25)) * 100).toFixed(1)}%<br/>
                      (基本{(selectedHsCode.base_duty * 100).toFixed(1)}% + Section301 {((selectedHsCode.section301_rate || 0.25) * 100).toFixed(0)}%)
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* eBay設定 */}
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
            <h4 className="font-bold text-orange-800 mb-2 text-sm">🛒 eBay設定</h4>
            
            {/* FVF率選択 */}
            <div className="mb-2">
              <label className="text-xs font-medium text-gray-700">
                FVF率（手数料率）
              </label>
              <select
                value={formData.fvfRate}
                onChange={(e) => onInputChange('fvfRate', parseFloat(e.target.value))}
                className="w-full px-2 py-1.5 border rounded text-xs"
              >
                {fvfRates.map((rate) => (
                  <option key={rate} value={rate}>
                    {(rate * 100).toFixed(2)}%
                  </option>
                ))}
              </select>
              <div className="mt-1 text-xs bg-white p-1 rounded">
                <div>選択中: {(formData.fvfRate * 100).toFixed(2)}%</div>
                <div>出品料: $0.35</div>
              </div>
            </div>

            {/* ストアタイプ */}
            <div>
              <label className="text-xs font-medium text-gray-700">
                ストア（割引: -{selectedStore ? (selectedStore.fvf_discount * 100).toFixed(1) : '0.0'}%）
              </label>
              <select
                value={formData.storeType}
                onChange={(e) => onInputChange('storeType', e.target.value)}
                className="w-full px-2 py-1.5 border rounded text-xs"
              >
                {Object.entries(STORE_FEES).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.name} [-{(val.fvf_discount * 100).toFixed(1)}%]
                  </option>
                ))}
              </select>
              {selectedStore && formData.storeType !== 'none' && (
                <div className="mt-1 text-xs bg-white p-1 rounded">
                  <div>月額: ${selectedStore.monthly_fee || '0'}</div>
                  <div>FVF割引: -{(selectedStore.fvf_discount * 100).toFixed(1)}%</div>
                  <div className="text-green-600 font-semibold">
                    実質FVF: {((formData.fvfRate - selectedStore.fvf_discount) * 100).toFixed(2)}%
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            console.log('📢 計算実行 - 現在の送料:', {
              usa: formData.shippingFeeUSD,
              other: formData.otherShippingFeeUSD
            })
            onCalculate({
              targetProfitMargin,
              costAdjustmentPercent,
              shippingAdjustmentPercent,
              otherCostAdjustmentPercent,
              adjustedCostJPY
            })
          }}
          className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <Calculator className="w-5 h-5" />
          DDP & DDU 同時計算 / Calculate Both
        </button>
      </div>

      {/* 🆕 使用中の配送ポリシー表示 */}
      {(resultDDP?.usedPolicy || resultDDU?.usedPolicy) && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
          <h3 className="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
            📦 使用中の配送ポリシー
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resultDDP?.usedPolicy && (
              <div className="bg-white p-3 rounded-lg border border-blue-200">
                <div className="font-semibold text-blue-700 mb-2">🇺🇸 USA (DDP)</div>
                <div className="text-sm space-y-1">
                  <div><strong>ポリシー:</strong> {resultDDP.usedPolicy.policy_name || resultDDP.usedPolicy.name || 'N/A'}</div>
                  <div><strong>重量範囲:</strong> {resultDDP.usedPolicy.weight_min_kg || resultDDP.usedPolicy.weight_min}kg - {resultDDP.usedPolicy.weight_max_kg || resultDDP.usedPolicy.weight_max}kg</div>
                  <div><strong>送料(USA):</strong> ${(
                    resultDDP.usedPolicy.zones?.find((z: any) => z.country === 'US')?.rate || 
                    resultDDP.usedPolicy.rate_usa ||
                    resultDDP.shipping ||
                    0
                  ).toFixed(2)}</div>
                  <div><strong>目標利益率:</strong> {resultDDP.targetProfitMargin}%</div>
                  <div><strong>実際利益率:</strong> <span className={resultDDP.profitMargin_NoRefund >= resultDDP.targetProfitMargin ? 'text-green-600' : 'text-red-600'}>{(resultDDP.profitMargin_NoRefund * 100).toFixed(1)}%</span></div>
                </div>
              </div>
            )}
            {resultDDU?.usedPolicy && (
              <div className="bg-white p-3 rounded-lg border border-green-200">
                <div className="font-semibold text-green-700 mb-2">🌍 その他 (DDU)</div>
                <div className="text-sm space-y-1">
                  <div><strong>ポリシー:</strong> {resultDDU.usedPolicy.policy_name || resultDDU.usedPolicy.name || 'N/A'}</div>
                  <div><strong>重量範囲:</strong> {resultDDU.usedPolicy.weight_min_kg || resultDDU.usedPolicy.weight_min}kg - {resultDDU.usedPolicy.weight_max_kg || resultDDU.usedPolicy.weight_max}kg</div>
                  <div><strong>送料(その他):</strong> ${(
                    resultDDU.usedPolicy.zones?.find((z: any) => z.country === 'GB')?.rate || 
                    resultDDU.usedPolicy.rate_other ||
                    resultDDU.shipping ||
                    0
                  ).toFixed(2)}</div>
                  <div><strong>目標利益率:</strong> {resultDDU.targetProfitMargin}%</div>
                  <div><strong>実際利益率:</strong> <span className={resultDDU.profitMargin_NoRefund >= resultDDU.targetProfitMargin ? 'text-green-600' : 'text-red-600'}>{(resultDDU.profitMargin_NoRefund * 100).toFixed(1)}%</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DDP/DDU推奨判定 */}
      {recommendation && (
        <div className={`p-4 rounded-lg border-2 shadow-lg ${
          recommendation.recommendation === 'DDP' 
            ? 'bg-indigo-50 border-indigo-400' 
            : 'bg-green-50 border-green-400'
        }`}>
          <div className="flex items-start gap-3">
            <div className="text-4xl">
              {recommendation.recommendation === 'DDP' ? '🇺🇸' : '🌍'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className={`text-xl font-bold ${
                  recommendation.recommendation === 'DDP' ? 'text-indigo-800' : 'text-green-800'
                }`}>
                  推奨: {recommendation.recommendation === 'DDP' ? 'DDP（関税込み）' : 'DDU（着払い）'}
                </h3>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  recommendation.confidence === 'high' 
                    ? 'bg-green-200 text-green-800' 
                    : recommendation.confidence === 'medium'
                    ? 'bg-yellow-200 text-yellow-800'
                    : 'bg-gray-200 text-gray-800'
                }`}>
                  確信度: {recommendation.confidence === 'high' ? '高' : recommendation.confidence === 'medium' ? '中' : '低'}
                </span>
              </div>
              <div className="text-sm text-gray-700 mb-2">
                <strong>判定理由:</strong> {recommendation.reason}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white rounded p-2">
                  <div className="text-gray-600">DDP利益</div>
                  <div className="font-bold text-indigo-700">
                    ¥{Math.round(resultDDP?.profitJPY_NoRefund || 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-white rounded p-2">
                  <div className="text-gray-600">DDU利益</div>
                  <div className="font-bold text-green-700">
                    ¥{Math.round(resultDDU?.profitJPY_NoRefund || 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-white rounded p-2 col-span-2">
                  <div className="text-gray-600">利益差</div>
                  <div className={`font-bold text-lg ${recommendation.profitDiff > 0 ? 'text-indigo-700' : 'text-green-700'}`}>
                    ¥{Math.abs(recommendation.profitDiff).toFixed(0)} ({Math.abs(recommendation.profitDiffPercent).toFixed(1)}%)
                    {recommendation.profitDiff > 0 ? ' DDPが有利' : ' DDUが有利'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 最終価格表示 */}
      {recommendation && (
        <FinalPriceDisplay 
          resultDDP={resultDDP} 
          resultDDU={resultDDU} 
          recommendation={recommendation} 
        />
      )}

      {/* 計算結果（DDP/DDU並行表示） */}
      {(resultDDP || resultDDU) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* DDP結果 */}
          <div className={`flex flex-col ${recommendation?.recommendation === 'DDP' ? 'ring-4 ring-indigo-300 rounded-lg' : ''}`}>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-lg font-bold text-indigo-800">
                🇺🇸 USA (DDP) - 関税込み配送
              </h3>
              {recommendation?.recommendation === 'DDP' && (
                <span className="px-2 py-1 bg-indigo-600 text-white text-xs rounded font-bold">
                  推奨
                </span>
              )}
            </div>
            <div className="flex-1">
              {resultDDP && (resultDDP.success ? (
                <ResultCard result={resultDDP} mode="DDP" formData={formData} hsCodes={hsCodes} />
              ) : (
                <ErrorResult result={resultDDP} />
              ))}
            </div>
          </div>

          {/* DDU結果 */}
          <div className={`flex flex-col ${recommendation?.recommendation === 'DDU' ? 'ring-4 ring-green-300 rounded-lg' : ''}`}>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-lg font-bold text-green-800">
                🌍 その他 (DDU) - 着払い配送
              </h3>
              {recommendation?.recommendation === 'DDU' && (
                <span className="px-2 py-1 bg-green-600 text-white text-xs rounded font-bold">
                  推奨
                </span>
              )}
            </div>
            <div className="flex-1">
              {resultDDU && (resultDDU.success ? (
                <ResultCard result={resultDDU} mode="DDU" formData={formData} hsCodes={hsCodes} />
              ) : (
                <ErrorResult result={resultDDU} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 判定基準 */}
      <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
        <h3 className="font-bold text-gray-800 mb-2">📋 判定基準（目標利益率: {targetProfitMargin}%）</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌟</span>
              <div>
                <strong>S級（優秀）:</strong> 利益率20%以上 & ROI50%以上 & 利益¥3,000以上
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              <div>
                <strong>A級（良好）:</strong> 利益率{targetProfitMargin}%以上 & ROI30%以上 & 利益¥3,000以上
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              <div>
                <strong>B級（可）:</strong> 利益率10%以上 & ROI20%以上 & 利益¥3,000以上
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <div>
                <strong>C級（要検討）:</strong> 上記未満だが利益¥3,000以上
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">❌</span>
              <div>
                <strong>D級（非推奨）:</strong> 利益¥3,000未満
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { ResultCard, ScoreBar, InputField, SelectField, Tooltip, PriceRow, CostRow, ErrorResult } from './result-card-components'
import { FinalPriceDisplay } from './final-price-display'
