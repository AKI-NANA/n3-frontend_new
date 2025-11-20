// app/tools/editing/components/VariationCreationModal.tsx
'use client'

import { useState } from 'react'
import { GroupingItem, VariationAttribute } from '@/types/product'

interface VariationCreationModalProps {
  items: GroupingItem[]
  onConfirm: (data: {
    parentSkuName: string
    attributes: VariationAttribute[][]  // 各子SKUの属性値
  }) => Promise<void>
  onCancel: () => void
}

export function VariationCreationModal({
  items,
  onConfirm,
  onCancel
}: VariationCreationModalProps) {
  const [parentSkuName, setParentSkuName] = useState(`VAR-${Date.now()}`)
  const [attributeNames, setAttributeNames] = useState<string[]>(['Color'])
  const [itemAttributes, setItemAttributes] = useState<VariationAttribute[][]>(
    items.map(() => [{ name: 'Color', value: '' }])
  )
  const [loading, setLoading] = useState(false)

  // 統一Item Price（最低DDPコスト）
  const minDdpCost = Math.min(...items.map(item => item.ddp_cost_usd))

  // 各アイテムの送料サーチャージ
  const getSurcharge = (ddpCost: number) => ddpCost - minDdpCost

  const addAttribute = () => {
    const newAttrName = `Attribute${attributeNames.length + 1}`
    setAttributeNames([...attributeNames, newAttrName])
    setItemAttributes(itemAttributes.map(attrs => [
      ...attrs,
      { name: newAttrName, value: '' }
    ]))
  }

  const removeAttribute = (index: number) => {
    setAttributeNames(attributeNames.filter((_, i) => i !== index))
    setItemAttributes(itemAttributes.map(attrs => attrs.filter((_, i) => i !== index)))
  }

  const updateAttributeName = (attrIndex: number, newName: string) => {
    setAttributeNames(prev => prev.map((name, i) => i === attrIndex ? newName : name))
    setItemAttributes(prev => prev.map(attrs =>
      attrs.map((attr, i) => i === attrIndex ? { ...attr, name: newName } : attr)
    ))
  }

  const updateAttributeValue = (itemIndex: number, attrIndex: number, value: string) => {
    setItemAttributes(prev => prev.map((attrs, i) =>
      i === itemIndex
        ? attrs.map((attr, j) => j === attrIndex ? { ...attr, value } : attr)
        : attrs
    ))
  }

  const handleConfirm = async () => {
    // バリデーション
    if (!parentSkuName.trim()) {
      alert('親SKU名を入力してください')
      return
    }

    // すべての属性値が入力されているかチェック
    for (let i = 0; i < itemAttributes.length; i++) {
      for (const attr of itemAttributes[i]) {
        if (!attr.value.trim()) {
          alert(`${items[i].sku}の属性「${attr.name}」を入力してください`)
          return
        }
      }
    }

    setLoading(true)
    try {
      await onConfirm({
        parentSkuName,
        attributes: itemAttributes
      })
    } catch (error) {
      console.error('Error creating variation:', error)
      alert('バリエーション作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            バリエーション作成（eBay）
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            最低価格ベース・ダイナミック送料加算戦略
          </p>
        </div>

        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* 価格戦略サマリー */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              💰 価格戦略
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">統一 Item Price（eBay出品価格）:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 text-lg">
                  ${minDdpCost.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                ※ 全バリエーションで同じ価格で表示されます。USA向けは送料加算で調整します。
              </p>
            </div>
          </div>

          {/* 親SKU名 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              親SKU名
            </label>
            <input
              type="text"
              value={parentSkuName}
              onChange={(e) => setParentSkuName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="例: VAR-GOLF-001"
            />
          </div>

          {/* 属性定義 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                バリエーション属性
              </h3>
              <button
                onClick={addAttribute}
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded"
              >
                + 属性追加
              </button>
            </div>

            {attributeNames.map((attrName, attrIndex) => (
              <div key={attrIndex} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={attrName}
                  onChange={(e) => updateAttributeName(attrIndex, e.target.value)}
                  className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="属性名（例: Color）"
                />
                {attributeNames.length > 1 && (
                  <button
                    onClick={() => removeAttribute(attrIndex)}
                    className="text-red-500 hover:text-red-700"
                  >
                    削除
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* 子SKU設定テーブル */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              各バリエーションの設定
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">SKU</th>
                    {attributeNames.map((name, i) => (
                      <th key={i} className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">
                        {name}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">適正DDPコスト</th>
                    <th className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                      <span className="text-green-600 dark:text-green-400">USA向け加算額</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {items.map((item, itemIndex) => (
                    <tr key={item.id} className="bg-white dark:bg-gray-800">
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                        {item.sku}
                      </td>
                      {attributeNames.map((_, attrIndex) => (
                        <td key={attrIndex} className="px-3 py-2">
                          <input
                            type="text"
                            value={itemAttributes[itemIndex]?.[attrIndex]?.value || ''}
                            onChange={(e) => updateAttributeValue(itemIndex, attrIndex, e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="値を入力"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-white">
                        ${item.ddp_cost_usd.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-green-600 dark:text-green-400">
                        +${getSurcharge(item.ddp_cost_usd).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              ※ USA向け加算額は、外部ツール（Ebaymugなど）を通じて送料に動的に加算されます。
            </p>
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
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? '作成中...' : '作成'}
          </button>
        </div>
      </div>
    </div>
  )
}
