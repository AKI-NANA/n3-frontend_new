// app/tools/editing/components/BundleCreationModal.tsx
'use client'

import { useState } from 'react'
import { GroupingItem } from '@/types/product'

interface BundleCreationModalProps {
  items: GroupingItem[]
  onConfirm: (data: {
    bundleSkuName: string
    bundleTitle: string
  }) => Promise<void>
  onCancel: () => void
}

export function BundleCreationModal({
  items,
  onConfirm,
  onCancel
}: BundleCreationModalProps) {
  const [bundleSkuName, setBundleSkuName] = useState(`BUNDLE-${Date.now()}`)
  const [bundleTitle, setBundleTitle] = useState('')
  const [loading, setLoading] = useState(false)

  // 自動計算: 原価合計
  const totalCost = items.reduce((sum, item) =>
    sum + (item.ddp_cost_usd * item.quantity), 0
  )

  // 自動計算: 最大在庫数（構成品の中で最小）
  const maxStock = Math.min(...items.map(item =>
    Math.floor((item.stock_quantity || 0) / item.quantity)
  ))

  // 優先度の高いアイテム（最も高価なアイテム）からデータを継承
  const priorityItem = items.reduce((max, item) =>
    item.ddp_cost_usd > max.ddp_cost_usd ? item : max
  , items[0])

  const handleConfirm = async () => {
    // バリデーション
    if (!bundleSkuName.trim()) {
      alert('セット品SKU名を入力してください')
      return
    }

    if (!bundleTitle.trim()) {
      alert('セット品タイトルを入力してください')
      return
    }

    setLoading(true)
    try {
      await onConfirm({
        bundleSkuName,
        bundleTitle
      })
    } catch (error) {
      console.error('Error creating bundle:', error)
      alert('セット品作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            セット品作成（全モール共通）
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            複数のアイテムを組み合わせて1つのセット品として出品
          </p>
        </div>

        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* 自動計算サマリー */}
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-3">
              📊 自動計算結果
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">仕入原価（合計）</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${totalCost.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">最大在庫数</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {maxStock} セット
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
              ※ 原価は構成品のDDPコスト × 数量の合計です。最大在庫数は、構成品の在庫数を考慮した作成可能なセット数です。
            </p>
          </div>

          {/* セット品SKU名 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              セット品SKU名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={bundleSkuName}
              onChange={(e) => setBundleSkuName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="例: BUNDLE-GOLF-001"
            />
          </div>

          {/* セット品タイトル */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              セット品タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={bundleTitle}
              onChange={(e) => setBundleTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="例: ゴルフクラブ3本セット（ドライバー、アイアン、パター）"
            />
            <p className="text-xs text-gray-500 mt-1">
              ※ 空白の場合、優先度の高いアイテム（{priorityItem.sku}）のタイトルを継承します
            </p>
          </div>

          {/* データ継承情報 */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              📋 データ継承
            </h3>
            <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">
              以下のデータは、最も高価なアイテム（<span className="font-bold">{priorityItem.sku}</span>）から自動継承されます：
            </p>
            <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li>商品タイトル（上書き可能）</li>
              <li>カテゴリ</li>
              <li>HTSコード</li>
              <li>原産国</li>
              <li>商品画像</li>
            </ul>
          </div>

          {/* 構成品テーブル */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              構成品
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">SKU</th>
                    <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">商品名</th>
                    <th className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">数量</th>
                    <th className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">単価</th>
                    <th className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">小計</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {items.map((item) => (
                    <tr key={item.id} className="bg-white dark:bg-gray-800">
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                        {item.sku}
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        {item.title.substring(0, 40)}...
                      </td>
                      <td className="px-3 py-2 text-center text-gray-900 dark:text-white">
                        {item.quantity}個
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-white">
                        ${item.ddp_cost_usd.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">
                        ${(item.ddp_cost_usd * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 dark:bg-gray-700 font-bold">
                    <td colSpan={4} className="px-3 py-2 text-right text-gray-900 dark:text-white">
                      合計原価:
                    </td>
                    <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">
                      ${totalCost.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 在庫連携の説明 */}
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              ⚠️ 在庫連携について
            </h3>
            <ul className="list-disc list-inside text-xs text-gray-700 dark:text-gray-300 space-y-1">
              <li>セット品が出品されると、構成品の在庫が「予約済み」として引き落とされます</li>
              <li>セット品が売れた場合、構成品の在庫が設定された数量分減少します</li>
              <li>最大{maxStock}セットまで作成可能です</li>
            </ul>
          </div>
        </div>

        {/* フッター */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? '作成中...' : 'セット品を作成'}
          </button>
        </div>
      </div>
    </div>
  )
}
