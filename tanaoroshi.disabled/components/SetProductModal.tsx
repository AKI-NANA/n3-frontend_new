import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { InventoryProduct } from '@/types/inventory'
import { Button } from '@/components/ui/button'

interface SetProductModalProps {
  selectedProducts: InventoryProduct[]
  onClose: () => void
  onSuccess: (setProductId: string) => void
}

interface ComponentQuantity {
  productId: string
  quantity: number
}

export function SetProductModal({
  selectedProducts,
  onClose,
  onSuccess
}: SetProductModalProps) {
  const supabase = createClientComponentClient()

  const [formData, setFormData] = useState({
    product_name: '',
    sku: '',
    selling_price: 0
  })

  const [componentQuantities, setComponentQuantities] = useState<ComponentQuantity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // 初期化: 各商品の数量を1に設定
    setComponentQuantities(
      selectedProducts.map(p => ({
        productId: p.id,
        quantity: 1
      }))
    )

    // 自動的にセット商品名を生成
    if (selectedProducts.length > 0) {
      const names = selectedProducts.map(p => p.product_name).join(' + ')
      setFormData(prev => ({
        ...prev,
        product_name: `セット: ${names.substring(0, 100)}`,
        sku: `SET-${Date.now()}`
      }))
    }
  }, [selectedProducts])

  const handleQuantityChange = (productId: string, quantity: number) => {
    setComponentQuantities(prev =>
      prev.map(cq =>
        cq.productId === productId ? { ...cq, quantity: Math.max(1, quantity) } : cq
      )
    )
  }

  // 原価計算（構成商品の合計）
  const calculateTotalCost = () => {
    return selectedProducts.reduce((sum, product) => {
      const qty = componentQuantities.find(cq => cq.productId === product.id)?.quantity || 1
      return sum + (product.cost_price * qty)
    }, 0)
  }

  // 作成可能なセット数を計算
  const calculateAvailableSets = () => {
    let minSets = Infinity

    selectedProducts.forEach(product => {
      const qty = componentQuantities.find(cq => cq.productId === product.id)?.quantity || 1
      const possibleSets = Math.floor(product.physical_quantity / qty)
      minSets = Math.min(minSets, possibleSets)
    })

    return minSets === Infinity ? 0 : minSets
  }

  const availableSets = calculateAvailableSets()
  const totalCost = calculateTotalCost()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // バリデーション
      if (!formData.product_name.trim()) {
        throw new Error('セット商品名を入力してください')
      }
      if (formData.selling_price <= 0) {
        throw new Error('販売価格を入力してください')
      }
      if (availableSets === 0) {
        throw new Error('在庫不足によりセット商品を作成できません')
      }

      // セット商品を作成
      const setProductData = {
        unique_id: `SET-${Date.now()}`,
        product_name: formData.product_name,
        sku: formData.sku || null,
        product_type: 'set',
        cost_price: totalCost,
        selling_price: formData.selling_price,
        physical_quantity: 0, // セット商品の在庫は自動計算される
        listing_quantity: 0,
        condition_name: 'new', // セット商品は新品扱い
        category: selectedProducts[0]?.category || 'Electronics',
        images: selectedProducts[0]?.images || [],
        is_manual_entry: true,
        notes: `構成商品: ${selectedProducts.map(p => p.product_name).join(', ')}`
      }

      const { data: setProduct, error: insertError } = await supabase
        .from('inventory_master')
        .insert(setProductData)
        .select()
        .single()

      if (insertError) throw insertError

      // セット構成を登録
      const componentInserts = componentQuantities.map(cq => ({
        set_product_id: setProduct.id,
        component_product_id: cq.productId,
        quantity_required: cq.quantity
      }))

      const { error: componentsError } = await supabase
        .from('set_components')
        .insert(componentInserts)

      if (componentsError) throw componentsError

      onSuccess(setProduct.id)
    } catch (err: any) {
      console.error('Create set error:', err)
      setError(err.message || 'セット商品の作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">
            <i className="fas fa-layer-group mr-2 text-amber-600"></i>
            セット商品作成
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <i className="fas fa-times text-2xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* エラー表示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}

          {/* 在庫アラート */}
          {availableSets === 0 && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <div className="flex items-center text-red-800 mb-2">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                <span className="font-semibold">在庫不足</span>
              </div>
              <p className="text-sm text-red-700">
                構成商品の在庫が不足しているため、セット商品を作成できません。
              </p>
            </div>
          )}

          {/* セット情報 */}
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-amber-700 mb-1">構成商品数</p>
                <p className="text-2xl font-bold text-amber-900">{selectedProducts.length}</p>
              </div>
              <div>
                <p className="text-sm text-amber-700 mb-1">作成可能セット数</p>
                <p className={`text-2xl font-bold ${availableSets > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {availableSets}
                </p>
              </div>
              <div>
                <p className="text-sm text-amber-700 mb-1">原価合計</p>
                <p className="text-2xl font-bold text-amber-900">${totalCost.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* 構成商品リスト */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-slate-900 border-b pb-2">
              構成商品 ({selectedProducts.length}個)
            </h3>

            <div className="space-y-3">
              {selectedProducts.map((product, index) => {
                const qty = componentQuantities.find(cq => cq.productId === product.id)?.quantity || 1
                const possibleSets = Math.floor(product.physical_quantity / qty)

                return (
                  <div key={product.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      {/* 画像 */}
                      <div className="w-16 h-16 flex-shrink-0">
                        {product.images[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.product_name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-100 rounded flex items-center justify-center">
                            <i className="fas fa-image text-slate-300"></i>
                          </div>
                        )}
                      </div>

                      {/* 商品情報 */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 truncate">
                          {product.product_name}
                        </h4>
                        <div className="flex gap-3 mt-1 text-sm text-slate-600">
                          <span>原価: ${product.cost_price.toFixed(2)}</span>
                          <span>在庫: {product.physical_quantity}個</span>
                          {product.sku && <span className="font-mono">SKU: {product.sku}</span>}
                        </div>
                      </div>

                      {/* 数量設定 */}
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-slate-700 whitespace-nowrap">
                          必要数:
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={qty}
                          onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 1)}
                          className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-sm text-slate-500">
                          → <span className={possibleSets > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {possibleSets}セット可
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* セット商品設定 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-slate-900 border-b pb-2">
              セット商品設定
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                セット商品名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例: Apple完全セット (iPhone + AirPods + Watch)"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  SKU
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="自動生成されます"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  販売価格 (USD) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* 利益計算 */}
            {formData.selling_price > 0 && totalCost > 0 && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">原価合計:</span>
                    <span className="ml-2 font-bold text-blue-900">${totalCost.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">利益額:</span>
                    <span className="ml-2 font-bold text-blue-900">
                      ${(formData.selling_price - totalCost).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">利益率:</span>
                    <span className={`ml-2 font-bold ${
                      formData.selling_price > totalCost ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(((formData.selling_price - totalCost) / formData.selling_price) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 注意事項 */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm text-yellow-800">
            <div className="flex items-start gap-2">
              <i className="fas fa-info-circle mt-0.5"></i>
              <div>
                <p className="font-semibold mb-1">セット商品について</p>
                <ul className="list-disc list-inside space-y-1 text-yellow-700">
                  <li>セット商品の在庫数は構成商品から自動計算されます</li>
                  <li>セット商品を出品する際、構成商品の出品は自動的に停止されます</li>
                  <li>セット商品が販売されると、構成商品の在庫が自動的に減算されます</li>
                </ul>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={loading || availableSets === 0}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  作成中...
                </>
              ) : (
                <>
                  <i className="fas fa-layer-group mr-2"></i>
                  セット商品を作成
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
