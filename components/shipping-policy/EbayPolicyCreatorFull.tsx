'use client'

import { useState, useEffect } from 'react'
import { Plus, X, ChevronDown, ChevronRight, Search, MoreVertical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { RateTableCreator } from './RateTableCreator'
import { ALL_SHIPPING_SERVICES_FINAL } from '@/lib/shipping-services-data'
import { EXCLUDED_LOCATIONS_DATA, getDefaultExcludedLocations, getExcludedCount } from '@/lib/excluded-locations-data'

// 配送方法
const SHIPPING_METHODS = [
  { value: 'STANDARD', label: 'Standard shipping: Small to medium items', desc: '標準配送：小型〜中型商品（最も一般的）' },
  { value: 'FREIGHT', label: 'Freight: Large items that require special handling', desc: '貨物配送：特別な取り扱いが必要な大型商品' },
  { value: 'NO_SHIPPING', label: 'No shipping. Local pickup only', desc: '配送なし：店頭受取のみ' },
]

// 全配送サービス（インポート）
const ALL_SHIPPING_SERVICES = ALL_SHIPPING_SERVICES_FINAL

// 配送先地域・国リスト
const DESTINATIONS = [
  'North and South America',
  'Europe (including UK)',
  'Asia',
  'Canada',
  'United Kingdom',
  'China',
  'Mexico',
  'Germany',
  'Japan',
  'Brazil',
  'France',
  'Australia',
  'Russian Federation'
]

interface RegionalCost {
  destination: string
  cost: number
  additionalCost: number
}

interface Service {
  id: number
  name: string
  code: string
  days: string
  minDays: number
  maxDays: number
  cost: number
  additionalCost: number
  additionalLocationType: 'none' | 'worldwide' | 'destination'
  selectedDestinations: string[]
  regionalCosts: RegionalCost[]
}

interface EbayPolicyCreatorFullProps {
  onCancel?: () => void
  onSaveComplete?: () => void
}

export function EbayPolicyCreatorFull({ onCancel, onSaveComplete }: EbayPolicyCreatorFullProps = {}) {
  const [policyName, setPolicyName] = useState('')
  const [description, setDescription] = useState('')
  const [shippingMethod, setShippingMethod] = useState('STANDARD')
  const [handlingDays, setHandlingDays] = useState(10)
  
  // 国際配送ON/OFF
  const [intlEnabled, setIntlEnabled] = useState(false)
  const [costType, setCostType] = useState<'flat' | 'calculated'>('calculated')
  const [handlingCost, setHandlingCost] = useState(0)
  
  // サービスリスト（初期状態は空）
  const [services, setServices] = useState<Service[]>([])
  
  // ダイアログ
  const [showAddServiceDialog, setShowAddServiceDialog] = useState(false)
  const [serviceSearchQuery, setServiceSearchQuery] = useState('')
  const [selectedServiceCodes, setSelectedServiceCodes] = useState<Set<string>>(new Set())
  const [showServiceMenu, setShowServiceMenu] = useState<number | null>(null)
  
  // Additional locations ダイアログ
  const [showAdditionalLocations, setShowAdditionalLocations] = useState(false)
  const [additionalLocationType, setAdditionalLocationType] = useState<'none' | 'worldwide' | 'destination'>('none')
  const [selectedDestinations, setSelectedDestinations] = useState<Set<string>>(new Set())
  const [editingServiceForLocation, setEditingServiceForLocation] = useState<number | null>(null)
  
  // Rate Table
  const [showRateTableDialog, setShowRateTableDialog] = useState(false)
  const [selectedRateTable, setSelectedRateTable] = useState<string>('none')
  const [showRateTableCreator, setShowRateTableCreator] = useState(false)
  
  // 除外場所
  const [excludedLocations, setExcludedLocations] = useState<string[]>(() => {
    const defaults = getDefaultExcludedLocations()
    console.log('🔍 デフォルト除外国数:', defaults.length)
    console.log('🔍 除外国リスト:', defaults)
    return defaults
  })
  const [showExcludeDialog, setShowExcludeDialog] = useState(false)
  const [excludeSearchQuery, setExcludeSearchQuery] = useState('')
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set())
  
  // マウント時にデフォルト値を再確認
  useEffect(() => {
    const defaults = getDefaultExcludedLocations()
    console.log('✅ useEffect: デフォルト除外国数:', defaults.length)
    setExcludedLocations(defaults)
  }, [])
  
  const [creating, setCreating] = useState(false)
  
  // サービス検索
  const filteredServices = ALL_SHIPPING_SERVICES.filter(s =>
    s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()) ||
    s.nameJa.includes(serviceSearchQuery)
  )
  
  // カテゴリ別グループ化
  const groupedServices = {
    'Expedited services from outside the country（速達サービス）': filteredServices.filter(s => s.category === 'expedited_intl'),
    'International services（国際サービス）': filteredServices.filter(s => s.category === 'international'),
    'Economy services from outside the country（エコノミーサービス）': filteredServices.filter(s => s.category === 'economy_intl'),
    'Standard services from outside the country（標準サービス）': filteredServices.filter(s => s.category === 'standard_intl'),
  }
  
  // Add servicesダイアログでサービスを追加
  function handleAddServices() {
    const newServices: Service[] = []
    
    selectedServiceCodes.forEach(code => {
      const serviceData = ALL_SHIPPING_SERVICES.find(s => s.code === code)
      if (!serviceData) return
      
      const [min, max] = serviceData.days.split('-').map(d => parseInt(d))
      
      newServices.push({
        id: Date.now() + Math.random(),
        name: serviceData.name,
        code: serviceData.code,
        days: serviceData.days,
        minDays: min,
        maxDays: max,
        cost: 0,
        additionalCost: 0,
        additionalLocationType: 'worldwide',
        selectedDestinations: [],
        regionalCosts: []
      })
    })
    
    setServices([...services, ...newServices])
    setShowAddServiceDialog(false)
    setSelectedServiceCodes(new Set())
    setServiceSearchQuery('')
  }
  
  function deleteService(serviceId: number) {
    setServices(services.filter(s => s.id !== serviceId))
    setShowServiceMenu(null)
  }
  
  function updateServiceCost(serviceId: number, field: 'cost' | 'additionalCost', value: number) {
    setServices(services.map(s =>
      s.id === serviceId ? { ...s, [field]: value } : s
    ))
  }
  
  // Additional locations ダイアログを開く
  function openAdditionalLocations(serviceId: number) {
    const service = services.find(s => s.id === serviceId)
    if (!service) return
    
    setEditingServiceForLocation(serviceId)
    setAdditionalLocationType(service.additionalLocationType)
    setSelectedDestinations(new Set(service.selectedDestinations))
    setShowAdditionalLocations(true)
  }
  
  // Additional locations を保存
  function saveAdditionalLocations() {
    if (editingServiceForLocation === null) return
    
    const destinations = Array.from(selectedDestinations)
    
    setServices(services.map(s => {
      if (s.id === editingServiceForLocation) {
        // 地域別コストを初期化
        const regionalCosts: RegionalCost[] = additionalLocationType === 'destination'
          ? destinations.map(dest => ({
              destination: dest,
              cost: 0,
              additionalCost: 0
            }))
          : []
        
        return {
          ...s,
          additionalLocationType,
          selectedDestinations: destinations,
          regionalCosts
        }
      }
      return s
    }))
    
    setShowAdditionalLocations(false)
    setEditingServiceForLocation(null)
    setSelectedDestinations(new Set())
  }
  
  // 地域別料金を更新
  function updateRegionalCost(serviceId: number, destination: string, field: 'cost' | 'additionalCost', value: number) {
    setServices(services.map(s => {
      if (s.id === serviceId) {
        const regionalCosts = s.regionalCosts.map(rc =>
          rc.destination === destination ? { ...rc, [field]: value } : rc
        )
        return { ...s, regionalCosts }
      }
      return s
    }))
  }
  
  // 配送先の表示テキストを取得
  function getShipToText(service: Service): string {
    if (service.additionalLocationType === 'none') {
      return 'None'
    } else if (service.additionalLocationType === 'worldwide') {
      return 'Ships worldwide'
    } else if (service.additionalLocationType === 'destination') {
      const count = service.selectedDestinations.length
      if (count === 0) return 'No destinations selected'
      if (count === 1) return service.selectedDestinations[0]
      return `${count} destinations`
    }
    return 'None'
  }
  
  async function handleSave() {
    if (!policyName) {
      alert('ポリシー名を入力してください')
      return
    }
    
    setCreating(true)
    
    try {
      const supabase = createClient()
      
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
      
      // サービス保存
      for (let i = 0; i < services.length; i++) {
        const service = services[i]
        
        const { data: serviceData, error: serviceError } = await supabase
          .from('ebay_shipping_services')
          .insert({
            policy_id: policy.id,
            service_type: 'INTERNATIONAL',
            shipping_carrier_code: 'OTHER',
            shipping_service_code: service.code,
            free_shipping: service.cost === 0,
            shipping_cost_value: service.cost,
            additional_shipping_cost_value: service.additionalCost,
            ship_to_locations: service.additionalLocationType === 'worldwide' 
              ? ['WORLDWIDE'] 
              : service.selectedDestinations,
            min_transit_time_value: service.minDays,
            max_transit_time_value: service.maxDays,
            sort_order: i
          })
          .select()
          .single()
        
        if (serviceError) throw new Error(serviceError.message)
        
        // 地域別料金を保存
        if (service.additionalLocationType === 'destination' && service.regionalCosts.length > 0) {
          for (const regional of service.regionalCosts) {
            await supabase
              .from('ebay_country_shipping_settings')
              .insert({
                policy_id: policy.id,
                country_code: regional.destination,
                shipping_cost: regional.cost,
                additional_item_cost: regional.additionalCost,
                handling_fee: handlingCost,
                express_available: true,
                economy_available: true,
                is_ddp: false
              })
          }
        }
      }
      
      alert(`✅ 配送ポリシー作成完了！\nID: ${policy.id}`)
      
      // 保存完了後のコールバック
      if (onSaveComplete) {
        onSaveComplete()
      }
      
    } catch (error: any) {
      alert(`❌ エラー: ${error.message}`)
    } finally {
      setCreating(false)
    }
  }
  
  // Rate Table作成画面への切り替え
  if (showRateTableCreator) {
    return (
      <RateTableCreator
        onSave={(data) => {
          console.log('Rate table saved:', data)
          setShowRateTableCreator(false)
          setSelectedRateTable('none')
          alert('Rate table作成完了！')
        }}
        onCancel={() => {
          setShowRateTableCreator(false)
          setSelectedRateTable('none')
        }}
      />
    )
  }
  
  return (
    <div className="max-w-4xl mx-auto bg-white p-6">
      {/* ヘッダー */}
      <div className="mb-6 pb-4 border-b">
        <h1 className="text-2xl font-bold">配送ポリシーを編集する</h1>
        <p className="text-sm text-gray-500">Edit shipping policy</p>
      </div>
      
      {/* ポリシー名 */}
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-2">
          ポリシー名 <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-600 mb-2">
          この配送ポリシーを識別するための名前（例：国際配送0.5kg用、送料無料プラン等）
        </p>
        <input
          type="text"
          value={policyName}
          onChange={(e) => setPolicyName(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          maxLength={64}
        />
        <div className="text-xs text-gray-500 mt-1">{policyName.length}/64</div>
      </div>
      
      {/* 説明 */}
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-2">
          説明（オプション）
        </label>
        <p className="text-xs text-gray-600 mb-2">
          このポリシーの内容や用途についての補足説明（社内管理用）
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          rows={3}
          maxLength={250}
        />
        <div className="text-xs text-gray-500 mt-1">{description.length}/250</div>
      </div>
      
      {/* SHIPPING */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-4">SHIPPING（配送設定）</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">
            Shipping method（配送方法）
          </label>
          <p className="text-xs text-gray-600 mb-2">
            商品のサイズや重量に応じた配送方法を選択します。ほとんどの商品は「Standard shipping」を使用します。
          </p>
          <select
            value={shippingMethod}
            onChange={(e) => setShippingMethod(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            {SHIPPING_METHODS.map(method => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">{SHIPPING_METHODS.find(m => m.value === shippingMethod)?.desc}</p>
        </div>
      </div>
      
      {/* International shipping */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4 p-4 border rounded-lg bg-gray-50">
          <div>
            <h3 className="text-base font-bold">International shipping</h3>
            <p className="text-xs text-gray-600">海外への配送サービスを設定します</p>
          </div>
          <label className="flex items-center gap-3">
            <span className="text-sm font-semibold">Add shipping services</span>
            <div className="relative cursor-pointer">
              <input
                type="checkbox"
                checked={intlEnabled}
                onChange={(e) => setIntlEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
            </div>
          </label>
        </div>
        
        {intlEnabled && (
          <div className="border rounded-lg p-6 bg-white">
            {/* Cost type - Calculatedのみ */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">
                Cost type
              </label>
              <p className="text-xs text-gray-600 mb-2">
                Calculated: 購入者の住所によって送料が変動します
              </p>
              <div className="w-full px-3 py-2 border-2 border-blue-500 rounded bg-gray-50">
                <div className="font-semibold text-sm">Calculated: Cost varies by buyer location</div>
              </div>
            </div>
            
            {/* Add services ボタン */}
            <button
              onClick={() => setShowAddServiceDialog(true)}
              className="flex items-center gap-2 text-sm mb-6 px-4 py-2 hover:bg-gray-100 rounded"
            >
              <Plus className="w-4 h-4" />
              Add services
            </button>
            
            {/* サービスリスト */}
            {services.length > 0 && (
              <div className="space-y-4 mb-6">
                {services.map((service) => (
                  <div key={service.id} className="border-2 rounded-lg p-4 bg-white relative">
                    {/* 削除ボタン */}
                    <button
                      onClick={() => deleteService(service.id)}
                      className="absolute top-4 right-4 p-1 hover:bg-gray-200 rounded"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center text-2xl">
                        📦
                      </div>
                      
                      <div className="flex-1">
                        <div className="font-semibold mb-1">{service.name}</div>
                        <div className="text-sm text-gray-600 mb-3">{service.days} business days</div>
                        
                        <button
                          onClick={() => openAdditionalLocations(service.id)}
                          className="text-blue-600 text-sm mb-3 hover:underline flex items-center gap-1"
                        >
                          Ships to: {getShipToText(service)}
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        
                        {/* 地域別料金設定 */}
                        {service.additionalLocationType === 'destination' && service.regionalCosts.length > 0 && (
                          <div className="mt-4 space-y-3 border-t pt-3">
                            <div className="font-semibold text-sm">Regional costs（地域別送料）</div>
                            {service.regionalCosts.map((regional) => (
                              <div key={regional.destination} className="bg-gray-50 p-3 rounded border">
                                <div className="font-medium text-sm mb-2">{regional.destination}</div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">
                                      Cost（送料）
                                    </label>
                                    <div className="flex items-center gap-1">
                                      <span className="text-sm">$</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={regional.cost}
                                        onChange={(e) => updateRegionalCost(service.id, regional.destination, 'cost', parseFloat(e.target.value) || 0)}
                                        className="flex-1 px-2 py-1 border rounded"
                                      />
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">
                                      Additional cost（追加料金）
                                    </label>
                                    <div className="flex items-center gap-1">
                                      <span className="text-sm">$</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={regional.additionalCost}
                                        onChange={(e) => updateRegionalCost(service.id, regional.destination, 'additionalCost', parseFloat(e.target.value) || 0)}
                                        className="flex-1 px-2 py-1 border rounded"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Rate table */}
            <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">
                  Rate table <span className="text-gray-500 text-xs font-normal">(optional)</span>
                </label>
                <p className="text-xs text-gray-600 mb-2">
                  地域別に異なる送料を設定できます（例：アメリカ国内の州ごとに送料を変える）
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedRateTable}
                    onChange={(e) => {
                      setSelectedRateTable(e.target.value)
                      if (e.target.value === 'create_new') {
                        setShowRateTableCreator(true)
                      }
                    }}
                    className="flex-1 px-3 py-2 border rounded"
                  >
                    <option value="none">None</option>
                    <option value="create_new">Create new rate table...</option>
                  </select>
                  <button
                    onClick={() => setShowRateTableCreator(true)}
                    className="px-4 py-2 border-2 border-blue-600 text-blue-600 rounded hover:bg-blue-50"
                  >
                    Create new
                  </button>
                </div>
              </div>
            
            {/* Handling Cost */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">
                Handling Cost <span className="text-gray-500 text-xs font-normal">(optional)</span>
              </label>
              <p className="text-xs text-gray-600 mb-2">
                梱包や処理にかかる追加手数料（すべてのサービスに適用）
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={handlingCost}
                  onChange={(e) => setHandlingCost(parseFloat(e.target.value) || 0)}
                  className="w-48 px-3 py-2 border rounded"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Excluded locations */}
      <div className="mb-6">
        <h3 className="text-base font-bold mb-2">Excluded locations (optional)</h3>
        <p className="text-xs text-gray-600 mb-3">
          配送しない国や地域を指定します（制裁対象国、軍事基地など）
        </p>
        
        <div className="border rounded p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-semibold">除外設定済み:</span> {excludedLocations.length}カ国/地域
            </div>
            <button
              onClick={() => setShowExcludeDialog(true)}
              className="text-blue-600 text-sm hover:underline flex items-center gap-1"
            >
              編集 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Preferences */}
      <div className="mb-6">
        <h3 className="text-base font-bold mb-2">Preferences（処理設定）</h3>
        
        <div>
          <label className="block text-sm font-semibold mb-2">
            Handling time（処理時間）
          </label>
          <p className="text-xs text-gray-600 mb-2">
            注文を受けてから商品を発送するまでの日数（営業日）を設定します
          </p>
          <select
            value={handlingDays}
            onChange={(e) => setHandlingDays(parseInt(e.target.value))}
            className="w-full px-3 py-2 border rounded"
          >
            {[1, 2, 3, 4, 5, 10, 15, 20, 30].map(days => (
              <option key={days} value={days}>{days}営業日</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* ボタン */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={handleSave}
          disabled={creating}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? '保存中...' : '保存'}
        </button>
        <button
          onClick={() => {
            if (onCancel) {
              onCancel()
            } else {
              if (confirm('変更を破棄しますか？')) {
                window.location.reload()
              }
            }
          }}
          className="px-6 py-2 border rounded hover:bg-gray-50"
        >
          キャンセル
        </button>
      </div>
      
      {/* Add services ダイアログ */}
      {showAddServiceDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-5 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold">Add services</h3>
              <button
                onClick={handleAddServices}
                className="text-blue-600 font-semibold text-lg"
              >
                Done
              </button>
            </div>
            
            <div className="p-6 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="配送サービスを検索 (Find a shipping service)"
                  value={serviceSearchQuery}
                  onChange={(e) => setServiceSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 rounded-lg"
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                最大5つの配送サービスを選択できます (Select up to 5 shipping services)
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {Object.entries(groupedServices).map(([category, items]) => (
                items.length > 0 && (
                  <div key={category} className="mb-6">
                    <h4 className="font-bold text-base mb-3 text-blue-900">{category}</h4>
                    <div className="space-y-2">
                      {items.map((item: any) => (
                        <label
                          key={item.code}
                          className={`flex items-start gap-3 p-4 rounded cursor-pointer border-2 transition-all ${
                            item.recommended 
                              ? 'bg-blue-50 border-blue-400 hover:bg-blue-100' 
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedServiceCodes.has(item.code)}
                            onChange={(e) => {
                              const newSet = new Set(selectedServiceCodes)
                              if (e.target.checked) {
                                if (newSet.size >= 5) {
                                  alert('最大5つまでしか選択できません')
                                  return
                                }
                                newSet.add(item.code)
                              } else {
                                newSet.delete(item.code)
                              }
                              setSelectedServiceCodes(newSet)
                            }}
                            className="mt-1 w-5 h-5"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`font-bold text-sm ${item.recommended ? 'text-blue-700' : 'text-gray-900'}`}>
                                {item.nameJa}
                              </div>
                              {item.recommended && (
                                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-semibold">
                                  おすすめ
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-600 mb-1">{item.name}</div>
                            <div className="text-xs text-blue-600 font-semibold mb-1">{item.days} 営業日</div>
                            <div className="text-xs text-gray-700">{item.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Additional locations ダイアログ */}
      {showAdditionalLocations && (
        <div className="fixed inset-0 bg-black bg-opacity-5 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">Additional locations</h3>
              <button
                onClick={saveAdditionalLocations}
                className="text-blue-600 font-semibold hover:underline"
              >
                Done
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {/* 解説 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="font-bold text-sm text-blue-900 mb-2">💡 Additional locationsとは？</div>
                <div className="text-xs text-gray-700 space-y-1">
                  <p><strong>None:</strong> 追加料金なし。基本料金のみで配送します</p>
                  <p><strong>Ships worldwide:</strong> 世界中に配送可能で、追加料金が適用されます</p>
                  <p><strong>Destination:</strong> 特定の地域・国のみ追加料金で配送します</p>
                </div>
              </div>
              
              {/* None */}
              <label className="flex items-start gap-3 p-4 hover:bg-gray-50 rounded cursor-pointer mb-1">
                <input
                  type="radio"
                  name="location-type"
                  checked={additionalLocationType === 'none'}
                  onChange={() => setAdditionalLocationType('none')}
                  className="w-5 h-5 mt-0.5 flex-shrink-0"
                />
                <div>
                  <div className="font-bold text-base">None</div>
                  <div className="text-xs text-gray-600 mt-1">追加料金なし（全地域同一料金）</div>
                </div>
              </label>
              
              {/* Ships worldwide */}
              <label className="flex items-start gap-3 p-4 hover:bg-gray-50 rounded cursor-pointer mb-1">
                <input
                  type="radio"
                  name="location-type"
                  checked={additionalLocationType === 'worldwide'}
                  onChange={() => setAdditionalLocationType('worldwide')}
                  className="w-5 h-5 mt-0.5 flex-shrink-0"
                />
                <div>
                  <div className="font-bold text-base">Ships worldwide</div>
                  <div className="text-xs text-gray-600 mt-1">世界中に配送可能（追加料金が適用されます）</div>
                </div>
              </label>
              
              {/* Destination */}
              <label className="flex items-start gap-3 p-4 hover:bg-gray-50 rounded cursor-pointer mb-1">
                <input
                  type="radio"
                  name="location-type"
                  checked={additionalLocationType === 'destination'}
                  onChange={() => setAdditionalLocationType('destination')}
                  className="w-5 h-5 mt-0.5 flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="font-bold text-base mb-1">Destination</div>
                  <div className="text-xs text-gray-600 mb-2">特定の地域・国のみ追加料金で配送</div>
                  
                  {/* 地域選択 */}
                  {additionalLocationType === 'destination' && (
                    <div className="space-y-1 mt-3">
                      {DESTINATIONS.map((dest) => (
                        <label
                          key={dest}
                          className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedDestinations.has(dest)}
                            onChange={(e) => {
                              const newSet = new Set(selectedDestinations)
                              if (e.target.checked) {
                                newSet.add(dest)
                              } else {
                                newSet.delete(dest)
                              }
                              setSelectedDestinations(newSet)
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{dest}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>
      )}
      
      {/* Excluded locations ダイアログ */}
      {showExcludeDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-5 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">Excluded locations</h3>
              <button
                onClick={() => setShowExcludeDialog(false)}
                className="text-blue-600 font-semibold hover:underline"
              >
                Done
              </button>
            </div>
            
            <div className="px-6 py-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="国や地域を検索 (Find a country or a region)"
                  value={excludeSearchQuery}
                  onChange={(e) => setExcludeSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 rounded-lg"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {/* Domestic */}
              <div className="mb-6">
                <h4 className="font-bold text-base mb-3">{EXCLUDED_LOCATIONS_DATA.domestic.title}</h4>
                <div className="space-y-2">
                  {EXCLUDED_LOCATIONS_DATA.domestic.items.map((item) => (
                    <label
                      key={item.code}
                      className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={excludedLocations.includes(item.code)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setExcludedLocations([...excludedLocations, item.code])
                          } else {
                            setExcludedLocations(excludedLocations.filter(c => c !== item.code))
                          }
                        }}
                        className="w-5 h-5 mt-0.5 flex-shrink-0"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-gray-600">{item.nameJa} - {item.reason}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* International */}
              <div className="mb-6">
                <h4 className="font-bold text-base mb-3">International</h4>
                <div className="space-y-3">
                  {EXCLUDED_LOCATIONS_DATA.international.map((regionData) => {
                    const isExpanded = expandedRegions.has(regionData.region)
                    const selectedCount = regionData.countries.filter(c => excludedLocations.includes(c.code)).length
                    const isAllSelected = selectedCount === regionData.countries.length
                    const isPartialSelected = selectedCount > 0 && selectedCount < regionData.countries.length
                    
                    return (
                      <div key={regionData.region} className="border rounded-lg">
                        <button
                          onClick={() => {
                            const newSet = new Set(expandedRegions)
                            if (isExpanded) {
                              newSet.delete(regionData.region)
                            } else {
                              newSet.add(regionData.region)
                            }
                            setExpandedRegions(newSet)
                          }}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={isAllSelected}
                                ref={(el) => {
                                  if (el) el.indeterminate = isPartialSelected
                                }}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  if (isAllSelected || isPartialSelected) {
                                    // 全解除
                                    const regionCodes = regionData.countries.map(c => c.code)
                                    setExcludedLocations(excludedLocations.filter(c => !regionCodes.includes(c)))
                                  } else {
                                    // 全選択
                                    const newCodes = regionData.countries.map(c => c.code)
                                    setExcludedLocations([...new Set([...excludedLocations, ...newCodes])])
                                  }
                                }}
                                className="w-5 h-5"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div className="text-left">
                              <div className="font-semibold text-sm">{regionData.region}</div>
                              <div className="text-xs text-gray-600">{regionData.regionJa}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600 text-sm">{selectedCount} / {regionData.countries.length} 選択中</span>
                            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                          </div>
                        </button>
                        
                        {isExpanded && (
                          <div className="px-4 pb-3 space-y-1 border-t">
                            {regionData.countries.map((country) => (
                              <label
                                key={country.code}
                                className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={excludedLocations.includes(country.code)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setExcludedLocations([...excludedLocations, country.code])
                                    } else {
                                      setExcludedLocations(excludedLocations.filter(c => c !== country.code))
                                    }
                                  }}
                                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                                />
                                <div className="flex-1">
                                  <div className="text-sm">{country.name}</div>
                                  <div className="text-xs text-gray-600">{country.nameJa} - {country.reason}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              
              {/* Other */}
              <div className="mb-6">
                <h4 className="font-bold text-base mb-3">{EXCLUDED_LOCATIONS_DATA.other.title}</h4>
                <div className="space-y-2">
                  {EXCLUDED_LOCATIONS_DATA.other.items.map((item) => (
                    <label
                      key={item.code}
                      className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={excludedLocations.includes(item.code)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setExcludedLocations([...excludedLocations, item.code])
                          } else {
                            setExcludedLocations(excludedLocations.filter(c => c !== item.code))
                          }
                        }}
                        className="w-5 h-5 mt-0.5 flex-shrink-0"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-gray-600">{item.nameJa} - {item.reason}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
