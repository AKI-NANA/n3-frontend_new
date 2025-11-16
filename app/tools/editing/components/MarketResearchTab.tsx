// app/tools/editing/components/MarketResearchTab.tsx
'use client'

import { Product } from '../types/product'

interface MarketResearchTabProps {
  product: Product
}

export function MarketResearchTab({ product }: MarketResearchTabProps) {
  const browseResult = product.ebay_api_data?.browse_result
  const marketResearch = product.market_research_summary

  if (!browseResult && !marketResearch) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>市場調査データがありません</p>
        <p className="text-sm mt-2">「市場調査」ボタンをクリックして分析を実行してください</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* 競合状況 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <span>📊</span>
          <span>競合状況</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600">総競合数</div>
            <div className="text-2xl font-bold text-blue-600">
              {product.sm_competitor_count || 0}件
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-gray-600">日本人セラー</div>
            <div className="text-2xl font-bold text-green-600">
              {product.sm_jp_seller_count || 0}件
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ({((product.sm_jp_seller_count || 0) / (product.sm_competitor_count || 1) * 100).toFixed(1)}%)
            </div>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="text-sm text-gray-600">最安値</div>
            <div className="text-2xl font-bold text-orange-600">
              ${product.sm_lowest_price?.toFixed(2) || 0}
            </div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-sm text-gray-600">中央値</div>
            <div className="text-2xl font-bold text-purple-600">
              ${product.sm_median_price_usd?.toFixed(2) || 0}
            </div>
          </div>
        </div>
      </div>

      {/* 価格分布 */}
      {browseResult && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span>💰</span>
            <span>価格帯</span>
          </h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">最安値</div>
                <div className="text-xl font-bold">${browseResult.lowestPrice?.toFixed(2) || 0}</div>
              </div>
              <div className="flex-1 mx-4">
                <div className="h-2 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full"></div>
              </div>
              <div>
                <div className="text-sm text-gray-600 text-right">平均値</div>
                <div className="text-xl font-bold">${browseResult.averagePrice?.toFixed(2) || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 需要分析 */}
      {product.research_sold_count !== undefined && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span>📈</span>
            <span>需要分析</span>
          </h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">販売実績</div>
                <div className="text-xl font-bold">{product.research_sold_count || 0}件</div>
                <div className="text-xs text-gray-500 mt-1">過去90日間（推定）</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">需要レベル</div>
                <div className="text-xl font-bold">
                  {(product.research_sold_count || 0) > 50 ? '高' : 
                   (product.research_sold_count || 0) > 20 ? '中' : '低'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Geminiの市場調査サマリー */}
      {marketResearch && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span>🤖</span>
            <span>AI分析コメント</span>
          </h3>
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <p className="text-gray-700 whitespace-pre-wrap">{marketResearch}</p>
          </div>
        </div>
      )}

      {/* 検索情報 */}
      {browseResult && (
        <div className="pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <div>検索クエリ: {browseResult.searchTitle || '-'}</div>
            <div>検索レベル: Level {browseResult.searchLevel || 1}</div>
            <div>分析日時: {browseResult.searchedAt ? new Date(browseResult.searchedAt).toLocaleString('ja-JP') : '-'}</div>
          </div>
        </div>
      )}

      {/* 競合商品リスト */}
      {browseResult?.referenceItems && browseResult.referenceItems.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span>🔍</span>
            <span>参考商品（上位10件）</span>
          </h3>
          <div className="space-y-2">
            {browseResult.referenceItems.slice(0, 10).map((item: any, index: number) => (
              <div key={index} className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  {item.image?.imageUrl && (
                    <img 
                      src={item.image.imageUrl} 
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <a 
                      href={item.itemWebUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline line-clamp-2"
                    >
                      {item.title}
                    </a>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>価格: ${item.price?.value || 0}</span>
                      {item.itemLocation?.country && (
                        <span className={item.itemLocation.country === 'JP' ? 'text-green-600 font-medium' : ''}>
                          📍 {item.itemLocation.country}
                        </span>
                      )}
                      {item.matchLevel && (
                        <span className={`px-2 py-0.5 rounded ${
                          item.matchLevel === 1 ? 'bg-green-100 text-green-700' :
                          item.matchLevel === 2 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          精度Lv{item.matchLevel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
