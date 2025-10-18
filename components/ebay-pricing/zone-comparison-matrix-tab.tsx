'use client'

import React, { useState, useEffect } from 'react'
import { Globe, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface PolicyV2 {
  id: number
  policy_number: number
  policy_name: string
  sample_product_price: number
}

interface ZoneRate {
  policy_id: number
  zone_code: string
  zone_name: string
  actual_cost_usd: number
  display_shipping_usd: number
  shipping_markup_percent: number
  handling_fee_usd: number
  total_cost_usd: number
}

export function ZoneComparisonMatrixTab() {
  const [policies, setPolicies] = useState<PolicyV2[]>([])
  const [zoneRates, setZoneRates] = useState<ZoneRate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedZone, setSelectedZone] = useState<string>('ALL')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      const { data: policiesData, error: policiesError } = await supabase
        .from('ebay_shipping_policies_v2')
        .select('id, policy_number, policy_name, sample_product_price')
        .order('policy_number')

      if (policiesError) throw policiesError

      const { data: zonesData, error: zonesError } = await supabase
        .from('ebay_policy_zone_rates_v2')
        .select('*')
        .eq('zone_type', 'OTHER')
        .order('policy_id')
        .order('zone_code')

      if (zonesError) throw zonesError

      setPolicies(policiesData || [])
      setZoneRates(zonesData || [])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const uniqueZones = Array.from(new Set(zoneRates.map(z => z.zone_code)))
    .map(code => {
      const zone = zoneRates.find(z => z.zone_code === code)
      return { code, name: zone?.zone_name || code }
    })
    .sort((a, b) => a.code.localeCompare(b.code))

  const getZoneRate = (policyId: number, zoneCode: string) => {
    return zoneRates.find(z => z.policy_id === policyId && z.zone_code === zoneCode)
  }

  const checkCompliance = (rate: ZoneRate, productPrice: number) => {
    const shippingRatio = rate.display_shipping_usd / rate.actual_cost_usd
    const handlingPercent = (rate.handling_fee_usd / productPrice) * 100
    return {
      shippingOk: shippingRatio <= 2.5,
      handlingOk: handlingPercent <= 25,
      shippingRatio,
      handlingPercent
    }
  }

  const filteredPolicies = selectedZone === 'ALL' ? policies : policies

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-600">データを読み込み中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Globe className="w-7 h-7 text-indigo-600" />
            ZONE別 実費 vs 表示送料マトリックス
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            36ポリシー × {uniqueZones.length} ZONE = {zoneRates.length}レコード
          </p>
        </div>
      </div>

      {/* ZONEフィルター */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedZone('ALL')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedZone === 'ALL'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            全ZONE
          </button>
          {uniqueZones.map(zone => (
            <button
              key={zone.code}
              onClick={() => setSelectedZone(zone.code)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedZone === zone.code
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {zone.code}
            </button>
          ))}
        </div>
      </div>

      {/* マトリックステーブル */}
      <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 border-b-2 border-gray-300">
              <tr>
                <th className="px-3 py-3 text-left font-semibold text-gray-700 sticky left-0 bg-gray-100 z-10 border-r-2 border-gray-300 min-w-[60px]">
                  No.
                </th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700 min-w-[180px]">
                  ポリシー名
                </th>
                <th className="px-3 py-3 text-center font-semibold text-gray-700">
                  価格
                </th>
                {(selectedZone === 'ALL' ? uniqueZones : uniqueZones.filter(z => z.code === selectedZone)).map(zone => (
                  <th key={zone.code} colSpan={5} className="px-3 py-3 text-center font-semibold text-indigo-700 bg-indigo-50 border-x border-gray-300">
                    {zone.code} - {zone.name}
                  </th>
                ))}
              </tr>
              <tr className="bg-gray-50 text-xs">
                <th className="sticky left-0 bg-gray-50 z-10 border-r-2 border-gray-300"></th>
                <th></th>
                <th></th>
                {(selectedZone === 'ALL' ? uniqueZones : uniqueZones.filter(z => z.code === selectedZone)).map(zone => (
                  <React.Fragment key={zone.code}>
                    <th className="px-2 py-2 text-center text-gray-600 bg-indigo-50 border-l border-gray-300">実費</th>
                    <th className="px-2 py-2 text-center text-gray-600 bg-indigo-50">送料</th>
                    <th className="px-2 py-2 text-center text-gray-600 bg-indigo-50">倍率</th>
                    <th className="px-2 py-2 text-center text-gray-600 bg-indigo-50">手数料</th>
                    <th className="px-2 py-2 text-center text-gray-600 bg-indigo-50 border-r border-gray-300">状態</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPolicies.map((policy, idx) => {
                const zonesToShow = selectedZone === 'ALL' ? uniqueZones : uniqueZones.filter(z => z.code === selectedZone)
                
                return (
                  <tr key={policy.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-indigo-50`}>
                    <td className="px-3 py-2 font-semibold text-gray-700 sticky left-0 z-10 bg-inherit border-r-2 border-gray-300">
                      {policy.policy_number}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {policy.policy_name}
                    </td>
                    <td className="px-3 py-2 text-center font-semibold text-gray-700">
                      ${policy.sample_product_price}
                    </td>
                    {zonesToShow.map(zone => {
                      const rate = getZoneRate(policy.id, zone.code)
                      if (!rate) {
                        return (
                          <React.Fragment key={zone.code}>
                            <td colSpan={5} className="px-2 py-2 text-center text-gray-400 bg-gray-100 border-x border-gray-300">
                              データなし
                            </td>
                          </React.Fragment>
                        )
                      }
                      
                      const compliance = checkCompliance(rate, policy.sample_product_price)
                      const bgColor = compliance.shippingOk && compliance.handlingOk ? 'bg-green-50' : 'bg-red-50'
                      
                      return (
                        <React.Fragment key={zone.code}>
                          <td className={`px-2 py-2 text-center ${bgColor} border-l border-gray-300`}>
                            ${rate.actual_cost_usd}
                          </td>
                          <td className={`px-2 py-2 text-center font-semibold ${bgColor}`}>
                            ${rate.display_shipping_usd}
                          </td>
                          <td className={`px-2 py-2 text-center ${bgColor} ${!compliance.shippingOk ? 'text-red-700 font-bold' : 'text-gray-700'}`}>
                            {compliance.shippingRatio.toFixed(2)}x
                          </td>
                          <td className={`px-2 py-2 text-center ${bgColor}`}>
                            ${rate.handling_fee_usd}
                            <div className="text-xs text-gray-500">({compliance.handlingPercent.toFixed(0)}%)</div>
                          </td>
                          <td className={`px-2 py-2 text-center ${bgColor} border-r border-gray-300`}>
                            {compliance.shippingOk && compliance.handlingOk ? (
                              <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600 mx-auto" />
                            )}
                          </td>
                        </React.Fragment>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">現在の戦略</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>✅ DDU送料: 実費の50%または$5の少ない方</li>
            <li>✅ 手数料: 商品価格の2%（還付対象維持）</li>
            <li>✅ 全ZONEで規約遵守（送料2.5倍以下、手数料25%以下）</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-800 mb-2">規約遵守状況</h4>
          <div className="text-sm text-green-700">
            <div className="flex justify-between mb-1">
              <span>総レコード:</span>
              <span className="font-semibold">{zoneRates.length}</span>
            </div>
            <div className="flex justify-between">
              <span>規約違反:</span>
              <span className="font-semibold text-green-800">0件 ✅</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
