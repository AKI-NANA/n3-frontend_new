import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { InventoryProduct, ProductType, ConditionType } from '@/types/inventory'
import { Button } from '@/components/ui/button'

interface ProductRegistrationModalProps {
  product: InventoryProduct | null
  onClose: () => void
  onSuccess: () => void
}

export function ProductRegistrationModal({
  product,
  onClose,
  onSuccess
}: ProductRegistrationModalProps) {
  const supabase = createClientComponentClient()
  const isEdit = !!product

  const [formData, setFormData] = useState({
    product_name: '',
    sku: '',
    product_type: 'stock' as ProductType,
    cost_price: 0,
    selling_price: 0,
    physical_quantity: 0,
    condition_name: 'used' as ConditionType,
    category: 'Electronics',
    subcategory: '',
    images: [] as string[],
    supplier_url: '',
    tracking_id: '',
    notes: ''
  })

  const [imageInput, setImageInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (product) {
      setFormData({
        product_name: product.product_name,
        sku: product.sku || '',
        product_type: product.product_type,
        cost_price: product.cost_price,
        selling_price: product.selling_price,
        physical_quantity: product.physical_quantity,
        condition_name: product.condition_name,
        category: product.category,
        subcategory: product.subcategory || '',
        images: product.images || [],
        supplier_url: product.supplier_info?.url || '',
        tracking_id: product.supplier_info?.tracking_id || '',
        notes: product.notes || ''
      })
    }
  }, [product])

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleAddImage = () => {
    if (imageInput.trim()) {
      setFormData({
        ...formData,
        images: [...formData.images, imageInput.trim()]
      })
      setImageInput('')
    }
  }

  const handleRemoveImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // バリデーション
      if (!formData.product_name.trim()) {
        throw new Error('商品名を入力してください')
      }
      if (formData.cost_price < 0 || formData.selling_price < 0) {
        throw new Error('価格は0以上で入力してください')
      }
      if (formData.physical_quantity < 0) {
        throw new Error('在庫数は0以上で入力してください')
      }

      const productData = {
        unique_id: isEdit ? product.unique_id : `ITEM-${Date.now()}`,
        product_name: formData.product_name,
        sku: formData.sku || null,
        product_type: formData.product_type,
        cost_price: formData.cost_price,
        selling_price: formData.selling_price,
        physical_quantity: formData.physical_quantity,
        listing_quantity: 0,
        condition_name: formData.condition_name,
        category: formData.category,
        subcategory: formData.subcategory || null,
        images: formData.images,
        supplier_info: {
          url: formData.supplier_url || undefined,
          tracking_id: formData.tracking_id || undefined
        },
        is_manual_entry: true,
        notes: formData.notes || null
      }

      if (isEdit) {
        // 更新
        const { error: updateError } = await supabase
          .from('inventory_master')
          .update(productData)
          .eq('id', product.id)

        if (updateError) throw updateError

        // 在庫変更履歴を記録
        if (formData.physical_quantity !== product.physical_quantity) {
          await supabase.from('inventory_changes').insert({
            product_id: product.id,
            change_type: 'manual',
            quantity_before: product.physical_quantity,
            quantity_after: formData.physical_quantity,
            source: 'manual_edit',
            notes: '手動編集による在庫調整'
          })
        }
      } else {
        // 新規作成
        const { data: newProduct, error: insertError } = await supabase
          .from('inventory_master')
          .insert(productData)
          .select()
          .single()

        if (insertError) throw insertError

        // 初回在庫履歴
        if (formData.physical_quantity > 0) {
          await supabase.from('inventory_changes').insert({
            product_id: newProduct.id,
            change_type: 'import',
            quantity_before: 0,
            quantity_after: formData.physical_quantity,
            source: 'manual_registration',
            notes: '新規登録'
          })
        }
      }

      onSuccess()
    } catch (err: any) {
      console.error('Save error:', err)
      setError(err.message || '保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">
            {isEdit ? '商品編集' : '新規商品登録'}
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

          {/* 基本情報 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-slate-900 border-b pb-2">
              基本情報
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                商品名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) => handleChange('product_name', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例: iPhone 14 Pro Max 256GB"
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
                  onChange={(e) => handleChange('sku', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例: APL-IP14PM-256"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  商品タイプ <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.product_type}
                  onChange={(e) => handleChange('product_type', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isEdit && product?.product_type === 'set'}
                >
                  <option value="stock">有在庫</option>
                  <option value="dropship">無在庫</option>
                  <option value="hybrid">ハイブリッド</option>
                  {isEdit && product?.product_type === 'set' && (
                    <option value="set">セット商品</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* 価格・在庫 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-slate-900 border-b pb-2">
              価格・在庫
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  原価 (USD) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={(e) => handleChange('cost_price', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
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
                  onChange={(e) => handleChange('selling_price', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  現在庫数 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.physical_quantity}
                  onChange={(e) => handleChange('physical_quantity', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {formData.selling_price > 0 && formData.cost_price > 0 && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm">
                <span className="font-semibold text-blue-900">利益率: </span>
                <span className="text-blue-700">
                  {(((formData.selling_price - formData.cost_price) / formData.selling_price) * 100).toFixed(1)}%
                </span>
                <span className="ml-4 font-semibold text-blue-900">利益額: </span>
                <span className="text-blue-700">
                  ${(formData.selling_price - formData.cost_price).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* カテゴリ・状態 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-slate-900 border-b pb-2">
              カテゴリ・状態
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  カテゴリ <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Electronics">Electronics</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Home">Home</option>
                  <option value="Sports">Sports</option>
                  <option value="Books">Books</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  サブカテゴリ
                </label>
                <input
                  type="text"
                  value={formData.subcategory}
                  onChange={(e) => handleChange('subcategory', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例: Smartphones"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  商品状態 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.condition_name}
                  onChange={(e) => handleChange('condition_name', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="new">新品</option>
                  <option value="used">中古</option>
                  <option value="refurbished">整備済</option>
                </select>
              </div>
            </div>
          </div>

          {/* 画像 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-slate-900 border-b pb-2">
              商品画像
            </h3>

            <div className="flex gap-2">
              <input
                type="url"
                value={imageInput}
                onChange={(e) => setImageInput(e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="画像URLを入力..."
              />
              <Button type="button" onClick={handleAddImage} variant="outline">
                <i className="fas fa-plus mr-2"></i>
                追加
              </Button>
            </div>

            {formData.images.length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                {formData.images.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={img}
                      alt={`Product ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 仕入先情報 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-slate-900 border-b pb-2">
              仕入先情報
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  仕入先URL
                </label>
                <input
                  type="url"
                  value={formData.supplier_url}
                  onChange={(e) => handleChange('supplier_url', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  トラッキングID
                </label>
                <input
                  type="text"
                  value={formData.tracking_id}
                  onChange={(e) => handleChange('tracking_id', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例: AMZN-123456"
                />
              </div>
            </div>
          </div>

          {/* メモ */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              メモ
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="商品に関するメモを入力..."
            />
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
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  保存中...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  {isEdit ? '更新' : '登録'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
