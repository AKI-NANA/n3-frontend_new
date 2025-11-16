// app/tools/editing/components/QuickDataFix.tsx
'use client'

import { useState } from 'react'
import type { Product } from '../types/product'

interface QuickDataFixProps {
  product: Product
  onUpdate: (id: string | number, updates: any) => void
}

export function QuickDataFix({ product, onUpdate }: QuickDataFixProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [priceJpy, setPriceJpy] = useState(product.price_jpy?.toString() || '')
  const [weightG, setWeightG] = useState((product.listing_data as any)?.weight_g?.toString() || '')
  const [lengthCm, setLengthCm] = useState((product.listing_data as any)?.length_cm?.toString() || '')
  const [widthCm, setWidthCm] = useState((product.listing_data as any)?.width_cm?.toString() || '')
  const [heightCm, setHeightCm] = useState((product.listing_data as any)?.height_cm?.toString() || '')

  const hasIssues = !product.price_jpy || !(product.listing_data as any)?.weight_g

  if (!hasIssues && !isOpen) {
    return null
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded"
      >
        ⚠️ データ不足を修正
      </button>
    )
  }

  const handleSave = () => {
    const updates: any = {}

    // price_jpyを更新
    if (priceJpy && parseFloat(priceJpy) > 0) {
      updates.price_jpy = parseFloat(priceJpy)
    }

    // listing_dataを更新
    const listingDataUpdates: any = {}
    
    if (weightG && parseFloat(weightG) > 0) {
      listingDataUpdates.weight_g = parseFloat(weightG)
    }
    
    if (lengthCm && parseFloat(lengthCm) > 0) {
      listingDataUpdates.length_cm = parseFloat(lengthCm)
    }
    
    if (widthCm && parseFloat(widthCm) > 0) {
      listingDataUpdates.width_cm = parseFloat(widthCm)
    }
    
    if (heightCm && parseFloat(heightCm) > 0) {
      listingDataUpdates.height_cm = parseFloat(heightCm)
    }

    // 既存のlisting_dataとマージ
    if (Object.keys(listingDataUpdates).length > 0) {
      updates.listing_data = {
        ...(product.listing_data || {}),
        ...listingDataUpdates
      }
    }

    if (Object.keys(updates).length > 0) {
      onUpdate(product.id, updates)
      setIsOpen(false)
      alert('✅ データを更新しました。「保存(1)」ボタンでDBに保存してください。')
    } else {
      alert('⚠️ 更新するデータがありません')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold">データ不足を修正</h2>
          <p className="text-sm text-gray-600 mt-1">
            ID: {product.id} - {product.title?.substring(0, 40)}...
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* 価格 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              仕入れ価格 (JPY) {!product.price_jpy && <span className="text-red-600">*必須</span>}
            </label>
            <input
              type="number"
              value={priceJpy}
              onChange={(e) => setPriceJpy(e.target.value)}
              placeholder="例: 5000"
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
            {product.purchase_price_jpy && (
              <button
                onClick={() => setPriceJpy(product.purchase_price_jpy!.toString())}
                className="text-xs text-blue-600 hover:underline mt-1"
              >
                購入価格から設定: ¥{product.purchase_price_jpy.toLocaleString()}
              </button>
            )}
          </div>

          {/* 重量 */}
          <div>
            <label className="block text-sm font-medium mb-1">
              重量 (g) {!(product.listing_data as any)?.weight_g && <span className="text-red-600">*必須</span>}
            </label>
            <input
              type="number"
              value={weightG}
              onChange={(e) => setWeightG(e.target.value)}
              placeholder="例: 500"
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              目安: 小物 100-300g / 中型 500-1000g / 大型 1000g以上
            </p>
          </div>

          {/* サイズ（オプション） */}
          <div>
            <label className="block text-sm font-medium mb-1">
              サイズ (cm) - オプション
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                value={lengthCm}
                onChange={(e) => setLengthCm(e.target.value)}
                placeholder="長さ"
                className="px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                value={widthCm}
                onChange={(e) => setWidthCm(e.target.value)}
                placeholder="幅"
                className="px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="高さ"
                className="px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 注意事項 */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded text-sm">
            <strong className="text-yellow-800 dark:text-yellow-200">⚠️ 注意:</strong>
            <ul className="mt-1 text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• 更新後、「保存(1)」ボタンでDBに保存する必要があります</li>
              <li>• 重量とサイズは送料計算に影響します</li>
              <li>• 不明な場合は類似商品の値を参考にしてください</li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            更新
          </button>
        </div>
      </div>
    </div>
  )
}
