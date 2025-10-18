// components/ebay-pricing/calculator-tab-final.tsx
'use client'

import { Calculator, CheckCircle, XCircle, Info, HelpCircle } from 'lucide-react'
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

export function CalculatorTabFinal({
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
    // eBay手数料の還付対象: FVF、出品料、PayPal/Payoneer手数料
    const estimatedEbayFees = costJPY * 0.15 // 概算15%
    return ((costJPY + estimatedEbayFees) * 10) / 110
  }

  const taxRefund = calculateTaxRefund(formData.costJPY)

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-gray-800">価格計算 / Price Calculator</h2>

      {/* DDP/DDU切り替え */}
      <div className="flex gap-3 bg-gray-100 p-3 rounded-lg">
        <button
          onClick={() => {
            setCalculationMode('DDP')
            onInputChange('destCountry', 'US')
          }}
          className={`flex-1 py-2 rounded-lg font-semibold transition-colors text-sm ${
            calculationMode === 'DDP'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          🇺🇸 USA (DDP) - 関税込み配送
        </button>
        <button
          onClick={() => {
            setCalculationMode('DDU')
            onInputChange('destCountry', 'GB')
          }}
          className={`flex-1 py-2 rounded-lg font-semibold transition-colors text-sm ${
            calculationMode === 'DDU'
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          🌍 その他 (DDU) - 着払い配送
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 入力フォーム */}
        <div className="space-y-3">
          <InputField
            label="仕入値（円） / Purchase Cost (JPY)"
            type="number"
            value={formData.costJPY}
            onChange={(e) => onInputChange('costJPY', parseFloat(e.target.value) || 0)}
          />

          <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
            <h3 className="font-semibold mb-2 text-sm text-blue-800">
              容積重量計算 / Volumetric Weight
            </h3>
            <div className="grid grid-cols-3 gap-2 mb-2">
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

          <div className="border border-green-200 rounded-lg p-3 bg-green-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-green-800">HSコード / HS Code</h3>
              <Tooltip text="USA関税率を決定する重要コード。実運用では商品説明から自動選択されます。" />
            </div>
            <select
              value={formData.hsCode}
              onChange={(e) => onInputChange('hsCode', e.target.value)}
              className="w-full px-2 py-2 border rounded-lg text-sm"
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
              <optgroup label="その他">
                {hsCodes
                  .filter((hs) => !['Golf', 'Toys', 'Sports', 'Trading', 'Electronics', 'Tools'].some(
                    (cat) => hs.description.includes(cat)
                  ))
                  .map((hs) => (
                    <option key={hs.code} value={hs.code}>
                      {hs.code} - {hs.description} (関税: {(hs.base_duty * 100).toFixed(1)}%)
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          <SelectField
            label="原産国 / Country of Origin"
            value={formData.originCountry}
            onChange={(e) => onInputChange('originCountry', e.target.value)}
            options={countries.map((c) => ({
              value: c.code,
              label: `${c.name_ja} / ${c.name} (${c.code})`,
            }))}
          />

          {calculationMode === 'DDP' ? (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-indigo-800">
                対象国 / Destination: 🇺🇸 USA (DDP配送)
              </p>
              <p className="text-xs text-indigo-600 mt-1">
                関税・諸費用を販売者が負担 / Seller pays all duties and fees
              </p>
            </div>
          ) : (
            <SelectField
              label="対象国 / Destination Country (DDU)"
              value={formData.destCountry}
              onChange={(e) => onInputChange('destCountry', e.target.value)}
              options={[
                { value: 'GB', label: '🇬🇧 UK / イギリス' },
                { value: 'DE', label: '🇩🇪 Germany / ドイツ' },
                { value: 'FR', label: '🇫🇷 France / フランス' },
                { value: 'CA', label: '🇨🇦 Canada / カナダ' },
                { value: 'AU', label: '🇦🇺 Australia / オーストラリア' },
                { value: 'HK', label: '🇭🇰 Hong Kong / 香港' },
              ]}
            />
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-700">
                eBayカテゴリ / Category
              </label>
              <Tooltip text="カテゴリごとにFVF（落札手数料）と出品料が異なります" />
            </div>
            <select
              value={formData.category}
              onChange={(e) => onInputChange('category', e.target.value)}
              className="w-full px-2 py-2 border rounded-lg text-sm"
            >
              {categoryFees.map((cat: any) => {
                const fvfRate = cat.fvf_rate || 0.1315
                const insertionFee = cat.insertion_fee || 0.35

                return (
                  <option key={cat.category_key} value={cat.category_key}>
                    {cat.category_name} (FVF: {(fvfRate * 100).toFixed(2)}%, 出品料: $
                    {insertionFee.toFixed(2)})
                  </option>
                )
              })}
            </select>
            <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded">
              <strong>FVF</strong> = 落札手数料（販売価格の%） | <strong>出品料</strong> = 1出品あたりの固定費用
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-700">
                ストアタイプ / Store Type
              </label>
              <Tooltip text="ストアプランにより1出品あたりのFVFが変動します" />
            </div>
            <select
              value={formData.storeType}
              onChange={(e) => onInputChange('storeType', e.target.value)}
              className="w-full px-2 py-2 border rounded-lg text-sm"
            >
              {Object.entries(STORE_FEES).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.name} (月額: ${val.monthly_fee}/月, FVF: -{(val.fvf_discount * 100).toFixed(1)}%)
                </option>
              ))}
            </select>
            <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded">
              ストアプランにより出品手数料が変動（例: Basic = -4%）
            </div>
          </div>

          <div className="border border-purple-200 rounded-lg p-3 bg-purple-50">
            <h3 className="font-semibold mb-2 text-sm text-purple-800">
              消費税還付（自動計算） / Tax Refund (Auto)
            </h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>仕入値:</span>
                <span className="font-mono">¥{formData.costJPY.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>還付対象手数料（概算）:</span>
                <span className="font-mono">¥{Math.round(formData.costJPY * 0.15).toLocaleString()}</span>
              </div>
              <div className="border-t border-purple-300 pt-1 flex justify-between font-semibold text-purple-700">
                <span>還付額:</span>
                <span className="font-mono">¥{Math.round(taxRefund).toLocaleString()}</span>
              </div>
            </div>
            <p className="text-xs text-purple-600 mt-2">
              計算式: (仕入値 + eBay手数料) × 10/110
              <br />
              還付対象: FVF、出品料、Payoneer手数料
            </p>
          </div>

          <button
            onClick={onCalculate}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <Calculator className="w-5 h-5" />
            計算実行 / Calculate
          </button>
        </div>

        {/* 計算結果 */}
        <div className="space-y-3">
          {result && (result.success ? <SuccessResult result={result} mode={calculationMode} formData={formData} /> : <ErrorResult result={result} />)}
        </div>
      </div>
    </div>
  )
}

function InputField({ label, type = 'text', value, onChange, step }: any) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        step={step}
        className="w-full px-2 py-1.5 border rounded-lg text-sm"
      />
    </div>
  )
}

function SelectField({ label, value, onChange, options }: any) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <select value={value} onChange={onChange} className="w-full px-2 py-2 border rounded-lg text-sm">
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
      <div className="invisible group-hover:visible absolute z-10 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg right-0 top-6">
        {text}
      </div>
    </div>
  )
}

function ResultRow({ label, labelEn, value, highlight, color = 'text-gray-800', note, explanation }: any) {
  return (
    <div className={`flex justify-between items-start ${highlight ? 'font-bold' : ''}`}>
      <div className="flex-1">
        <span className="text-gray-600 text-xs block">{label}</span>
        {labelEn && <span className="text-gray-500 text-xs block">{labelEn}</span>}
        {explanation && <span className="text-gray-500 text-xs block italic">{explanation}</span>}
      </div>
      <div className="text-right">
        <span className={`${color} text-sm`}>{value}</span>
        {note && <span className="text-xs text-gray-500 ml-1">{note}</span>}
      </div>
    </div>
  )
}

function SuccessResult({ result, mode, formData }: any) {
  return (
    <div className="space-y-3">
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-center gap-2 text-green-700 font-bold text-base mb-2">
          <CheckCircle className="w-4 h-4" />
          計算成功 / Success
        </div>
        <div className="space-y-1 text-xs">
          <ResultRow label="商品価格" labelEn="Product Price" value={`$${result.productPrice}`} highlight />
          <ResultRow label="送料（固定）" labelEn="Shipping (Fixed)" value={`$${result.shipping}`} />
          <ResultRow
            label="Handling"
            labelEn={result.isDDP ? 'DDP差額吸収' : 'DDU部分吸収'}
            explanation={result.isDDP ? 'DDP関税を部分吸収' : 'DDU利益率改善'}
            value={`$${result.handling}`}
          />
          <ResultRow
            label="検索表示価格"
            labelEn="Display Price"
            value={`$${result.searchDisplayPrice.toFixed(2)}`}
            highlight
            color="text-blue-600"
          />
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <h3 className="font-bold text-yellow-800 text-sm mb-2">
          💰 利益 / Profit
        </h3>
        
        {/* 成績判定 - 新規追加 */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 rounded-lg p-3">
          <h3 className="font-bold text-purple-800 text-sm mb-2 flex items-center gap-2">
            <span>🎯</span>
            成績判定 / Performance Grade
          </h3>
          {(() => {
            const netMargin = result.profitMargin_NoRefund * 100
            const costJPY = formData.costJPY || 15000
            const roi = (result.profitJPY_NoRefund / costJPY) * 100
            
            let grade = 'C'
            let label = ''
            let color = ''
            let bgColor = ''
            let icon = ''
            let message = ''
            let barWidth = 0
            
            if (netMargin >= 35 && roi >= 100) {
              grade = 'S'
              label = '優秀'
              color = 'text-yellow-600'
              bgColor = 'bg-yellow-100 border-yellow-400'
              icon = '🌟🌟🌟'
              message = '即座に仕入れるべき商品です'
              barWidth = 100
            } else if (netMargin >= 25 && roi >= 50) {
              grade = 'A'
              label = '良好'
              color = 'text-green-600'
              bgColor = 'bg-green-100 border-green-400'
              icon = '⭐⭐'
              message = '仕入れ推奨です'
              barWidth = 75
            } else if (netMargin >= 20 && roi >= 30) {
              grade = 'B'
              label = '要改善'
              color = 'text-yellow-600'
              bgColor = 'bg-yellow-100 border-yellow-400'
              icon = '⚠️'
              message = '慎重に判断してください'
              barWidth = 50
            } else {
              grade = 'C'
              label = '非推奨'
              color = 'text-red-600'
              bgColor = 'bg-red-100 border-red-400'
              icon = '❌'
              message = '仕入れを控えることを推奨'
              barWidth = 25
            }
            
            return (
              <div className="space-y-2">
                <div className={`${bgColor} border-2 rounded-lg p-3 text-center`}>
                  <div className="text-3xl mb-1">{icon}</div>
                  <div className={`text-xl font-bold ${color}`}>{grade}級 - {label}</div>
                  <div className="text-xs text-gray-600 mt-1">{message}</div>
                </div>
                
                {/* プログレスバー */}
                <div className="space-y-1 text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>純利益率: {netMargin.toFixed(1)}%</span>
                      <span className="text-gray-500">目標: 35%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${netMargin >= 35 ? 'bg-green-500' : netMargin >= 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min((netMargin / 35) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>ROI: {roi.toFixed(1)}%</span>
                      <span className="text-gray-500">目標: 100%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${roi >= 100 ? 'bg-green-500' : roi >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min((roi / 100) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* 判定基準 */}
                <div className="text-xs text-gray-600 bg-white rounded p-2">
                  <div className="font-semibold mb-1">判定基準:</div>
                  <div className="space-y-0.5">
                    <div>🌟 S級: 純利益率35%以上 & ROI100%以上</div>
                    <div>⭐ A級: 純利益率25%以上 & ROI50%以上</div>
                    <div>⚠️ B級: 純利益率20%以上 & ROI30%以上</div>
                    <div>❌ C級: 上記未満</div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>

        {/* 還付なし利益 - 目立たせる */}
        <div className="bg-white rounded p-2 mb-2 border-2 border-yellow-400">
          <h4 className="font-bold text-gray-800 mb-1 text-sm">
            ✅ 【標準】還付なし利益 / Without Refund
          </h4>
          <div className="space-y-0.5 text-xs">
            <ResultRow 
              label="純利益（USD）" 
              labelEn="Net Profit (USD)" 
              value={`${result.profitUSD_NoRefund.toFixed(2)}`} 
              highlight 
              color="text-yellow-700"
            />
            <ResultRow
              label="純利益（円）"
              labelEn="Net Profit (JPY)"
              value={`¥${Math.round(result.profitJPY_NoRefund).toLocaleString()}`}
              highlight
              color="text-yellow-700"
            />
            <div className="border-t border-yellow-300 pt-1 mt-1" />
            <ResultRow
              label="純利益率"
              labelEn="Net Margin"
              explanation="売上に対する利益の割合"
              value={`${(result.profitMargin_NoRefund * 100).toFixed(1)}%`}
              highlight
              color="text-yellow-700"
            />
            <ResultRow
              label="ROI"
              labelEn="Return on Investment"
              explanation="投資に対するリターン"
              value={`${((result.profitJPY_NoRefund / (result.costJPY || 15000)) * 100).toFixed(1)}%`}
              color="text-gray-600"
            />
            <ResultRow
              label="マークアップ"
              labelEn="Markup Rate"
              explanation="原価に対する値上げ率"
              value={`${(((result.totalRevenue * result.exchangeRate) - (result.costJPY || 15000)) / (result.costJPY || 15000) * 100).toFixed(1)}%`}
              color="text-gray-600"
            />
          </div>
        </div>

        {/* 還付込み利益 - 控えめに */}
        <div className="bg-green-50 rounded p-2 border border-green-200">
          <h4 className="font-semibold text-green-700 mb-1 text-xs">
            【参考】還付込み利益 / With Refund
          </h4>
          <div className="space-y-0.5 text-xs">
            <ResultRow
              label="消費税還付額"
              labelEn="Tax Refund"
              value={`¥${Math.round(result.refundAmount).toLocaleString()}`}
              color="text-green-600"
            />
            <ResultRow
              label="利益（USD）"
              labelEn="Profit (USD)"
              value={`$${result.profitUSD_WithRefund.toFixed(2)}`}
              color="text-green-600"
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <h3 className="font-bold text-gray-800 mb-2 text-sm">コスト内訳 / Cost Breakdown</h3>
        <div className="space-y-0.5 text-xs">
          <ResultRow 
            label="原価" 
            labelEn="Cost" 
            explanation="仕入値を為替レートで換算"
            value={`$${result.breakdown.costUSD}`} 
          />
          <ResultRow 
            label="実送料" 
            labelEn="Actual Shipping" 
            explanation="実際の配送費用"
            value={`$${result.breakdown.actualShipping}`} 
          />
          <ResultRow 
            label="関税" 
            labelEn="Tariff" 
            explanation="HSコードに基づく輸入関税"
            value={`$${result.breakdown.tariff}`} 
          />
          {result.isDDP && (
            <>
              <ResultRow 
                label="MPF" 
                labelEn="Merchandise Processing Fee" 
                explanation="商品処理手数料（米国税関）"
                value={`$${result.breakdown.mpf}`} 
              />
              <ResultRow 
                label="HMF" 
                labelEn="Harbor Maintenance Fee" 
                explanation="港湾維持費（海上輸送時）"
                value={`$${result.breakdown.hmf}`} 
              />
              <ResultRow 
                label="DDP手数料" 
                labelEn="DDP Service Fee" 
                explanation="通関代行サービス手数料"
                value={`$${result.breakdown.ddpFee}`} 
              />
            </>
          )}
          <ResultRow
            label={`FVF (${result.breakdown.fvfRate})`}
            labelEn="Final Value Fee"
            explanation="eBay落札手数料"
            value={`$${result.breakdown.fvf}`}
          />
          <ResultRow 
            label="ストア割引" 
            labelEn="Store Discount" 
            explanation="ストアプラン割引"
            value={`-${result.breakdown.storeDiscount}`} 
            color="text-green-600" 
          />
          <ResultRow 
            label="Payoneer" 
            labelEn="Payment Processing" 
            explanation="決済手数料（1%）"
            value={`$${result.breakdown.payoneer}`} 
          />
          <ResultRow 
            label="為替損失" 
            labelEn="Exchange Loss" 
            explanation="為替変動リスク"
            value={`$${result.breakdown.exchangeLoss}`} 
          />
          <ResultRow 
            label="海外手数料" 
            labelEn="International Fee" 
            explanation="国際取引手数料"
            value={`$${result.breakdown.internationalFee}`} 
          />
          <ResultRow 
            label="総コスト" 
            labelEn="Total Cost" 
            value={`$${result.breakdown.totalCosts}`} 
            highlight 
          />
        </div>
      </div>
    </div>
  )
}

function ErrorResult({ result }: any) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-center gap-2 text-red-700 font-bold text-base mb-2">
        <XCircle className="w-5 h-5" />
        計算エラー / Error
      </div>
      <p className="text-red-600 text-sm mb-2">{result.error}</p>
      {result.current_profit_no_refund && (
        <div className="text-xs text-red-500 space-y-1">
          <div>現在利益: ${result.current_profit_no_refund}</div>
          <div>現在利益率: {result.current_margin}</div>
          <div>最低利益額: ${result.min_profit_amount}</div>
          <div>最低利益率: {result.min_margin}</div>
        </div>
      )}
    </div>
  )
}
