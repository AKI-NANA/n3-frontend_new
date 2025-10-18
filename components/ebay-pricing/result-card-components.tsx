// components/ebay-pricing/result-card-components.tsx
'use client'

import { HelpCircle } from 'lucide-react'
import { CalculationStepsDisplay } from './calculation-steps-display'

export function ResultCard({ result, mode, formData, hsCodes }: any) {
  const netMargin = result.profitMargin_NoRefund * 100
  const profitJPY = result.profitJPY_NoRefund
  const costJPY = formData.costJPY || 15000
  const roi = (profitJPY / costJPY) * 100
  
  // 判定基準（15%基準）
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

  // HTSコード情報取得
  const hsInfo = hsCodes.find((hs: any) => hs.code === result.hsCode)
  
  // 実効関税率計算（Section 301含む）
  const baseDuty = hsInfo?.base_duty || 0
  const section301Rate = (hsInfo?.section301 && formData.originCountry === 'CN') 
    ? (hsInfo.section301_rate || 0.25) 
    : 0
  const totalTariffRate = baseDuty + section301Rate

  // DDP手数料の合計
  const ddpTotal = mode === 'DDP' 
    ? parseFloat(result.breakdown?.tariff || 0) + 
      parseFloat(result.breakdown?.mpf || 0) + 
      parseFloat(result.breakdown?.hmf || 0) + 
      parseFloat(result.breakdown?.ddpFee || 0)
    : parseFloat(result.breakdown?.tariff || 0)

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

      {/* 関税詳細 */}
      <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-3">
        <h4 className="font-bold text-purple-800 mb-2 text-sm flex items-center gap-1">
          🌍 関税詳細 / Tariff Details
          <Tooltip text="HTSコードに基づく関税率と実際の関税額" />
        </h4>
        
        <div className="space-y-2 text-xs">
          {/* HTSコード情報 */}
          <div className="bg-white rounded p-2">
            <div className="font-semibold text-gray-700">HTSコード</div>
            <div className="font-mono text-sm font-bold">{result.hsCode}</div>
            {hsInfo && (
              <div className="text-gray-600 text-xs mt-1">{hsInfo.description}</div>
            )}
          </div>

          {/* 関税率内訳 */}
          <div className="bg-white rounded p-2">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">基本関税率</span>
                <span className="font-bold text-purple-700">
                  {(baseDuty * 100).toFixed(2)}%
                </span>
              </div>
              {section301Rate > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Section 301（中国）</span>
                  <span className="font-bold text-red-600">
                    +{(section301Rate * 100).toFixed(0)}%
                  </span>
                </div>
              )}
              <div className="border-t pt-1 flex justify-between items-center">
                <span className="font-semibold text-gray-800">実効関税率</span>
                <span className="font-bold text-purple-800 text-base">
                  {(totalTariffRate * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* 実際の関税額 */}
          <div className="bg-white rounded p-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">関税額 (Tariff)</span>
              <span className="font-bold text-purple-700 text-sm">${result.breakdown?.tariff}</span>
            </div>
          </div>

          {/* DDP追加手数料 */}
          {mode === 'DDP' && (
            <>
              <div className="bg-indigo-50 rounded p-2 border border-indigo-200">
                <div className="font-semibold text-indigo-800 mb-1">DDP追加手数料（USA）</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">
                      MPF (0.3464%)
                      <Tooltip text="Merchandise Processing Fee: 最低$27.75〜最大$538.40" />
                    </span>
                    <span className="font-semibold text-indigo-700">${result.breakdown?.mpf}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">
                      HMF (0.125%)
                      <Tooltip text="Harbor Maintenance Fee: 海上輸送時のみ" />
                    </span>
                    <span className="font-semibold text-indigo-700">${result.breakdown?.hmf}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">
                      DDP手数料
                      <Tooltip text="通関代行サービス手数料" />
                    </span>
                    <span className="font-semibold text-indigo-700">${result.breakdown?.ddpFee}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-indigo-100 rounded p-2 border-2 border-indigo-400">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-indigo-900">DDP合計</span>
                  <span className="font-bold text-indigo-900 text-lg">
                    ${ddpTotal.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-indigo-700 mt-1">
                  = 関税 + MPF + HMF + DDP手数料
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

      {/* コスト内訳（DDP手数料を含む） */}
      <div className="bg-white rounded-lg shadow p-3 border-l-4 border-gray-500">
        <h4 className="font-bold text-gray-800 mb-2 text-sm">📊 コスト内訳</h4>
        <div className="space-y-0.5 text-xs">
          <CostRow label="原価" value={`$${result.breakdown?.costUSD}`} />
          <CostRow label="実送料" value={`$${result.breakdown?.actualShipping}`} />
          
          {/* 関税・DDP関連 */}
          <div className="bg-purple-50 rounded p-2 my-1">
            <div className="font-semibold text-purple-800 mb-1">関税・DDP関連</div>
            <CostRow label="　関税" value={`$${result.breakdown?.tariff}`} />
            {mode === 'DDP' && (
              <>
                <CostRow label="　MPF (0.3464%)" value={`$${result.breakdown?.mpf}`} />
                <CostRow label="　HMF (0.125%)" value={`$${result.breakdown?.hmf}`} />
                <CostRow label="　DDP手数料" value={`$${result.breakdown?.ddpFee}`} />
                <div className="border-t border-purple-300 pt-1 mt-1">
                  <CostRow label="　DDP合計" value={`$${ddpTotal.toFixed(2)}`} bold />
                </div>
              </>
            )}
          </div>

          {/* eBay手数料 */}
          <div className="bg-orange-50 rounded p-2 my-1">
            <div className="font-semibold text-orange-800 mb-1">eBay手数料</div>
            <CostRow label={`　FVF (${result.breakdown?.fvfRate})`} value={`$${result.breakdown?.fvf}`} />
            <CostRow label="　ストア割引" value={`-${result.breakdown?.storeDiscount}`} highlight />
            <CostRow label="　Payoneer (2%)" value={`$${result.breakdown?.payoneer}`} />
          </div>

          {/* その他手数料 */}
          <CostRow label="為替損失 (3%)" value={`$${result.breakdown?.exchangeLoss}`} />
          <CostRow label="国際手数料 (1.5%)" value={`$${result.breakdown?.internationalFee}`} />
          
          <div className="border-t-2 border-gray-400 pt-1 mt-1">
            <CostRow label="総コスト" value={`${result.breakdown?.totalCosts}`} bold large />
          </div>
        </div>
      </div>

      {/* 🆕 計算ステップと推奨案表示 */}
      <CalculationStepsDisplay result={result} />
    </div>
  )
}

export function ScoreBar({ label, value, target, unit }: any) {
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

export function InputField({ label, type = 'text', value, onChange, step }: any) {
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

export function SelectField({ label, value, onChange, options }: any) {
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

export function Tooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-block">
      <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
      <div className="invisible group-hover:visible absolute z-10 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl right-0 top-5">
        {text}
      </div>
    </div>
  )
}

export function PriceRow({ label, value, bold = false }: any) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold text-sm' : ''}`}>
      <span className="text-gray-600">{label}</span>
      <span>{value}</span>
    </div>
  )
}

export function CostRow({ label, value, bold = false, highlight = false, large = false }: any) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold' : ''} ${large ? 'text-sm' : ''} ${highlight ? 'text-green-600' : ''}`}>
      <span className="text-gray-600">{label}</span>
      <span>{value}</span>
    </div>
  )
}

export function ErrorResult({ result }: any) {
  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 shadow">
      <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
        <span className="text-xl">❌</span>
        計算エラー
      </div>
      <p className="text-red-600 text-sm">{result.error}</p>
    </div>
  )
}
