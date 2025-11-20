// app/tools/editing/components/GroupingBox.tsx
'use client'

import { useState, useEffect } from 'react'
import { GroupingItem } from '@/types/product'
import { Product } from '../types/product'

interface GroupingBoxProps {
  selectedProducts: Product[]
  onCreateVariation: (items: GroupingItem[]) => void
  onCreateBundle: (items: GroupingItem[]) => void
  onClose: () => void
}

export function GroupingBox({
  selectedProducts,
  onCreateVariation,
  onCreateBundle,
  onClose
}: GroupingBoxProps) {
  const [items, setItems] = useState<GroupingItem[]>([])
  const [showDetails, setShowDetails] = useState(true)

  // 選択された商品をGroupingItemに変換
  useEffect(() => {
    const groupingItems: GroupingItem[] = selectedProducts.map(product => ({
      id: String(product.id),
      sku: product.sku || 'N/A',
      title: product.title || product.english_title || 'No Title',
      image: product.primary_image_url || product.images?.[0] || '',
      quantity: 1,
      ddp_cost_usd: product.ddp_price_usd || 0,
      stock_quantity: product.current_stock || product.inventory_quantity || 0,
      size_cm: product.listing_data?.length_cm ? {
        length: product.listing_data.length_cm,
        width: product.listing_data.width_cm || 0,
        height: product.listing_data.height_cm || 0
      } : undefined,
      weight_g: product.listing_data?.weight_g
    }))
    setItems(groupingItems)
  }, [selectedProducts])

  const updateQuantity = (id: string, quantity: number) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
    ))
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const getTotalCost = () => {
    return items.reduce((sum, item) => sum + (item.ddp_cost_usd * item.quantity), 0)
  }

  const getMinStock = () => {
    return Math.min(...items.map(item =>
      Math.floor((item.stock_quantity || 0) / item.quantity)
    ))
  }

  // バリエーション作成の事前チェック
  const canCreateVariation = () => {
    if (items.length < 2) return { can: false, reason: 'バリエーションには2つ以上のアイテムが必要です' }

    // DDPコスト近接チェック（最大 - 最小が$20または10%を超えない）
    const costs = items.map(item => item.ddp_cost_usd)
    const minCost = Math.min(...costs)
    const maxCost = Math.max(...costs)
    const diff = maxCost - minCost
    const percentDiff = (diff / minCost) * 100

    if (diff > 20 && percentDiff > 10) {
      return {
        can: false,
        reason: `DDPコストの差が大きすぎます（差額: $${diff.toFixed(2)}, ${percentDiff.toFixed(1)}%）`
      }
    }

    // サイズ許容範囲チェック（最大体積が最小体積の150%を超えない）
    const volumes = items
      .filter(item => item.size_cm)
      .map(item => {
        const size = item.size_cm!
        return size.length * size.width * size.height
      })

    if (volumes.length > 0) {
      const minVol = Math.min(...volumes)
      const maxVol = Math.max(...volumes)
      if (maxVol > minVol * 1.5) {
        return {
          can: false,
          reason: `サイズの差が大きすぎます（最大体積が最小の${(maxVol / minVol * 100).toFixed(0)}%）`
        }
      }
    }

    return { can: true, reason: '' }
  }

  const variationCheck = canCreateVariation()

  return (
    <div className="fixed right-4 top-20 w-96 bg-white dark:bg-gray-800 shadow-2xl rounded-lg border border-gray-200 dark:border-gray-700 max-h-[calc(100vh-6rem)] flex flex-col z-50">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              セット/バリエーション作成BOX
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {items.length}件のアイテムを選択中
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* サマリー情報 */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">合計コスト:</span>
            <span className="ml-2 font-bold text-blue-600 dark:text-blue-400">
              ${getTotalCost().toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">最大在庫:</span>
            <span className="ml-2 font-bold text-green-600 dark:text-green-400">
              {getMinStock()}個
            </span>
          </div>
        </div>
      </div>

      {/* アイテムリスト */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>アイテムを選択してください</p>
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
            >
              <div className="flex gap-3">
                {/* 画像サムネイル */}
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-16 h-16 object-cover rounded"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                    <span className="text-gray-400 text-xs">No Image</span>
                  </div>
                )}

                {/* 商品情報 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {item.sku}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {item.title.substring(0, 40)}...
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      ${item.ddp_cost_usd.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs text-gray-500">
                      在庫: {item.stock_quantity}個
                    </span>
                  </div>
                </div>

                {/* 削除ボタン */}
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 数量設定 */}
              <div className="mt-2 flex items-center gap-2">
                <label className="text-xs text-gray-600 dark:text-gray-400">
                  数量:
                </label>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                  className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <span className="text-xs text-gray-500">
                  小計: ${(item.ddp_cost_usd * item.quantity).toFixed(2)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* アクションボタン */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        {/* バリエーション作成ボタン */}
        <button
          onClick={() => onCreateVariation(items)}
          disabled={!variationCheck.can}
          className={`w-full px-4 py-2 rounded-lg font-semibold text-white ${
            variationCheck.can
              ? 'bg-purple-600 hover:bg-purple-700'
              : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
          }`}
          title={variationCheck.can ? 'バリエーションを作成' : variationCheck.reason}
        >
          📦 バリエーション作成（eBay）
        </button>
        {!variationCheck.can && (
          <p className="text-xs text-red-500">{variationCheck.reason}</p>
        )}

        {/* セット品作成ボタン */}
        <button
          onClick={() => onCreateBundle(items)}
          disabled={items.length === 0}
          className={`w-full px-4 py-2 rounded-lg font-semibold text-white ${
            items.length > 0
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
          }`}
        >
          🎁 セット品作成（全モール共通）
        </button>
      </div>
    </div>
  )
}
