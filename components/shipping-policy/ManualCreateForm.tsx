'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Region {
  region_code: string
  region_name: string
  countries?: any[]
}

export function ManualCreateForm() {
  const [regions, setRegions] = useState<Region[]>([])
  const [excludedCountries, setExcludedCountries] = useState<string[]>([])
  
  const [config, setConfig] = useState({
    policyName: 'Manual Shipping Policy',
    handlingDays: 10,
    selectedRegions: [] as string[],
    services: [
      {
        name: 'Economy',
        code: 'EconomyShippingFromOutsideUS',
        minDays: 13,
        maxDays: 23,
        rates: {} as Record<string, number>
      },
      {
        name: 'Expedited',
        code: 'ExpeditedShippingFromOutsideUS',
        minDays: 7,
        maxDays: 15,
        rates: {} as Record<string, number>
      }
    ]
  })
  
  const [creating, setCreating] = useState(false)
  
  useEffect(() => {
    loadRegionsAndCountries()
    loadDefaultExclusions()
  }, [])
  
  async function loadRegionsAndCountries() {
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
      setExcludedCountries(data.map(d => d.country_code))
    }
  }
  
  function toggleRegion(regionCode: string) {
    const selected = config.selectedRegions.includes(regionCode)
    
    setConfig({
      ...config,
      selectedRegions: selected
        ? config.selectedRegions.filter(r => r !== regionCode)
        : [...config.selectedRegions, regionCode]
    })
  }
  
  function updateServiceRate(serviceIndex: number, regionCode: string, rate: number) {
    const updated = [...config.services]
    updated[serviceIndex].rates[regionCode] = rate
    setConfig({ ...config, services: updated })
  }
  
  async function handleCreate() {
    setCreating(true)
    
    try {
      const supabase = createClient()
      
      // 1. ポリシー作成
      const { data: policy, error: policyError } = await supabase
        .from('ebay_fulfillment_policies')
        .insert({
          name: config.policyName,
          marketplace_id: 'EBAY_US',
          handling_time_value: config.handlingDays,
          ship_to_locations: config.selectedRegions
        })
        .select()
        .single()
      
      if (policyError) throw new Error(policyError.message)
      
      // 2. 除外国設定
      for (const countryCode of excludedCountries) {
        await supabase
          .from('ebay_shipping_exclusions')
          .insert({
            policy_id: policy.id,
            exclude_ship_to_location: countryCode
          })
      }
      
      // 3. サービスと料金設定
      for (let i = 0; i < config.services.length; i++) {
        const service = config.services[i]
        
        const { data: createdService } = await supabase
          .from('ebay_shipping_services')
          .insert({
            policy_id: policy.id,
            service_type: 'INTERNATIONAL',
            shipping_carrier_code: 'OTHER',
            shipping_service_code: service.code,
            free_shipping: false,
            min_transit_time_value: service.minDays,
            max_transit_time_value: service.maxDays,
            sort_order: i
          })
          .select()
          .single()
        
        if (createdService) {
          // 地域別料金設定
          for (const regionCode of config.selectedRegions) {
            const rate = service.rates[regionCode] || 0
            
            await supabase
              .from('shipping_rate_tables')
              .insert({
                policy_id: policy.id,
                service_id: createdService.id,
                region_code: regionCode,
                shipping_cost: rate,
                additional_item_cost: rate
              })
          }
        }
      }
      
      alert(`配送ポリシー作成完了！\nポリシーID: ${policy.id}`)
      
    } catch (error: any) {
      alert(`エラー: ${error.message}`)
      console.error(error)
    } finally {
      setCreating(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">手動作成</h2>
            <p className="text-sm text-gray-600">地域別に詳細な料金設定が可能</p>
          </div>
        </div>
        
        {/* 基本設定 */}
        <div className="bg-white rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-lg mb-4">基本設定</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ポリシー名
              </label>
              <input
                type="text"
                value={config.policyName}
                onChange={(e) => setConfig({ ...config, policyName: e.target.value })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                処理時間（営業日）
              </label>
              <input
                type="number"
                value={config.handlingDays}
                onChange={(e) => setConfig({ ...config, handlingDays: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
        
        {/* 配送地域選択 */}
        <div className="bg-white rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-lg mb-4">配送地域選択</h3>
          
          <div className="space-y-3">
            {regions.map(region => (
              <div key={region.region_code} className="border-2 border-gray-200 rounded-lg p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.selectedRegions.includes(region.region_code)}
                    onChange={() => toggleRegion(region.region_code)}
                    className="w-5 h-5"
                  />
                  <div className="flex-1">
                    <div className="font-semibold">{region.region_name}</div>
                    <div className="text-xs text-gray-600">
                      {region.countries?.length || 0}カ国
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>
        
        {/* サービス別料金設定 */}
        {config.selectedRegions.length > 0 && (
          <div className="bg-white rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-lg mb-4">サービス別料金設定</h3>
            
            {config.services.map((service, serviceIndex) => (
              <div key={serviceIndex} className="mb-6 border-2 border-blue-200 rounded-lg p-4">
                <div className="font-semibold text-blue-900 mb-3">{service.name}</div>
                
                <div className="space-y-2">
                  {config.selectedRegions.map(regionCode => {
                    const region = regions.find(r => r.region_code === regionCode)
                    
                    return (
                      <div key={regionCode} className="flex items-center gap-3">
                        <div className="w-48 text-sm font-medium">{region?.region_name}</div>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={service.rates[regionCode] || ''}
                          onChange={(e) => updateServiceRate(serviceIndex, regionCode, parseFloat(e.target.value))}
                          className="w-32 px-3 py-1 border border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-600">USD</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* 除外国 */}
        <div className="bg-white rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-lg mb-4">除外国</h3>
          <div className="text-sm text-gray-600">
            デフォルト除外国: {excludedCountries.length}カ国
          </div>
        </div>
        
        {/* 作成ボタン */}
        <button
          onClick={handleCreate}
          disabled={creating || config.selectedRegions.length === 0}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg disabled:opacity-50 font-semibold text-lg"
        >
          {creating ? (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
              <span>作成中...</span>
            </>
          ) : (
            <>
              <Plus className="w-6 h-6" />
              <span>配送ポリシーを作成</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
