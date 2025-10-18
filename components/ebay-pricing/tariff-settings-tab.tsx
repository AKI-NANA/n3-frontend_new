'use client'

import { useState, useEffect } from 'react'
import { Globe, AlertCircle, CheckCircle, TrendingUp, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface TariffSettingsTabProps {
  countries: any[]
}

interface HTSCountry {
  country_code: string
  name_ja: string
  name_en: string
  region: string
  is_preferential: boolean
}

interface CountryAdditionalTariff {
  country_code: string
  tariff_type: string
  additional_rate: number
  description: string
  is_active: boolean
}

export function TariffSettingsTab({ countries }: TariffSettingsTabProps) {
  const [htsCountries, setHtsCountries] = useState<HTSCountry[]>([])
  const [additionalTariffs, setAdditionalTariffs] = useState<CountryAdditionalTariff[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // 原産国マスタ取得
      const { data: countriesData } = await supabase
        .from('hts_countries')
        .select('*')
        .order('country_code')

      if (countriesData) setHtsCountries(countriesData)

      // 追加関税データ取得
      const { data: tariffsData } = await supabase
        .from('country_additional_tariffs')
        .select('*')
        .eq('is_active', true)
        .order('additional_rate', { ascending: false })

      if (tariffsData) setAdditionalTariffs(tariffsData)
    } catch (error) {
      console.error('Failed to fetch tariff data:', error)
    } finally {
      setLoading(false)
    }
  }

  // 原産国の追加関税を取得
  const getCountryTariff = (countryCode: string) => {
    return additionalTariffs.find(t => t.country_code === countryCode)
  }

  // 検索フィルタ
  const filteredCountries = htsCountries.filter(c => 
    c.name_ja.includes(searchTerm) || 
    c.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.country_code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 地域別にグループ化
  const groupedCountries = filteredCountries.reduce((acc, country) => {
    if (!acc[country.region]) {
      acc[country.region] = []
    }
    acc[country.region].push(country)
    return acc
  }, {} as Record<string, HTSCountry[]>)

  // 税率帯別の統計
  const getTariffStats = () => {
    const ranges = {
      'very_high': additionalTariffs.filter(t => t.additional_rate >= 0.40).length,
      'high': additionalTariffs.filter(t => t.additional_rate >= 0.30 && t.additional_rate < 0.40).length,
      'medium': additionalTariffs.filter(t => t.additional_rate >= 0.20 && t.additional_rate < 0.30).length,
      'low': additionalTariffs.filter(t => t.additional_rate >= 0.10 && t.additional_rate < 0.20).length,
    }
    return ranges
  }

  const stats = getTariffStats()
  const selectedCountryData = selectedCountry 
    ? htsCountries.find(c => c.country_code === selectedCountry)
    : null
  const selectedCountryTariff = selectedCountry ? getCountryTariff(selectedCountry) : null

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Globe className="w-7 h-7" />
          原産国別追加関税マスタ
        </h2>
        <div className="text-sm text-gray-600">
          2025年トランプ政権 相互関税
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 mb-1">総登録国</div>
          <div className="text-3xl font-bold text-blue-900">{additionalTariffs.length}</div>
          <div className="text-xs text-blue-700 mt-1">ヶ国</div>
        </div>
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-600 mb-1">超高税率</div>
          <div className="text-3xl font-bold text-red-900">{stats.very_high}</div>
          <div className="text-xs text-red-700 mt-1">40-50%</div>
        </div>
        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
          <div className="text-sm text-orange-600 mb-1">高税率</div>
          <div className="text-3xl font-bold text-orange-900">{stats.high}</div>
          <div className="text-xs text-orange-700 mt-1">30-39%</div>
        </div>
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-600 mb-1">中税率</div>
          <div className="text-3xl font-bold text-yellow-900">{stats.medium}</div>
          <div className="text-xs text-yellow-700 mt-1">20-29%</div>
        </div>
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 mb-1">低税率</div>
          <div className="text-3xl font-bold text-green-900">{stats.low}</div>
          <div className="text-xs text-green-700 mt-1">10-19%</div>
        </div>
      </div>

      {/* 検索バー */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="国名、国コードで検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* 原産国一覧（地域別） */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">読み込み中...</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedCountries).map(([region, countries]) => (
              <div key={region}>
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-lg">
                  <Globe className="w-5 h-5 text-indigo-600" />
                  {region} ({countries.length}ヶ国)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {countries.map((country) => {
                    const tariff = getCountryTariff(country.country_code)
                    const rate = tariff ? tariff.additional_rate * 100 : 0
                    
                    return (
                      <div
                        key={country.country_code}
                        onClick={() => setSelectedCountry(
                          selectedCountry === country.country_code ? null : country.country_code
                        )}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedCountry === country.country_code
                            ? 'border-indigo-500 bg-indigo-50 shadow-md'
                            : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:shadow'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-bold text-gray-900">{country.name_ja}</div>
                            <div className="text-gray-600 text-xs">{country.country_code} • {country.name_en}</div>
                          </div>
                          {country.is_preferential && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              特恵
                            </span>
                          )}
                        </div>
                        
                        {tariff ? (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">追加関税</span>
                              <span className={`font-bold text-lg ${
                                rate >= 40 ? 'text-red-600' :
                                rate >= 30 ? 'text-orange-600' :
                                rate >= 20 ? 'text-yellow-600' :
                                rate >= 15 ? 'text-blue-600' :
                                'text-green-600'
                              }`}>
                                +{rate.toFixed(1)}%
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              {tariff.tariff_type}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="text-xs text-gray-400 text-center">
                              追加関税データなし
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 選択した原産国の詳細 */}
      {selectedCountry && selectedCountryData && (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-300 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-indigo-900 flex items-center gap-2">
              <Globe className="w-6 h-6" />
              {selectedCountryData.name_ja} ({selectedCountryData.country_code})
            </h3>
            <button
              onClick={() => setSelectedCountry(null)}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              閉じる ✕
            </button>
          </div>

          <div className="bg-white rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">英語名</div>
                <div className="font-semibold">{selectedCountryData.name_en}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">地域</div>
                <div className="font-semibold">{selectedCountryData.region}</div>
              </div>
            </div>

            {selectedCountryTariff ? (
              <>
                <div className="border-t pt-4">
                  <div className="text-sm text-gray-600 mb-2">🇺🇸 米国 追加関税</div>
                  <div className="flex items-center gap-4">
                    <div className="text-5xl font-bold text-indigo-600">
                      +{(selectedCountryTariff.additional_rate * 100).toFixed(1)}%
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-700">
                        {selectedCountryTariff.tariff_type}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {selectedCountryTariff.description}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">💡 関税計算例</h4>
                  <div className="text-sm space-y-1 text-blue-800">
                    <p>• HTSコード基本関税率: 10%</p>
                    <p>• {selectedCountryData.name_ja}の追加関税: +{(selectedCountryTariff.additional_rate * 100).toFixed(1)}%</p>
                    <p className="font-bold text-lg text-blue-900 mt-2">
                      → 合計関税率: {(10 + selectedCountryTariff.additional_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-center">
                <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-sm text-yellow-800">
                  この原産国の追加関税データは未登録です
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 説明カード */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-5">
        <h3 className="font-bold text-yellow-900 mb-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          米国関税制度について（2025年版）
        </h3>
        <div className="text-sm space-y-2 text-gray-800">
          <p>
            <strong className="text-yellow-800">• 最終関税率の計算式:</strong> 
            <code className="bg-yellow-100 px-2 py-1 rounded ml-2 text-xs">
              HTSコード基本関税率 + 原産国別追加関税
            </code>
          </p>
          <p>
            <strong className="text-yellow-800">• トランプ相互関税 (2025年):</strong> 
            各国の対米貿易障壁に応じて10%～50%の追加関税
          </p>
          <p>
            <strong className="text-yellow-800">• 主要国の追加関税:</strong> 
            中国34%、日本24%、ベトナム46%、EU諸国15%など
          </p>
          <p>
            <strong className="text-yellow-800">• データ更新:</strong> 
            現在{additionalTariffs.length}ヶ国の追加関税率を管理中
          </p>
        </div>
      </div>

      {/* トップ税率国 */}
      <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-lg p-6">
        <h3 className="font-bold text-red-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          追加関税率 トップ10
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {additionalTariffs.slice(0, 10).map((tariff, index) => {
            const country = htsCountries.find(c => c.country_code === tariff.country_code)
            return (
              <div
                key={tariff.country_code}
                className="bg-white rounded-lg p-3 border border-red-200"
              >
                <div className="text-lg font-bold text-red-600">
                  #{index + 1}
                </div>
                <div className="text-sm font-semibold text-gray-900 mt-1">
                  {country?.name_ja || tariff.country_code}
                </div>
                <div className="text-2xl font-bold text-red-700 mt-2">
                  +{(tariff.additional_rate * 100).toFixed(0)}%
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
