// components/ebay-pricing/calculation-steps-display.tsx
'use client'

import { HelpCircle } from 'lucide-react'

export function CalculationStepsDisplay({ result }: any) {
  if (!result) return null

  return (
    <div className="space-y-3">
      {/* 🌍 関税詳細 */}
      {result.tariff && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-lg p-4 border-2 border-purple-300">
          <h4 className="font-bold text-purple-800 mb-3 text-base flex items-center gap-2">
            🌍 関税詳細 / Tariff Details
            <Tooltip text="原産国とHTSコードに基づく関税計算" />
          </h4>
          
          <div className="bg-white rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-700 font-semibold">HTSコード</span>
              <span className="font-mono font-bold text-purple-900">{result.tariff.hsCode}</span>
            </div>
            
            {result.originCountry && (
              <div className="flex justify-between items-center pb-2 border-b bg-blue-50 rounded p-2">
                <span className="text-gray-700 font-semibold">原産国</span>
                <span className="font-bold text-blue-900">{result.originCountry}</span>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-purple-50 rounded p-2">
                <div className="text-xs text-gray-600">基本関税率</div>
                <div className="font-bold text-purple-700">{result.tariff.baseDuty?.toFixed(2)}%</div>
              </div>
              <div className="bg-pink-50 rounded p-2">
                <div className="text-xs text-gray-600">実効関税率</div>
                <div className="font-bold text-pink-700">{result.tariff.effectiveDuty?.toFixed(2)}%</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">関税額 (Tariff)</span>
              <span className="font-bold text-lg text-purple-700">${result.tariff.tariffUSD?.toFixed(2)}</span>
            </div>
            
            <div className="bg-purple-50 rounded p-3 mt-2">
              <h5 className="text-xs font-semibold text-purple-800 mb-2">DDP追加手数料 (USA)</h5>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600">MPF (0.3464%)</span>
                    <Tooltip text="Merchandise Processing Fee: 商品処理手数料" />
                  </div>
                  <span className="font-mono">${result.tariff.mpf?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600">HMF (0.125%)</span>
                    <Tooltip text="Harbor Maintenance Fee: 港湾維持費" />
                  </div>
                  <span className="font-mono">${result.tariff.hmf?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">DDP手数料</span>
                  <span className="font-mono">${result.tariff.ddpFee?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-purple-700 pt-1 border-t">
                  <span>DDP合計</span>
                  <span className="text-base">${result.tariff.ddpTotal?.toFixed(2)}</span>
                </div>
              </div>
              <div className="text-xs text-gray-600 mt-2">
                = 関税 + MPF + HMF + DDP手数料
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📊 計算ステップ表示 */}
      {result.calculationSteps && result.calculationSteps.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-4 border-2 border-blue-300">
          <h4 className="font-bold text-blue-800 mb-3 text-base flex items-center gap-2">
            📊 計算プロセス - 商品価格最適化
            <Tooltip text="送料を調整して商品価格比率80%を目指します" />
          </h4>
          <div className="space-y-2">
            {result.calculationSteps.map((step: any, idx: number) => (
              <div key={idx} className="bg-white rounded-lg p-3 border border-blue-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-20 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-blue-900 text-base mb-1">{step.value}</div>
                    <div className="text-sm text-gray-600">{step.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ⭐ 推奨案・代替案表示 */}
      {result.recommended && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-lg p-4 border-2 border-green-400">
          <h4 className="font-bold text-green-800 mb-3 text-base flex items-center gap-2">
            ⭐ 推奨販売価格
            <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">最適化済み</span>
          </h4>
          
          {/* 推奨販売価格サマリー */}
          <div className="bg-white rounded-lg p-4 mb-3 border-2 border-green-300 shadow-md">
            <div className="text-center mb-3">
              <div className="text-4xl font-bold text-green-700 mb-1">
                ${result.recommended.total.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">推奨販売価格</div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 rounded p-2 text-center">
                <div className="text-xs text-gray-600 mb-1">商品価格</div>
                <div className="text-2xl font-bold text-green-700">${result.recommended.productPrice}</div>
              </div>
              <div className="bg-blue-50 rounded p-2 text-center">
                <div className="text-xs text-gray-600 mb-1">送料（顧客表示）</div>
                <div className="text-2xl font-bold text-blue-700">${result.recommended.shipping.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* 推奨案詳細 */}
          <div className="bg-white rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-700 font-semibold">使用ポリシー:</span>
              <span className="font-bold text-blue-900">{result.recommended.policyName}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-50 rounded p-2">
                <div className="text-xs text-gray-600">実送料</div>
                <div className="font-bold text-blue-700">${result.recommended.baseShipping.toFixed(2)}</div>
              </div>
              <div className="bg-purple-50 rounded p-2">
                <div className="text-xs text-gray-600">DDP手数料</div>
                <div className="font-bold text-purple-700">${(result.recommended.ddpServiceFee || result.recommended.ddpFee || 0).toFixed(2)}</div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">商品価格比率:</span>
              <span className="font-bold text-lg text-blue-700">
                {(result.recommended.productPriceRatio * 100).toFixed(1)}%
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">利益率:</span>
              <span className="font-bold text-lg text-green-700">
                {(result.recommended.profitMargin * 100).toFixed(2)}%
              </span>
            </div>

            {result.recommended.reason && (
              <div className="text-xs text-gray-700 p-2 bg-green-50 rounded border border-green-200 mt-2">
                💡 {result.recommended.reason}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🔄 代替案（最安送料） */}
      {result.alternative && (
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg shadow-lg p-4 border-2 border-gray-300">
          <h4 className="font-bold text-gray-800 mb-3 text-base flex items-center gap-2">
            🔄 代替案（最安送料）
            <span className="px-2 py-0.5 bg-gray-500 text-white text-xs rounded-full">参考</span>
          </h4>
          
          <div className="bg-white rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-gray-700 font-semibold">使用ポリシー:</span>
              <span className="font-bold text-gray-900">{result.alternative.policyName}</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs text-gray-600">商品価格</div>
                <div className="font-bold text-gray-700">${result.alternative.productPrice}</div>
              </div>
              <div className="bg-blue-50 rounded p-2">
                <div className="text-xs text-gray-600">送料</div>
                <div className="font-bold text-blue-700">${result.alternative.shipping.toFixed(2)}</div>
              </div>
              <div className="bg-green-50 rounded p-2">
                <div className="text-xs text-gray-600">利益率</div>
                <div className="font-bold text-green-700">{(result.alternative.profitMargin * 100).toFixed(2)}%</div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">商品価格比率:</span>
              <span className="font-bold text-gray-700">
                {(result.alternative.productPriceRatio * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 📈 最適化効果 */}
      {result.comparison && (
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg shadow-lg p-4 border-2 border-yellow-400">
          <h4 className="font-bold text-yellow-800 mb-2 text-base">📈 最適化効果</h4>
          <div className="bg-white rounded-lg p-3 text-sm">
            <div className="text-gray-700 leading-relaxed">{result.comparison.message}</div>
            
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-red-50 rounded p-2 text-center">
                <div className="text-xs text-gray-600">商品価格↓</div>
                <div className="font-bold text-red-600">-${result.comparison.productPriceReduction.toFixed(2)}</div>
              </div>
              <div className="bg-blue-50 rounded p-2 text-center">
                <div className="text-xs text-gray-600">送料↑</div>
                <div className="font-bold text-blue-600">+${result.comparison.shippingIncrease.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Tooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-block">
      <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
      <div className="invisible group-hover:visible absolute z-10 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl right-0 top-6">
        {text}
      </div>
    </div>
  )
}
