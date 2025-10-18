'use client'

import { CheckCircle, AlertCircle, Package, Globe, Home, XCircle } from 'lucide-react'

interface ConfirmationStepProps {
  formData: any
  zones: any[]
  countries: any[]
  carriers: any[]
  services: any[]
}

export function ConfirmationStep({
  formData,
  zones,
  countries,
  carriers,
  services
}: ConfirmationStepProps) {
  const getCarrierName = (carrierId: string) => {
    return carriers.find((c: any) => c.id === carrierId)?.carrier_name || 'Unknown'
  }

  const getServiceName = (serviceId: string) => {
    return services.find((s: any) => s.id === serviceId)?.service_name || 'Unknown'
  }

  const getZoneName = (zoneCode: string) => {
    return zones.find((z: any) => z.zone_code === zoneCode)?.zone_name || zoneCode
  }

  const getCountryName = (countryCode: string) => {
    return countries.find((c: any) => c.country_code === countryCode)?.country_name || countryCode
  }

  const totalInternationalCountries = formData.internationalServices.reduce((total: number, service: any) => {
    const serviceCountries = countries.filter((c: any) =>
      service.includedZones?.includes(c.zone_code)
    )
    return total + serviceCountries.length
  }, 0)

  const isValid = formData.policyName && 
                  formData.handlingTime > 0 &&
                  (formData.domesticServices.length > 0 || formData.internationalServices.length > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            確認 / Confirmation
          </h2>
          <p className="text-sm text-gray-600">
            設定内容を確認してください
          </p>
        </div>
      </div>

      {/* 検証ステータス */}
      <div className={`border-2 rounded-lg p-4 ${
        isValid 
          ? 'bg-green-50 border-green-300' 
          : 'bg-red-50 border-red-300'
      }`}>
        <div className="flex items-center gap-2">
          {isValid ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-800">
                ✅ すべての必須項目が入力されています
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="font-semibold text-red-800">
                ❌ 必須項目が不足しています
              </span>
            </>
          )}
        </div>
        {!isValid && (
          <ul className="mt-2 ml-7 text-sm text-red-700 space-y-1">
            {!formData.policyName && <li>• ポリシー名を入力してください</li>}
            {formData.handlingTime <= 0 && <li>• ハンドリングタイムを設定してください</li>}
            {formData.domesticServices.length === 0 && formData.internationalServices.length === 0 && (
              <li>• 国内または国際配送サービスを少なくとも1つ設定してください</li>
            )}
          </ul>
        )}
      </div>

      {/* 基本情報 */}
      <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 border-b-2 border-gray-200">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            基本情報
          </h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-600 mb-1">ポリシー名</div>
              <div className="font-semibold">{formData.policyName || '未設定'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">マーケットプレイス</div>
              <div className="font-semibold">{formData.marketplace}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">カテゴリータイプ</div>
              <div className="font-semibold text-sm">
                {formData.categoryType === 'ALL_EXCLUDING_MOTORS_VEHICLES' 
                  ? 'すべて（自動車除く）' 
                  : '自動車・車両'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">ハンドリングタイム</div>
              <div className="font-semibold">{formData.handlingTime}営業日</div>
            </div>
          </div>

          {/* オプション */}
          <div className="pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-600 mb-2">有効なオプション:</div>
            <div className="flex flex-wrap gap-2">
              {formData.localPickup && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  🏪 ローカルピックアップ
                </span>
              )}
              {formData.freightShipping && (
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                  📦 フレイト配送
                </span>
              )}
              {formData.globalShipping && (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  🌍 Global Shipping Program
                </span>
              )}
              {!formData.localPickup && !formData.freightShipping && !formData.globalShipping && (
                <span className="text-sm text-gray-500">なし</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 国内配送サービス */}
      <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-3 border-b-2 border-gray-200">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Home className="w-5 h-5 text-blue-600" />
            国内配送サービス ({formData.domesticServices.length})
          </h3>
        </div>
        <div className="p-4">
          {formData.domesticServices.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              国内配送サービスが設定されていません
            </div>
          ) : (
            <div className="space-y-3">
              {formData.domesticServices.map((service: any, index: number) => (
                <div key={service.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">サービス #{index + 1}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      service.costType === 'FLAT' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {service.costType === 'FLAT' ? '定額' : '計算'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">配送業者: </span>
                      <span className="font-medium">{getCarrierName(service.carrierId)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">サービス: </span>
                      <span className="font-medium">{getServiceName(service.serviceId)}</span>
                    </div>
                    {service.costType === 'FLAT' && (
                      <>
                        <div>
                          <span className="text-gray-600">基本送料: </span>
                          <span className="font-medium">${service.baseShipping}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">追加送料: </span>
                          <span className="font-medium">${service.additionalShipping}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 国際配送サービス */}
      <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 border-b-2 border-gray-200">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Globe className="w-5 h-5 text-green-600" />
            国際配送サービス ({formData.internationalServices.length})
          </h3>
        </div>
        <div className="p-4">
          {formData.internationalServices.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              国際配送サービスが設定されていません
            </div>
          ) : (
            <div className="space-y-3">
              {formData.internationalServices.map((service: any, index: number) => {
                const serviceCountries = countries.filter((c: any) =>
                  service.includedZones?.includes(c.zone_code)
                )
                
                return (
                  <div key={service.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">サービス #{index + 1}</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                        {serviceCountries.length}カ国対応
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-600">配送業者: </span>
                          <span className="font-medium">{getCarrierName(service.carrierId)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">サービス: </span>
                          <span className="font-medium">{getServiceName(service.serviceId)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">配送日数: </span>
                          <span className="font-medium">
                            {service.minTransitDays}-{service.maxTransitDays}日
                          </span>
                        </div>
                      </div>
                      
                      {service.includedZones && service.includedZones.length > 0 && (
                        <div className="pt-2 border-t border-gray-200">
                          <div className="text-gray-600 mb-1">対象Zone:</div>
                          <div className="flex flex-wrap gap-1">
                            {service.includedZones.map((zoneCode: string) => (
                              <span key={zoneCode} className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs">
                                {getZoneName(zoneCode)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm font-semibold text-green-800 mb-1">
                  合計配送可能国数: {totalInternationalCountries}カ国
                </div>
                <div className="text-xs text-green-700">
                  設定された国際配送サービスで配送可能な国の総数です
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 除外設定 */}
      {((formData.excludedCountries && formData.excludedCountries.length > 0) ||
        (formData.excludedRegions && formData.excludedRegions.length > 0)) && (
        <div className="border-2 border-red-200 rounded-lg overflow-hidden">
          <div className="bg-red-50 px-4 py-3 border-b-2 border-red-200">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              配送除外設定
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {formData.excludedRegions && formData.excludedRegions.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">
                  除外Zone ({formData.excludedRegions.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.excludedRegions.map((zoneCode: string) => (
                    <span key={zoneCode} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                      {getZoneName(zoneCode)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {formData.excludedCountries && formData.excludedCountries.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">
                  除外国 ({formData.excludedCountries.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.excludedCountries.slice(0, 20).map((countryCode: string) => (
                    <span key={countryCode} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                      {getCountryName(countryCode)}
                    </span>
                  ))}
                  {formData.excludedCountries.length > 20 && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                      他{formData.excludedCountries.length - 20}カ国
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 最終確認 */}
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <div className="font-semibold mb-2">保存前の最終確認:</div>
            <ul className="space-y-1 ml-4 text-xs">
              <li>• ポリシー名はユニークですか？</li>
              <li>• ハンドリングタイムは現実的ですか？</li>
              <li>• 配送サービスの設定は正しいですか？</li>
              <li>• 除外設定は意図した通りですか？</li>
              <li>• 保存後、このポリシーをeBay出品に適用できます</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
