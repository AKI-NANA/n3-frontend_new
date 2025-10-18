// components/ebay-pricing/calculator-tab-dual.tsx
'use client'

import { Calculator, CheckCircle, XCircle, Info, HelpCircle, TrendingUp, DollarSign, Globe } from 'lucide-react'
import { STORE_FEES } from '@/app/ebay-pricing/page'
import { useState } from 'react'

interface CalculatorTabProps {
  formData: any
  onInputChange: (field: string, value: any) => void
  onCalculate: () => void
  resultDDP: any
  resultDDU: any
  hsCodes: any[]
  countries: any[]
  categoryFees: any[]
}

export function CalculatorTabDual({
  formData,
  onInputChange,
  onCalculate,
  resultDDP,
  resultDDU,
  hsCodes,
  countries,
  categoryFees,
}: CalculatorTabProps) {
  // 消費税還付を自動計算
  const calculateTaxRefund = (costJPY: number) => {
    const estimatedEbayFees = costJPY * 0.15
    return ((costJPY + estimatedEbayFees) * 10) / 110
  }

  const taxRefund = calculateTaxRefund(formData.costJPY)

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="w-7 h-7" />
          eBay DDP/DDU 価格計算エンジン（並行比較）
        </h2>
        <p className="text-indigo-100 text-sm mt-1">
          関税込み(DDP)と着払い(DDU)を同時計算して、最適な販売戦略を提案します
        </p>
      </div>

      {/* 入力フォーム */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-4">入力項目 / Input Parameters</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 基本情報 */}
          <div className="space-y-3">
            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
              <h4 className="font-bold text-indigo-800 mb-2 text-sm">💰 基本情報</h4>
              <InputField
                label="仕入値（円）"
                type="number"
                value={formData.costJPY}
                onChange={(e) => onInputChange('costJPY', parseFloat(e.target.value) || 0)}
              />
              <div className="mt-2 p-2 bg-purple-100 rounded text-xs">
                <div className="font-semibold text-purple-800">消費税還付（自動）</div>
                <div className="text-xl font-bold text-purple-700">
                  ¥{Math.round(taxRefund).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* 重量・サイズ */}
          <div className="space-y-3">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <h4 className="font-bold text-blue-800 mb-2 text-sm">📦 重量・サイズ</h4>
              <div className="grid grid-cols-3 gap-1 mb-2">
                <InputField
                  label="長(cm)"
                  type="number"
                  value={formData.length}
                  onChange={(e) => onInputChange('length', parseFloat(e.target.value) || 0)}
                />
                <InputField
                  label="幅(cm)"
                  type="number"
                  value={formData.width}
                  onChange={(e) => onInputChange('width', parseFloat(e.target.value) || 0)}
                />
                <InputField
                  label="高(cm)"
                  type="number"
                  value={formData.height}
                  onChange={(e) => onInputChange('height', parseFloat(e.target.value) || 0)}
                />
              </div>
              <InputField
                label="実重量(kg)"
                type="number"
                step="0.1"
                value={formData.actualWeight}
                onChange={(e) => onInputChange('actualWeight', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* 関税設定 */}
          <div className="space-y-3">
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <h4 className="font-bold text-green-800 mb-2 text-sm flex items-center gap-1">
                🌍 関税設定
                <Tooltip text="HSコードにより各国の関税率が決まります" />
              </h4>
              <div className="mb-2">
                <label className="text-xs font-medium text-gray-700">HSコード</label>
                <select
                  value={formData.hsCode}
                  onChange={(e) => onInputChange('hsCode', e.target.value)}
                  className="w-full px-2 py-1.5 border rounded text-xs"
                >
                  {hsCodes.map((hs) => (
                    <option key={hs.code} value={hs.code}>
                      {hs.code} - {hs.description?.substring(0, 20)}...
                    </option>
                  ))}
                </select>
              </div>
              <SelectField
                label="原産国"
                value={formData.originCountry}
                onChange={(e) => onInputChange('originCountry', e.target.value)}
                options={countries.map((c) => ({
                  value: c.code,
                  label: `${c.name_ja} (${c.code})`,
                }))}
              />
            </div>
          </div>

          {/* eBay設定 */}
          <div className="space-y-3">
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
              <h4 className="font-bold text-orange-800 mb-2 text-sm">🛒 eBay設定</h4>
              <div className="mb-2">
                <label className="text-xs font-medium text-gray-700">カテゴリ</label>
                <select
                  value={formData.category}
                  onChange={(e) => onInputChange('category', e.target.value)}
                  className="w-full px-2 py-1.5 border rounded text-xs"
                >
                  {categoryFees.map((cat: any) => (
                    <option key={cat.category_key} value={cat.category_key}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
              </div>
              <SelectField
                label="ストアタイプ"
                value={formData.storeType}
                onChange={(e) => onInputChange('storeType', e.target.value)}
                options={Object.entries(STORE_FEES).map(([key, val]) => ({
                  value: key,
                  label: val.name,
                }))}
              />
            </div>
          </div>
        </div>

        <button
          onClick={onCalculate}
          className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <Calculator className="w-5 h-5" />
          DDP & DDU 同時計算 / Calculate Both
        </button>
      </div>

      {/* 計算結果（DDP/DDU並行表示） */}
      {(resultDDP || resultDDU) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* DDP結果 */}
          <div>
            <h3 className="text-lg font-bold text-indigo-800 mb-3 flex items-center gap-2">
              🇺🇸 USA (DDP) - 関税込み配送
            </h3>
            {resultDDP && (resultDDP.success ? (
              <ResultCard result={resultDDP} mode="DDP" formData={formData} hsCodes={hsCodes} />
            ) : (
              <ErrorResult result={resultDDP} />
            ))}
          </div>

          {/* DDU結果 */}
          <div>
            <h3 className="text-lg font-bold text-green-800 mb-3 flex items-center gap-2">
              🌍 その他 (DDU) - 着払い配送
            </h3>
            {resultDDU && (resultDDU.success ? (
              <ResultCard result={resultDDU} mode="DDU" formData={formData} hsCodes={hsCodes} />
            ) : (
              <ErrorResult result={resultDDU} />
            ))}
          </div>
        </div>
      )}

      {/* 判定基準（修正版） */}
      <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
        <h3 className="font-bold text-gray-800 mb-2">📋 判定基準（標準15%）</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌟</span>
              <div>
                <strong>S級（優秀）:</strong> 利益率20%以上 & ROI50%以上 & 利益¥3,000以上
                <div className="text-xs text-gray-600">→ 即座に仕入れ、有在庫推奨</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              <div>
                <strong>A級（良好）:</strong> 利益率15%以上 & ROI30%以上 & 利益¥3,000以上
                <div className="text-xs text-gray-600">→ 積極的に仕入れ、有在庫推奨</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              <div>
                <strong>B級（可）:</strong> 利益率10%以上 & ROI20%以上 & 利益¥3,000以上
                <div className="text-xs text-gray-600">→ 条件次第、無在庫 or 少量有在庫</div>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <div>
                <strong>C級（要検討）:</strong> 上記未満だが利益¥3,000以上
                <div className="text-xs text-gray-600">→ 慎重に判断、無在庫のみ</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">❌</span>
              <div>
                <strong>D級（非推奨）:</strong> 利益¥3,000未満
                <div className="text-xs text-gray-600">→ 仕入れ不可</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ResultCard({ result, mode, formData, hsCodes }: any) {
  const netMargin = result.profitMargin_NoRefund * 100
  const profitJPY = result.profitJPY_NoRefund
  const costJPY = formData.costJPY || 15000
  const roi = (profitJPY / costJPY) * 100
  
  // 判定基準（15%基準に修正）
  let grade = 'D'
  let gradeName = ''
  let gradeColor = ''
  let gradeBg = ''
  let gradeIcon = ''
  let stockRecommendation = ''
  
  if (profitJPY >= 3000) {
    if (netMargin >= 20 && roi >= 50) {
      grade = 'S'
      gradeName = '優秀'
      gradeColor = 'text-yellow-600'
      gradeBg = 'bg-gradient-to-br from-yellow-100 to-orange-100 border-yellow-500'
      gradeIcon = '🌟🌟🌟'
      stockRecommendation = '有在庫推奨'
    } else if (netMargin >= 15 && roi >= 30) {
      grade = 'A'
      gradeName = '良好'
      gradeColor = 'text-green-600'
      gradeBg = 'bg-gradient-to-br from-green-100 to-emerald-100 border-green-500'
      gradeIcon = '⭐⭐'
      stockRecommendation = '有在庫推奨'
    } else if (netMargin >= 10 && roi >= 20) {
      grade = 'B'
      gradeName = '可'
      gradeColor = 'text-blue-600'
      gradeBg = 'bg-gradient-to-br from-blue-100 to-sky-100 border-blue-500'
      gradeIcon = '⭐'
      stockRecommendation = '無在庫 or 少量有在庫'
    } else {
      grade = 'C'
      gradeName = '要検討'
      gradeColor = 'text-orange-600'
      gradeBg = 'bg-gradient-to-br from-orange-100 to-yellow-100 border-orange-500'
      gradeIcon = '⚠️'
      stockRecommendation = '無在庫のみ'
    }
  } else {
    grade = 'D'
    gradeName = '非推奨'
    gradeColor = 'text-red-600'
    gradeBg = 'bg-gradient-to-br from-red-100 to-pink-100 border-red-500'
    gradeIcon = '❌'
    stockRecommendation = '仕入れ不可'
  }

  // HSコード情報取得
  const hsInfo = hsCodes.find((hs: any) => hs.code === result.hsCode)

  return (
    <div className="space-y-3">
      {/* 判定結果 */}
      <div className={`${gradeBg} border-2 rounded-lg p-3 shadow-lg`}>
        <div className="text-center">
          <div className="text-4xl mb-1">{gradeIcon}</div>
          <div className={`text-2xl font-bold ${gradeColor}`}>{grade}級 - {gradeName}</div>
          <div className="mt-2 px-3 py-1 bg-white rounded inline-block text-sm">
            <div className="font-bold text-gray-800">{stockRecommendation}</div>
          </div>
        </div>

        {/* スコア */}
        <div className="mt-3 space-y-1.5">
          <ScoreBar label="純利益率" value={netMargin} target={20} unit="%" />
          <ScoreBar label="ROI" value={roi} target={50} unit="%" />
          <ScoreBar label="利益額" value={profitJPY} target={3000} unit="円" />
        </div>
      </div>

      {/* 関税詳細（新規追加） */}
      <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-3">
        <h4 className="font-bold text-purple-800 mb-2 text-sm flex items-center gap-1">
          🌍 関税詳細 / Tariff Details
          <Tooltip text="各国の関税率と手数料の内訳です" />
        </h4>
        
        <div className="space-y-2 text-xs">
          {/* HSコード情報 */}
          <div className="bg-white rounded p-2">
            <div className="font-semibold text-gray-700">HSコード</div>
            <div className="font-mono text-sm">{result.hsCode}</div>
            {hsInfo && (
              <div className="text-gray-600 text-xs mt-1">{hsInfo.description}</div>
            )}
          </div>

          {/* 関税率 */}
          <div className="bg-white rounded p-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-gray-600">基本関税率</div>
                <div className="font-bold text-purple-700">
                  {hsInfo ? (hsInfo.base_duty * 100).toFixed(2) : '0.00'}%
                </div>
              </div>
              {hsInfo?.section301 && formData.originCountry === 'CN' && (
                <div>
                  <div className="text-gray-600">Section 301</div>
                  <div className="font-bold text-red-600">
                    +{((hsInfo.section301_rate || 0.25) * 100).toFixed(0)}%
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 実際の関税額 */}
          <div className="bg-white rounded p-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">関税額 (Tariff)</span>
              <span className="font-bold text-purple-700 text-sm">${result.breakdown.tariff}</span>
            </div>
          </div>

          {/* DDP追加手数料 */}
          {mode === 'DDP' && (
            <>
              <div className="bg-white rounded p-2">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">MPF (0.3464%、最低$27.75〜最大$538.40)</span>
                    <span className="font-semibold text-indigo-700">${result.breakdown.mpf}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">HMF (0.125%、海上輸送時)</span>
                    <span className="font-semibold text-indigo-700">${result.breakdown.hmf}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">DDP手数料 (通関代行)</span>
                    <span className="font-semibold text-indigo-700">${result.breakdown.ddpFee}</span>
                  </div>
                </div>
              </div>
              <div className="bg-indigo-100 rounded p-2 border border-indigo-300">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-indigo-800">DDP合計</span>
                  <span className="font-bold text-indigo-800 text-base">
                    ${(parseFloat(result.breakdown.tariff) + parseFloat(result.breakdown.mpf) + parseFloat(result.breakdown.hmf) + parseFloat(result.breakdown.ddpFee)).toFixed(2)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 利益詳細 */}
      <div className="bg-white rounded-lg shadow p-3 border-l-4 border-yellow-500">
        <h4 className="font-bold text-yellow-800 mb-2 text-sm">💰 利益詳細</h4>
        
        <div className="bg-yellow-50 rounded p-2 mb-2 border border-yellow-300">
          <div className="text-xs text-gray-600 mb-1">【標準】還付なし利益</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-600">純利益（円）</div>
              <div className="text-xl font-bold text-yellow-700">¥{Math.round(profitJPY).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-600">純利益率</div>
              <div className="text-xl font-bold text-yellow-700">{netMargin.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded p-2 border border-green-200">
          <div className="text-xs text-gray-600 mb-1">【参考】還付込み利益</div>
          <div className="text-xs">
            <span className="text-gray-600">還付額:</span>
            <span className="ml-1 font-semibold text-green-600">¥{Math.round(result.refundAmount).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 価格設定 */}
      <div className="bg-white rounded-lg shadow p-3 border-l-4 border-blue-500">
        <h4 className="font-bold text-blue-800 mb-2 text-sm">💵 価格設定</h4>
        <div className="space-y-1 text-xs">
          <PriceRow label="商品価格" value={`$${result.productPrice}`} />
          <PriceRow label="送料" value={`$${result.shipping}`} />
          <PriceRow label="Handling" value={`$${result.handling}`} />
          <div className="border-t pt-1 mt-1">
            <PriceRow label="検索表示価格" value={`$${result.searchDisplayPrice.toFixed(2)}`} bold />
          </div>
        </div>
      </div>

      {/* コスト内訳 */}
      <div className="bg-white rounded-lg shadow p-3 border-l-4 border-gray-500">
        <h4 className="font-bold text-gray-800 mb-2 text-sm">📊 コスト内訳</h4>
        <div className="space-y-0.5 text-xs">
          <CostRow label="原価" value={`$${result.breakdown.costUSD}`} />
          <CostRow label="実送料" value={`$${result.breakdown.actualShipping}`} />
          <CostRow label={`FVF (${result.breakdown.fvfRate})`} value={`$${result.breakdown.fvf}`} />
          <CostRow label="Payoneer (2%)" value={`$${result.breakdown.payoneer}`} />
          <CostRow label="為替損失 (3%)" value={`$${result.breakdown.exchangeLoss}`} />
          <CostRow label="国際手数料 (1.5%)" value={`$${result.breakdown.internationalFee}`} />
          <div className="border-t pt-1 mt-1">
            <CostRow label="総コスト" value={`$${result.breakdown.totalCosts}`} bold />
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoreBar({ label, value, target, unit }: any) {
  const percentage = Math.min((value / target) * 100, 100)
  const color = value >= target ? 'bg-green-500' : value >= target * 0.75 ? 'bg-yellow-500' : value >= target * 0.5 ? 'bg-blue-500' : 'bg-red-500'
  
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span>{label}: <strong>{unit === '円' ? `¥${Math.round(value).toLocaleString()}` : `${value.toFixed(1)}${unit}`}</strong></span>
        <span className="text-gray-500">目標: {unit === '円' ? `¥${target.toLocaleString()}` : `${target}${unit}`}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

function InputField({ label, type = 'text', value, onChange, step }: any) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-0.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        step={step}
        className="w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  )
}

function SelectField({ label, value, onChange, options }: any) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-0.5">{label}</label>
      <select value={value} onChange={onChange} className="w-full px-2 py-1.5 border rounded text-xs">
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function Tooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-block">
      <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
      <div className="invisible group-hover:visible absolute z-10 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl right-0 top-5">
        {text}
      </div>
    </div>
  )
}

function PriceRow({ label, value, bold = false }: any) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold text-sm' : ''}`}>
      <span className="text-gray-600">{label}</span>
      <span>{value}</span>
    </div>
  )
}

function CostRow({ label, value, bold = false }: any) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold' : ''}`}>
      <span className="text-gray-600">{label}</span>
      <span>{value}</span>
    </div>
  )
}

function ErrorResult({ result }: any) {
  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 shadow">
      <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
        <XCircle className="w-5 h-5" />
        計算エラー
      </div>
      <p className="text-red-600 text-sm">{result.error}</p>
    </div>
  )
}
