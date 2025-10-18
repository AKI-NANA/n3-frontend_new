// components/ebay-pricing/calculator-tab-ultimate.tsx
'use client'

import { Calculator, CheckCircle, XCircle, Info, HelpCircle, TrendingUp, DollarSign } from 'lucide-react'
import { STORE_FEES } from '@/app/ebay-pricing/page'
import { useState } from 'react'

interface CalculatorTabProps {
  formData: any
  onInputChange: (field: string, value: any) => void
  onCalculate: () => void
  result: any
  hsCodes: any[]
  countries: any[]
  categoryFees: any[]
}

export function CalculatorTabUltimate({
  formData,
  onInputChange,
  onCalculate,
  result,
  hsCodes,
  countries,
  categoryFees,
}: CalculatorTabProps) {
  const [calculationMode, setCalculationMode] = useState<'DDP' | 'DDU'>('DDP')

  // 消費税還付を自動計算（仕入値 + eBay手数料の還付対象から）
  const calculateTaxRefund = (costJPY: number) => {
    const estimatedEbayFees = costJPY * 0.15 // 概算15%
    return ((costJPY + estimatedEbayFees) * 10) / 110
  }

  const taxRefund = calculateTaxRefund(formData.costJPY)

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="w-7 h-7" />
          eBay DDP/DDU 価格計算エンジン
        </h2>
        <p className="text-indigo-100 text-sm mt-1">
          関税込み(DDP)と着払い(DDU)を自動判定・比較して、最適な販売戦略を提案します
        </p>
      </div>

      {/* DDP/DDU切り替え */}
      <div className="flex gap-3 bg-gray-100 p-3 rounded-lg shadow">
        <button
          onClick={() => {
            setCalculationMode('DDP')
            onInputChange('destCountry', 'US')
          }}
          className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
            calculationMode === 'DDP'
              ? 'bg-indigo-600 text-white shadow-lg transform scale-105'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="text-2xl mb-1">🇺🇸</div>
          <div>USA (DDP)</div>
          <div className="text-xs opacity-80">関税込み配送</div>
        </button>
        <button
          onClick={() => {
            setCalculationMode('DDU')
            onInputChange('destCountry', 'GB')
          }}
          className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
            calculationMode === 'DDU'
              ? 'bg-green-600 text-white shadow-lg transform scale-105'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="text-2xl mb-1">🌍</div>
          <div>その他 (DDU)</div>
          <div className="text-xs opacity-80">着払い配送</div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 入力フォーム */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-indigo-500">
            <h3 className="font-bold text-indigo-800 mb-3 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              基本情報 / Basic Information
            </h3>
            
            <InputField
              label="仕入値（円） / Purchase Cost (JPY)"
              type="number"
              value={formData.costJPY}
              onChange={(e) => onInputChange('costJPY', parseFloat(e.target.value) || 0)}
            />

            <div className="mt-3 p-3 bg-purple-50 rounded border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-purple-800">消費税還付（自動計算）</span>
                <Tooltip text="仕入値とeBay手数料の消費税還付額を自動計算します（10/110方式）" />
              </div>
              <div className="text-2xl font-bold text-purple-700">
                ¥{Math.round(taxRefund).toLocaleString()}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                還付対象: 仕入値 + eBay手数料（FVF、出品料、Payoneer等）
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <h3 className="font-bold text-blue-800 mb-3">重量・サイズ / Weight & Dimensions</h3>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <InputField
                label="長さ(cm)"
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
                label="高さ(cm)"
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

          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-green-800">関税設定 / Tariff Settings</h3>
              <Tooltip text="HSコードにより関税率が決まります。USA向けDDPでは追加でMPF/HMFが発生します" />
            </div>
            
            <select
              value={formData.hsCode}
              onChange={(e) => onInputChange('hsCode', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm mb-3"
            >
              <optgroup label="よく使うカテゴリ">
                {hsCodes
                  .filter((hs) => ['Golf', 'Toys', 'Sports', 'Trading', 'Electronics', 'Tools'].some(
                    (cat) => hs.description.includes(cat) || hs.category?.includes(cat)
                  ))
                  .map((hs) => (
                    <option key={hs.code} value={hs.code}>
                      {hs.code} - {hs.description} (関税: {(hs.base_duty * 100).toFixed(1)}%)
                    </option>
                  ))}
              </optgroup>
            </select>

            <SelectField
              label="原産国 / Country of Origin"
              value={formData.originCountry}
              onChange={(e) => onInputChange('originCountry', e.target.value)}
              options={countries.map((c) => ({
                value: c.code,
                label: `${c.name_ja} (${c.code})`,
              }))}
            />
          </div>

          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
            <h3 className="font-bold text-orange-800 mb-3">eBay設定 / eBay Settings</h3>
            
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  カテゴリ / Category
                </label>
                <Tooltip text="カテゴリごとにFVF（落札手数料）と出品料が異なります" />
              </div>
              <select
                value={formData.category}
                onChange={(e) => onInputChange('category', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {categoryFees.map((cat: any) => {
                  const fvfRate = cat.fvf_rate || 0.1315
                  const insertionFee = cat.insertion_fee || 0.35

                  return (
                    <option key={cat.category_key} value={cat.category_key}>
                      {cat.category_name} (FVF: {(fvfRate * 100).toFixed(2)}%)
                    </option>
                  )
                })}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  ストアタイプ / Store Type
                </label>
                <Tooltip text="ストアプランによりFVF割引率が変動します" />
              </div>
              <select
                value={formData.storeType}
                onChange={(e) => onInputChange('storeType', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {Object.entries(STORE_FEES).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.name} (FVF割引: -{(val.fvf_discount * 100).toFixed(1)}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={onCalculate}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-lg font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg flex items-center justify-center gap-2 text-lg"
          >
            <Calculator className="w-6 h-6" />
            価格を計算する / Calculate Price
          </button>
        </div>

        {/* 計算結果 */}
        <div className="space-y-4">
          {result && (result.success ? (
            <SuccessResultUltimate result={result} mode={calculationMode} formData={formData} />
          ) : (
            <ErrorResult result={result} />
          ))}
        </div>
      </div>
    </div>
  )
}

function InputField({ label, type = 'text', value, onChange, step }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        step={step}
        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  )
}

function SelectField({ label, value, onChange, options }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select value={value} onChange={onChange} className="w-full px-3 py-2 border rounded-lg">
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
      <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
      <div className="invisible group-hover:visible absolute z-10 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl right-0 top-6">
        {text}
      </div>
    </div>
  )
}

function SuccessResultUltimate({ result, mode, formData }: any) {
  // 判定ロジック
  const netMargin = result.profitMargin_NoRefund * 100
  const profitJPY = result.profitJPY_NoRefund
  const costJPY = formData.costJPY || 15000
  const roi = (profitJPY / costJPY) * 100
  
  // 判定基準
  let grade = 'D'
  let gradeName = ''
  let gradeColor = ''
  let gradeBg = ''
  let gradeIcon = ''
  let recommendation = ''
  let stockRecommendation = ''
  
  if (profitJPY >= 3000) {
    if (netMargin >= 35 && roi >= 100) {
      grade = 'S'
      gradeName = '優秀'
      gradeColor = 'text-yellow-600'
      gradeBg = 'bg-gradient-to-br from-yellow-100 to-orange-100 border-yellow-500'
      gradeIcon = '🌟🌟🌟'
      recommendation = '即座に仕入れるべき商品です'
      stockRecommendation = '有在庫推奨'
    } else if (netMargin >= 25 && roi >= 50) {
      grade = 'A'
      gradeName = '良好'
      gradeColor = 'text-green-600'
      gradeBg = 'bg-gradient-to-br from-green-100 to-emerald-100 border-green-500'
      gradeIcon = '⭐⭐'
      recommendation = '積極的に仕入れを検討してください'
      stockRecommendation = '有在庫推奨'
    } else if (netMargin >= 20 && roi >= 30) {
      grade = 'B'
      gradeName = '可'
      gradeColor = 'text-blue-600'
      gradeBg = 'bg-gradient-to-br from-blue-100 to-sky-100 border-blue-500'
      gradeIcon = '⭐'
      recommendation = '条件によっては仕入れ可能です'
      stockRecommendation = '無在庫 or 少量有在庫'
    } else {
      grade = 'C'
      gradeName = '要検討'
      gradeColor = 'text-orange-600'
      gradeBg = 'bg-gradient-to-br from-orange-100 to-yellow-100 border-orange-500'
      gradeIcon = '⚠️'
      recommendation = '慎重に判断してください'
      stockRecommendation = '無在庫のみ推奨'
    }
  } else {
    grade = 'D'
    gradeName = '非推奨'
    gradeColor = 'text-red-600'
    gradeBg = 'bg-gradient-to-br from-red-100 to-pink-100 border-red-500'
    gradeIcon = '❌'
    recommendation = '仕入れを控えることを推奨します'
    stockRecommendation = '仕入れ不可'
  }

  // 配送方法判定
  const shippingPolicy = result.isDDP ? 'DDP（関税込み）' : 'DDU（着払い）'
  const shippingPolicyColor = result.isDDP ? 'text-indigo-700' : 'text-green-700'
  const shippingPolicyBg = result.isDDP ? 'bg-indigo-50 border-indigo-300' : 'bg-green-50 border-green-300'

  return (
    <div className="space-y-4">
      {/* 🎯 判定結果カード */}
      <div className={`${gradeBg} border-2 rounded-xl p-4 shadow-lg`}>
        <div className="text-center mb-3">
          <div className="text-5xl mb-2">{gradeIcon}</div>
          <div className={`text-3xl font-bold ${gradeColor}`}>
            {grade}級 - {gradeName}
          </div>
          <div className="text-sm text-gray-700 mt-1">{recommendation}</div>
          <div className="mt-2 px-4 py-2 bg-white rounded-lg inline-block">
            <div className="text-xs text-gray-600">在庫判定</div>
            <div className="font-bold text-gray-800">{stockRecommendation}</div>
          </div>
        </div>

        {/* 配送方法判定 */}
        <div className={`${shippingPolicyBg} border-2 rounded-lg p-3 mb-3`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600">推奨配送ポリシー</div>
              <div className={`font-bold text-lg ${shippingPolicyColor}`}>{shippingPolicy}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-600">対象国</div>
              <div className="font-semibold">{result.isDDP ? '🇺🇸 USA' : '🌍 その他'}</div>
            </div>
          </div>
          {result.isDDP && (
            <div className="mt-2 text-xs text-indigo-600 bg-white rounded p-2">
              <strong>DDP詳細:</strong> 関税${result.breakdown.tariff} + MPF${result.breakdown.mpf} + HMF${result.breakdown.hmf}
            </div>
          )}
        </div>

        {/* スコア表示 */}
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>純利益率: <strong>{netMargin.toFixed(1)}%</strong></span>
              <span className="text-gray-500">目標: 35%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all ${netMargin >= 35 ? 'bg-green-500' : netMargin >= 25 ? 'bg-yellow-500' : netMargin >= 20 ? 'bg-blue-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min((netMargin / 35) * 100, 100)}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>ROI: <strong>{roi.toFixed(1)}%</strong></span>
              <span className="text-gray-500">目標: 100%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all ${roi >= 100 ? 'bg-green-500' : roi >= 50 ? 'bg-yellow-500' : roi >= 30 ? 'bg-blue-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min((roi / 100) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>利益額: <strong>¥{Math.round(profitJPY).toLocaleString()}</strong></span>
              <span className="text-gray-500">最低: ¥3,000</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all ${profitJPY >= 3000 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min((profitJPY / 3000) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 判定基準 */}
        <div className="mt-3 text-xs text-gray-700 bg-white rounded-lg p-3">
          <div className="font-semibold mb-1">📋 判定基準:</div>
          <div className="space-y-0.5">
            <div>🌟 S級: 利益率35%以上 & ROI100%以上 & 利益¥3,000以上</div>
            <div>⭐ A級: 利益率25%以上 & ROI50%以上 & 利益¥3,000以上</div>
            <div>⭐ B級: 利益率20%以上 & ROI30%以上 & 利益¥3,000以上</div>
            <div>⚠️ C級: 上記未満だが利益¥3,000以上</div>
            <div>❌ D級: 利益¥3,000未満</div>
          </div>
        </div>
      </div>

      {/* 💰 利益詳細 */}
      <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-yellow-500">
        <h3 className="font-bold text-yellow-800 text-lg mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          利益詳細 / Profit Details
        </h3>
        
        {/* 還付なし利益（メイン） */}
        <div className="bg-yellow-50 rounded-lg p-3 mb-3 border-2 border-yellow-400">
          <h4 className="font-bold text-gray-800 mb-2 text-sm flex items-center gap-1">
            ✅ 【標準】還付なし利益
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-xs text-gray-600">純利益（円）</div>
              <div className="text-2xl font-bold text-yellow-700">
                ¥{Math.round(profitJPY).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600">純利益（USD）</div>
              <div className="text-2xl font-bold text-yellow-700">
                ${result.profitUSD_NoRefund.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600">純利益率</div>
              <div className="text-xl font-bold text-yellow-700">
                {netMargin.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600">ROI</div>
              <div className="text-xl font-bold text-yellow-700">
                {roi.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* 還付込み利益（参考） */}
        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <h4 className="font-semibold text-green-700 mb-2 text-xs">
            【参考】還付込み利益
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-600">消費税還付:</span>
              <span className="ml-1 font-semibold text-green-600">
                ¥{Math.round(result.refundAmount).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600">利益（円）:</span>
              <span className="ml-1 font-semibold text-green-600">
                ¥{Math.round(result.profitJPY_WithRefund).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 💵 価格設定 */}
      <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-blue-500">
        <h3 className="font-bold text-blue-800 text-lg mb-3">価格設定 / Price Settings</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center bg-blue-50 p-2 rounded">
            <span className="text-gray-700">商品価格 / Product Price:</span>
            <span className="font-bold text-blue-700 text-lg">${result.productPrice}</span>
          </div>
          <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
            <span className="text-gray-600">送料 / Shipping:</span>
            <span className="font-semibold">${result.shipping}</span>
          </div>
          <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
            <span className="text-gray-600">Handling:</span>
            <span className="font-semibold">${result.handling}</span>
          </div>
          <div className="flex justify-between items-center bg-blue-100 p-2 rounded border-2 border-blue-400">
            <span className="font-bold text-gray-800">検索表示価格:</span>
            <span className="font-bold text-blue-700 text-xl">${result.searchDisplayPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 📊 コスト内訳 */}
      <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-gray-500">
        <h3 className="font-bold text-gray-800 text-lg mb-3">コスト内訳 / Cost Breakdown</h3>
        <div className="space-y-1 text-xs">
          <CostRow label="原価" value={`$${result.breakdown.costUSD}`} />
          <CostRow label="実送料" value={`$${result.breakdown.actualShipping}`} />
          <CostRow label="関税" value={`$${result.breakdown.tariff}`} />
          {result.isDDP && (
            <>
              <CostRow label="MPF（米国税関手数料）" value={`$${result.breakdown.mpf}`} />
              <CostRow label="HMF（港湾維持費）" value={`$${result.breakdown.hmf}`} />
              <CostRow label="DDP手数料" value={`$${result.breakdown.ddpFee}`} />
            </>
          )}
          <CostRow label={`FVF (${result.breakdown.fvfRate})`} value={`$${result.breakdown.fvf}`} />
          <CostRow label="ストア割引" value={`-${result.breakdown.storeDiscount}`} highlight />
          <CostRow label="Payoneer (2%)" value={`$${result.breakdown.payoneer}`} />
          <CostRow label="為替損失" value={`$${result.breakdown.exchangeLoss}`} />
          <CostRow label="国際手数料" value={`$${result.breakdown.internationalFee}`} />
          <div className="border-t-2 border-gray-300 pt-1 mt-1" />
          <CostRow label="総コスト" value={`$${result.breakdown.totalCosts}`} bold />
        </div>
      </div>
    </div>
  )
}

function CostRow({ label, value, bold = false, highlight = false }: any) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold' : ''} ${highlight ? 'text-green-600' : ''}`}>
      <span className="text-gray-600">{label}:</span>
      <span>{value}</span>
    </div>
  )
}

function ErrorResult({ result }: any) {
  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 shadow-lg">
      <div className="flex items-center gap-2 text-red-700 font-bold text-lg mb-2">
        <XCircle className="w-6 h-6" />
        計算エラー / Error
      </div>
      <p className="text-red-600 mb-3">{result.error}</p>
      {result.current_profit_no_refund && (
        <div className="text-sm text-red-500 space-y-1 bg-white rounded p-3">
          <div>現在利益: ${result.current_profit_no_refund}</div>
          <div>現在利益率: {result.current_margin}</div>
          <div>最低利益額: ${result.min_profit_amount}</div>
          <div>最低利益率: {result.min_margin}</div>
        </div>
      )}
    </div>
  )
}
