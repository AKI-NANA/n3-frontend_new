/**
 * USA価格計算結果の表示コンポーネント（V3完全版）
 * 
 * 機能:
 * - 計算プロセスの詳細表示
 * - 赤字の場合は赤く表示
 * - 重量帯変更の警告
 * - 送料上限の警告
 */

'use client'

import { CheckCircle2, AlertCircle, Info, TrendingDown, Package, AlertTriangle } from 'lucide-react'
import { UsaPricingResultV3 } from '@/lib/ebay-pricing/usa-price-calculator-v3'

interface UsaPriceResultDisplayV3Props {
  result: UsaPricingResultV3
}

export function UsaPriceResultDisplayV3({ result }: UsaPriceResultDisplayV3Props) {
  const isDeficit = result.profitUSD !== undefined && result.profitUSD < 0

  // 計算エラー（データがない場合）
  if (!result.success && !result.breakdown) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">計算エラー</h3>
            <p className="text-red-700">{result.error}</p>
          </div>
        </div>
      </div>
    )
  }

  const { breakdown, calculationSteps } = result

  // 重量帯が変更されているかチェック
  const isWeightTierChanged = breakdown.minPolicyName !== breakdown.selectedPolicyName
  
  // 送料上限が適用されているかチェック（将来の実装用）
  const hasShippingLimit = false // TODO: breakdownに追加する

  return (
    <div className="space-y-6">
      {/* 赤字警告バナー */}
      {isDeficit && (
        <div className="bg-red-500 border-2 border-red-700 rounded-xl p-6 text-white shadow-xl">
          <div className="flex items-center gap-4">
            <AlertCircle className="w-12 h-12 flex-shrink-0" />
            <div>
              <h3 className="text-2xl font-bold mb-2">❌ 赤字のため出品不可</h3>
              <p className="text-lg">
                この商品は利益が <span className="font-bold text-3xl">${breakdown.profit.toFixed(2)}</span>
                {' '}(<span className="font-bold text-2xl">{breakdown.profitMargin.toFixed(1)}%</span>) の赤字です。
              </p>
              <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded text-yellow-900 text-sm">
                <strong>💡 改善提案:</strong> 仕入れ価格を下げる / 目標利益率を下げる / 軽い商品を選ぶ / 関税率が低い原産国を選ぶ
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 重量帯変更の警告 */}
      {isWeightTierChanged && (
        <div className="bg-orange-50 border-2 border-orange-400 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-orange-900 mb-1">⚠️ 重量帯を変更して出品します</h4>
              <p className="text-sm text-orange-800">
                実重量: <span className="font-mono font-bold">{breakdown.weight_kg}kg</span> → 
                DDP費用が高いため、<span className="font-mono font-bold">{breakdown.selectedPolicyName}</span> ポリシーを使用します
              </p>
              <p className="text-xs text-orange-700 mt-1">
                （最安ポリシー: {breakdown.minPolicyName} から変更）
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 送料上限の警告 */}
      {hasShippingLimit && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900 mb-1">⚠️ 送料上限が適用されています</h4>
              <p className="text-sm text-yellow-800">
                このカテゴリには送料上限があるため、超過分を商品価格に転嫁しています
              </p>
            </div>
          </div>
        </div>
      )}

      {/* サマリーカード */}
      <div className={`rounded-xl p-6 shadow-lg ${
        isDeficit 
          ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' 
          : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          {isDeficit ? <AlertCircle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
          <h2 className="text-2xl font-bold">{isDeficit ? '赤字計算結果' : '計算結果サマリー'}</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
            <div className="text-sm text-blue-100 mb-1">商品価格</div>
            <div className="text-3xl font-bold">${breakdown.finalProductPrice.toFixed(2)}</div>
            <div className="text-sm text-blue-100 mt-1">
              商品価格比率: {(breakdown.productPriceRatio * 100).toFixed(1)}%
            </div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
            <div className="text-sm text-blue-100 mb-1">送料</div>
            <div className="text-3xl font-bold">${breakdown.finalShipping.toFixed(2)}</div>
            <div className="text-sm text-blue-100 mt-1">{breakdown.selectedPolicyName}</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
            <div className="text-sm text-blue-100 mb-1">総売上</div>
            <div className="text-3xl font-bold">${breakdown.finalTotal.toFixed(2)}</div>
            <div className={`text-sm mt-1 font-semibold ${isDeficit ? 'text-red-200' : 'text-blue-100'}`}>
              利益率: {breakdown.profitMarginWithRefund.toFixed(2)}% {isDeficit && ' (赤字)'}
            </div>
          </div>
        </div>
      </div>

      {/* 計算プロセスの詳細 */}
      {calculationSteps && calculationSteps.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">📋 計算プロセス</h3>
          <div className="space-y-4">
            {calculationSteps.map((step, index) => (
              <div key={index} className="border-l-4 border-indigo-500 pl-4 py-2">
                <h4 className="font-semibold text-gray-900">
                  STEP {step.step}: {step.title}
                </h4>
                <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                <div className="space-y-1">
                  {step.values.map((v, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-700">{v.label}</span>
                      <div className="text-right">
                        <span className="font-mono font-semibold">{v.value}</span>
                        {v.formula && (
                          <span className="text-xs text-gray-500 ml-2">({v.formula})</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 関税情報 */}
      <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">関税率の詳細</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between items-baseline border-b pb-2">
              <span className="text-gray-600">HTSコード</span>
              <span className="font-mono font-semibold text-gray-900">{breakdown.hsCode}</span>
            </div>
            
            <div className="flex justify-between items-baseline border-b pb-2">
              <span className="text-gray-600">原産国</span>
              <span className="font-semibold text-gray-900">{breakdown.originCountry}</span>
            </div>
            
            <div className="flex justify-between items-baseline border-b pb-2">
              <span className="text-gray-600">基本関税率</span>
              <span className="font-semibold text-gray-900">{(breakdown.baseTariffRate * 100).toFixed(2)}%</span>
            </div>
            
            {breakdown.additionalTariffRate > 0 && (
              <div className="flex justify-between items-baseline border-b pb-2">
                <span className="text-gray-600">追加関税率</span>
                <span className="font-semibold text-red-600">+{(breakdown.additionalTariffRate * 100).toFixed(2)}%</span>
              </div>
            )}
            
            <div className="flex justify-between items-baseline border-b pb-2 bg-blue-50 -mx-2 px-2 py-2 rounded">
              <span className="text-gray-700 font-semibold">合計関税率</span>
              <span className="font-bold text-blue-600">{(breakdown.totalTariffRate * 100).toFixed(2)}%</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-baseline border-b pb-2">
              <span className="text-gray-600">販売税率</span>
              <span className="font-semibold text-gray-900">{(breakdown.salesTaxRate * 100).toFixed(2)}%</span>
            </div>
            
            <div className="flex justify-between items-baseline border-b pb-2 bg-green-50 -mx-2 px-2 py-2 rounded">
              <span className="text-gray-700 font-semibold">実効DDP率</span>
              <span className="font-bold text-green-600">{(breakdown.effectiveDDPRate * 100).toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* eBay手数料の詳細 */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">💳 eBay手数料の詳細</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">ストアタイプ</span>
              <span className="font-semibold">{breakdown.storeType}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">基本FVF</span>
              <span className="font-semibold">{(breakdown.baseFVF * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">ストア割引</span>
              <span className="font-semibold text-green-600">-{(breakdown.storeDiscount * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-sm bg-blue-50 -mx-2 px-2 py-1 rounded">
              <span className="text-gray-700 font-semibold">最終FVF</span>
              <span className="font-bold text-blue-600">{(breakdown.finalFVF * 100).toFixed(2)}%</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">FVF</span>
              <span className="font-semibold">${breakdown.ebayFees.fvf.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Payoneer (2%)</span>
              <span className="font-semibold">${breakdown.ebayFees.payoneer.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">為替損失 (3%)</span>
              <span className="font-semibold">${breakdown.ebayFees.exchangeLoss.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">国際手数料 (1.5%)</span>
              <span className="font-semibold">${breakdown.ebayFees.internationalFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">出品手数料</span>
              <span className="font-semibold">${breakdown.ebayFees.insertionFee.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold">
              <span className="text-gray-900">eBay手数料合計</span>
              <span className="text-blue-600">${breakdown.ebayFees.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 最終利益計算 */}
      <div className={`rounded-xl shadow-lg p-6 border-2 ${
        isDeficit 
          ? 'bg-gradient-to-r from-red-50 to-red-100 border-red-500' 
          : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          {isDeficit ? <AlertCircle className="w-7 h-7 text-red-600" /> : <CheckCircle2 className="w-7 h-7 text-green-600" />}
          <h3 className={`text-xl font-bold ${isDeficit ? 'text-red-900' : 'text-gray-900'}`}>
            {isDeficit ? '❌ 赤字：出品不可' : '💰 最終利益計算'}
          </h3>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-gray-700">総売上</span>
            <span className="text-2xl font-bold text-gray-900">${breakdown.finalTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-baseline text-sm">
            <span className="text-gray-600">仕入れ値</span>
            <span className="font-semibold text-gray-700">${breakdown.costUSD.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-baseline text-sm">
            <span className="text-gray-600">実送料</span>
            <span className="font-semibold text-gray-700">${breakdown.selectedBaseShipping.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-baseline text-sm">
            <span className="text-gray-600">DDP関連コスト</span>
            <span className="font-semibold text-red-600">${breakdown.ddpCosts.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-baseline text-sm">
            <span className="text-gray-600">eBay手数料</span>
            <span className="font-semibold text-blue-600">${breakdown.ebayFees.total.toFixed(2)}</span>
          </div>
          <div className="border-t border-gray-300 pt-2 flex justify-between items-baseline text-sm">
            <span className="text-gray-700 font-semibold">総コスト</span>
            <span className="font-bold text-gray-900">${breakdown.totalCosts.toFixed(2)}</span>
          </div>
          
          <div className={`border-t-2 pt-3 space-y-2 ${isDeficit ? 'border-red-400' : 'border-green-300'}`}>
            <div className="flex justify-between items-baseline">
              <span className="text-gray-700 font-semibold">利益（還付前）</span>
              <span className={`text-xl font-bold ${isDeficit ? 'text-red-600' : 'text-green-600'}`}>
                ${breakdown.profit.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-baseline text-sm">
              <span className="text-gray-600">🎯 利益率（還付前）</span>
              <span className={`font-semibold ${isDeficit ? 'text-red-600' : 'text-green-600'}`}>
                {breakdown.profitMargin.toFixed(2)}%
              </span>
            </div>
            
            <div className={`flex justify-between items-baseline text-sm -mx-2 px-2 py-1 rounded ${
              isDeficit ? 'bg-red-100' : 'bg-green-100'
            }`}>
              <span className={isDeficit ? 'text-red-700' : 'text-green-700'}>消費税還付</span>
              <span className={`font-semibold ${isDeficit ? 'text-red-700' : 'text-green-700'}`}>
                +${breakdown.refundUSD.toFixed(2)} (¥{breakdown.refundJPY.toFixed(0)})
              </span>
            </div>
            
            <div className={`flex justify-between items-baseline text-white -mx-2 px-2 py-2 rounded ${
              isDeficit ? 'bg-red-600' : 'bg-green-600'
            }`}>
              <span className="font-bold">利益（還付後）</span>
              <span className="text-2xl font-bold">${breakdown.profitWithRefund.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-baseline text-sm">
              <span className="text-gray-600">利益率（還付後）</span>
              <span className={`font-bold ${isDeficit ? 'text-red-600' : 'text-green-600'}`}>
                {breakdown.profitMarginWithRefund.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
