'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Region {
  region_code: string
  region_name: string
  country_count?: number
}

export function EbayPolicyCreatorFixed() {
  const [policyName, setPolicyName] = useState('')
  const [description, setDescription] = useState('')
  const [handlingDays, setHandlingDays] = useState(10)
  
  // 国際配送
  const [intlEnabled, setIntlEnabled] = useState(true)
  const [costType, setCostType] = useState<'flat' | 'calculated'>('flat')
  
  // Economy service
  const [economyEnabled, setEconomyEnabled] = useState(true)
  const [economyMinDays, setEconomyMinDays] = useState(13)
  const [economyMaxDays, setEconomyMaxDays] = useState(23)
  const [economyShipsTo, setEconomyShipsTo] = useState('Worldwide')
  const [economyFree, setEconomyFree] = useState(true)
  const [economyCost, setEconomyCost] = useState(0)
  const [economyAdditional, setEconomyAdditional] = useState(0)
  
  // Expedited service
  const [expeditedEnabled, setExpeditedEnabled] = useState(true)
  const [expeditedMinDays, setExpeditedMinDays] = useState(7)
  const [expeditedMaxDays, setExpeditedMaxDays] = useState(15)
  const [expeditedShipsTo, setExpeditedShipsTo] = useState('Worldwide')
  const [expeditedCost, setExpeditedCost] = useState(14.00)
  const [expeditedAdditional, setExpeditedAdditional] = useState(14.00)
  
  // 除外場所
  const [excludedLocations, setExcludedLocations] = useState<string[]>([])
  const [showExcludeDialog, setShowExcludeDialog] = useState(false)
  const [regions, setRegions] = useState<Region[]>([])
  
  const [creating, setCreating] = useState(false)
  
  useEffect(() => {
    loadData()
  }, [])
  
  async function loadData() {
    const supabase = createClient()
    
    // デフォルト除外国
    const { data: excluded } = await supabase
      .from('excluded_countries_master')
      .select('country_code')
      .eq('is_default_excluded', true)
    
    if (excluded) {
      setExcludedLocations(excluded.map(e => e.country_code))
    }
    
    // 地域リスト
    const { data: regionsData } = await supabase
      .from('shipping_regions')
      .select('region_code, region_name')
      .gte('sort_order', 10)
      .order('sort_order')
    
    if (regionsData) {
      const regionsWithCounts = await Promise.all(
        regionsData.map(async (region) => {
          const { count } = await supabase
            .from('region_country_mapping')
            .select('*', { count: 'exact', head: true })
            .eq('region_code', region.region_code)
          
          return {
            ...region,
            country_count: count || 0
          }
        })
      )
      
      setRegions(regionsWithCounts)
    }
  }
  
  async function handleSave() {
    if (!policyName) {
      alert('ポリシー名を入力してください')
      return
    }
    
    setCreating(true)
    
    try {
      const supabase = createClient()
      
      // 1. ポリシー作成
      const { data: policy, error: policyError } = await supabase
        .from('ebay_fulfillment_policies')
        .insert({
          policy_name: policyName,
          description: description,
          marketplace_id: 'EBAY_US',
          handling_time_days: handlingDays,
          is_active: true
        })
        .select()
        .single()
      
      if (policyError) throw new Error(policyError.message)
      
      // 2. 国際配送サービス
      const services = []
      
      if (economyEnabled) {
        services.push({
          policy_id: policy.id,
          service_type: 'INTERNATIONAL',
          shipping_carrier_code: 'OTHER',
          shipping_service_code: 'EconomyShippingFromOutsideUS',
          free_shipping: economyFree,
          shipping_cost_value: economyFree ? 0 : economyCost,
          additional_shipping_cost_value: economyFree ? 0 : economyAdditional,
          ship_to_locations: [economyShipsTo],
          min_transit_time_value: economyMinDays,
          max_transit_time_value: economyMaxDays,
          sort_order: 0
        })
      }
      
      if (expeditedEnabled) {
        services.push({
          policy_id: policy.id,
          service_type: 'INTERNATIONAL',
          shipping_carrier_code: 'OTHER',
          shipping_service_code: 'ExpeditedShippingFromOutsideUS',
          free_shipping: false,
          shipping_cost_value: expeditedCost,
          additional_shipping_cost_value: expeditedAdditional,
          ship_to_locations: [expeditedShipsTo],
          min_transit_time_value: expeditedMinDays,
          max_transit_time_value: expeditedMaxDays,
          sort_order: 1
        })
      }
      
      if (services.length > 0) {
        await supabase.from('ebay_shipping_services').insert(services)
      }
      
      // 3. 除外国
      for (const code of excludedLocations) {
        await supabase
          .from('ebay_shipping_exclusions')
          .insert({
            policy_id: policy.id,
            exclude_ship_to_location: code
          })
      }
      
      alert(`配送ポリシー作成完了！\nID: ${policy.id}`)
      
    } catch (error: any) {
      alert(`エラー: ${error.message}`)
    } finally {
      setCreating(false)
    }
  }
  
  return (
    <div className="max-w-4xl mx-auto bg-white">
      {/* ヘッダー */}
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">配送ポリシーを編集する</h1>
        <p className="text-sm text-gray-500 mt-1">Edit shipping policy</p>
      </div>
      
      {/* ポリシー名 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ポリシー名
        </label>
        <input
          type="text"
          value={policyName}
          onChange={(e) => setPolicyName(e.target.value)}
          placeholder="例：国内送料無料"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          maxLength={64}
        />
        <div className="text-xs text-gray-500 mt-1">{policyName.length}/64</div>
      </div>
      
      {/* 説明 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          説明（オプション）
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="このポリシーの内容を理解するのに役立つ追加テキスト"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          rows={3}
          maxLength={250}
        />
        <div className="text-xs text-gray-500 mt-1">{description.length}/250</div>
      </div>
      
      {/* SHIPPING セクション */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">SHIPPING</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Shipping method
          </label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
            <option>Standard shipping: Small to medium items</option>
          </select>
        </div>
      </div>
      
      {/* Domestic shipping */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Domestic shipping</h3>
        
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cost type
          </label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
            <option>Flat: Same cost to all buyers</option>
          </select>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400">
              📦
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">Economy Shipping from outside US</div>
              <div className="text-xs text-gray-500">11~23営業日</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">購入者が支払う（最初の...）</div>
              <div className="font-semibold">$ 0.00</div>
            </div>
          </div>
          
          <div className="mt-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">送料無料を提供</span>
            </label>
          </div>
        </div>
      </div>
      
      {/* International shipping */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900">International shipping</h3>
          <label className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Add shipping services</span>
            <input
              type="checkbox"
              checked={intlEnabled}
              onChange={(e) => setIntlEnabled(e.target.checked)}
              className="rounded"
            />
          </label>
        </div>
        
        {intlEnabled && (
          <>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cost type
              </label>
              <select
                value={costType}
                onChange={(e) => setCostType(e.target.value as 'flat' | 'calculated')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="flat">Flat: Same cost to all buyers</option>
                <option value="calculated">Calculated: Cost varies by buyer location</option>
              </select>
            </div>
            
            {/* Economy International */}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 flex-shrink-0">
                  🚚
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm mb-2">Economy International Shipping</div>
                  <div className="text-xs text-gray-500 mb-2">{economyMinDays}~{economyMaxDays}営業日</div>
                  
                  <button className="text-blue-600 text-sm hover:underline mb-3">
                    Ships to: {economyShipsTo} →
                  </button>
                  
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={economyFree}
                        onChange={(e) => setEconomyFree(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">送料無料を提供</span>
                    </label>
                    
                    {!economyFree && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            購入者が支払う（最初の...）
                          </label>
                          <div className="flex items-center">
                            <span className="mr-1">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={economyCost}
                              onChange={(e) => setEconomyCost(parseFloat(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            同じのアイテム
                          </label>
                          <div className="flex items-center">
                            <span className="mr-1">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={economyAdditional}
                              onChange={(e) => setEconomyAdditional(parseFloat(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Expedited International */}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 flex-shrink-0">
                  ✈️
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm mb-2">Expedited International Shipping</div>
                  <div className="text-xs text-gray-500 mb-2">{expeditedMinDays}~{expeditedMaxDays}営業日</div>
                  
                  <button className="text-blue-600 text-sm hover:underline mb-3">
                    Ships to: {expeditedShipsTo} →
                  </button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        購入者が支払う（最初の...）
                      </label>
                      <div className="flex items-center">
                        <span className="mr-1">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={expeditedCost}
                          onChange={(e) => setExpeditedCost(parseFloat(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        同じのアイテム
                      </label>
                      <div className="flex items-center">
                        <span className="mr-1">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={expeditedAdditional}
                          onChange={(e) => setExpeditedAdditional(parseFloat(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Excluded locations */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">除外する場所（オプション）</h3>
        
        <div className="border border-gray-300 rounded-md p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">APO/FPO (+{excludedLocations.length})</div>
            </div>
            <button
              onClick={() => setShowExcludeDialog(true)}
              className="text-blue-600 text-sm hover:underline"
            >
              編集 →
            </button>
          </div>
        </div>
      </div>
      
      {/* Preferences */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Preferences</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Handling time
          </label>
          <select
            value={handlingDays}
            onChange={(e) => setHandlingDays(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            {[1, 2, 3, 4, 5, 10, 15, 20, 30].map(days => (
              <option key={days} value={days}>{days}営業日</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* ボタン */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={creating}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? '保存中...' : '保存'}
        </button>
        <button className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
          キャンセル
        </button>
      </div>
      
      {/* 除外場所ダイアログ */}
      {showExcludeDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <h3 className="text-xl font-bold mb-4">Excluded locations</h3>
            <button
              onClick={() => setShowExcludeDialog(false)}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
