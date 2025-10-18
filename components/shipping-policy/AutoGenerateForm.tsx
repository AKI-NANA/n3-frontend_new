'use client'

import { useState } from 'react'
import { Zap, Package } from 'lucide-react'
import { autoGenerateShippingPolicy } from '@/lib/shipping/auto-policy-generator'

const WEIGHT_CATEGORIES = {
  ultra_light: { name: '超軽量級', min: 0.0, max: 0.3 },
  light: { name: '軽量級', min: 0.3, max: 0.5 },
  medium: { name: '中量級', min: 0.5, max: 1.0 },
  medium_heavy: { name: '準重量級', min: 1.0, max: 2.0 },
  heavy: { name: '重量級', min: 2.0, max: 5.0 },
}

export function AutoGenerateForm() {
  const [config, setConfig] = useState({
    weightCategory: 'medium',
    policyName: 'Auto Generated Policy - Medium',
    handlingDays: 10
  })
  
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)
  
  async function handleGenerate() {
    setGenerating(true)
    setResult(null)
    
    try {
      const category = WEIGHT_CATEGORIES[config.weightCategory as keyof typeof WEIGHT_CATEGORIES]
      
      const result = await autoGenerateShippingPolicy({
        policyName: config.policyName,
        weightCategory: config.weightCategory,
        weightMinKg: category.min,
        weightMaxKg: category.max,
        handlingDays: config.handlingDays
      })
      
      setResult(result)
      alert(`配送ポリシー作成完了！\n\nポリシーID: ${result.policyId}\n対応地域: ${result.regions}\n除外国: ${result.excludedCountries}カ国`)
      
    } catch (error: any) {
      alert(`エラー: ${error.message}`)
      console.error(error)
    } finally {
      setGenerating(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Zap className="w-8 h-8 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">自動生成</h2>
            <p className="text-sm text-gray-600">CPASS料金から自動で最適な送料を計算</p>
          </div>
        </div>
        
        {/* 重量カテゴリ選択 */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            重量カテゴリ
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(WEIGHT_CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => {
                  setConfig({
                    ...config,
                    weightCategory: key,
                    policyName: `Auto Policy - ${cat.name}`
                  })
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  config.weightCategory === key
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="font-semibold text-sm">{cat.name}</div>
                <div className="text-xs text-gray-600">{cat.min}-{cat.max}kg</div>
              </button>
            ))}
          </div>
        </div>
        
        {/* ポリシー名 */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            ポリシー名
          </label>
          <input
            type="text"
            value={config.policyName}
            onChange={(e) => setConfig({ ...config, policyName: e.target.value })}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
          />
        </div>
        
        {/* 処理時間 */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            処理時間（営業日）
          </label>
          <input
            type="number"
            value={config.handlingDays}
            onChange={(e) => setConfig({ ...config, handlingDays: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
          />
        </div>
        
        {/* 自動設定内容 */}
        <div className="bg-white border-2 border-purple-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-purple-900 mb-3">自動設定される内容</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>国際配送サービス: Economy（送料無料）+ Expedited（有料）</li>
            <li>地域別料金: 9地域に自動計算</li>
            <li>除外国: デフォルト9カ国（制裁国・APO/FPO）</li>
            <li>配送先: 全世界（除外国を除く）</li>
          </ul>
        </div>
        
        {/* 生成ボタン */}
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 font-semibold text-lg"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
              <span>自動生成中...</span>
            </>
          ) : (
            <>
              <Zap className="w-6 h-6" />
              <span>配送ポリシーを自動生成</span>
            </>
          )}
        </button>
        
        {/* 結果表示 */}
        {result && (
          <div className="mt-6 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
            <div className="font-semibold text-green-900 mb-2">生成完了！</div>
            <div className="text-sm text-green-800">
              <div>ポリシーID: {result.policyId}</div>
              <div>対応地域: {result.regions}地域</div>
              <div>除外国: {result.excludedCountries}カ国</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
