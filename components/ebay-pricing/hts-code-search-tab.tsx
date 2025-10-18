'use client'

import React, { useState } from 'react'
import { Search, FileText, Globe, DollarSign } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface HTSCodeResult {
  code: string
  description: string
  base_duty: number
  general_rate?: string
  source: 'hs_codes' | 'hts_codes_details'
}

interface CountryTariff {
  country_code: string
  additional_rate: number
  tariff_type: string
  description: string
}

export function HTSCodeSearchTab() {
  const [searchQuery, setSearchQuery] = useState('')
  const [htsResult, setHtsResult] = useState<HTSCodeResult | null>(null)
  const [countryTariffs, setCountryTariffs] = useState<CountryTariff[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('HTSコードを入力してください')
      return
    }

    setLoading(true)
    setError('')
    setHtsResult(null)
    setCountryTariffs([])

    try {
      const normalized = searchQuery.replace(/\./g, '')

      // 1. hs_codesで検索
      const { data: hsData } = await supabase
        .from('hs_codes')
        .select('code, base_duty, description')
        .eq('code', normalized)
        .single()

      if (hsData) {
        setHtsResult({
          code: hsData.code,
          description: hsData.description,
          base_duty: parseFloat(hsData.base_duty) * 100,
          source: 'hs_codes'
        })
      } else {
        // 2. hts_codes_detailsで検索
        const { data: htsDetail } = await supabase
          .from('hts_codes_details')
          .select('hts_number, general_rate, description')
          .or(`hts_number.eq.${searchQuery},hts_number.eq.${normalized}`)
          .limit(1)
          .single()

        if (htsDetail) {
          const parseRate = (rate: string): number => {
            if (!rate || rate === 'Free') return 0
            const match = rate.match(/([\d.]+)/)
            return match ? parseFloat(match[1]) : 0
          }

          setHtsResult({
            code: htsDetail.hts_number,
            description: htsDetail.description,
            base_duty: parseRate(htsDetail.general_rate),
            general_rate: htsDetail.general_rate,
            source: 'hts_codes_details'
          })
        } else {
          setError(`HTSコード "${searchQuery}" が見つかりませんでした`)
        }
      }

      // 3. 主要国の追加関税を取得
      const { data: tariffs } = await supabase
        .from('country_additional_tariffs')
        .select('country_code, additional_rate, tariff_type, description')
        .in('country_code', ['CN', 'JP', 'US', 'KR', 'VN', 'DE', 'GB', 'CA', 'MX', 'TW'])
        .eq('is_active', true)
        .order('additional_rate', { ascending: false })

      setCountryTariffs(tariffs || [])

    } catch (err) {
      console.error('検索エラー:', err)
      setError('検索中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 検索ヘッダー */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-6 h-6" />
          <h2 className="text-2xl font-bold">HTSコード検索</h2>
        </div>
        <p className="text-purple-100">
          HTSコード（10桁）で検索して、基本関税率と原産国別追加関税を確認
        </p>
      </div>

      {/* 検索ボックス */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="HTSコードを入力（例: 9006.91.0000 または 9006910000）"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-mono"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-semibold flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                検索中...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                検索
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* HTSコード結果 */}
      {htsResult && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-lg p-6 border-2 border-purple-300">
          <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            HTSコード情報
          </h3>

          <div className="bg-white rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-gray-700 font-semibold">HTSコード</span>
              <span className="text-2xl font-mono font-bold text-purple-900">{htsResult.code}</span>
            </div>

            <div className="pb-3 border-b">
              <div className="text-gray-700 font-semibold mb-1">説明</div>
              <div className="text-gray-900">{htsResult.description}</div>
            </div>

            <div className="flex justify-between items-center bg-purple-50 rounded-lg p-4">
              <span className="text-gray-700 font-semibold text-lg">基本関税率</span>
              <span className="text-3xl font-bold text-purple-700">{htsResult.base_duty.toFixed(2)}%</span>
            </div>

            {htsResult.general_rate && (
              <div className="text-sm text-gray-600">
                元の表記: <span className="font-mono">{htsResult.general_rate}</span>
              </div>
            )}

            <div className="text-xs text-gray-500 pt-2 border-t">
              データソース: {htsResult.source === 'hs_codes' ? 'hs_codes (180件)' : 'hts_codes_details (28,881件)'}
            </div>
          </div>
        </div>
      )}

      {/* 原産国別追加関税 */}
      {countryTariffs.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6 border-2 border-blue-300">
          <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
            <Globe className="w-6 h-6" />
            原産国別追加関税（トランプ相互関税2025）
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {countryTariffs.map((tariff) => {
              const totalRate = htsResult ? htsResult.base_duty + (tariff.additional_rate * 100) : tariff.additional_rate * 100

              return (
                <div key={tariff.country_code} className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-gray-900">{tariff.country_code}</span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      tariff.tariff_type === 'TRUMP_2025' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {tariff.tariff_type}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {tariff.description}
                  </div>

                  <div className="space-y-2">
                    {htsResult && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">基本関税:</span>
                        <span className="font-mono font-semibold">{htsResult.base_duty.toFixed(2)}%</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">追加関税:</span>
                      <span className="font-mono font-semibold text-red-600">+{(tariff.additional_rate * 100).toFixed(2)}%</span>
                    </div>
                    {htsResult && (
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-semibold text-gray-900">合計税率:</span>
                        <span className="text-xl font-bold text-blue-700">{totalRate.toFixed(2)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 使い方ガイド */}
      {!htsResult && !error && (
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            使い方
          </h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• HTSコードは10桁で入力してください（ドット付き/なし両対応）</li>
            <li>• 例: <code className="px-2 py-1 bg-gray-200 rounded font-mono">9006.91.0000</code> または <code className="px-2 py-1 bg-gray-200 rounded font-mono">9006910000</code></li>
            <li>• 基本関税率 + 原産国別追加関税 = 最終税率</li>
            <li>• 中国: +34%, 日本: +24%, ベトナム: +46%など</li>
          </ul>
        </div>
      )}
    </div>
  )
}
