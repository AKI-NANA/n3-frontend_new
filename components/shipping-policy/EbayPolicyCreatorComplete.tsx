'use client'

import { useState, useEffect } from 'react'
import { Plus, X, ChevronDown, ChevronRight, Globe, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ALL_SHIPPING_SERVICES_FINAL } from '@/lib/shipping-services-data'

// すべてのサービスを表示
const ALL_SERVICES = ALL_SHIPPING_SERVICES_FINAL

// カテゴリごとにグループ化
const GROUPED_SERVICES = {
  economy: ALL_SERVICES.filter(s => s.category === 'economy_intl'),
  standard: ALL_SERVICES.filter(s => s.category === 'standard_intl'),
  expedited: ALL_SERVICES.filter(s => s.category === 'expedited_intl'),
  international: ALL_SERVICES.filter(s => s.category === 'international'),
}

interface Region {
  region_code: string
  region_name: string
  country_count?: number
  countries?: Country[]
}

interface Country {
  country_code: string
  country_name: string
}

interface Service {
  id: number
  name: string
  nameJa: string
  code: string
  description: string
  days: string
  recommended: boolean
  carrier: string
  minDays: number
  maxDays: number
  shipsTo: string
  freeShipping: boolean
  cost: number
  additionalCost: number
}

export function EbayPolicyCreatorComplete() {
  const [policyName, setPolicyName] = useState('')
  const [description, setDescription] = useState('')
  const [handlingDays, setHandlingDays] = useState(10)
  
  // 配送サービスリスト
  const [services, setServices] = useState<Service[]>([])
  
  // 除外場所
  const [excludedCountries, setExcludedCountries] = useState<string[]>([])
  const [showExcludeDialog, setShowExcludeDialog] = useState(false)
  const [excludeSearchTerm, setExcludeSearchTerm] = useState('')
  
  // Ships to ダイアログ
  const [editingShipsToService, setEditingShipsToService] = useState<number | null>(null)
  const [showShipsToDialog, setShowShipsToDialog] = useState(false)
  
  // サービス追加ダイアログ
  const [showAddServiceDialog, setShowAddServiceDialog] = useState(false)
  const [serviceSearchTerm, setServiceSearchTerm] = useState('')
  const [selectedServiceCodes, setSelectedServiceCodes] = useState<Set<string>>(new Set())
  
  // データ
  const [regions, setRegions] = useState<Region[]>([])
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set())
  const [allCountries, setAllCountries] = useState<Country[]>([])
  
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadData()
  }, [])
  
  async function loadData() {
    setLoading(true)
    const supabase = createClient()
    
    try {
      // デフォルト除外国をデータベースから取得
      const { data: excluded } = await supabase
        .from('excluded_countries_master')
        .select('country_code')
        .eq('is_default_excluded', true)
      
      if (excluded) {
        setExcludedCountries(excluded.map(e => e.country_code))
      }
      
      // 地域・国データ
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
              .order('country_name')
            
            return {
              ...region,
              country_count: countries?.length || 0,
              countries: countries || []
            }
          })
        )
        
        setRegions(regionsWithCountries)
        
        // 全国リストを平坦化
        const allCountriesList = regionsWithCountries.flatMap(r => r.countries || [])
        setAllCountries(allCountriesList)
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error)
    } finally {
      setLoading(false)
    }
  }
  
  function toggleServiceSelection(code: string) {
    const newSelected = new Set(selectedServiceCodes)
    if (newSelected.has(code)) {
      newSelected.delete(code)
    } else {
      if (newSelected.size >= 5) {
        alert('Select up to 5 shipping services for your listing. / 最大5つまで選択できます')
        return
      }
      newSelected.add(code)
    }
    setSelectedServiceCodes(newSelected)
  }
  
  function addSelectedServices() {
    const newServices: Service[] = []
    
    selectedServiceCodes.forEach(code => {
      // 既に追加済みか確認
      if (services.some(s => s.code === code)) return
      
      const serviceData = ALL_SERVICES.find(s => s.code === code)
      if (!serviceData) return
      
      // daysから数値を抽出
      const [minDays, maxDays] = serviceData.days.split('-').map(d => parseInt(d.trim()))
      
      newServices.push({
        id: Date.now() + Math.random(),
        name: serviceData.name,
        nameJa: serviceData.nameJa,
        code: serviceData.code,
        description: serviceData.description,
        days: serviceData.days,
        recommended: serviceData.recommended,
        carrier: 'OTHER',
        minDays: minDays || 1,
        maxDays: maxDays || 20,
        shipsTo: 'Worldwide',
        freeShipping: false,
        cost: 0,
        additionalCost: 0,
      })
    })
    
    setServices([...services, ...newServices])
    setSelectedServiceCodes(new Set())
    setShowAddServiceDialog(false)
    setServiceSearchTerm('')
  }
  
  function removeService(id: number) {
    if (confirm('このサービスを削除しますか？ / Delete this service?')) {
      setServices(services.filter(s => s.id !== id))
    }
  }
  
  function updateService(id: number, updates: Partial<Service>) {
    setServices(services.map(s => s.id === id ? { ...s, ...updates } : s))
  }
  
  function openShipsToDialog(serviceId: number) {
    setEditingShipsToService(serviceId)
    setShowShipsToDialog(true)
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
  
  function toggleCountryExclusion(countryCode: string) {
    if (excludedCountries.includes(countryCode)) {
      setExcludedCountries(excludedCountries.filter(c => c !== countryCode))
    } else {
      setExcludedCountries([...excludedCountries, countryCode])
    }
  }
  
  function clearAllExclusions() {
    if (confirm('すべての除外設定をクリアしますか？ / Clear all exclusions?')) {
      setExcludedCountries([])
    }
  }
  
  async function handleSave() {
    if (!policyName) {
      alert('Policy name is required. / ポリシー名を入力してください')
      return
    }
    
    if (services.length === 0) {
      alert('Add at least one shipping service. / 少なくとも1つの配送サービスを追加してください')
      return
    }
    
    setCreating(true)
    
    try {
      const supabase = createClient()
      
      // ポリシー作成
      const { data: policy, error: policyError } = await supabase
        .from('ebay_fulfillment_policies')
        .insert({
          policy_name: policyName,
          marketplace_id: 'EBAY_US',
          handling_time_days: handlingDays,
          is_active: true
        })
        .select()
        .single()
      
      if (policyError) throw new Error(policyError.message)
      
      // サービス作成
      for (let i = 0; i < services.length; i++) {
        const service = services[i]
        
        await supabase
          .from('ebay_shipping_services')
          .insert({
            policy_id: policy.id,
            service_type: 'INTERNATIONAL',
            shipping_carrier_code: service.carrier,
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
      
      // 除外国
      for (const code of excludedCountries) {
        await supabase
          .from('ebay_shipping_exclusions')
          .insert({
            policy_id: policy.id,
            exclude_ship_to_location: code
          })
      }
      
      alert(`✅ Shipping policy created! / 配送ポリシー作成完了！\nID: ${policy.id}\nName: ${policyName}`)
      
      // フォームをリセット
      setPolicyName('')
      setDescription('')
      setServices([])
      
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`)
    } finally {
      setCreating(false)
    }
  }
  
  const filteredServices = {
    economy: GROUPED_SERVICES.economy.filter(s =>
      serviceSearchTerm === '' ||
      s.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) ||
      s.nameJa.includes(serviceSearchTerm)
    ),
    standard: GROUPED_SERVICES.standard.filter(s =>
      serviceSearchTerm === '' ||
      s.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) ||
      s.nameJa.includes(serviceSearchTerm)
    ),
    expedited: GROUPED_SERVICES.expedited.filter(s =>
      serviceSearchTerm === '' ||
      s.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) ||
      s.nameJa.includes(serviceSearchTerm)
    ),
    international: GROUPED_SERVICES.international.filter(s =>
      serviceSearchTerm === '' ||
      s.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) ||
      s.nameJa.includes(serviceSearchTerm)
    ),
  }
  
  const filteredCountries = allCountries.filter(c =>
    excludeSearchTerm === '' ||
    c.country_name.toLowerCase().includes(excludeSearchTerm.toLowerCase()) ||
    c.country_code.toLowerCase().includes(excludeSearchTerm.toLowerCase())
  )
  
  const selectedExcludedCountries = filteredCountries.filter(c => excludedCountries.includes(c.country_code))
  const unselectedCountries = filteredCountries.filter(c => !excludedCountries.includes(c.country_code))
  
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto bg-white p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading data... / データを読み込んでいます...</div>
      </div>
    )
  }
  
  return (
    <div className="max-w-4xl mx-auto bg-white p-6">
      {/* ヘッダー */}
      <div className="mb-6 pb-4 border-b">
        <h1 className="text-2xl font-bold">Create shipping policy</h1>
        <p className="text-sm text-gray-500">配送ポリシーを作成する</p>
      </div>
      
      {/* ポリシー名 */}
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-2">
          Policy name <span className="text-red-500">*</span>
        </label>
        <div className="text-xs text-gray-600 mb-2">ポリシー名（必須）</div>
        <input
          type="text"
          value={policyName}
          onChange={(e) => setPolicyName(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          maxLength={64}
          placeholder="Example: Free domestic shipping / 例: 国際配送ポリシー_標準"
        />
        <div className="text-xs text-gray-500 mt-1">{policyName.length}/64</div>
      </div>
      
      {/* 説明 */}
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-2">
          Description (optional)
        </label>
        <div className="text-xs text-gray-600 mb-2">
          説明（オプション）- Additional text to help you identify the contents of this policy
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          rows={3}
          maxLength={250}
          placeholder="Policy description / ポリシーの詳細説明"
        />
        <div className="text-xs text-gray-500 mt-1">{description.length}/250</div>
      </div>
      
      {/* SHIPPING */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-1">SHIPPING</h2>
        <div className="text-sm text-gray-600 mb-4">配送設定</div>
      </div>
      
      {/* International shipping */}
      <div className="mb-6">
        <h3 className="text-base font-bold mb-1">International shipping</h3>
        <div className="text-sm text-gray-600 mb-3">国際配送</div>
        
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">
            Cost type
          </label>
          <div className="text-xs text-gray-600 mb-2">
            料金タイプ - Flat: Same cost to all buyers / 全購入者に同じ料金
          </div>
          <select className="w-full px-3 py-2 border rounded" disabled>
            <option>Flat: Same cost to all buyers</option>
          </select>
        </div>
        
        {/* サービスリスト */}
        {services.length === 0 ? (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Globe className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600 mb-1">No shipping services configured</p>
            <p className="text-sm text-gray-500 mb-4">配送サービスが未設定です</p>
            <button
              onClick={() => setShowAddServiceDialog(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add services
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((service) => (
              <div key={service.id} className="border-2 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium">{service.name}</div>
                      {service.recommended && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">⭐ Recommended</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">{service.nameJa}</div>
                    <div className="text-xs text-gray-500">{service.days} business days / 営業日</div>
                    
                    {/* Ships to */}
                    <button 
                      onClick={() => openShipsToDialog(service.id)}
                      className="text-blue-600 text-sm hover:underline mt-2"
                    >
                      Ships to: {service.shipsTo} →
                    </button>
                    
                    {/* 送料設定 */}
                    <div className="mt-3 space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={service.freeShipping}
                          onChange={(e) => updateService(service.id, { freeShipping: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Offer free shipping / 送料無料を提供</span>
                      </label>
                      
                      {!service.freeShipping && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-600">Buyer pays (first item)</label>
                            <div className="text-xs text-gray-500 mb-1">購入者が支払う（最初の商品）</div>
                            <div className="flex items-center gap-1">
                              <span className="text-sm">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={service.cost}
                                onChange={(e) => updateService(service.id, { cost: parseFloat(e.target.value) || 0 })}
                                className="flex-1 px-2 py-1 border rounded text-sm"
                                min="0"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Each additional item</label>
                            <div className="text-xs text-gray-500 mb-1">同じ商品の追加料金</div>
                            <div className="flex items-center gap-1">
                              <span className="text-sm">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={service.additionalCost}
                                onChange={(e) => updateService(service.id, { additionalCost: parseFloat(e.target.value) || 0 })}
                                className="flex-1 px-2 py-1 border rounded text-sm"
                                min="0"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => removeService(service.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Delete / 削除"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            
            <button
              onClick={() => setShowAddServiceDialog(true)}
              disabled={services.length >= 5}
              className="w-full py-2 border-2 border-dashed rounded hover:bg-gray-50 text-blue-600 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add services {services.length > 0 && `(${services.length}/5)`}
            </button>
          </div>
        )}
      </div>
      
      {/* Excluded locations */}
      <div className="mb-6">
        <h3 className="text-base font-bold mb-1">Excluded locations (optional)</h3>
        <div className="text-sm text-gray-600 mb-3">
          除外する場所（オプション）- Places you don't ship to
        </div>
        
        <div className="border rounded p-3 hover:bg-gray-50 cursor-pointer" onClick={() => setShowExcludeDialog(true)}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">
                APO/FPO (+{excludedCountries.length})
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {excludedCountries.length} countries excluded / {excludedCountries.length}カ国を除外
              </div>
            </div>
            <button
              className="text-blue-600 text-sm hover:underline"
              onClick={(e) => {
                e.stopPropagation()
                setShowExcludeDialog(true)
              }}
            >
              Edit / 編集 →
            </button>
          </div>
        </div>
      </div>
      
      {/* Preferences */}
      <div className="mb-6">
        <h3 className="text-base font-bold mb-1">Preferences</h3>
        <div className="text-sm text-gray-600 mb-3">設定</div>
        
        <div>
          <label className="block text-sm font-semibold mb-2">
            Handling time
          </label>
          <div className="text-xs text-gray-600 mb-2">
            処理時間 - Number of business days to ship the item
          </div>
          <select
            value={handlingDays}
            onChange={(e) => setHandlingDays(parseInt(e.target.value))}
            className="w-full px-3 py-2 border rounded"
          >
            {[1, 2, 3, 4, 5, 10, 15, 20, 30].map(days => (
              <option key={days} value={days}>{days} business days / {days}営業日</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* ボタン */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={handleSave}
          disabled={creating || services.length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? 'Saving... / 保存中...' : 'Save / 保存'}
        </button>
        <button 
          className="px-6 py-2 border rounded hover:bg-gray-50"
          onClick={() => {
            if (confirm('Discard changes? / 変更を破棄しますか？')) {
              setPolicyName('')
              setDescription('')
              setServices([])
            }
          }}
        >
          Cancel / キャンセル
        </button>
      </div>
      
      {/* サービス追加ダイアログ */}
      {showAddServiceDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold">Add services</h3>
              <button 
                onClick={() => {
                  setShowAddServiceDialog(false)
                  setSelectedServiceCodes(new Set())
                  setServiceSearchTerm('')
                }}
                className="text-blue-600 hover:underline text-sm"
              >
                Done
              </button>
            </div>
            
            {/* 検索 */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={serviceSearchTerm}
                  onChange={(e) => setServiceSearchTerm(e.target.value)}
                  placeholder="Find a shipping service"
                  className="w-full pl-10 pr-3 py-2 border rounded"
                />
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Select up to 5 shipping services for your listing.
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {/* Economy services */}
              {filteredServices.economy.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-sm mb-1">Economy services from outside the country</h4>
                  <div className="text-xs text-gray-500 mb-2">
                    海外からのエコノミーサービス - Rendered {filteredServices.economy.length} out of {GROUPED_SERVICES.economy.length} options
                  </div>
                  <div className="space-y-2">
                    {filteredServices.economy.map(service => (
                      <label 
                        key={service.code}
                        className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedServiceCodes.has(service.code)}
                          onChange={() => toggleServiceSelection(service.code)}
                          className="mt-0.5 w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{service.nameJa}</div>
                          <div className="text-xs text-gray-500">{service.days} business days</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Standard services */}
              {filteredServices.standard.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-sm mb-1">Standard services from outside the country</h4>
                  <div className="text-xs text-gray-500 mb-2">
                    海外からの標準サービス - Rendered {filteredServices.standard.length} out of {GROUPED_SERVICES.standard.length} options
                  </div>
                  <div className="space-y-2">
                    {filteredServices.standard.map(service => (
                      <label 
                        key={service.code}
                        className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedServiceCodes.has(service.code)}
                          onChange={() => toggleServiceSelection(service.code)}
                          className="mt-0.5 w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{service.nameJa}</div>
                          <div className="text-xs text-gray-500">{service.days} business days</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Expedited services */}
              {filteredServices.expedited.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-sm mb-1">Expedited services from outside the country</h4>
                  <div className="text-xs text-gray-500 mb-2">
                    海外からの速達サービス - Rendered {filteredServices.expedited.length} out of {GROUPED_SERVICES.expedited.length} options
                  </div>
                  <div className="space-y-2">
                    {filteredServices.expedited.map(service => (
                      <label 
                        key={service.code}
                        className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedServiceCodes.has(service.code)}
                          onChange={() => toggleServiceSelection(service.code)}
                          className="mt-0.5 w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{service.nameJa}</div>
                          <div className="text-xs text-gray-500">{service.days} business days</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
              {/* International services */}
              {filteredServices.international.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-sm mb-1">International services</h4>
                  <div className="text-xs text-gray-500 mb-2">
                    その他の国際サービス - Rendered {filteredServices.international.length} out of {GROUPED_SERVICES.international.length} options
                  </div>
                  <div className="space-y-2">
                    {filteredServices.international.map(service => (
                      <label 
                        key={service.code}
                        className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedServiceCodes.has(service.code)}
                          onChange={() => toggleServiceSelection(service.code)}
                          className="mt-0.5 w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{service.nameJa}</div>
                          <div className="text-xs text-gray-500">{service.days} business days</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {selectedServiceCodes.size}/5 selected / 選択中
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAddServiceDialog(false)
                    setSelectedServiceCodes(new Set())
                    setServiceSearchTerm('')
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addSelectedServices}
                  disabled={selectedServiceCodes.size === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Ships to ダイアログ */}
      {showShipsToDialog && editingShipsToService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Ships to</h3>
                <button onClick={() => setShowShipsToDialog(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-3">
                {[
                  { value: 'Worldwide', label: 'Worldwide', labelJa: '全世界' },
                  { value: 'Americas', label: 'Americas', labelJa: '南北アメリカ大陸' },
                  { value: 'Europe', label: 'Europe', labelJa: 'ヨーロッパ' },
                  { value: 'Asia', label: 'Asia', labelJa: 'アジア' },
                ].map(location => (
                  <label key={location.value} className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="ships-to"
                      value={location.value}
                      checked={services.find(s => s.id === editingShipsToService)?.shipsTo === location.value}
                      onChange={() => {
                        updateService(editingShipsToService, { shipsTo: location.value })
                        setShowShipsToDialog(false)
                      }}
                      className="w-4 h-4"
                    />
                    <div>
                      <div className="font-medium">{location.label}</div>
                      <div className="text-xs text-gray-500">{location.labelJa}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 除外国ダイアログ */}
      {showExcludeDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold">Excluded locations</h3>
              <button 
                onClick={() => setShowExcludeDialog(false)}
                className="text-blue-600 hover:underline text-sm"
              >
                Done
              </button>
            </div>
            
            {/* 検索 */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={excludeSearchTerm}
                  onChange={(e) => setExcludeSearchTerm(e.target.value)}
                  placeholder="Find a country or a region"
                  className="w-full pl-10 pr-3 py-2 border rounded"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {/* Selected セクション */}
              {selectedExcludedCountries.length > 0 && (
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">Selected</h4>
                    <button
                      onClick={clearAllExclusions}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1">
                    {selectedExcludedCountries.map(country => (
                      <label 
                        key={country.country_code}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={true}
                          onChange={() => toggleCountryExclusion(country.country_code)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{country.country_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 未選択の国 */}
              {unselectedCountries.length > 0 && (
                <div className="p-4">
                  <div className="space-y-1">
                    {unselectedCountries.map(country => (
                      <label 
                        key={country.country_code}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => toggleCountryExclusion(country.country_code)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{country.country_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
