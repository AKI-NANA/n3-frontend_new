'use client'

import React, { useState, useEffect } from 'react'
import { Package, Loader2, CheckCircle, XCircle, Info, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface PolicyV2 {
  id: number
  policy_number: number
  policy_name: string
  weight_min_kg: number
  weight_max_kg: number
  tariff_min: number
  tariff_max: number
  tariff_sample: number
  pricing_basis: 'DDP' | 'DDU'
  sample_product_price: number
  active: boolean
  ebay_policy_id: string | null
}

interface ZoneRate {
  id: number
  policy_id: number
  zone_type: 'USA' | 'OTHER'
  zone_code: string
  zone_name: string
  actual_cost_usd: number
  display_shipping_usd: number
  shipping_markup_percent: number
  handling_fee_usd: number
  handling_calculation_method: string
  total_cost_usd: number
  is_ddp: boolean
  ddp_costs: any
  notes: string
}

interface PolicyWithZones extends PolicyV2 {
  zones: ZoneRate[]
}

export function ShippingPoliciesV2Tab() {
  const [policies, setPolicies] = useState<PolicyWithZones[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyWithZones | null>(null)
  const [filterBasis, setFilterBasis] = useState<'ALL' | 'DDP' | 'DDU'>('ALL')

  useEffect(() => {
    loadPolicies()
  }, [])

  const loadPolicies = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      const { data: policiesData, error: policiesError } = await supabase
        .from('ebay_shipping_policies_v2')
        .select('*')
        .order('policy_number')

      if (policiesError) throw policiesError

      const { data: zonesData, error: zonesError } = await supabase
        .from('ebay_policy_zone_rates_v2')
        .select('*')

      if (zonesError) throw zonesError

      const policiesWithZones: PolicyWithZones[] = (policiesData || []).map(policy => ({
        ...policy,
        zones: (zonesData || []).filter(zone => zone.policy_id === policy.id)
      }))

      setPolicies(policiesWithZones)
    } catch (error) {
      console.error('Failed to load policies:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPolicies = policies.filter(p => 
    filterBasis === 'ALL' || p.pricing_basis === filterBasis
  )

  const getWeightBadgeColor = (weight: number) => {
    if (weight <= 2) return 'bg-green-100 text-green-800'
    if (weight <= 5) return 'bg-blue-100 text-blue-800'
    if (weight <= 10) return 'bg-yellow-100 text-yellow-800'
    if (weight <= 20) return 'bg-orange-100 text-orange-800'
    if (weight <= 40) return 'bg-red-100 text-red-800'
    return 'bg-purple-100 text-purple-800'
  }

  const getTariffBadgeColor = (tariff: number) => {
    if (tariff < 0.3) return 'bg-green-100 text-green-800'
    if (tariff < 0.5) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getHandlingWarning = (handlingFee: number, productPrice: number) => {
    const percentage = (handlingFee / productPrice) * 100
    if (percentage > 25) {
      return { level: 'danger', text: `${percentage.toFixed(0)}% (上限25%超過)` }
    } else if (percentage > 20) {
      return { level: 'warning', text: `${percentage.toFixed(0)}% (上限付近)` }
    }
    return { level: 'ok', text: `${percentage.toFixed(0)}%` }
  }

  const getShippingWarning = (displayShipping: number, actualCost: number) => {
    const ratio = displayShipping / actualCost
    if (ratio > 2.0) {
      return { level: 'danger', text: `${ratio.toFixed(2)}倍 (上限2倍超過)` }
    } else if (ratio > 1.8) {
      return { level: 'warning', text: `${ratio.toFixed(2)}倍 (上限付近)` }
    }
    return { level: 'ok', text: `${ratio.toFixed(2)}倍` }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-600">ポリシーを読み込み中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="w-7 h-7 text-indigo-600" />
            36配送ポリシーシステム（送料上限2倍版）
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            全{policies.length}ポリシー | DDP基準: {policies.filter(p => p.pricing_basis === 'DDP').length}個 | 
            DDU基準: {policies.filter(p => p.pricing_basis === 'DDU').length}個
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilterBasis('ALL')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterBasis === 'ALL'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            全て
          </button>
          <button
            onClick={() => setFilterBasis('DDP')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterBasis === 'DDP'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            DDP基準
          </button>
          <button
            onClick={() => setFilterBasis('DDU')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterBasis === 'DDU'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            DDU基準
          </button>
        </div>
      </div>

      {/* ポリシーグリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPolicies.map(policy => {
          const usaZone = policy.zones.find(z => z.zone_type === 'USA')
          const otherZone = policy.zones.find(z => z.zone_type === 'OTHER')
          
          const usaShippingWarning = usaZone ? getShippingWarning(usaZone.display_shipping_usd, usaZone.actual_cost_usd) : null
          const usaHandlingWarning = usaZone ? getHandlingWarning(usaZone.handling_fee_usd, policy.sample_product_price) : null
          const otherHandlingWarning = otherZone ? getHandlingWarning(otherZone.handling_fee_usd, policy.sample_product_price) : null

          return (
            <div
              key={policy.id}
              onClick={() => setSelectedPolicy(policy)}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg ${
                selectedPolicy?.id === policy.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-indigo-300'
              }`}
            >
              {/* ポリシーヘッダー */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-500">No.{policy.policy_number}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      policy.pricing_basis === 'DDP'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {policy.pricing_basis}基準
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-800 text-sm leading-tight">
                    {policy.policy_name}
                  </h3>
                </div>
                {policy.active ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </div>

              {/* 重量・関税率バッジ */}
              <div className="flex gap-2 mb-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getWeightBadgeColor(policy.weight_max_kg)}`}>
                  {policy.weight_min_kg}-{policy.weight_max_kg}kg
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getTariffBadgeColor(policy.tariff_max)}`}>
                  関税 {(policy.tariff_min * 100).toFixed(0)}-{(policy.tariff_max * 100).toFixed(0)}%
                </span>
              </div>

              {/* USA ZONE */}
              {usaZone && (
                <div className="bg-blue-50 rounded p-2 mb-2">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs font-semibold text-blue-800">USA (DDP)</span>
                    {usaZone.is_ddp && (
                      <span className="px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded text-xs font-bold">DDP</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-700 space-y-0.5">
                    <div className="flex justify-between items-center">
                      <span>実費:</span>
                      <span className="font-semibold">${usaZone.actual_cost_usd}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>送料:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">${usaZone.display_shipping_usd}</span>
                        <span className={`text-xs ${
                          usaShippingWarning?.level === 'danger' ? 'text-red-600 font-bold' :
                          usaShippingWarning?.level === 'warning' ? 'text-orange-600 font-semibold' :
                          'text-gray-500'
                        }`}>
                          ({usaShippingWarning?.text})
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>手数料:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">${usaZone.handling_fee_usd}</span>
                        <span className={`text-xs ${
                          usaHandlingWarning?.level === 'danger' ? 'text-red-600 font-bold' :
                          usaHandlingWarning?.level === 'warning' ? 'text-orange-600 font-semibold' :
                          'text-gray-500'
                        }`}>
                          ({usaHandlingWarning?.text})
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between border-t border-blue-200 pt-0.5">
                      <span>合計:</span>
                      <span className="font-bold text-blue-800">${usaZone.total_cost_usd}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* OTHER ZONE */}
              {otherZone && (
                <div className="bg-green-50 rounded p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs font-semibold text-green-800">他国 (DDU)</span>
                  </div>
                  <div className="text-xs text-gray-700 space-y-0.5">
                    <div className="flex justify-between items-center">
                      <span>実費:</span>
                      <span className="font-semibold">${otherZone.actual_cost_usd}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>送料:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">${otherZone.display_shipping_usd}</span>
                        <span className="text-xs text-gray-500">
                          ({otherZone.shipping_markup_percent}%)
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>手数料:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">${otherZone.handling_fee_usd}</span>
                        <span className={`text-xs ${
                          otherHandlingWarning?.level === 'danger' ? 'text-red-600 font-bold' :
                          otherHandlingWarning?.level === 'warning' ? 'text-orange-600 font-semibold' :
                          'text-gray-500'
                        }`}>
                          ({otherHandlingWarning?.text})
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between border-t border-green-200 pt-0.5">
                      <span>合計:</span>
                      <span className="font-bold text-green-800">${otherZone.total_cost_usd}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 詳細パネル */}
      {selectedPolicy && (
        <div className="border-2 border-indigo-500 rounded-lg p-6 bg-indigo-50">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Info className="w-6 h-6 text-indigo-600" />
            ポリシー詳細: {selectedPolicy.policy_name}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 基本情報 */}
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                基本情報
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">ポリシーNo:</span>
                  <span className="font-semibold">#{selectedPolicy.policy_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">価格基準:</span>
                  <span className={`px-2 py-0.5 rounded font-semibold ${
                    selectedPolicy.pricing_basis === 'DDP'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {selectedPolicy.pricing_basis}基準
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">重量範囲:</span>
                  <span className="font-semibold">{selectedPolicy.weight_min_kg} - {selectedPolicy.weight_max_kg} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">関税率範囲:</span>
                  <span className="font-semibold">
                    {(selectedPolicy.tariff_min * 100).toFixed(0)} - {(selectedPolicy.tariff_max * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">サンプル関税率:</span>
                  <span className="font-semibold">{(selectedPolicy.tariff_sample * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">サンプル商品価格:</span>
                  <span className="font-semibold">${selectedPolicy.sample_product_price}</span>
                </div>
              </div>
            </div>

            {/* ZONE詳細 */}
            {selectedPolicy.zones.map(zone => {
              const shippingWarning = getShippingWarning(zone.display_shipping_usd, zone.actual_cost_usd)
              const handlingWarning = getHandlingWarning(zone.handling_fee_usd, selectedPolicy.sample_product_price)
              
              return (
                <div key={zone.id} className={`rounded-lg p-4 ${
                  zone.zone_type === 'USA' ? 'bg-blue-50' : 'bg-green-50'
                }`}>
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-indigo-600" />
                    {zone.zone_name} ({zone.zone_type})
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">実費:</span>
                      <span className="font-semibold">${zone.actual_cost_usd}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">表示送料:</span>
                      <div className="text-right">
                        <div className="font-semibold">${zone.display_shipping_usd}</div>
                        <div className={`text-xs ${
                          shippingWarning.level === 'danger' ? 'text-red-600 font-bold' :
                          shippingWarning.level === 'warning' ? 'text-orange-600 font-semibold' :
                          'text-gray-500'
                        }`}>
                          実費の{shippingWarning.text}
                          {shippingWarning.level === 'danger' && ' ⚠️'}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">手数料:</span>
                      <div className="text-right">
                        <div className="font-semibold">${zone.handling_fee_usd}</div>
                        <div className={`text-xs ${
                          handlingWarning.level === 'danger' ? 'text-red-600 font-bold' :
                          handlingWarning.level === 'warning' ? 'text-orange-600 font-semibold' :
                          'text-gray-500'
                        }`}>
                          商品価格の{handlingWarning.text}
                          {handlingWarning.level === 'danger' && ' ⚠️'}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-700 font-semibold">合計:</span>
                      <span className="font-bold text-lg">${zone.total_cost_usd}</span>
                    </div>
                    {zone.is_ddp && zone.ddp_costs && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <div className="text-xs text-gray-600 font-semibold mb-1">DDP費用内訳:</div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>CIF:</span>
                            <span>${zone.ddp_costs.cif}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>関税:</span>
                            <span>${zone.ddp_costs.tariff}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>MPF:</span>
                            <span>${zone.ddp_costs.mpf}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>HMF:</span>
                            <span>${zone.ddp_costs.hmf}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>eBay手数料:</span>
                            <span>${zone.ddp_costs.ebay}</span>
                          </div>
                          <div className="flex justify-between font-semibold border-t pt-1">
                            <span>DDP合計:</span>
                            <span>${zone.ddp_costs.total}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {zone.notes && (
                      <div className="mt-2 pt-2 border-t border-gray-300">
                        <div className="text-xs text-gray-600">備考:</div>
                        <div className="text-xs text-gray-700 mt-1">{zone.notes}</div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={() => setSelectedPolicy(null)}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            閉じる
          </button>
        </div>
      )}

      {/* 注意事項 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          eBay規約と重要な注意事項
        </h4>
        <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
          <li><strong>送料上限:</strong> 実費の2倍まで（安全ライン）⚠️ 2倍超過は規約違反の可能性</li>
          <li><strong>手数料上限:</strong> 商品価格の25%まで推奨 ⚠️ 超過は「手数料の乱用」とみなされる可能性</li>
          <li><strong>DDP費用:</strong> 関税 + MPF + HMF + eBay $5</li>
          <li><strong>DDP基準:</strong> USA価格基準、高価格商品・高関税商品向け</li>
          <li><strong>DDU基準:</strong> その他の国価格基準、低価格商品・アジア欧州市場向け</li>
          <li className="text-red-600 font-semibold">⚠️ 赤字表示は規約違反の可能性あり - ポリシー修正を推奨</li>
        </ul>
      </div>
    </div>
  )
}
