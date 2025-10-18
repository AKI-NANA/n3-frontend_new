'use client'

import { useEffect, useState } from 'react'
import { Package, Globe, Ban, Clock, CheckCircle } from 'lucide-react'
import { getFulfillmentPolicyDetail } from '@/lib/shipping/ebay-policy-generator'

export function PolicyDetailView({ policyId }: { policyId: number }) {
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadDetail()
  }, [policyId])
  
  async function loadDetail() {
    try {
      const data = await getFulfillmentPolicyDetail(policyId)
      setDetail(data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load policy detail:', error)
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    )
  }
  
  if (!detail) {
    return <div className="text-center py-12 text-gray-500">ポリシーが見つかりません</div>
  }
  
  const domesticServices = detail.services.filter((s: any) => s.service_type === 'DOMESTIC')
  const internationalServices = detail.services.filter((s: any) => s.service_type === 'INTERNATIONAL')
  
  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{detail.policy.name}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>処理時間: {detail.policy.handling_time_value}営業日</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>マーケット: {detail.policy.marketplace_id}</span>
              </div>
              {detail.policy.is_active && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>有効</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 国内配送 */}
      {domesticServices.length > 0 && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            国内配送
          </h3>
          
          <div className="space-y-3">
            {domesticServices.map((service: any) => (
              <div key={service.id} className="border-2 border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-lg">{service.shipping_service_code}</div>
                    <div className="text-sm text-gray-600">{service.shipping_carrier_code}</div>
                  </div>
                  <div className="text-right">
                    {service.free_shipping ? (
                      <div className="text-green-600 font-semibold text-lg">送料無料</div>
                    ) : (
                      <>
                        <div className="font-semibold text-lg">${service.shipping_cost_value.toFixed(2)}</div>
                        {service.additional_shipping_cost_value > 0 && (
                          <div className="text-sm text-gray-600">
                            追加: ${service.additional_shipping_cost_value.toFixed(2)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 国際配送 */}
      {internationalServices.length > 0 && (
        <div className="bg-white rounded-xl border-2 border-blue-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-600" />
            国際配送
          </h3>
          
          <div className="space-y-4">
            {internationalServices.map((service: any) => (
              <div key={service.id} className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="font-semibold text-lg mb-1">{service.shipping_service_code}</div>
                    <div className="text-sm text-gray-600 mb-2">{service.shipping_carrier_code}</div>
                    
                    {service.min_transit_time_value && service.max_transit_time_value && (
                      <div className="text-sm text-gray-700">
                        📦 配送日数: {service.min_transit_time_value}〜{service.max_transit_time_value}営業日
                      </div>
                    )}
                    
                    <div className="text-sm text-gray-700 mt-1">
                      🌍 配送先: {service.ship_to_locations?.includes('WORLDWIDE') ? '全世界' : service.ship_to_locations?.join(', ') || '未設定'}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {service.free_shipping ? (
                      <div className="text-green-600 font-semibold text-lg">送料無料</div>
                    ) : (
                      <>
                        <div className="font-semibold text-lg text-blue-600">
                          ${service.shipping_cost_value.toFixed(2)}
                        </div>
                        {service.additional_shipping_cost_value > 0 && (
                          <div className="text-sm text-gray-600">
                            追加: ${service.additional_shipping_cost_value.toFixed(2)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 除外する場所 */}
      {detail.exclusions && detail.exclusions.length > 0 && (
        <div className="bg-white rounded-xl border-2 border-red-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Ban className="w-6 h-6 text-red-600" />
            除外する場所
          </h3>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm font-medium text-red-900 mb-2">
              除外国数: {detail.exclusions.length}カ国
            </div>
            <div className="flex flex-wrap gap-2">
              {detail.exclusions.map((exclusion: any) => (
                <span
                  key={exclusion.id}
                  className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium"
                >
                  {exclusion.exclude_ship_to_location}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
