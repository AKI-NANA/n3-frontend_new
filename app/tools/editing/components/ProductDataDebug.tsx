// app/tools/editing/components/ProductDataDebug.tsx
'use client'

import { useState } from 'react'
import type { Product } from '../types/product'

interface ProductDataDebugProps {
  product: Product
}

export function ProductDataDebug({ product }: ProductDataDebugProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs text-blue-600 hover:text-blue-800 underline"
      >
        🔍 データ構造を確認
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-bold">商品データ構造（ID: {product.id}）</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
          {/* 基本情報 */}
          <section className="mb-6">
            <h3 className="font-bold text-sm mb-2 text-blue-600">📋 基本情報</h3>
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs space-y-1">
              <div><strong>ID:</strong> {product.id} ({typeof product.id})</div>
              <div><strong>タイトル:</strong> {product.title || 'なし'}</div>
              <div><strong>英語タイトル:</strong> {product.english_title || product.title_en || 'なし'}</div>
              <div><strong>ソース:</strong> {product.source_system || 'unknown'} / {product.source_id || 'N/A'}</div>
            </div>
          </section>

          {/* 価格情報 */}
          <section className="mb-6">
            <h3 className="font-bold text-sm mb-2 text-green-600">💰 価格情報</h3>
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs space-y-1">
              <div className={!product.price_jpy ? 'text-red-600 font-bold' : ''}>
                <strong>price_jpy:</strong> {product.price_jpy ?? '❌ なし (必須!)'}
              </div>
              <div><strong>price_usd:</strong> {product.price_usd ?? 'なし'}</div>
              <div><strong>current_price:</strong> {product.current_price ?? 'なし'}</div>
              <div><strong>purchase_price_jpy:</strong> {product.purchase_price_jpy ?? 'なし'}</div>
            </div>
          </section>

          {/* listing_data */}
          <section className="mb-6">
            <h3 className="font-bold text-sm mb-2 text-purple-600">📦 listing_data (JSONB)</h3>
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs">
              {product.listing_data ? (
                <div className="space-y-2">
                  <div>
                    <strong>型:</strong> {typeof product.listing_data}
                  </div>
                  <div>
                    <strong>キー:</strong> {Object.keys(product.listing_data).join(', ') || 'なし'}
                  </div>
                  
                  {/* 重要フィールドを個別表示 */}
                  <div className="mt-3 border-t pt-2">
                    <div className={!(product.listing_data as any).weight_g ? 'text-red-600 font-bold' : ''}>
                      <strong>weight_g:</strong> {(product.listing_data as any).weight_g ?? '❌ なし (必須!)'}
                    </div>
                    <div><strong>length_cm:</strong> {(product.listing_data as any).length_cm ?? 'なし'}</div>
                    <div><strong>width_cm:</strong> {(product.listing_data as any).width_cm ?? 'なし'}</div>
                    <div><strong>height_cm:</strong> {(product.listing_data as any).height_cm ?? 'なし'}</div>
                    <div><strong>ddp_price_usd:</strong> {(product.listing_data as any).ddp_price_usd ?? 'なし'}</div>
                    <div><strong>shipping_cost_usd:</strong> {(product.listing_data as any).shipping_cost_usd ?? 'なし'}</div>
                  </div>
                  
                  {/* 全データ（JSON形式） */}
                  <details className="mt-3">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                      全データを表示
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto text-[10px]">
                      {JSON.stringify(product.listing_data, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <div className="text-red-600 font-bold">❌ listing_dataが存在しません</div>
              )}
            </div>
          </section>

          {/* scraped_data */}
          <section className="mb-6">
            <h3 className="font-bold text-sm mb-2 text-orange-600">🕷️ scraped_data (JSONB)</h3>
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs">
              {product.scraped_data ? (
                <details>
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                    データを表示
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto text-[10px]">
                    {JSON.stringify(product.scraped_data, null, 2)}
                  </pre>
                </details>
              ) : (
                <div className="text-gray-500">なし</div>
              )}
            </div>
          </section>

          {/* 画像情報 */}
          <section className="mb-6">
            <h3 className="font-bold text-sm mb-2 text-pink-600">🖼️ 画像情報</h3>
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs space-y-1">
              <div><strong>primary_image_url:</strong> {product.primary_image_url || 'なし'}</div>
              <div><strong>images:</strong> {Array.isArray(product.images) ? `配列(${product.images.length}件)` : typeof product.images}</div>
              <div><strong>image_count:</strong> {product.image_count ?? 'なし'}</div>
              {product.primary_image_url && (
                <img 
                  src={product.primary_image_url} 
                  alt="商品画像" 
                  className="mt-2 w-32 h-32 object-cover rounded border"
                />
              )}
            </div>
          </section>

          {/* 診断結果 */}
          <section className="mb-6">
            <h3 className="font-bold text-sm mb-2 text-red-600">🔍 診断結果</h3>
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded text-xs space-y-2">
              {!product.price_jpy && (
                <div className="flex items-start gap-2">
                  <span className="text-red-600">❌</span>
                  <div>
                    <strong>price_jpy が不足</strong>
                    <div className="text-gray-600 mt-1">
                      送料・利益計算に必要です。<br/>
                      対処: purchase_price_jpy または current_price から設定してください
                    </div>
                  </div>
                </div>
              )}
              
              {!(product.listing_data as any)?.weight_g && (
                <div className="flex items-start gap-2">
                  <span className="text-red-600">❌</span>
                  <div>
                    <strong>listing_data.weight_g が不足</strong>
                    <div className="text-gray-600 mt-1">
                      送料・利益計算に必要です。<br/>
                      対処: 商品の重量（グラム）を入力してください
                    </div>
                  </div>
                </div>
              )}

              {product.price_jpy && (product.listing_data as any)?.weight_g && (
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✅</span>
                  <div>
                    <strong>必須データが揃っています</strong>
                    <div className="text-gray-600 mt-1">
                      送料・利益計算を実行できます
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={() => {
              console.log('📋 Product Data:', product)
              alert('コンソールに完全なデータを出力しました')
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            コンソールに出力
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
