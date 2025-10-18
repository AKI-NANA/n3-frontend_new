'use client'

import React, { useState, useEffect } from 'react'
import { Table, Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface PolicyV2 {
  id: number
  policy_number: number
  policy_name: string
  weight_min_kg: number
  weight_max_kg: number
  pricing_basis: 'DDP' | 'DDU'
  sample_product_price: number
}

interface ZoneRate {
  id: number
  policy_id: number
  zone_type: 'USA' | 'OTHER'
  actual_cost_usd: number
  display_shipping_usd: number
  shipping_markup_percent: number
  handling_fee_usd: number
  total_cost_usd: number
}

interface PolicyWithZones extends PolicyV2 {
  zones: ZoneRate[]
}

interface ComplianceStatus {
  shippingOk: boolean
  handlingOk: boolean
  shippingRatio: number
  handlingPercent: number
  suggestion?: string
}

export function ShippingPoliciesMatrixTab() {
  const [policies, setPolicies] = useState<PolicyWithZones[]>([])
  const [loading, setLoading] = useState(true)

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

  const checkCompliance = (zone: ZoneRate, productPrice: number): ComplianceStatus => {
    const shippingRatio = zone.display_shipping_usd / zone.actual_cost_usd
    const handlingPercent = (zone.handling_fee_usd / productPrice) * 100

    const shippingOk = shippingRatio <= 2.5
    const handlingOk = handlingPercent <= 25

    let suggestion = undefined
    if (!shippingOk || !handlingOk) {
      if (!shippingOk && !handlingOk) {
        suggestion = '送料を下げる→手数料を削減'
      } else if (!shippingOk) {
        suggestion = '送料を実費の2.5倍以下に削減'
      } else {
        suggestion = '手数料を25%以下に削減'
      }
    }

    return {
      shippingOk,
      handlingOk,
      shippingRatio,
      handlingPercent,
      suggestion
    }
  }

  const getStatusIcon = (ok: boolean) => {
    if (ok) {
      return <CheckCircle className="w-4 h-4 text-green-600" />
    }
    return <XCircle className="w-4 h-4 text-red-600" />
  }

  const getStatusColor = (compliance: ComplianceStatus) => {
    if (compliance.shippingOk && compliance.handlingOk) {
      return 'bg-green-50'
    }
    return 'bg-red-50'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-600">ポリシーを読み込み中...</span>
      </div>
    )
  }

  const usaViolations = policies.filter(p => {
    const usa = p.zones.find(z => z.zone_type === 'USA')
    if (!usa) return false
    const c = checkCompliance(usa, p.sample_product_price)
    return !c.shippingOk || !c.handlingOk
  }).length

  const otherViolations = policies.filter(p => {
    const other = p.zones.find(z => z.zone_type === 'OTHER')
    if (!other) return false
    const c = checkCompliance(other, p.sample_product_price)
    return !c.shippingOk || !c.handlingOk
  }).length

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Table className="w-7 h-7 text-indigo-600" />
            36ポリシー規約遵守マトリックス
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            全ポリシーの送料・手数料の規約遵守状況を一覧表示
          </p>
        </div>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">総ポリシー数</div>
          <div className="text-3xl font-bold text-gray-800">{policies.length}</div>
        </div>
        <div className={`rounded-lg border-2 p-4 ${usaViolations === 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
          <div className="text-sm text-gray-600 mb-1">USA違反数</div>
          <div className={`text-3xl font-bold ${usaViolations === 0 ? 'text-green-700' : 'text-red-700'}`}>
            {usaViolations} / {policies.length}
          </div>
        </div>
        <div className={`rounded-lg border-2 p-4 ${otherViolations === 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
          <div className="text-sm text-gray-600 mb-1">OTHER違反数</div>
          <div className={`text-3xl font-bold ${otherViolations === 0 ? 'text-green-700' : 'text-red-700'}`}>
            {otherViolations} / {policies.length}
          </div>
        </div>
      </div>

      {/* マトリックステーブル */}
      <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b-2 border-gray-300">
              <tr>
                <th className="px-3 py-3 text-left font-semibold text-gray-700 sticky left-0 bg-gray-100 z-10 border-r-2 border-gray-300">
                  No.
                </th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700 min-w-[180px]">
                  ポリシー名
                </th>
                <th className="px-3 py-3 text-center font-semibold text-gray-700">
                  基準
                </th>
                <th className="px-3 py-3 text-center font-semibold text-gray-700">
                  価格
                </th>
                <th colSpan={5} className="px-3 py-3 text-center font-semibold text-blue-700 bg-blue-50 border-x-2 border-gray-300">
                  USA ZONE
                </th>
                <th colSpan={5} className="px-3 py-3 text-center font-semibold text-green-700 bg-green-50">
                  OTHER ZONE
                </th>
              </tr>
              <tr className="bg-gray-50">
                <th className="sticky left-0 bg-gray-50 z-10 border-r-2 border-gray-300"></th>
                <th></th>
                <th></th>
                <th></th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-blue-50 border-l-2 border-gray-300">実費</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-blue-50">送料</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-blue-50">倍率</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-blue-50">手数料</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-blue-50 border-r-2 border-gray-300">状態</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-green-50">実費</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-green-50">送料</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-green-50">倍率</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-green-50">手数料</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 bg-green-50">状態</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => {
                const usaZone = policy.zones.find(z => z.zone_type === 'USA')
                const otherZone = policy.zones.find(z => z.zone_type === 'OTHER')
                
                const usaCompliance = usaZone ? checkCompliance(usaZone, policy.sample_product_price) : null
                const otherCompliance = otherZone ? checkCompliance(otherZone, policy.sample_product_price) : null

                return (
                  <tr key={policy.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-3 py-3 font-semibold text-gray-700 sticky left-0 bg-white z-10 border-r-2 border-gray-300">
                      {policy.policy_number}
                    </td>
                    <td className="px-3 py-3 text-gray-700 text-xs">
                      {policy.policy_name}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        policy.pricing_basis === 'DDP' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {policy.pricing_basis}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-gray-700">
                      ${policy.sample_product_price}
                    </td>

                    {/* USA ZONE */}
                    {usaZone && usaCompliance ? (
                      <>
                        <td className={`px-2 py-3 text-center text-xs bg-blue-50 border-l-2 border-gray-300 ${getStatusColor(usaCompliance)}`}>
                          ${usaZone.actual_cost_usd}
                        </td>
                        <td className={`px-2 py-3 text-center text-xs bg-blue-50 ${getStatusColor(usaCompliance)}`}>
                          ${usaZone.display_shipping_usd}
                        </td>
                        <td className={`px-2 py-3 text-center text-xs font-semibold bg-blue-50 ${getStatusColor(usaCompliance)} ${
                          !usaCompliance.shippingOk ? 'text-red-700' : 'text-gray-700'
                        }`}>
                          {usaCompliance.shippingRatio.toFixed(2)}x
                        </td>
                        <td className={`px-2 py-3 text-center text-xs font-semibold bg-blue-50 ${getStatusColor(usaCompliance)} ${
                          !usaCompliance.handlingOk ? 'text-red-700' : 'text-gray-700'
                        }`}>
                          ${usaZone.handling_fee_usd}<br/>
                          <span className="text-xs">({usaCompliance.handlingPercent.toFixed(0)}%)</span>
                        </td>
                        <td className={`px-2 py-3 text-center bg-blue-50 border-r-2 border-gray-300 ${getStatusColor(usaCompliance)}`}>
                          <div className="flex items-center justify-center gap-1">
                            {getStatusIcon(usaCompliance.shippingOk)}
                            {getStatusIcon(usaCompliance.handlingOk)}
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td colSpan={5} className="px-2 py-3 text-center text-xs text-gray-400 bg-blue-50 border-x-2 border-gray-300">
                          データなし
                        </td>
                      </>
                    )}

                    {/* OTHER ZONE */}
                    {otherZone && otherCompliance ? (
                      <>
                        <td className={`px-2 py-3 text-center text-xs bg-green-50 ${getStatusColor(otherCompliance)}`}>
                          ${otherZone.actual_cost_usd}
                        </td>
                        <td className={`px-2 py-3 text-center text-xs bg-green-50 ${getStatusColor(otherCompliance)}`}>
                          ${otherZone.display_shipping_usd}
                        </td>
                        <td className={`px-2 py-3 text-center text-xs font-semibold bg-green-50 ${getStatusColor(otherCompliance)} ${
                          !otherCompliance.shippingOk ? 'text-red-700' : 'text-gray-700'
                        }`}>
                          {otherCompliance.shippingRatio.toFixed(2)}x
                        </td>
                        <td className={`px-2 py-3 text-center text-xs font-semibold bg-green-50 ${getStatusColor(otherCompliance)} ${
                          !otherCompliance.handlingOk ? 'text-red-700' : 'text-gray-700'
                        }`}>
                          ${otherZone.handling_fee_usd}<br/>
                          <span className="text-xs">({otherCompliance.handlingPercent.toFixed(0)}%)</span>
                        </td>
                        <td className={`px-2 py-3 text-center bg-green-50 ${getStatusColor(otherCompliance)}`}>
                          <div className="flex items-center justify-center gap-1">
                            {getStatusIcon(otherCompliance.shippingOk)}
                            {getStatusIcon(otherCompliance.handlingOk)}
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td colSpan={5} className="px-2 py-3 text-center text-xs text-gray-400 bg-green-50">
                          データなし
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 凡例・注意事項 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            規約遵守基準
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>✅ <strong>送料</strong>: 実費の2.5倍以下</li>
            <li>✅ <strong>手数料</strong>: 商品価格の25%以下</li>
            <li>✅ 両方クリアで<strong className="text-green-700">緑色背景</strong></li>
            <li>❌ 超過で<strong className="text-red-700">赤色背景</strong></li>
          </ul>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            超過時の調整優先順位
          </h4>
          <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
            <li><strong>送料を下げる</strong>（優先度: 高）
              <div className="ml-5 text-xs">無料でもOK、規約違反を回避</div>
            </li>
            <li><strong>手数料を削減</strong>（優先度: 中）
              <div className="ml-5 text-xs">ゼロは避ける（還付対象のため少額維持）</div>
            </li>
          </ol>
        </div>
      </div>

      {/* 重要な注記 */}
      <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
        <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          重要: OTHER ZONEの実費データについて
        </h4>
        <div className="text-sm text-orange-700 space-y-2">
          <p>
            現在のOTHER ZONEは<strong>平均値</strong>を使用していますが、実際には<strong>22個の個別ZONE</strong>が存在します。
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>ヨーロッパ・アジアの一部地域は<strong>USAより高額</strong>な送料になる</li>
            <li>各ZONEごとに実費データを登録し、個別に規約遵守を確認する必要がある</li>
            <li>FedEx International Priorityの実費レートテーブルから正確なデータを取得すべき</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
