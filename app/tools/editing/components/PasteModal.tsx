// app/tools/editing/components/PasteModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import type { Product, ProductUpdate } from '../types/product'

interface PasteModalProps {
  products: Product[]
  onClose: () => void
  onApply: (updates: { id: string; data: ProductUpdate }[]) => void
}

export function PasteModal({ products, onClose, onApply }: PasteModalProps) {
  const [pasteData, setPasteData] = useState('')
  const [startColumn, setStartColumn] = useState(4) // 長さから開始
  const [preview, setPreview] = useState<string[][] | null>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const columnNames = [
    'item_id',
    'sku',
    'title',
    'acquired_price_jpy',
    'length_cm',
    'width_cm',
    'height_cm',
    'weight_g',
    'condition',
    'image_count',
    'ddp_price_usd',
    'ddu_price_usd',
    'shipping_service',
    'shipping_cost_usd',
    'shipping_policy',
    'stock_quantity',
    'category_name',
    'category_number',
    'handling_time'
  ]

  const columnLabels = [
    'Item ID',
    'SKU',
    '商品名',
    '取得価格(JPY)',
    '長さ(cm)',
    '幅(cm)',
    '高さ(cm)',
    '重さ(g)',
    '状態',
    '画像枚数',
    'DDP価格(USD)',
    'DDU価格(USD)',
    '配送サービス',
    '送料(USD)',
    '配送ポリシー',
    '在庫数',
    'カテゴリ名',
    'カテゴリ番号',
    'ハンドリングタイム'
  ]

  const handlePasteChange = (value: string) => {
    setPasteData(value)
    
    if (!value.trim()) {
      setPreview(null)
      return
    }

    // Excelからの貼り付けをパース（タブ区切り）
    const rows = value.trim().split('\n').map(row => row.split('\t'))
    setPreview(rows)
  }

  const handleApply = () => {
    if (!preview || preview.length === 0) return

    const updates: { id: string; data: ProductUpdate }[] = []

    preview.forEach((row, rowIndex) => {
      if (rowIndex >= products.length) return

      const product = products[rowIndex]
      const data: ProductUpdate = {}

      row.forEach((value, colOffset) => {
        const columnIndex = startColumn + colOffset
        if (columnIndex >= columnNames.length) return

        const field = columnNames[columnIndex]
        const trimmedValue = value.trim()

        // 数値フィールドの処理
        const numericFields = [
          'acquired_price_jpy', 'ddp_price_usd', 'ddu_price_usd',
          'length_cm', 'width_cm', 'height_cm', 'weight_g',
          'image_count', 'shipping_cost_usd', 'stock_quantity',
          'sm_competitors', 'sm_min_price_usd', 'sm_profit_margin',
          'listing_score'
        ]

        if (numericFields.includes(field)) {
          data[field] = trimmedValue === '' ? null : parseFloat(trimmedValue)
        } else {
          data[field] = trimmedValue
        }
      })

      if (Object.keys(data).length > 0) {
        updates.push({ id: product.id, data })
      }
    })

    onApply(updates)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Excel貼り付け</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
          >
            ×
          </button>
        </div>

        {/* ボディ */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 開始列選択 */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              貼り付け開始列:
            </label>
            <select
              value={startColumn}
              onChange={(e) => setStartColumn(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {columnLabels.map((label, index) => (
                <option key={index} value={index}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* 貼り付けエリア */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              データ (Excelから貼り付け):
            </label>
            <textarea
              value={pasteData}
              onChange={(e) => handlePasteChange(e.target.value)}
              placeholder="Excelデータをコピーして貼り付けてください&#10;&#10;例:&#10;20	15	5	250&#10;10	7	0.5	50"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px] resize-y font-mono text-sm"
            />
          </div>

          {/* プレビュー */}
          {preview && (
            <div className="bg-gray-50 rounded-md p-4 max-h-[200px] overflow-auto">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">
                プレビュー
              </h3>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    {preview[0]?.map((_, colIndex) => (
                      <th key={colIndex} className="p-2 border text-left">
                        {columnLabels[startColumn + colIndex] || `列${startColumn + colIndex}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="p-2 border">
                          {cell || '(空)'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex justify-end gap-3 p-6 border-t">
          <Button
            onClick={onClose}
            variant="outline"
          >
            キャンセル
          </Button>
          <Button
            onClick={handleApply}
            disabled={!preview || preview.length === 0}
            variant="default"
          >
            貼り付け実行
          </Button>
        </div>
      </div>
    </div>
  )
}
