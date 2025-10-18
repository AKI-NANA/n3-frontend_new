// components/ebay-pricing/shipping-policies-tab.tsx
'use client'

import { useState, useEffect } from 'react'
import { Package, Calculator, TrendingUp, AlertCircle, CheckCircle, XCircle, Filter } from 'lucide-react'
import { generateShippingPolicies, type ShippingPolicyPattern } from '@/lib/ebay-pricing/shipping-policy-generator'

interface ShippingPoliciesTabProps {
  policies: any[]
}

export function ShippingPoliciesTab({ policies }: ShippingPoliciesTabProps) {
  const [showGenerated, setShowGenerated] = useState(true)
  const [generatedPolicies, setGeneratedPolicies] = useState<ShippingPolicyPattern[]>([])
  const [filterBasis, setFilterBasis] = useState<'ALL' | 'DDP' | 'DDU'>('ALL')

  useEffect(() => {
    const policies = generateShippingPolicies()
    setGeneratedPolicies(policies)
    console.log(`生成されたポリシー数: ${policies.length}`)
  }, [])

  const filteredPolicies = generatedPolicies.filter(p => 
    filterBasis === 'ALL' || p.basis === filterBasis
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">配送ポリシー（DDP/DDU別Handling）</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGenerated(!showGenerated)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            {showGenerated ? '生成ポリシーを隠す' : '生成ポリシーを表示'}
          </button>
        </div>
      </div>

      {/* 生成された配送ポリシー */}
      {showGenerated && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-600" />
              <h3 className="text-xl font-bold text-gray-800">
                自動生成配送ポリシー（{filteredPolicies.length}件）
              </h3>
            </div>
            
            {/* フィルター */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <select
                value={filterBasis}
                onChange={(e) => setFilterBasis(e.target.value as any)}
                className="px-3 py-1.5 border rounded text-sm"
              >
                <option value="ALL">全て（{generatedPolicies.length}）</option>
                <option value="DDP">DDP基準のみ（{generatedPolicies.filter(p => p.basis === 'DDP').length}）</option>
                <option value="DDU">DDU基準のみ（{generatedPolicies.filter(p => p.basis === 'DDU').length}）</option>
              </select>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-300 rounded p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <strong>ポリシー選択ロジック:</strong>
              <ul className="list-disc ml-5 mt-1 space-y-1">
                <li><strong>DDP基準:</strong> USA価格を基準、他国は送料↓Handling↑で利益率調整</li>
                <li><strong>DDU基準:</strong> 他国価格を基準、USAは送料↑（実費2.5倍まで）で利益率調整</li>
                <li>低価格商品または高送料商品 → DDU基準が適用可能</li>
                <li>高価格商品または低送料商品 → DDP基準のみ</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3 max-h-[800px] overflow-y-auto">
            {filteredPolicies.map((policy, idx) => (
              <div key={idx} className={`bg-white rounded-lg p-4 border-2 ${
                policy.basis === 'DDP' ? 'border-blue-300' : 'border-green-300'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-lg">{policy.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        policy.basis === 'DDP' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {policy.basis}基準
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {policy.applicability}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      重量: {policy.weightRange.min}-{policy.weightRange.max}kg | 
                      価格: ${policy.priceRange.min}-${policy.priceRange.max}
                    </div>
                  </div>
                  {policy.basis === 'DDP' ? (
                    <CheckCircle className="w-6 h-6 text-blue-600" />
                  ) : (
                    <Package className="w-6 h-6 text-green-600" />
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
                  {policy.zones.map((zone, zIdx) => (
                    <div key={zIdx} className={`rounded-lg p-2 border ${
                      zone.country === 'US' 
                        ? 'bg-blue-50 border-blue-300' 
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="font-bold text-sm mb-1">
                        {zone.country}
                        {zone.country === 'US' && ' 🇺🇸'}
                      </div>
                      
                      <div className="space-y-0.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">実費:</span>
                          <span className="font-semibold text-red-600">${zone.actualCost}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">送料:</span>
                          <span className="font-bold text-green-600">${zone.displayShipping}</span>
                        </div>

                        {zone.handlingDDP !== null ? (
                          <div className="flex justify-between bg-yellow-100 px-1 rounded">
                            <span className="text-gray-700">DDP:</span>
                            <span className="font-bold text-yellow-800">${zone.handlingDDP}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between bg-purple-100 px-1 rounded">
                            <span className="text-gray-700">DDU:</span>
                            <span className="font-bold text-purple-800">${zone.handlingDDU}</span>
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500 pt-1 border-t">
                          倍率: {(zone.displayShipping / zone.actualCost).toFixed(2)}x
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 既存のポリシー */}
      <div>
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          現在のDBポリシー（{policies.length}件）
        </h3>
        <div className="space-y-4">
          {policies.map((policy) => (
            <div key={policy.id} className="border-2 rounded-lg p-6 bg-gray-50">
              <h4 className="text-lg font-bold text-gray-800 mb-4">
                {policy.policy_name} ({policy.ebay_policy_id || 'N/A'})
              </h4>
              
              <div className="mb-4 grid grid-cols-3 gap-4 text-sm bg-gray-100 p-3 rounded">
                <div>
                  重量: <strong>{policy.weight_min}-{policy.weight_max}kg</strong>
                </div>
                <div>
                  サイズ: <strong>{policy.size_min}-{policy.size_max}cm</strong>
                </div>
                <div>
                  価格帯: <strong>${policy.price_min}-${policy.price_max === Infinity ? '∞' : policy.price_max}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {policy.zones?.map((zone: any) => (
                  <div key={zone.country_code} className="bg-blue-50 border border-blue-200 rounded p-3">
                    <div className="font-bold mb-2">{zone.country_code}</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>表示送料:</span>
                        <strong className="text-blue-600">${zone.display_shipping}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>実費:</span>
                        <strong className="text-red-600">${zone.actual_cost}</strong>
                      </div>
                      <div className="border-t my-1"></div>
                      {zone.handling_ddp !== undefined && zone.handling_ddp !== null && (
                        <div className="flex justify-between">
                          <span>Handling (DDP):</span>
                          <strong className="text-green-600">${zone.handling_ddp}</strong>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Handling (DDU):</span>
                        <strong className="text-green-600">${zone.handling_ddu}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
