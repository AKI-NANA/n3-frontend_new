"use client"

import { useState } from 'react'
import { Sliders, RotateCcw, Save, TrendingUp, ShoppingCart, Users, Shield, Zap } from 'lucide-react'
import { ScoringWeights, DEFAULT_WEIGHTS, SCORING_PRESETS } from '@/lib/research/scoring-engine'

interface ScoringWeightAdjusterProps {
  weights: ScoringWeights
  onChange: (weights: ScoringWeights) => void
  onApply?: () => void
}

export default function ScoringWeightAdjuster({ weights, onChange, onApply }: ScoringWeightAdjusterProps) {
  const [localWeights, setLocalWeights] = useState<ScoringWeights>(weights)
  const [showPresets, setShowPresets] = useState(false)

  // 重みの合計が100になるように自動調整
  const handleWeightChange = (key: keyof ScoringWeights, value: number) => {
    const newWeights = { ...localWeights, [key]: value }
    
    // 合計を計算
    const total = Object.values(newWeights).reduce((sum, val) => sum + val, 0)
    
    // 100を超えた場合、他の値を proportionally に調整
    if (total > 100) {
      const excess = total - 100
      const otherKeys = Object.keys(newWeights).filter(k => k !== key) as Array<keyof ScoringWeights>
      const otherTotal = otherKeys.reduce((sum, k) => sum + newWeights[k], 0)
      
      otherKeys.forEach(k => {
        const proportion = newWeights[k] / otherTotal
        newWeights[k] = Math.max(0, Math.round(newWeights[k] - (excess * proportion)))
      })
    }
    
    setLocalWeights(newWeights)
    onChange(newWeights)
  }

  const handlePresetSelect = (presetKey: keyof typeof SCORING_PRESETS) => {
    const preset = SCORING_PRESETS[presetKey]
    setLocalWeights(preset.weights)
    onChange(preset.weights)
    setShowPresets(false)
  }

  const handleReset = () => {
    setLocalWeights(DEFAULT_WEIGHTS)
    onChange(DEFAULT_WEIGHTS)
  }

  const total = Object.values(localWeights).reduce((sum, val) => sum + val, 0)

  const weightConfigs = [
    {
      key: 'profitRate' as keyof ScoringWeights,
      label: '利益率重視度',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'DDP計算後の純利益率を重視'
    },
    {
      key: 'salesVolume' as keyof ScoringWeights,
      label: '売上数重視度',
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: '過去の販売実績を重視'
    },
    {
      key: 'competition' as keyof ScoringWeights,
      label: '競合状況重視度',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: '競合の少なさを重視'
    },
    {
      key: 'riskLevel' as keyof ScoringWeights,
      label: 'リスク回避度',
      icon: Shield,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: 'Section 301・関税リスクを回避'
    },
    {
      key: 'trendScore' as keyof ScoringWeights,
      label: 'トレンド重視度',
      icon: Zap,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      description: '市場トレンドを重視'
    },
  ]

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-slate-200">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Sliders className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">スコアリング調整</h3>
            <p className="text-sm text-slate-600">各指標の重要度を調整してスコアを最適化</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            プリセット
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            リセット
          </button>
        </div>
      </div>

      {/* プリセット選択 */}
      {showPresets && (
        <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-sm font-semibold text-slate-700 mb-3">プリセットを選択</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(SCORING_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => handlePresetSelect(key as keyof typeof SCORING_PRESETS)}
                className="p-3 bg-white hover:bg-blue-50 border-2 border-slate-200 hover:border-blue-500 rounded-lg text-left transition-all"
              >
                <div className="font-semibold text-slate-800 mb-1">{preset.name}</div>
                <div className="text-xs text-slate-600">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* スライダー */}
      <div className="space-y-6 mb-6">
        {weightConfigs.map((config) => {
          const Icon = config.icon
          const value = localWeights[config.key]
          
          return (
            <div key={config.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 ${config.bgColor} rounded`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      {config.label}
                    </label>
                    <p className="text-xs text-slate-500">{config.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${config.color}`}>{value}</span>
                  <span className="text-sm text-slate-500">%</span>
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={value}
                  onChange={(e) => handleWeightChange(config.key, parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  style={{
                    background: `linear-gradient(to right, ${config.color.replace('text-', 'rgb(var(--')} 0%, ${config.color.replace('text-', 'rgb(var(--')} ${value}%, rgb(226, 232, 240) ${value}%, rgb(226, 232, 240) 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 合計表示 */}
      <div className={`p-4 rounded-lg border-2 ${
        total === 100 ? 'bg-green-50 border-green-500' : 'bg-yellow-50 border-yellow-500'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">合計</span>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${
              total === 100 ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {total}
            </span>
            <span className="text-sm text-slate-600">/ 100</span>
          </div>
        </div>
        {total !== 100 && (
          <p className="text-xs text-yellow-700 mt-2">
            ⚠️ 合計が100になるように調整してください
          </p>
        )}
      </div>

      {/* 適用ボタン */}
      {onApply && (
        <button
          onClick={onApply}
          disabled={total !== 100}
          className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-lg font-semibold transition-all shadow-lg disabled:shadow-none flex items-center justify-center gap-2"
        >
          <Sliders className="w-5 h-5" />
          スコアリングを適用
        </button>
      )}

      {/* ヒント */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>💡 ヒント:</strong> 利益率とリスク回避を高めに設定すると、安定した商品が上位に表示されます。
          トレンド重視にすると、話題の商品を優先的に見つけることができます。
        </p>
      </div>
    </div>
  )
}
