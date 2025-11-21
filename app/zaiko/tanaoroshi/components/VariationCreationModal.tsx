// app/zaiko/tanaoroshi/components/VariationCreationModal.tsx
'use client'

import { useState } from 'react'
import { InventoryProduct } from '@/types/inventory'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, AlertCircle } from 'lucide-react'

interface VariationAttribute {
  name: string
  value: string
}

interface VariationCreationModalProps {
  products: InventoryProduct[]
  onClose: () => void
  onSuccess: () => void
}

export function VariationCreationModal({
  products,
  onClose,
  onSuccess
}: VariationCreationModalProps) {
  const [parentSkuName, setParentSkuName] = useState(`VAR-${Date.now()}`)
  const [categoryId, setCategoryId] = useState('')
  const [attributeNames, setAttributeNames] = useState<string[]>(['Color'])
  const [itemAttributes, setItemAttributes] = useState<VariationAttribute[][]>(
    products.map(() => [{ name: 'Color', value: '' }])
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 統一Item Price（最大DDPコスト）
  const maxDdpCost = Math.max(...products.map(p => p.cost_price || 0))

  // 各アイテムの追加利益
  const getExcessProfit = (costPrice: number) => maxDdpCost - costPrice

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
    setError(null)

    // バリデーション
    if (!parentSkuName.trim()) {
      setError('親SKU名を入力してください')
      return
    }

    // すべての属性値が入力されているかチェック
    for (let i = 0; i < itemAttributes.length; i++) {
      for (const attr of itemAttributes[i]) {
        if (!attr.value.trim()) {
          setError(`${products[i].sku || products[i].product_name}の属性「${attr.name}」を入力してください`)
          return
        }
      }
    }

    setLoading(true)
    try {
      // inventory_master → products_master形式に変換
      const selectedItems = products.map((product, index) => ({
        id: product.id,
        sku: product.sku || `AUTO-${product.unique_id}`,
        title: product.product_name,
        image: product.images && product.images.length > 0 ? product.images[0] : '',
        quantity: 1,
        ddp_cost_usd: product.cost_price || 0,
        stock_quantity: product.physical_quantity || 0,
        weight_g: product.source_data?.weight_g || 0,
        category_id: product.source_data?.category_id || null
      }))

      const response = await fetch('/api/products/create-variation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedItems,
          parentSkuName,
          attributes: itemAttributes,
          categoryId: categoryId || selectedItems[0].category_id
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'バリエーション作成に失敗しました')
      }

      alert(`✅ バリエーション作成成功!\n\n親SKU: ${data.parentSku}\n統一価格: $${data.unifiedItemPrice.toFixed(2)}\n追加利益合計: +$${data.summary.totalExcessProfit.toFixed(2)}`)

      onSuccess()
      onClose()

    } catch (err: any) {
      console.error('バリエーション作成エラー:', err)
      setError(err.message || 'バリエーション作成中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              バリエーション作成（eBay）
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              最大DDPコストベース・ハイブリッド価格戦略
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* エラー表示 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-900">エラー</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* 価格戦略サマリー */}
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-3">
              💰 価格戦略（最大DDPコストベース）
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">統一 Item Price（eBay出品価格）:</span>
                <span className="font-bold text-green-600 dark:text-green-400 text-lg">
                  ${maxDdpCost.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                ※ グループ内の最大DDPコストを統一価格とし、全バリエーションをカバー。構造的に赤字リスクはゼロです。
              </p>
            </div>
          </div>

          {/* 親SKU名 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              親SKU名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={parentSkuName}
              onChange={(e) => setParentSkuName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="例: VAR-GOLF-001"
            />
          </div>

          {/* カテゴリーID（オプション） */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              カテゴリーID（オプション）
            </label>
            <input
              type="text"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="例: 1234567890"
            />
            <p className="text-xs text-gray-500 mt-1">
              ※ 空白の場合、最初の商品のカテゴリーIDを使用します
            </p>
          </div>

          {/* 属性定義 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                バリエーション属性
              </h3>
              <Button
                onClick={addAttribute}
                size="sm"
                variant="outline"
              >
                + 属性追加
              </Button>
            </div>

            {attributeNames.map((attrName, attrIndex) => (
              <div key={attrIndex} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={attrName}
                  onChange={(e) => updateAttributeName(attrIndex, e.target.value)}
                  className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  placeholder="属性名（例: Color）"
                />
                {attributeNames.length > 1 && (
                  <Button
                    onClick={() => removeAttribute(attrIndex)}
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700"
                  >
                    削除
                  </Button>
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
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300 border">SKU</th>
                    <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300 border">商品名</th>
                    {attributeNames.map((name, i) => (
                      <th key={i} className="px-3 py-2 text-left text-gray-700 dark:text-gray-300 border">
                        {name}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 border">DDPコスト</th>
                    <th className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 border">
                      <span className="text-green-600 dark:text-green-400">追加利益</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {products.map((product, itemIndex) => {
                    const cost = product.cost_price || 0
                    const excessProfit = getExcessProfit(cost)

                    return (
                      <tr key={product.id} className="bg-white dark:bg-gray-800">
                        <td className="px-3 py-2 font-mono text-xs border">
                          {product.sku || `AUTO-${product.unique_id}`}
                        </td>
                        <td className="px-3 py-2 border">
                          <div className="max-w-xs truncate">{product.product_name}</div>
                        </td>
                        {attributeNames.map((_, attrIndex) => (
                          <td key={attrIndex} className="px-3 py-2 border">
                            <input
                              type="text"
                              value={itemAttributes[itemIndex]?.[attrIndex]?.value || ''}
                              onChange={(e) => updateAttributeValue(itemIndex, attrIndex, e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              placeholder="値を入力"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-white border">
                          ${cost.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-green-600 dark:text-green-400 border">
                          +${excessProfit.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              ※ 追加利益 = 統一価格 - 実際のDDPコスト。高コスト商品は0、低コスト商品は追加利益を得ます。
            </p>
          </div>
        </div>

        {/* フッター */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <Button
            onClick={onClose}
            disabled={loading}
            variant="outline"
          >
            キャンセル
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? '作成中...' : 'バリエーション作成'}
          </Button>
        </div>
      </div>
    </div>
  )
}
