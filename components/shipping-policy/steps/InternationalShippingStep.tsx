'use client'

import { useState } from 'react'
import { Plus, Trash2, Globe, Info, CheckCircle } from 'lucide-react'

interface InternationalShippingStepProps {
  formData: any
  zones: any[]
  countries: any[]
  carriers: any[]
  services: any[]
  onChange: (data: any) => void
}

export function InternationalShippingStep({
  formData,
  zones,
  countries,
  carriers,
  services,
  onChange
}: InternationalShippingStepProps) {
  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set())
  const [rateCalculationMode, setRateCalculationMode] = useState<'auto' | 'manual'>('auto')

  function addInternationalService() {
    const newService = {
      id: Date.now(),
      optionType: 'INTERNATIONAL',
      costType: 'CALCULATED',
      carrierId: carriers[0]?.id || '',
      serviceId: services[0]?.id || '',
      includedZones: [],
      includedCountries: [],
      baseShipping: 0,
      additionalShipping: 0,
      minTransitDays: 7,
      maxTransitDays: 21,
    }
    
    onChange({
      internationalServices: [...formData.internationalServices, newService]
    })
  }

  function removeService(id: number) {
    onChange({
      internationalServices: formData.internationalServices.filter((s: any) => s.id !== id)
    })
  }

  function updateService(id: number, updates: any) {
    onChange({
      internationalServices: formData.internationalServices.map((s: any) =>
        s.id === id ? { ...s, ...updates } : s
      )
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
          <Globe className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            国際配送設定 / International Shipping
          </h2>
          <p className="text-sm text-gray-600">
            Zone別に配送サービスと料金を設定します
          </p>
        </div>
      </div>

      {/* 料金計算モード選択 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Info className="w-5 h-5" />
          料金計算方法 / Rate Calculation Method
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setRateCalculationMode('auto')}
            className={`p-4 rounded-lg border-2 transition-all ${
              rateCalculationMode === 'auto'
                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {rateCalculationMode === 'auto' && <CheckCircle className="w-5 h-5 text-indigo-600" />}
              <div className="font-semibold text-gray-800">🤖 自動計算（推奨）</div>
            </div>
            <div className="text-xs text-gray-600 text-left">
              DBマトリックスから最適な送料を自動計算します
            </div>
          </button>
          
          <button
            onClick={() => setRateCalculationMode('manual')}
            className={`p-4 rounded-lg border-2 transition-all ${
              rateCalculationMode === 'manual'
                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {rateCalculationMode === 'manual' && <CheckCircle className="w-5 h-5 text-indigo-600" />}
              <div className="font-semibold text-gray-800">✏️ 手動入力</div>
            </div>
            <div className="text-xs text-gray-600 text-left">
              送料を手動で設定します
            </div>
          </button>
        </div>
      </div>

      {/* Zone選択UI */}
      <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
        <h3 className="font-semibold text-purple-900 mb-3">
          📍 配送対象Zone選択
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {zones.map((zone) => (
            <label
              key={zone.id}
              className="flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer hover:bg-white transition-colors"
              style={{
                borderColor: selectedZones.has(zone.zone_code) ? '#8b5cf6' : '#e5e7eb',
                backgroundColor: selectedZones.has(zone.zone_code) ? '#f5f3ff' : 'white'
              }}
            >
              <input
                type="checkbox"
                checked={selectedZones.has(zone.zone_code)}
                onChange={(e) => {
                  const newZones = new Set(selectedZones)
                  if (e.target.checked) {
                    newZones.add(zone.zone_code)
                  } else {
                    newZones.delete(zone.zone_code)
                  }
                  setSelectedZones(newZones)
                }}
                className="w-4 h-4 text-purple-600"
              />
              <div className="flex-1">
                <div className="font-semibold text-sm">{zone.zone_name}</div>
                <div className="text-xs text-gray-600">
                  {zone.country_count || 0}カ国
                </div>
              </div>
            </label>
          ))}
        </div>
        
        {selectedZones.size > 0 && (
          <div className="mt-3 p-3 bg-white rounded border border-purple-300">
            <div className="text-sm font-semibold text-purple-900 mb-2">
              選択中のZone: {selectedZones.size}個
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedZones).map(zoneCode => {
                const zone = zones.find(z => z.zone_code === zoneCode)
                return (
                  <span key={zoneCode} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                    {zone?.zone_name}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 配送サービスリスト */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">
            配送サービス / Shipping Services
          </h3>
          <button
            onClick={addInternationalService}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            サービス追加
          </button>
        </div>

        {formData.internationalServices.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <Globe className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600 mb-2">国際配送サービスが設定されていません</p>
            <p className="text-sm text-gray-500">「サービス追加」をクリックして設定を開始してください</p>
          </div>
        ) : (
          <div className="space-y-4">
            {formData.internationalServices.map((service: any, index: number) => (
              <InternationalServiceCard
                key={service.id}
                service={service}
                index={index}
                carriers={carriers}
                services={services}
                zones={zones}
                countries={countries}
                selectedZones={selectedZones}
                rateCalculationMode={rateCalculationMode}
                onUpdate={(updates) => updateService(service.id, updates)}
                onRemove={() => removeService(service.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ヘルプ情報 */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <div className="font-semibold mb-2">国際配送の設定について:</div>
            <ul className="space-y-1 ml-4 text-xs">
              <li>• <strong>自動計算モード:</strong> DBマトリックスから重量・サイズに応じた送料を自動計算します</li>
              <li>• <strong>Zone設定:</strong> 同じZoneの国は同一の送料体系が適用されます</li>
              <li>• <strong>複数サービス:</strong> Standard/Expressなど複数の配送オプションを提供できます</li>
              <li>• <strong>配送日数:</strong> 購入者の期待に合わせて現実的な日数を設定してください</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function InternationalServiceCard({
  service,
  index,
  carriers,
  services,
  zones,
  countries,
  selectedZones,
  rateCalculationMode,
  onUpdate,
  onRemove
}: any) {
  const [expanded, setExpanded] = useState(true)
  const [showCountrySelector, setShowCountrySelector] = useState(false)

  // Zone選択に基づいて対応国を取得
  const getCountriesForZones = () => {
    if (!service.includedZones || service.includedZones.length === 0) {
      return []
    }
    
    return countries.filter((country: any) =>
      service.includedZones.includes(country.zone_code)
    )
  }

  const affectedCountries = getCountriesForZones()

  return (
    <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
      {/* ヘッダー */}
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-600 hover:text-gray-800"
          >
            {expanded ? '▼' : '▶'}
          </button>
          <span className="font-semibold text-gray-800">
            国際配送サービス #{index + 1}
          </span>
          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
            {affectedCountries.length}カ国
          </span>
        </div>
        <button
          onClick={onRemove}
          className="text-red-600 hover:bg-red-50 p-2 rounded transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* コンテンツ */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* 配送業者・サービス選択 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                配送業者 / Carrier
              </label>
              <select
                value={service.carrierId}
                onChange={(e) => onUpdate({ carrierId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {carriers.map((carrier: any) => (
                  <option key={carrier.id} value={carrier.id}>
                    {carrier.carrier_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                配送サービス / Service
              </label>
              <select
                value={service.serviceId}
                onChange={(e) => onUpdate({ serviceId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {services
                  .filter((s: any) => s.carrier_id === service.carrierId)
                  .map((svc: any) => (
                    <option key={svc.id} value={svc.id}>
                      {svc.service_name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Zone選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              対象Zone / Target Zones *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {Array.from(selectedZones).map(zoneCode => {
                const zone = zones.find((z: any) => z.zone_code === zoneCode)
                const isSelected = service.includedZones?.includes(zoneCode)
                
                return (
                  <label
                    key={zoneCode}
                    className={`p-2 border-2 rounded cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        const newZones = e.target.checked
                          ? [...(service.includedZones || []), zoneCode]
                          : (service.includedZones || []).filter((z: string) => z !== zoneCode)
                        onUpdate({ includedZones: newZones })
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium">{zone?.zone_name}</span>
                  </label>
                )
              })}
            </div>
            
            {affectedCountries.length > 0 && (
              <div className="mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded text-xs">
                <strong>対応国 ({affectedCountries.length}):</strong> {' '}
                {affectedCountries.slice(0, 10).map((c: any) => c.country_name).join(', ')}
                {affectedCountries.length > 10 && ` 他${affectedCountries.length - 10}カ国`}
              </div>
            )}
          </div>

          {/* 料金設定 */}
          {rateCalculationMode === 'manual' && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  基本送料 / Base Shipping
                </label>
                <input
                  type="number"
                  value={service.baseShipping}
                  onChange={(e) => onUpdate({ baseShipping: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  追加送料 / Additional
                </label>
                <input
                  type="number"
                  value={service.additionalShipping}
                  onChange={(e) => onUpdate({ additionalShipping: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          {rateCalculationMode === 'auto' && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 text-sm">
                <CheckCircle className="w-4 h-4" />
                <strong>自動計算モード:</strong> 
                <span className="text-xs">
                  DBマトリックスから重量・サイズに応じて自動計算されます
                </span>
              </div>
            </div>
          )}

          {/* 配送日数 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最短配送日数 / Min Transit Days
              </label>
              <input
                type="number"
                value={service.minTransitDays}
                onChange={(e) => onUpdate({ minTransitDays: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最長配送日数 / Max Transit Days
              </label>
              <input
                type="number"
                value={service.maxTransitDays}
                onChange={(e) => onUpdate({ maxTransitDays: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
