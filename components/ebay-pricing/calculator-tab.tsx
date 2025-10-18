import { Calculator, CheckCircle, XCircle } from 'lucide-react'
import { STORE_FEES } from '@/app/ebay-pricing/page'

interface CalculatorTabProps {
  formData: any
  onInputChange: (field: string, value: any) => void
  onCalculate: () => void
  result: any
  hsCodes: any[]
  countries: any[]
  categoryFees: string[]
  getCategoryFee?: (key: string) => { fvf: number; insertion_fee: number }
}

export function CalculatorTab({
  formData,
  onInputChange,
  onCalculate,
  result,
  hsCodes,
  countries,
  categoryFees,
  getCategoryFee,
}: CalculatorTabProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">価格計算</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 入力フォーム */}
        <div className="space-y-4">
          <InputField
            label="仕入値（円）"
            type="number"
            value={formData.costJPY}
            onChange={(e) => onInputChange('costJPY', parseFloat(e.target.value) || 0)}
          />

          <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
            <h3 className="font-semibold mb-2 text-blue-800">容積重量計算</h3>
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

          <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
            <h3 className="font-semibold mb-2 text-green-800">HSコード</h3>
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
          </div>

          <SelectField
            label="原産国"
            value={formData.originCountry}
            onChange={(e) => onInputChange('originCountry', e.target.value)}
            options={countries.map((c) => ({
              value: c.code,
              label: `${c.name_ja || c.name} (${c.code})`,
            }))}
          />

          <SelectField
            label="対象国"
            value={formData.destCountry}
            onChange={(e) => onInputChange('destCountry', e.target.value)}
            options={[
              { value: 'US', label: 'USA (DDP)' },
              { value: 'GB', label: 'UK (DDU)' },
              { value: 'EU', label: 'EU (DDU)' },
              { value: 'CA', label: 'Canada (DDU)' },
              { value: 'HK', label: 'Hong Kong (DDU)' },
              { value: 'AU', label: 'Australia (DDU)' },
            ]}
          />

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">eBayカテゴリ</label>
            <select
              value={formData.category}
              onChange={(e) => onInputChange('category', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              {categoryFees.map((cat) => {
                // デフォルト値を設定
                const fvf = 0.1315 // 13.15%
                const insertionFee = 0.35
                
                return (
                  <option key={cat} value={cat}>
                    {cat} (FVF: {(fvf * 100).toFixed(2)}%, 出品料: ${insertionFee.toFixed(2)})
                  </option>
                )
              })}
            </select>
          </div>

          <SelectField
            label="ストアタイプ"
            value={formData.storeType}
            onChange={(e) => onInputChange('storeType', e.target.value)}
            options={Object.entries(STORE_FEES).map(([key, val]) => ({
              value: key,
              label: `${val.name} (FVF割引: -${(val.fvf_discount * 100).toFixed(2)}%)`,
            }))}
          />

          <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
            <h3 className="font-semibold mb-2 text-purple-800">消費税還付（自動計算）</h3>
            <InputField
              label="還付対象手数料（円）"
              type="number"
              value={formData.refundableFeesJPY}
              onChange={(e) => onInputChange('refundableFeesJPY', parseFloat(e.target.value) || 0)}
            />
            <p className="text-xs text-purple-600 mt-2">還付額 = (仕入値 + 還付対象手数料) × 10/110</p>
          </div>

          <button
            onClick={onCalculate}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <Calculator className="w-5 h-5" />
            計算実行
          </button>
        </div>

        {/* 計算結果 */}
        <div className="space-y-4 max-h-[900px] overflow-y-auto">
          {result && (result.success ? <SuccessResult result={result} /> : <ErrorResult result={result} />)}
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

function ResultRow({ label, value, highlight, color = 'text-gray-800', note }: any) {
  return (
    <div className={`flex justify-between items-center ${highlight ? 'font-bold' : ''}`}>
      <span className="text-gray-600">{label}</span>
      <div className="text-right">
        <span className={color}>{value}</span>
        {note && <span className="text-xs text-gray-500 ml-1">{note}</span>}
      </div>
    </div>
  )
}

function SuccessResult({ result }: any) {
  return (
    <div className="space-y-4">
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-700 font-bold text-lg mb-3">
          <CheckCircle className="w-5 h-5" />
          計算成功
        </div>
        <div className="space-y-2 text-sm">
          <ResultRow label="商品価格" value={`$${result.productPrice}`} highlight />
          <ResultRow label="送料（固定）" value={`$${result.shipping}`} />
          <ResultRow label="Handling" value={`$${result.handling}`} note={result.isDDP ? '（関税回収）' : '（最小限）'} />
          <ResultRow label="検索表示価格" value={`$${result.searchDisplayPrice.toFixed(2)}`} highlight color="text-blue-600" />
          <ResultRow label="総売上" value={`$${result.totalRevenue.toFixed(2)}`} />
        </div>
      </div>

      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
        <h3 className="font-bold text-yellow-800 mb-3">💰 利益（2パターン表示）</h3>
        <div className="bg-white rounded p-3 mb-3">
          <h4 className="font-semibold text-gray-700 mb-2">【デフォルト】還付なし利益</h4>
          <div className="space-y-1 text-sm">
            <ResultRow label="利益（USD）" value={`$${result.profitUSD_NoRefund.toFixed(2)}`} highlight />
            <ResultRow label="利益（円）" value={`¥${Math.round(result.profitJPY_NoRefund).toLocaleString()}`} highlight />
            <ResultRow label="利益率" value={`${(result.profitMargin_NoRefund * 100).toFixed(2)}%`} color="text-blue-600" />
          </div>
        </div>

        <div className="bg-green-100 rounded p-3">
          <h4 className="font-semibold text-green-800 mb-2">【参考】還付込み利益</h4>
          <div className="space-y-1 text-sm">
            <ResultRow label="消費税還付額" value={`¥${Math.round(result.refundAmount).toLocaleString()}`} color="text-green-600" />
            <ResultRow label="還付（USD）" value={`$${result.refundUSD.toFixed(2)}`} color="text-green-600" />
            <ResultRow label="利益（USD）" value={`$${result.profitUSD_WithRefund.toFixed(2)}`} highlight color="text-green-600" />
            <ResultRow label="利益（円）" value={`¥${Math.round(result.profitJPY_WithRefund).toLocaleString()}`} highlight color="text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 max-h-80 overflow-y-auto">
        <h3 className="font-bold text-gray-800 mb-3">計算式（全13ステップ）</h3>
        <div className="space-y-2 text-xs font-mono">
          {result.formulas.map((f: any, i: number) => (
            <div key={i} className="bg-white p-2 rounded border">
              <div className="text-indigo-600 font-bold">
                Step {f.step}: {f.label}
              </div>
              <div className="text-gray-700">{f.formula}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
        <h3 className="font-bold text-gray-800 mb-3">コスト内訳</h3>
        <div className="space-y-1 text-xs">
          <ResultRow label="原価" value={`$${result.breakdown.costUSD}`} />
          <ResultRow label="実送料" value={`$${result.breakdown.actualShipping}`} />
          <ResultRow label="関税" value={`$${result.breakdown.tariff}`} />
          {result.isDDP && (
            <>
              <ResultRow label="MPF" value={`$${result.breakdown.mpf}`} />
              <ResultRow label="HMF" value={`$${result.breakdown.hmf}`} />
              <ResultRow label="DDP手数料" value={`$${result.breakdown.ddpFee}`} />
            </>
          )}
          <ResultRow label={`FVF (${result.breakdown.fvfRate})`} value={`$${result.breakdown.fvf}`} />
          <ResultRow label="ストア割引" value={`-${result.breakdown.storeDiscount}`} color="text-green-600" />
          <ResultRow label="Payoneer" value={`$${result.breakdown.payoneer}`} />
          <ResultRow label="為替損失" value={`$${result.breakdown.exchangeLoss}`} />
          <ResultRow label="海外手数料" value={`$${result.breakdown.internationalFee}`} />
          <ResultRow label="総コスト" value={`$${result.breakdown.totalCosts}`} highlight />
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
        計算エラー
      </div>
      <p className="text-red-600 mb-2">{result.error}</p>
      {result.current_profit_no_refund && (
        <div className="text-sm text-red-500 space-y-1">
          <div>現在利益: ${result.current_profit_no_refund}</div>
          <div>現在利益率: {result.current_margin}</div>
          <div>最低利益額: ${result.min_profit_amount}</div>
          <div>最低利益率: {result.min_margin}</div>
        </div>
      )}
    </div>
  )
}
