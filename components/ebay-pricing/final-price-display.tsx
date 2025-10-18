// components/ebay-pricing/final-price-display.tsx
'use client'

import { DollarSign, TrendingUp, ArrowRight } from 'lucide-react'

interface FinalPriceDisplayProps {
  resultDDP: any
  resultDDU: any
  recommendation: any
}

export function FinalPriceDisplay({ resultDDP, resultDDU, recommendation }: FinalPriceDisplayProps) {
  if (!resultDDP?.success || !resultDDU?.success || !recommendation) return null

  const selectedResult = recommendation.recommendation === 'DDP' ? resultDDP : resultDDU
  const otherResult = recommendation.recommendation === 'DDP' ? resultDDU : resultDDP
  const mode = recommendation.recommendation

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-xl shadow-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <DollarSign className="w-8 h-8" />
        <div>
          <h2 className="text-2xl font-bold">最終出品価格</h2>
          <p className="text-indigo-100 text-sm">
            {mode === 'DDP' ? '🇺🇸 USA (DDP) - 関税込み' : '🌍 その他 (DDU) - 着払い'} で出品
          </p>
        </div>
      </div>

      {/* メイン価格表示 */}
      <div className="bg-white/10 backdrop-blur rounded-lg p-4 mb-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-indigo-100 text-xs mb-1">商品価格</div>
            <div className="text-3xl font-bold">${selectedResult.productPrice}</div>
          </div>
          <div>
            <div className="text-indigo-100 text-xs mb-1">送料</div>
            <div className="text-3xl font-bold">${selectedResult.shipping}</div>
          </div>
          <div>
            <div className="text-indigo-100 text-xs mb-1">Handling</div>
            <div className="text-3xl font-bold">${selectedResult.handling}</div>
          </div>
        </div>
        
        <div className="border-t border-white/30 mt-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="text-indigo-100 text-lg">検索表示価格</div>
            <div className="text-4xl font-bold">
              ${selectedResult.searchDisplayPrice.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* 利益情報 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white/10 backdrop-blur rounded-lg p-3">
          <div className="text-indigo-100 text-xs mb-1">純利益（還付なし）</div>
          <div className="text-2xl font-bold">
            ¥{Math.round(selectedResult.profitJPY_NoRefund).toLocaleString()}
          </div>
          <div className="text-indigo-200 text-sm mt-1">
            {(selectedResult.profitMargin_NoRefund * 100).toFixed(1)}% 利益率
          </div>
        </div>
        
        <div className="bg-white/10 backdrop-blur rounded-lg p-3">
          <div className="text-indigo-100 text-xs mb-1">ROI</div>
          <div className="text-2xl font-bold">
            {((selectedResult.profitJPY_NoRefund / (selectedResult.costJPY || 15000)) * 100).toFixed(1)}%
          </div>
          <div className="text-indigo-200 text-sm mt-1">
            投資リターン率
          </div>
        </div>
      </div>

      {/* DDP vs DDU 比較 */}
      <div className="bg-white/10 backdrop-blur rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5" />
          <h3 className="font-bold">DDP vs DDU 比較</h3>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-indigo-100 text-xs mb-1">DDP利益</div>
            <div className="font-bold">
              ¥{Math.round(resultDDP.profitJPY_NoRefund).toLocaleString()}
            </div>
            <div className="text-indigo-200 text-xs">
              {(resultDDP.profitMargin_NoRefund * 100).toFixed(1)}%
            </div>
          </div>
          
          <div className="flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-indigo-200" />
          </div>
          
          <div>
            <div className="text-indigo-100 text-xs mb-1">DDU利益</div>
            <div className="font-bold">
              ¥{Math.round(resultDDU.profitJPY_NoRefund).toLocaleString()}
            </div>
            <div className="text-indigo-200 text-xs">
              {(resultDDU.profitMargin_NoRefund * 100).toFixed(1)}%
            </div>
          </div>
        </div>
        
        <div className="border-t border-white/30 mt-3 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-indigo-100 text-sm">利益差</span>
            <span className={`font-bold text-lg ${
              recommendation.profitDiff > 0 ? 'text-green-300' : 'text-yellow-300'
            }`}>
              ¥{Math.abs(recommendation.profitDiff).toFixed(0)} 
              ({Math.abs(recommendation.profitDiffPercent).toFixed(1)}%)
            </span>
          </div>
          <div className="text-indigo-200 text-xs mt-1 text-center">
            {recommendation.profitDiff > 0 ? 'DDPが有利' : recommendation.profitDiff < 0 ? 'DDUが有利' : 'ほぼ同等'}
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="mt-4 flex gap-3">
        <button className="flex-1 bg-white text-indigo-600 py-3 rounded-lg font-bold hover:bg-indigo-50 transition-colors">
          出品ページ作成
        </button>
        <button className="flex-1 bg-indigo-500 text-white py-3 rounded-lg font-bold hover:bg-indigo-400 transition-colors border border-white/30">
          価格を保存
        </button>
      </div>
    </div>
  )
}
