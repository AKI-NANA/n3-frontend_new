'use client'

import React, { useState } from 'react'
import { Calculator, DollarSign, TrendingUp, Package, Loader2 } from 'lucide-react'
import { calculateUsaPriceV3, STORE_FEES, type UsaPricingResultV3 } from '@/lib/ebay-pricing/usa-price-calculator-v3'
import { UsaPriceResultDisplayV3 } from './usa-price-result-display-v3'

/**
 * USA配送ポリシーベース価格計算UI（V3対応）
 * 
 * 仕入れ値と重量から、目標利益率を達成する販売価格を計算
 * 全ての計算ステップを詳細に表示
 */
export function UsaPriceCalculatorComplete() {
  const [formData, setFormData] = useState({
    costJPY: 15000,
    weight_kg: 0.5,
    targetMargin: 15,
    hsCode: '9620.00.20.00',  // HTSコード（三脚・一脚）
    originCountry: 'JP',  // 原産国
    storeType: 'none' as keyof typeof STORE_FEES,
    fvfRate: 13.15,
    exchangeRate: 154.32
  })

  const [result, setResult] = useState<UsaPricingResultV3 | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCalculate = async () => {
    setLoading(true)
    try {
      const calculationResult = await calculateUsaPriceV3({
        costJPY: formData.costJPY,
        weight_kg: formData.weight_kg,
        targetMargin: formData.targetMargin,
        hsCode: formData.hsCode,
        originCountry: formData.originCountry,
        storeType: formData.storeType,
        fvfRate: formData.fvfRate / 100,
        exchangeRate: formData.exchangeRate
      })
      
      console.log('✅ 計算結果:', calculationResult)
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
            <h2 className="text-2xl font-bold text-gray-900">USA DDP価格計算（V3）</h2>
            <p className="text-gray-600 text-sm">詳細な計算フローを確認できます</p>
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
              onChange={(e) => setFormData({ ...formData, costJPY: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="15000"
            />
          </div>

          {/* 重量 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Package className="w-4 h-4 inline mr-1" />
              重量（kg）
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.weight_kg}
              onChange={(e) => setFormData({ ...formData, weight_kg: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0.5"
            />
          </div>

          {/* 目標利益率 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              目標利益率（%）
            </label>
            <input
              type="number"
              value={formData.targetMargin}
              onChange={(e) => setFormData({ ...formData, targetMargin: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="15"
            />
          </div>

          {/* HTSコード */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              HTSコード
            </label>
            <input
              type="text"
              value={formData.hsCode}
              onChange={(e) => setFormData({ ...formData, hsCode: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="9620.00.20.00"
            />
          </div>

          {/* 原産国 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              原産国
            </label>
            <select
              value={formData.originCountry}
              onChange={(e) => setFormData({ ...formData, originCountry: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, storeType: e.target.value as keyof typeof STORE_FEES })}
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
              value={formData.fvfRate}
              onChange={(e) => setFormData({ ...formData, fvfRate: parseFloat(e.target.value) || 0 })}
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
              onChange={(e) => setFormData({ ...formData, exchangeRate: parseFloat(e.target.value) || 0 })}
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
                価格を計算
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
