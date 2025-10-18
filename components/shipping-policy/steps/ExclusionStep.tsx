'use client'

import { useState } from 'react'
import { X, Search, AlertCircle, Info } from 'lucide-react'

interface ExclusionStepProps {
  formData: any
  countries: any[]
  zones: any[]
  onChange: (data: any) => void
}

export function ExclusionStep({
  formData,
  countries,
  zones,
  onChange
}: ExclusionStepProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedZone, setSelectedZone] = useState('')

  const filteredCountries = countries.filter((country: any) =>
    country.country_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.country_code.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter((country: any) =>
    !selectedZone || country.zone_code === selectedZone
  )

  function toggleCountry(countryCode: string) {
    const excluded = formData.excludedCountries || []
    const newExcluded = excluded.includes(countryCode)
      ? excluded.filter((c: string) => c !== countryCode)
      : [...excluded, countryCode]
    
    onChange({ excludedCountries: newExcluded })
  }

  function toggleZone(zoneCode: string) {
    const excluded = formData.excludedRegions || []
    const newExcluded = excluded.includes(zoneCode)
      ? excluded.filter((z: string) => z !== zoneCode)
      : [...excluded, zoneCode]
    
    onChange({ excludedRegions: newExcluded })
  }

  function clearAllExclusions() {
    onChange({ 
      excludedCountries: [],
      excludedRegions: []
    })
  }

  const excludedCount = (formData.excludedCountries || []).length
  const excludedZoneCount = (formData.excludedRegions || []).length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
          <span className="text-xl">🚫</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            配送除外設定 / Shipping Exclusions
          </h2>
          <p className="text-sm text-gray-600">
            配送しない国・地域を指定します（オプション）
          </p>
        </div>
      </div>

      {/* 注意事項 */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <div className="font-semibold mb-1">重要:</div>
            <ul className="space-y-1 ml-4 text-xs">
              <li>• 除外設定は慎重に行ってください。販売機会が減少します</li>
              <li>• 制裁国・紛争地域など法的に配送できない国のみ除外を推奨</li>
              <li>• Zone除外すると、そのZone内の全ての国が除外されます</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 統計表示 */}
      {(excludedCount > 0 || excludedZoneCount > 0) && (
        <div className="flex items-center justify-between p-4 bg-red-50 border-2 border-red-200 rounded-lg">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-sm font-semibold text-red-800">除外中:</span>
              <span className="ml-2 text-red-900">
                {excludedCount}カ国、{excludedZoneCount}Zone
              </span>
            </div>
          </div>
          <button
            onClick={clearAllExclusions}
            className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
          >
            すべてクリア
          </button>
        </div>
      )}

      {/* Zone一括除外 */}
      <div className="border-2 border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span>🌏</span>
          Zone一括除外 / Exclude by Zone
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {zones.map((zone: any) => {
            const isExcluded = (formData.excludedRegions || []).includes(zone.zone_code)
            return (
              <label
                key={zone.id}
                className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  isExcluded
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isExcluded}
                  onChange={() => toggleZone(zone.zone_code)}
                  className="mr-2"
                />
                <div className="inline-block">
                  <div className="font-semibold text-sm">{zone.zone_name}</div>
                  <div className="text-xs text-gray-600">
                    {zone.country_count || 0}カ国
                  </div>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* 国別除外 */}
      <div className="border-2 border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span>🌍</span>
          個別国除外 / Exclude by Country
        </h3>

        {/* 検索・フィルター */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="国名・国コードで検索..."
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">すべてのZone</option>
            {zones.map((zone: any) => (
              <option key={zone.id} value={zone.zone_code}>
                {zone.zone_name}
              </option>
            ))}
          </select>
        </div>

        {/* 国リスト */}
        <div className="max-h-96 overflow-y-auto border-2 border-gray-200 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
            {filteredCountries.map((country: any) => {
              const isExcluded = (formData.excludedCountries || []).includes(country.country_code)
              return (
                <label
                  key={country.id}
                  className={`flex items-center gap-2 p-3 border-b border-r cursor-pointer transition-all ${
                    isExcluded
                      ? 'bg-red-50 hover:bg-red-100'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isExcluded}
                    onChange={() => toggleCountry(country.country_code)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{country.flag || '🏴'}</span>
                      <span className="text-sm font-medium">{country.country_name}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {country.country_code} • {country.zone_name || 'N/A'}
                    </div>
                  </div>
                  {isExcluded && (
                    <X className="w-4 h-4 text-red-600" />
                  )}
                </label>
              )
            })}
          </div>
        </div>

        {filteredCountries.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>該当する国が見つかりません</p>
          </div>
        )}
      </div>

      {/* 推奨除外国リスト */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <div className="font-semibold mb-2">推奨除外国:</div>
            <div className="text-xs space-y-1">
              <p>以下の国は一般的に配送が困難または法的制限があります:</p>
              <ul className="ml-4 space-y-1 mt-2">
                <li>• 北朝鮮（KP）- 国際制裁対象</li>
                <li>• シリア（SY）- 紛争地域</li>
                <li>• イラン（IR）- 制裁対象（一部商品）</li>
                <li>• キューバ（CU）- 制裁対象（米国から）</li>
                <li>• クリミア地域 - 制裁対象</li>
              </ul>
              <p className="mt-2 text-blue-700 font-medium">
                ※ 最新の制裁情報は各国政府・eBayのガイドラインをご確認ください
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 除外中の国サマリー */}
      {excludedCount > 0 && (
        <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
          <h4 className="font-semibold text-red-900 mb-3">
            除外中の国 ({excludedCount}カ国)
          </h4>
          <div className="flex flex-wrap gap-2">
            {(formData.excludedCountries || []).map((countryCode: string) => {
              const country = countries.find((c: any) => c.country_code === countryCode)
              return (
                <div
                  key={countryCode}
                  className="flex items-center gap-2 px-3 py-1 bg-white border border-red-300 rounded-full"
                >
                  <span className="text-sm">
                    {country?.flag || '🏴'} {country?.country_name || countryCode}
                  </span>
                  <button
                    onClick={() => toggleCountry(countryCode)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
