// 簡易版計算フォーム - HTSコード入力 + 関税率プルダウン
'use client'

import { useState } from 'react'
import { Search, Calculator } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

// 一般的な関税率
const COMMON_TARIFF_RATES = [
  { value: 0, label: '0% (Free)' },
  { value: 0.025, label: '2.5%' },
  { value: 0.029, label: '2.9%' },
  { value: 0.035, label: '3.5%' },
  { value: 0.039, label: '3.9%' },
  { value: 0.045, label: '4.5%' },
  { value: 0.05, label: '5%' },
  { value: 0.058, label: '5.8%' },
  { value: 0.068, label: '6.8%' },
  { value: 0.098, label: '9.8%' },
  { value: 0.10, label: '10%' },
  { value: 0.165, label: '16.5%' },
  { value: 0.20, label: '20%' },
]

interface SimpleTariffInputProps {
  onTariffChange: (baseDuty: number, originDuty: number, hsCode?: string) => void
}

export function SimpleTariffInput({ onTariffChange }: SimpleTariffInputProps) {
  const [inputMode, setInputMode] = useState<'hts' | 'manual'>('hts')
  const [htsCode, setHtsCode] = useState('')
  const [manualRate, setManualRate] = useState(0)
  const [originCountry, setOriginCountry] = useState('CN')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  // HTSコードで検索
  const searchHTS = async () => {
    if (!htsCode.trim()) return

    setLoading(true)
    try {
      const normalized = htsCode.replace(/\./g, '')

      // 1. hs_codes
      let { data: hsData } = await supabase
        .from('hs_codes')
        .select('code, base_duty, description')
        .eq('code', normalized)
        .single()

      // 2. hts_codes_details
      if (!hsData) {
        const { data: htsDetail } = await supabase
          .from('hts_codes_details')
          .select('hts_number, general_rate, description')
          .or(`hts_number.eq.${htsCode},hts_number.eq.${normalized}`)
          .limit(1)
          .single()

        if (htsDetail) {
          const parseRate = (rate: string): number => {
            if (!rate || rate === 'Free') return 0
            const match = rate.match(/([\d.]+)/)
            return match ? parseFloat(match[1]) / 100 : 0
          }

          hsData = {
            code: htsDetail.hts_number,
            base_duty: parseRate(htsDetail.general_rate).toString(),
            description: htsDetail.description
          }
        }
      }

      if (hsData) {
        const baseDuty = parseFloat(hsData.base_duty)
        setResult({ baseDuty, description: hsData.description })
        
        // 原産国別追加関税を取得
        const { data: countryTariff } = await supabase
          .from('country_additional_tariffs')
          .select('additional_rate')
          .eq('country_code', originCountry)
          .eq('is_active', true)
          .single()

        const additionalRate = countryTariff?.additional_rate || 0
        onTariffChange(baseDuty, additionalRate, hsData.code)
      }
    } catch (error) {
      console.error('HTS検索エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  // 手動入力
  const applyManualRate = async () => {
    const { data: countryTariff } = await supabase
      .from('country_additional_tariffs')
      .select('additional_rate')
      .eq('country_code', originCountry)
      .eq('is_active', true)
      .single()

    const additionalRate = countryTariff?.additional_rate || 0
    onTariffChange(manualRate, additionalRate)
  }

  return (
    <div className="bg-green-50 rounded-lg p-4 border border-green-300">
      <h4 className="font-semibold text-gray-900 mb-3">📋 関税設定</h4>

      {/* モード切替 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setInputMode('hts')}
          className={`px-4 py-2 rounded ${
            inputMode === 'hts'
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700 border'
          }`}
        >
          HTSコード入力
        </button>
        <button
          onClick={() => setInputMode('manual')}
          className={`px-4 py-2 rounded ${
            inputMode === 'manual'
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700 border'
          }`}
        >
          関税率選択
        </button>
      </div>

      {/* HTSコード入力モード */}
      {inputMode === 'hts' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="HTSコード (例: 9620.00.20.00)"
              value={htsCode}
              onChange={(e) => setHtsCode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchHTS()}
              className="flex-1 px-3 py-2 border rounded font-mono"
            />
            <button
              onClick={searchHTS}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? '検索中...' : <Search className="w-5 h-5" />}
            </button>
          </div>

          {result && (
            <div className="bg-white rounded p-3 border">
              <div className="text-sm text-gray-600">{result.description}</div>
              <div className="text-2xl font-bold text-green-700 mt-1">
                基本関税: {(result.baseDuty * 100).toFixed(2)}%
              </div>
            </div>
          )}
        </div>
      )}

      {/* 関税率選択モード */}
      {inputMode === 'manual' && (
        <div className="space-y-3">
          <select
            value={manualRate}
            onChange={(e) => {
              const rate = parseFloat(e.target.value)
              setManualRate(rate)
              applyManualRate()
            }}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">関税率を選択...</option>
            {COMMON_TARIFF_RATES.map((rate) => (
              <option key={rate.value} value={rate.value}>
                {rate.label}
              </option>
            ))}
          </select>

          {manualRate > 0 && (
            <div className="bg-white rounded p-3 border">
              <div className="text-2xl font-bold text-green-700">
                選択された関税率: {(manualRate * 100).toFixed(2)}%
              </div>
            </div>
          )}
        </div>
      )}

      {/* 原産国選択 */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          原産国
        </label>
        <select
          value={originCountry}
          onChange={(e) => {
            setOriginCountry(e.target.value)
            if (inputMode === 'hts' && result) {
              searchHTS()
            } else if (inputMode === 'manual' && manualRate > 0) {
              applyManualRate()
            }
          }}
          className="w-full px-3 py-2 border rounded"
        >
          <option value="CN">中国 (CN)</option>
          <option value="JP">日本 (JP)</option>
          <option value="KR">韓国 (KR)</option>
          <option value="VN">ベトナム (VN)</option>
          <option value="US">アメリカ (US)</option>
          <option value="DE">ドイツ (DE)</option>
          <option value="GB">イギリス (GB)</option>
        </select>
      </div>
    </div>
  )
}
