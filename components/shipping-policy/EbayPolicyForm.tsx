'use client'

import { useState } from 'react'
import { Plus, Save, Globe, Package, AlertCircle } from 'lucide-react'
import { createEbayFulfillmentPolicy, DEFAULT_EXCLUDED_LOCATIONS } from '@/lib/shipping/ebay-policy-generator'

export function EbayPolicyForm() {
  const [config, setConfig] = useState({
    name: 'International Shipping Policy',
    handlingDays: 10,
    domesticServices: [
      {
        carrierCode: 'USPS',
        serviceCode: 'USPSPriorityFlatRateBox',
        freeShipping: true,
        shippingCost: 0,
        additionalCost: 0
      }
    ],
    internationalServices: [
      {
        carrierCode: 'OTHER',
        serviceCode: 'EconomyShippingFromOutsideUS',
        freeShipping: true,
        shippingCost: 0,
        additionalCost: 0,
        shipToLocations: ['WORLDWIDE'],
        minTransitDays: 13,
        maxTransitDays: 23
      },
      {
        carrierCode: 'OTHER',
        serviceCode: 'ExpeditedShippingFromOutsideUS',
        freeShipping: false,
        shippingCost: 14.00,
        additionalCost: 14.00,
        shipToLocations: ['WORLDWIDE'],
        minTransitDays: 7,
        maxTransitDays: 15
      }
    ],
    excludedLocations: DEFAULT_EXCLUDED_LOCATIONS
  })
  
  const [creating, setCreating] = useState(false)
  
  async function handleCreate() {
    setCreating(true)
    
    try {
      const result = await createEbayFulfillmentPolicy({
        name: config.name,
        handlingTimeDays: config.handlingDays,
        domesticServices: config.domesticServices,
        internationalServices: config.internationalServices,
        excludedLocations: config.excludedLocations
      })
      
      alert(`✅ 配送ポリシー作成完了！\n\nポリシーID: ${result.policyId}\n国内サービス: ${result.domesticServices}件\n国際サービス: ${result.internationalServices}件\n除外国: ${result.excludedLocations}カ国`)
      
    } catch (error: any) {
      alert(`❌ エラー: ${error.message}`)
      console.error(error)
    } finally {
      setCreating(false)
    }
  }
  
  function updateInternationalService(index: number, field: string, value: any) {
    const updated = [...config.internationalServices]
    updated[index] = { ...updated[index], [field]: value }
    setConfig({ ...config, internationalServices: updated })
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">eBay配送ポリシー作成</h2>
            <p className="text-sm text-gray-600">eBay Fulfillment Policy API準拠</p>
          </div>
        </div>
        
        {/* 基本設定 */}
        <div className="bg-white rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-lg mb-4">基本設定</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ポリシー名
              </label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
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
        
        {/* 国内配送 */}
        <div className="bg-white rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-lg mb-4">国内配送</h3>
          
          <div className="space-y-3">
            {config.domesticServices.map((service, index) => (
              <div key={index} className="border-2 border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-3 mb-2">
                  <Package className="w-5 h-5 text-gray-600" />
                  <div className="flex-1">
                    <div className="font-medium">{service.carrierCode}</div>
                    <div className="text-xs text-gray-500">{service.serviceCode}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      {service.freeShipping ? '送料無料' : `$${service.shippingCost}`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* 国際配送 */}
        <div className="bg-white rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-lg mb-4">国際配送</h3>
          
          <div className="space-y-3">
            {config.internationalServices.map((service, index) => (
              <div key={index} className="border-2 border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      サービス名
                    </label>
                    <input
                      type="text"
                      value={service.serviceCode}
                      onChange={(e) => updateInternationalService(index, 'serviceCode', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      配送日数
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={service.minTransitDays}
                        onChange={(e) => updateInternationalService(index, 'minTransitDays', parseInt(e.target.value))}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="最短"
                      />
                      <span className="self-center">〜</span>
                      <input
                        type="number"
                        value={service.maxTransitDays}
                        onChange={(e) => updateInternationalService(index, 'maxTransitDays', parseInt(e.target.value))}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="最長"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={service.freeShipping}
                        onChange={(e) => updateInternationalService(index, 'freeShipping', e.target.checked)}
                      />
                      <span className="text-sm">送料無料</span>
                    </label>
                  </div>
                  
                  {!service.freeShipping && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          送料（USD）
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={service.shippingCost}
                          onChange={(e) => updateInternationalService(index, 'shippingCost', parseFloat(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          追加アイテム（USD）
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={service.additionalCost}
                          onChange={(e) => updateInternationalService(index, 'additionalCost', parseFloat(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </>
                  )}
                </div>
                
                <div className="mt-2 text-xs text-gray-600">
                  配送先: {service.shipToLocations.includes('WORLDWIDE') ? '全世界' : service.shipToLocations.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* 除外する場所 */}
        <div className="bg-white rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-lg mb-4">除外する場所</h3>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <div className="font-medium mb-1">除外国: {config.excludedLocations.length}カ国</div>
                <div className="text-xs">
                  {config.excludedLocations.slice(0, 5).join(', ')}
                  {config.excludedLocations.length > 5 && ` +${config.excludedLocations.length - 5}カ国`}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 作成ボタン */}
        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 font-semibold text-lg"
        >
          {creating ? (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
              <span>作成中...</span>
            </>
          ) : (
            <>
              <Save className="w-6 h-6" />
              <span>eBay配送ポリシーを作成</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
