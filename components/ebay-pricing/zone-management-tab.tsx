'use client'

import React, { useState, useEffect } from 'react'
import { Globe, Loader2, AlertTriangle, CheckCircle, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface FedExZoneRate {
  zone_code: string
  zone_name: string
  weight_kg: number
  actual_cost_usd: number
}

export function ZoneManagementTab() {
  const [zones, setZones] = useState<FedExZoneRate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadZones()
  }, [])

  const loadZones = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('fedex_zone_rates')
        .select('*')
        .order('zone_code')
        .order('weight_kg')

      if (error) throw error
      setZones(data || [])
    } catch (error) {
      console.error('Failed to load zones:', error)
    } finally {
      setLoading(false)
    }
  }

  const uniqueZones = Array.from(new Set(zones.map(z => z.zone_code)))
    .map(code => {
      const zone = zones.find(z => z.zone_code === code)
      return { code, name: zone?.zone_name || code }
    })

  const weights = [1.0, 3.5, 7.5, 15.0, 30.0, 55.0]

  const filteredZones = uniqueZones.filter(z => 
    z.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    z.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getZoneRate = (zoneCode: string, weight: number) => {
    return zones.find(z => z.zone_code === zoneCode && z.weight_kg === weight)
  }

  const registeredZones = uniqueZones.length
  const totalZonesNeeded = 22
  const completionPercent = (registeredZones / totalZonesNeeded) * 100

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-600">ZONEデータを読み込み中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Globe className="w-7 h-7 text-indigo-600" />
            22 ZONE 実費レート管理
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            FedEx International Priority の国別送料実費データ
          </p>
        </div>
      </div>

      {/* 進捗サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">登録済みZONE</div>
          <div className="text-3xl font-bold text-gray-800">{registeredZones} / {totalZonesNeeded}</div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">{completionPercent.toFixed(1)}% 完了</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">総レコード数</div>
          <div className="text-3xl font-bold text-gray-800">{zones.length} / 132</div>
          <div className="text-xs text-gray-500 mt-1">
            22 ZONE × 6重量帯 = 132レコード必要
          </div>
        </div>

        <div className={`rounded-lg border-2 p-4 ${
          completionPercent >= 100 ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'
        }`}>
          <div className="text-sm text-gray-600 mb-1">ステータス</div>
          <div className={`text-2xl font-bold ${
            completionPercent >= 100 ? 'text-green-700' : 'text-yellow-700'
          }`}>
            {completionPercent >= 100 ? '✅ 完了' : '⏳ 実装中'}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {completionPercent >= 100 ? '全ZONE登録完了' : `残り${totalZonesNeeded - registeredZones} ZONE`}
          </div>
        </div>
      </div>

      {/* 検索 */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="ZONE名または国コードで検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* ZONEレートテーブル */}
      <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b-2 border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 sticky left-0 bg-gray-100 z-10">
                  ZONE
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[150px]">
                  国/地域名
                </th>
                {weights.map(w => (
                  <th key={w} className="px-3 py-3 text-center font-semibold text-gray-700">
                    {w}kg
                  </th>
                ))}
                <th className="px-3 py-3 text-center font-semibold text-gray-700">
                  ステータス
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredZones.map((zone, idx) => {
                const hasAllWeights = weights.every(w => getZoneRate(zone.code, w))
                
                return (
                  <tr key={zone.code} className={`border-b border-gray-200 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:bg-indigo-50`}>
                    <td className="px-4 py-3 font-semibold text-gray-700 sticky left-0 z-10 bg-inherit">
                      {zone.code}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {zone.name}
                    </td>
                    {weights.map(w => {
                      const rate = getZoneRate(zone.code, w)
                      return (
                        <td key={w} className="px-3 py-3 text-center">
                          {rate ? (
                            <span className="font-semibold text-gray-800">
                              ${rate.actual_cost_usd}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-3 py-3 text-center">
                      {hasAllWeights ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mx-auto" />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 未登録ZONE警告 */}
      {completionPercent < 100 && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            未登録のZONE
          </h4>
          <div className="text-sm text-yellow-700">
            <p className="mb-2">以下のZONEのデータがまだ登録されていません：</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['IT', 'ES', 'NL', 'BE', 'SE', 'AU', 'JP', 'CN', 'HK', 'SG', 'KR', 'TW', 'TH', 'IN', 'BR', 'EU_OTHER', 'APAC_OTHER']
                .filter(code => !uniqueZones.find(z => z.code === code))
                .map(code => (
                  <div key={code} className="px-2 py-1 bg-yellow-100 rounded text-xs font-medium">
                    {code}
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* データ投入ガイド */}
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <Globe className="w-5 h-5" />
          データ投入方法
        </h4>
        <div className="text-sm text-blue-700 space-y-2">
          <p><strong>方法1: 手動SQL投入</strong></p>
          <pre className="bg-blue-100 p-2 rounded text-xs overflow-x-auto">
{`INSERT INTO fedex_zone_rates (zone_code, zone_name, country_code, weight_kg, actual_cost_usd, notes) VALUES
('AU', 'Australia', 'AU', 1.0, 28.50, 'FedEx IP Australia'),
('AU', 'Australia', 'AU', 3.5, 52.00, 'FedEx IP Australia'),
-- ... 残りの重量帯`}
          </pre>
          <p className="mt-2"><strong>方法2: CSV一括インポート</strong></p>
          <p className="text-xs">Supabase Dashboard → fedex_zone_rates テーブル → Import data from CSV</p>
        </div>
      </div>

      {/* 重要な注意事項 */}
      <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
        <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          重要: ポリシー生成への影響
        </h4>
        <div className="text-sm text-orange-700 space-y-1">
          <p>• 全22 ZONEのデータが揃うまで、正確なポリシー生成はできません</p>
          <p>• 現在の「OTHER ZONE」は仮の平均値を使用しています</p>
          <p>• 36ポリシー × 22 ZONE = <strong>792個の個別設定</strong>が必要です</p>
          <p>• ZONEによって送料が<strong>USA ZONEより高額</strong>になる場合があります</p>
        </div>
      </div>
    </div>
  )
}
