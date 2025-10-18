'use client'

import { useState, useEffect } from 'react'
import { Globe, Plus, X, ChevronDown, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Region {
  region_code: string
  region_name: string
  countries?: Country[]
}

interface Country {
  country_code: string
  country_name: string
}

export function EbayStylePolicyCreator() {
  const [policyName, setPolicyName] = useState('')
  const [description, setDescription] = useState('')
  const [handlingDays, setHandlingDays] = useState(10)
  
  // 配送サービス
  const [services, setServices] = useState([
    {
      id: 1,
      name: 'Economy International Shipping',
      code: 'EconomyShippingFromOutsideUS',
      minDays: 13,
      maxDays: 23,
      freeShipping: true,
      cost: 0,
      additionalCost: 0,
      shipsTo: 'Worldwide'
    },
    {
      id: 2,
      name: 'Expedited International Shipping',
      code: 'ExpeditedShippingFromOutsideUS',
      minDays: 7,
      maxDays: 15,
      freeShipping: false,
      cost: 14.00,
      additionalCost: 14.00,
      shipsTo: 'Worldwide'
    }
  ])
  
  // 除外場所
  const [excludedRegions, setExcludedRegions] = useState<string[]>([])
  const [showExclusionDialog, setShowExclusionDialog] = useState(false)
  
  // 地域データ
  const [regions, setRegions] = useState<Region[]>([])
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set())
  
  const [creating, setCreating] = useState(false)
  
  useEffect(() => {
    loadRegions()
    loadDefaultExclusions()
  }, [])
  
  async function loadRegions() {
    const supabase = createClient()
    
    const { data: regionsData } = await supabase
      .from('shipping_regions')
      .select('region_code, region_name')
      .gte('sort_order', 10)
      .order('sort_order')
    
    if (regionsData) {
      const regionsWithCountries = await Promise.all(
        regionsData.map(async (region) => {
          const { data: countries } = await supabase
            .from('region_country_mapping')
            .select('country_code, country_name')
            .eq('region_code', region.region_code)
          
          return {
            ...region,
            countries: countries || []
          }
        })
      )
      
      setRegions(regionsWithCountries)
    }
  }
  
  async function loadDefaultExclusions() {
    const supabase = createClient()
    
    const { data } = await supabase
      .from('excluded_countries_master')
      .select('country_code')
      .eq('is_default_excluded', true)
    
    if (data) {
      setExcludedRegions(data.map(d => d.country_code))
    }
  }
  
  function toggleRegionExpand(regionCode: string) {
    const newExpanded = new Set(expandedRegions)
    if (newExpanded.has(regionCode)) {
      newExpanded.delete(regionCode)
    } else {
      newExpanded.add(regionCode)
    }
    setExpandedRegions(newExpanded)
  }
  
  function addService() {
    const newService = {
      id: Date.now(),
      name: 'New Shipping Service',
      code: 'StandardInternational',
      minDays: 10,
      maxDays: 20,
      freeShipping: false,
      cost: 0,
      additionalCost: 0,
      shipsTo: 'Worldwide'
    }
    setServices([...services, newService])
  }
  
  function removeService(id: number) {
    setServices(services.filter(s => s.id !== id))
  }
  
  function updateService(id: number, field: string, value: any) {
    setServices(services.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ))
  }
  
  async function handleCreate() {
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
      
      // 2. サービス作成
      for (let i = 0; i < services.length; i++) {
        const service = services[i]
        
        await supabase
          .from('ebay_shipping_services')
          .insert({
            policy_id: policy.id,
            service_type: 'INTERNATIONAL',
            shipping_carrier_code: 'OTHER',
            shipping_service_code: service.code,
            free_shipping: service.freeShipping,
            shipping_cost_value: service.freeShipping ? 0 : service.cost,
            additional_shipping_cost_value: service.freeShipping ? 0 : service.additionalCost,
            ship_to_locations: [service.shipsTo],
            min_transit_time_value: service.minDays,
            max_transit_time_value: service.maxDays,
            sort_order: i
          })
      }
      
      // 3. 除外国設定
      for (const code of excludedRegions) {
        await supabase
          .from('ebay_shipping_exclusions')
          .insert({
            policy_id: policy.id,
            exclude_ship_to_location: code
          })
      }
      
      alert(`✅ 配送ポリシー作成完了！\n\nポリシーID: ${policy.id}\nサービス数: ${services.length}\n除外国: ${excludedRegions.length}`)
      
      // リセット
      setPolicyName('')
      setDescription('')
      
    } catch (error: any) {
      alert(`❌ エラー: ${error.message}`)
      console.error(error)
    } finally {
      setCreating(false)
    }
  }
  
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">配送ポリシーを作成する</h1>
        <p className="text-sm text-gray-600">Edit shipping policy</p>
      </div>
      
      {/* ポリシー名 */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            ポリシー名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={policyName}
            onChange={(e) => setPolicyName(e.target.value)}
            placeholder="例: 国内送料無料"
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            maxLength={64}
          />
          <div className="text-xs text-gray-500 mt-1">{policyName.length}/64</div>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            説明（オプション）
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="このポリシーの内容を理解するのに役立つ追加テキスト"
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            rows={4}
            maxLength={250}
          />
          <div className="text-xs text-gray-500 mt-1">{description.length}/250</div>
        </div>
      </div>
      
      {/* 国際配送 */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">国際配送</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">配送サービスを追加する</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked className="sr-only peer" readOnly />
              <div className="w-11 h-6 bg-blue-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
        
        {/* コストタイプ */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            コストタイプ
          </label>
          <select className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg">
            <option>フラット: すべての購入者に同じコスト</option>
            <option>計算済み: 購入者の場所によってコストが異なる</option>
          </select>
        </div>
        
        {/* サービスリスト */}
        <div className="space-y-4">
          {services.map((service, index) => (
            <div key={service.id} className="border-2 border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-4 mb-4">
                <Globe className="w-12 h-12 text-gray-400 flex-shrink-0 mt-2" />
                
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      サービス名
                    </label>
                    <input
                      type="text"
                      value={service.name}
                      onChange={(e) => updateService(service.id, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        最短配送日数（営業日）
                      </label>
                      <input
                        type="number"
                        value={service.minDays}
                        onChange={(e) => updateService(service.id, 'minDays', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        最長配送日数（営業日）
                      </label>
                      <input
                        type="number"
                        value={service.maxDays}
                        onChange={(e) => updateService(service.id, 'maxDays', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      配送先: {service.shipsTo} →
                    </button>
                  </div>
                </div>
                
                <div className="w-64 space-y-2">
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={service.freeShipping}
                      onChange={(e) => updateService(service.id, 'freeShipping', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">送料無料を提供</span>
                  </label>
                  
                  {!service.freeShipping && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          購入者が支払う（最初のアイテム）
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={service.cost}
                            onChange={(e) => updateService(service.id, 'cost', parseFloat(e.target.value))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          同じアイテムごと
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={service.additionalCost}
                            onChange={(e) => updateService(service.id, 'additionalCost', parseFloat(e.target.value))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                {services.length > 1 && (
                  <button
                    onClick={() => removeService(service.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={addService}
          className="mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
        >
          <Plus className="w-5 h-5" />
          サービスを追加する
        </button>
      </div>
      
      {/* 除外する場所 */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">除外する場所（オプション）</h2>
        
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">APO/FPO (+{excludedRegions.length})</div>
              <div className="text-sm text-gray-600">
                {excludedRegions.slice(0, 3).join(', ')}
                {excludedRegions.length > 3 && ` +${excludedRegions.length - 3}`}
              </div>
            </div>
            <button
              onClick={() => setShowExclusionDialog(true)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              編集 →
            </button>
          </div>
        </div>
      </div>
      
      {/* 設定 */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">設定</h2>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            処理時間
          </label>
          <select
            value={handlingDays}
            onChange={(e) => setHandlingDays(parseInt(e.target.value))}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
          >
            {[1, 2, 3, 4, 5, 10, 15, 20].map(days => (
              <option key={days} value={days}>{days}営業日</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* 保存ボタン */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleCreate}
          disabled={creating || !policyName}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {creating ? '作成中...' : '保存'}
        </button>
        
        <button className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold">
          キャンセル
        </button>
      </div>
      
      {/* 除外場所ダイアログ */}
      {showExclusionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">除外する場所</h3>
              <button
                onClick={() => setShowExclusionDialog(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-2">
              {regions.map(region => (
                <div key={region.region_code} className="border-b border-gray-200 py-2">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleRegionExpand(region.region_code)}
                  >
                    <div className="flex items-center gap-2">
                      {expandedRegions.has(region.region_code) ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                      <span className="font-medium">{region.region_name}</span>
                      <span className="text-sm text-gray-600">
                        ({region.countries?.length || 0}カ国)
                      </span>
                    </div>
                  </div>
                  
                  {expandedRegions.has(region.region_code) && region.countries && (
                    <div className="ml-7 mt-2 space-y-1">
                      {region.countries.map(country => (
                        <label key={country.country_code} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={excludedRegions.includes(country.country_code)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setExcludedRegions([...excludedRegions, country.country_code])
                              } else {
                                setExcludedRegions(excludedRegions.filter(c => c !== country.country_code))
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{country.country_name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowExclusionDialog(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                完了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
