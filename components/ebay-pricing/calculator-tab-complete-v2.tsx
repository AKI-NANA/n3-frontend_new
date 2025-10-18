// components/ebay-pricing/calculator-tab-complete-v2.tsx
'use client'

import { Calculator, TrendingUp, DollarSign, Package, Globe, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { calculateUsaPriceV3, STORE_FEES, type UsaPricingResultV3 } from '@/lib/ebay-pricing/usa-price-calculator-v3'
import { UsaPriceResultDisplayV3 } from './usa-price-result-display-v3'

interface CalculatorTabCompleteV2Props {
  formData: any
  onInputChange: (field: string, value: any) => void
}

export function CalculatorTabCompleteV2({ formData, onInputChange }: CalculatorTabCompleteV2Props) {
  const [result, setResult] = useState<UsaPricingResultV3 | null>(null)
  const [loading, setLoading] = useState(false)
  const [targetProfitMargin, setTargetProfitMargin] = useState(15)

  const handleCalculate = async () => {
    setLoading(true)
    try {
      // 容積重量を計算（エクスプレスは5000で割る）
      const volumetricWeight = (formData.length * formData.width * formData.height) / 5000
      const effectiveWeight = Math.max(formData.actualWeight, volumetricWeight)
      
      console.log('📦 重量計算:', {
        actualWeight: formData.actualWeight,
        volumetricWeight: volumetricWeight.toFixed(2),
        effectiveWeight: effectiveWeight.toFixed(2)
      })
      
      const calculationResult = await calculateUsaPriceV3({
        costJPY: formData.costJPY || 15000,
        weight_kg: effectiveWeight,
        targetMargin: targetProfitMargin,
        hsCode: formData.hsCode || '9620.00.20.00',
        originCountry: formData.originCountry || 'JP',
        storeType: formData.storeType || 'none',
        fvfRate: formData.fvfRate || 0.1315,
        exchangeRate: formData.exchangeRate || 154.32
      })
      
      console.log('✅ V3計算結果:', calculationResult)
      setResult(calculationResult)
    } catch (error) {
      console.error('計算エラー:', error)
      setResult({
        success: false,
        error: '計算中にエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー')
      } as UsaPricingResultV3)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 入力フォーム */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calculator className="w-7 h-7 text-indigo-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">USA DDP価格計算（精密版V3）</h2>
            <p className="text-gray-600 text-sm">🎯 目標利益率を固定して価格を逆算します</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 仕入れ値 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              仕入れ値（円）
            </label>
            <input
              type="number"
              value={formData.costJPY}
              onChange={(e) => onInputChange('costJPY', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="15000"
            />
          </div>

          {/* 重量 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Package className="w-4 h-4 inline mr-1" />
              実重量（kg）
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.actualWeight}
              onChange={(e) => onInputChange('actualWeight', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0.5"
            />
          </div>

          {/* 長さ */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              長さ（cm）
            </label>
            <input
              type="number"
              value={formData.length || 0}
              onChange={(e) => onInputChange('length', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="40"
            />
          </div>

          {/* 幅 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              幅（cm）
            </label>
            <input
              type="number"
              value={formData.width || 0}
              onChange={(e) => onInputChange('width', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="30"
            />
          </div>

          {/* 高さ */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              高さ（cm）
            </label>
            <input
              type="number"
              value={formData.height || 0}
              onChange={(e) => onInputChange('height', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="20"
            />
          </div>
        </div>

        {/* 容積重量の表示 */}
        {formData.length > 0 && formData.width > 0 && formData.height > 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">📦 重量計算（実重量 vs 容積重量）</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-gray-600">実重量:</span>
                <span className="ml-2 font-semibold text-gray-900">{formData.actualWeight.toFixed(2)}kg</span>
              </div>
              <div>
                <span className="text-gray-600">容積重量:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {((formData.length * formData.width * formData.height) / 6000).toFixed(2)}kg
                </span>
                <span className="ml-1 text-xs text-gray-500">(長xd7幅xd7高 xf7 6000)</span>
              </div>
              <div>
                <span className="text-gray-600">適用重量:</span>
                <span className="ml-2 font-bold text-blue-600">
                  {Math.max(formData.actualWeight, (formData.length * formData.width * formData.height) / 6000).toFixed(2)}kg
                </span>
                <span className="ml-1 text-xs text-gray-500">(大きい方)</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* 🎯 目標利益率 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              🎯 目標利益率（%）
            </label>
            <input
              type="number"
              value={targetProfitMargin}
              onChange={(e) => setTargetProfitMargin(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50 font-bold"
              placeholder="15"
            />
            <p className="text-xs text-gray-500 mt-1">この利益率を達成する価格を逆算します</p>
          </div>

          {/* HTSコード */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              HTSコード
            </label>
            <input
              type="text"
              value={formData.hsCode}
              onChange={(e) => onInputChange('hsCode', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="9620.00.20.00"
            />
          </div>

          {/* 原産国 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Globe className="w-4 h-4 inline mr-1" />
              原産国
            </label>
            <select
              value={formData.originCountry}
              onChange={(e) => onInputChange('originCountry', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="JP">日本 (JP)</option>
              <option value="CN">中国 (CN)</option>
              <option value="US">アメリカ (US)</option>
              <option value="DE">ドイツ (DE)</option>
              <option value="KR">韓国 (KR)</option>
              <option value="TW">台湾 (TW)</option>
            </select>
          </div>

          {/* ストアタイプ */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ストアタイプ
            </label>
            <select
              value={formData.storeType}
              onChange={(e) => onInputChange('storeType', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="none">ストアなし (0%割引)</option>
              <option value="basic">Basic (-4%)</option>
              <option value="premium">Premium (-6%)</option>
              <option value="anchor">Anchor (-8%)</option>
            </select>
          </div>

          {/* FVF率 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              FVF率（%）
            </label>
            <input
              type="number"
              step="0.01"
              value={(formData.fvfRate * 100).toFixed(2)}
              onChange={(e) => onInputChange('fvfRate', parseFloat(e.target.value) / 100 || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="13.15"
            />
          </div>

          {/* 為替レート */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              為替レート（円/USD）
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.exchangeRate}
              onChange={(e) => onInputChange('exchangeRate', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="154.32"
            />
          </div>
        </div>

        {/* 計算ボタン */}
        <div className="mt-6">
          <button
            onClick={handleCalculate}
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                計算中...
              </>
            ) : (
              <>
                <Calculator className="w-5 h-5" />
                🎯 目標利益率{targetProfitMargin}%で価格を計算
              </>
            )}
          </button>
        </div>
      </div>

      {/* 計算結果表示 */}
      {result && <UsaPriceResultDisplayV3 result={result} />}
    </div>
  )
}
