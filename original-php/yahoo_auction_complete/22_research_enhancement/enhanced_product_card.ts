// app/research/components/ProductCard.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ResearchProduct } from '@/types/research';

interface ProductCardProps {
  product: ResearchProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const [showAIDetails, setShowAIDetails] = useState(false);

  // AI分析データ取得
  const aiAnalysis = product.ai_analysis;

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
      {/* 商品画像 */}
      <div className="relative h-48 bg-gray-100">
        <img
          src={product.primary_image_url || '/placeholder.png'}
          alt={product.title}
          className="w-full h-full object-cover"
        />
        
        {/* リスクバッジ */}
        {product.risk_level && (
          <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold ${
            product.risk_level === 'high' ? 'bg-red-500 text-white' :
            product.risk_level === 'medium' ? 'bg-yellow-500 text-white' :
            'bg-green-500 text-white'
          }`}>
            {product.risk_level === 'high' ? '⚠️ 高リスク' :
             product.risk_level === 'medium' ? '⚡ 中リスク' :
             '✅ 低リスク'}
          </div>
        )}
      </div>

      {/* 商品情報 */}
      <div className="p-4">
        {/* タイトル */}
        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 mb-2" title={product.title}>
          {product.title}
        </h3>

        {/* カテゴリ */}
        <div className="text-xs text-gray-500 mb-2">
          <i className="fas fa-tag mr-1"></i>
          {product.category_name}
        </div>

        {/* 価格情報 */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-2xl font-bold text-[var(--research-primary)]">
              ${product.current_price?.toFixed(2) || '0.00'}
            </div>
            {product.shipping_cost > 0 && (
              <div className="text-xs text-gray-500">
                + ${product.shipping_cost?.toFixed(2)} 送料
              </div>
            )}
          </div>
          
          {/* 利益率 */}
          {product.profit_rate !== undefined && (
            <div className={`px-3 py-1 rounded-full text-sm font-bold ${
              product.profit_rate >= 25 ? 'bg-green-100 text-green-800' :
              product.profit_rate >= 15 ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              利益率 {product.profit_rate}%
            </div>
          )}
        </div>

        {/* 人気度指標 */}
        <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
          {product.sold_quantity > 0 && (
            <div className="flex items-center gap-1">
              <i className="fas fa-fire text-orange-500"></i>
              <span>{product.sold_quantity}売上</span>
            </div>
          )}
          {product.watch_count > 0 && (
            <div className="flex items-center gap-1">
              <i className="fas fa-eye text-blue-500"></i>
              <span>{product.watch_count}ウォッチ</span>
            </div>
          )}
        </div>

        {/* セラー情報 */}
        <div className="flex items-center justify-between text-xs text-gray-600 mb-3 pb-3 border-b">
          <div className="flex items-center gap-2">
            <i className="fas fa-user-circle"></i>
            <span>{product.seller_username}</span>
          </div>
          <div className="flex items-center gap-1">
            <i className="fas fa-star text-yellow-500"></i>
            <span>{product.seller_positive_percentage}%</span>
          </div>
        </div>

        {/* 🔥 AI分析セクション */}
        {aiAnalysis && (
          <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">
                <i className="fas fa-robot mr-1"></i>
                AI分析結果
              </span>
              <button
                onClick={() => setShowAIDetails(!showAIDetails)}
                className="text-xs text-blue-600 hover:underline"
              >
                {showAIDetails ? '閉じる' : '詳細'}
              </button>
            </div>

            {/* AI分析サマリー */}
            {!showAIDetails && aiAnalysis.sellingReasons && aiAnalysis.sellingReasons.length > 0 && (
              <div className="text-xs text-gray-600">
                💡 {aiAnalysis.sellingReasons[0]}
              </div>
            )}

            {/* AI分析詳細 */}
            {showAIDetails && (
              <div className="mt-3 space-y-2 text-xs">
                {/* 売れる理由 */}
                {aiAnalysis.sellingReasons && aiAnalysis.sellingReasons.length > 0 && (
                  <div>
                    <div className="font-semibold text-green-700 mb-1">
                      ✅ 売れる理由:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {aiAnalysis.sellingReasons.slice(0, 3).map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* リスク要因 */}
                {aiAnalysis.riskFactors && aiAnalysis.riskFactors.length > 0 && (
                  <div>
                    <div className="font-semibold text-red-700 mb-1">
                      ⚠️ リスク要因:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {aiAnalysis.riskFactors.slice(0, 2).map((risk, i) => (
                        <li key={i}>{risk}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 推奨アクション */}
                {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
                  <div>
                    <div className="font-semibold text-blue-700 mb-1">
                      💡 推奨アクション:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {aiAnalysis.recommendations.slice(0, 2).map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 市場トレンド */}
                {aiAnalysis.marketTrend && (
                  <div>
                    <div className="font-semibold text-purple-700 mb-1">
                      📈 市場トレンド:
                    </div>
                    <p className="text-gray-700">{aiAnalysis.marketTrend}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* アクションボタン */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => window.open(product.item_url, '_blank')}
          >
            <i className="fas fa-external-link-alt mr-1"></i>
            eBay
          </Button>
          <Button
            variant="default"
            size="sm"
            className="w-full text-xs bg-[var(--research-primary)]"
          >
            <i className="fas fa-calculator mr-1"></i>
            利益計算
          </Button>
        </div>

        {/* セラーミラー連携ボタン */}
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2 text-xs border-2 border-green-500 text-green-700 hover:bg-green-50"
        >
          <i className="fas fa-copy mr-1"></i>
          セラーミラーへ
        </Button>
      </div>
    </div>
  );
}
