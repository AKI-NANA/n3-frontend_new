// components/ebay-pricing/calculator-tab-improved.tsx
'use client'

import { Calculator, CheckCircle, XCircle, Info } from 'lucide-react'
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

export function CalculatorTabImproved({
  formData,
  onInputChange,
  onCalculate,
  result,
  hsCodes,
  countries,
  categoryFees,
}: CalculatorTabProps) {
  const [calculationMode, setCalculationMode] = useState<'DDP' | 'DDU'>('DDP')

  // 消費税還付を自動計算
  const calculateTaxRefund = (costJPY: number, refundableFeesJPY: number) => {
    return ((costJPY + refundableFeesJPY) * 10) / 110
  }

  const taxRefund = calculateTaxRefund(formData.costJPY, formData.refundableFeesJPY || 0)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">価格計算 / Price Calculator</h2>

      {/* DDP/DDU切り替え */}
      <div className="flex gap-4 bg-gray-100 p-4 rounded-lg">
        <button
          onClick={() => {
            setCalculationMode('DDP')
            onInputChange('destCountry', 'US')
          }}
          className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
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
          className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
            calculationMode === 'DDU'
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          🌍 その他 (DDU) - 着払い配送
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 入力フォーム */}
        <div className="space-y-4">
          <InputField
            label="仕入値（円） / Purchase Cost (JPY)"
            type="number"
            value={formData.costJPY}
            onChange={(e) => onInputChange('costJPY', parseFloat(e.target.value) || 0)}
          />

          <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
            <h3 className="font-semibold mb-2 text-blue-800">
              容積重量計算 / Volumetric Weight
            </h3>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <InputField
                label="長さ(cm) / Length"
                type="number"
                value={formData.length}
                onChange={(e) => onInputChange('length', parseFloat(e.target.value) || 0)}
              />
              <InputField
                label="幅(cm) / Width"
                type="number"
                value={formData.width}
                onChange={(e) => onInputChange('width', parseFloat(e.target.value) || 0)}
              />
              <InputField
                label="高さ(cm) / Height"
                type="number"
                value={formData.height}
                onChange={(e) => onInputChange('height', parseFloat(e.target.value) || 0)}
              />
            </div>
            <InputField
              label="実重量(kg) / Actual Weight"
              type="number"
              step="0.1"
              value={formData.actualWeight}
              onChange={(e) => onInputChange('actualWeight', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
            <h3 className="font-semibold mb-2 text-green-800">
              HSコード / HS Code
              <span className="text-xs text-green-600 ml-2">
                (関税率に影響 / Affects tariff rate)
              </span>
            </h3>
            <select
              value={formData.hsCode}
              onChange={(e) => onInputChange('hsCode', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg mb-2"
            >
              {hsCodes.map((hs) => (
                <option key={hs.code} value={hs.code}>
                  {hs.code} - {hs.description} (関税: {(hs.base_duty * 100).toFixed(2)}%)
                </option>
              ))}
            </select>
            <div className="flex items-start gap-2 text-xs text-green-700 bg-green-100 p-2 rounded">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                実際の運用では、商品説明から最適なHSコードが自動選択されます。
                <br />
                In production, optimal HS code is auto-selected from product description.
              </p>
            </div>
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
            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-indigo-800">
                対象国 / Destination: 🇺🇸 USA (DDP配送)
              </p>
              <p className="text-xs text-indigo-600 mt-1">
                関税・諸費用を販売者が負担
                <br />
                Seller pays all duties and fees
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
            <label className="block text-xs font-medium text-gray-700 mb-1">
              eBayカテゴリ / Category
              <span className="text-xs text-gray-500 ml-2">
                (カテゴリ別手数料 / Category-specific fees)
              </span>
            </label>
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
                    {cat.category_name} (FVF: {(fvfRate * 100).toFixed(2)}%, 出品料: $
                    {insertionFee.toFixed(2)})
                  </option>
                )
              })}
            </select>
            <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
              <strong>FVF</strong> = Final Value Fee (落札手数料): 販売価格に対する手数料
              <br />
              <strong>出品料</strong> = Insertion Fee: 1出品あたりの固定費用
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              ストアタイプ / Store Type
              <span className="text-xs text-gray-500 ml-2">
                (プラン別の手数料率 / Plan-specific fee rates)
              </span>
            </label>
            <select
              value={formData.storeType}
              onChange={(e) => onInputChange('storeType', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              {Object.entries(STORE_FEES).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.name} (月額: ${val.monthly_fee}/月, FVF割引: -
                  {(val.fvf_discount * 100).toFixed(2)}%)
                </option>
              ))}
            </select>
            <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
              ストアプランにより、1出品あたりのFVFが異なります
              <br />
              FVF per listing varies by store plan
            </div>
          </div>

          <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
            <h3 className="font-semibold mb-2 text-purple-800">
              消費税還付（自動計算） / Tax Refund (Auto-calculated)
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>仕入値 / Purchase Cost:</span>
                <span className="font-mono">¥{formData.costJPY.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>還付対象手数料 / Refundable Fees:</span>
                <span className="font-mono">¥{(formData.refundableFeesJPY || 0).toLocaleString()}</span>
              </div>
              <div className="border-t border-purple-300 pt-2 flex justify-between font-semibold text-purple-700">
                <span>還付額 / Refund Amount:</span>
                <span className="font-mono">¥{Math.round(taxRefund).toLocaleString()}</span>
              </div>
            </div>
            <p className="text-xs text-purple-600 mt-2">
              計算式: (仕入値 + 還付対象手数料) × 10/110
              <br />
              Formula: (Cost + Refundable Fees) × 10/110
            </p>
          </div>

          <button
            onClick={onCalculate}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <Calculator className="w-5 h-5" />
            計算実行 / Calculate
          </button>
        </div>

        {/* 計算結果 */}
        <div className="space-y-4">
          {result && (result.success ? <SuccessResult result={result} mode={calculationMode} /> : <ErrorResult result={result} />)}
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
        className="w-full px-3 py-2 border rounded-lg text-sm"
      />
    </div>
  )
}

function SelectField({ label, value, onChange, options }: any) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <select value={value} onChange={onChange} className="w-full px-3 py-2 border rounded-lg text-sm">
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function ResultRow({ label, labelEn, value, highlight, color = 'text-gray-800', note }: any) {
  return (
    <div className={`flex justify-between items-center ${highlight ? 'font-bold' : ''}`}>
      <span className="text-gray-600 text-sm">
        {label}
        {labelEn && <span className="text-xs text-gray-500 block">{labelEn}</span>}
      </span>
      <div className="text-right">
        <span className={color}>{value}</span>
        {note && <span className="text-xs text-gray-500 ml-1">{note}</span>}
      </div>
    </div>
  )
}

function SuccessResult({ result, mode }: any) {
  return (
    <div className="space-y-4">
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-700 font-bold text-lg mb-3">
          <CheckCircle className="w-5 h-5" />
          計算成功 / Calculation Success
        </div>
        <div className="space-y-2 text-sm">
          <ResultRow label="商品価格" labelEn="Product Price" value={`$${result.productPrice}`} highlight />
          <ResultRow label="送料（固定）" labelEn="Shipping" value={`$${result.shipping}`} />
          <ResultRow
            label="Handling"
            labelEn={result.isDDP ? '関税回収用' : '最小限'}
            value={`$${result.handling}`}
            note={result.isDDP ? '(DDP fee collection)' : '(Minimal)'}
          />
          <ResultRow
            label="検索表示価格"
            labelEn="Display Price"
            value={`$${result.searchDisplayPrice.toFixed(2)}`}
            highlight
            color="text-blue-600"
          />
          <ResultRow label="総売上" labelEn="Total Revenue" value={`$${result.totalRevenue.toFixed(2)}`} />
        </div>
      </div>

      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
        <h3 className="font-bold text-yellow-800 mb-3">
          💰 利益（2パターン） / Profit (2 Patterns)
        </h3>
        <div className="bg-white rounded p-3 mb-3">
          <h4 className="font-semibold text-gray-700 mb-2">
            【デフォルト】還付なし利益 / Without Refund
          </h4>
          <div className="space-y-1 text-sm">
            <ResultRow label="利益（USD）" labelEn="Profit (USD)" value={`$${result.profitUSD_NoRefund.toFixed(2)}`} highlight />
            <ResultRow
              label="利益（円）"
              labelEn="Profit (JPY)"
              value={`¥${Math.round(result.profitJPY_NoRefund).toLocaleString()}`}
              highlight
            />
            <ResultRow
              label="利益率"
              labelEn="Profit Margin"
              value={`${(result.profitMargin_NoRefund * 100).toFixed(2)}%`}
              color="text-blue-600"
            />
          </div>
        </div>

        <div className="bg-green-100 rounded p-3">
          <h4 className="font-semibold text-green-800 mb-2">
            【参考】還付込み利益 / With Tax Refund
          </h4>
          <div className="space-y-1 text-sm">
            <ResultRow
              label="消費税還付額"
              labelEn="Tax Refund"
              value={`¥${Math.round(result.refundAmount).toLocaleString()}`}
              color="text-green-600"
            />
            <ResultRow label="還付（USD）" labelEn="Refund (USD)" value={`$${result.refundUSD.toFixed(2)}`} color="text-green-600" />
            <ResultRow
              label="利益（USD）"
              labelEn="Profit (USD)"
              value={`$${result.profitUSD_WithRefund.toFixed(2)}`}
              highlight
              color="text-green-600"
            />
            <ResultRow
              label="利益（円）"
              labelEn="Profit (JPY)"
              value={`¥${Math.round(result.profitJPY_WithRefund).toLocaleString()}`}
              highlight
              color="text-green-600"
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
        <h3 className="font-bold text-gray-800 mb-3">コスト内訳 / Cost Breakdown</h3>
        <div className="space-y-1 text-xs">
          <ResultRow label="原価" labelEn="Cost" value={`$${result.breakdown.costUSD}`} />
          <ResultRow label="実送料" labelEn="Actual Shipping" value={`$${result.breakdown.actualShipping}`} />
          <ResultRow label="関税" labelEn="Tariff" value={`$${result.breakdown.tariff}`} />
          {result.isDDP && (
            <>
              <ResultRow label="MPF" labelEn="Merchandise Processing Fee" value={`$${result.breakdown.mpf}`} />
              <ResultRow label="HMF" labelEn="Harbor Maintenance Fee" value={`$${result.breakdown.hmf}`} />
              <ResultRow label="DDP手数料" labelEn="DDP Fee" value={`$${result.breakdown.ddpFee}`} />
            </>
          )}
          <ResultRow
            label={`FVF (${result.breakdown.fvfRate})`}
            labelEn="Final Value Fee"
            value={`$${result.breakdown.fvf}`}
          />
          <ResultRow label="ストア割引" labelEn="Store Discount" value={`-${result.breakdown.storeDiscount}`} color="text-green-600" />
          <ResultRow label="Payoneer" labelEn="Payment Processing" value={`$${result.breakdown.payoneer}`} />
          <ResultRow label="為替損失" labelEn="Exchange Loss" value={`$${result.breakdown.exchangeLoss}`} />
          <ResultRow label="海外手数料" labelEn="International Fee" value={`$${result.breakdown.internationalFee}`} />
          <ResultRow label="総コスト" labelEn="Total Cost" value={`$${result.breakdown.totalCosts}`} highlight />
        </div>
      </div>
    </div>
  )
}

function ErrorResult({ result }: any) {
  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
      <div className="flex items-center gap-2 text-red-700 font-bold text-xl mb-4">
        <XCircle className="w-6 h-6" />
        計算エラー / Calculation Error
      </div>
      <p className="text-red-600 mb-2">{result.error}</p>
      {result.current_profit_no_refund && (
        <div className="text-sm text-red-500 space-y-1">
          <div>現在利益 / Current Profit: ${result.current_profit_no_refund}</div>
          <div>現在利益率 / Current Margin: {result.current_margin}</div>
          <div>最低利益額 / Min Profit: ${result.min_profit_amount}</div>
          <div>最低利益率 / Min Margin: {result.min_margin}</div>
        </div>
      )}
    </div>
  )
}
