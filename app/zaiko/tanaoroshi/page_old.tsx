'use client'

import { useState, useEffect } from 'react'
import { StatsHeader } from './components/StatsHeader'
import { FilterPanel } from './components/FilterPanel'
import { ProductCard } from './components/ProductCard'
import { ProductRegistrationModal } from './components/ProductRegistrationModal'
import { SetProductModal } from './components/SetProductModal'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { InventoryProduct, InventoryStats, InventoryFilter } from '@/types/inventory'

export default function TanaoroshiPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [filteredProducts, setFilteredProducts] = useState<InventoryProduct[]>([])
  const [stats, setStats] = useState<InventoryStats>({
    total: 0,
    in_stock: 0,
    out_of_stock: 0,
    stock_count: 0,
    dropship_count: 0,
    set_count: 0,
    total_value: 0
  })
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showProductModal, setShowProductModal] = useState(false)
  const [showSetModal, setShowSetModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null)
  const [filter, setFilter] = useState<InventoryFilter>({
    product_type: 'all',
    stock_status: 'all',
    condition: 'all'
  })
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  // データ取得
  useEffect(() => {
    loadProducts()
  }, [])

  // フィルター適用
  useEffect(() => {
    applyFilters()
  }, [products, filter])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('inventory_master')
        .select(`
          *,
          set_components (
            id,
            quantity_required,
            component:component_product_id (
              id,
              product_name,
              sku,
              images,
              physical_quantity
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setProducts(data || [])
      calculateStats(data || [])
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data: InventoryProduct[]) => {
    const stats: InventoryStats = {
      total: data.length,
      in_stock: data.filter(p => p.physical_quantity > 0).length,
      out_of_stock: data.filter(p => p.physical_quantity === 0).length,
      stock_count: data.filter(p => p.product_type === 'stock').length,
      dropship_count: data.filter(p => p.product_type === 'dropship').length,
      set_count: data.filter(p => p.product_type === 'set').length,
      total_value: data.reduce((sum, p) => sum + (p.cost_price * p.physical_quantity), 0)
    }
    setStats(stats)
  }

  const applyFilters = () => {
    let filtered = [...products]

    // 検索
    if (filter.search) {
      const search = filter.search.toLowerCase()
      filtered = filtered.filter(p =>
        p.product_name.toLowerCase().includes(search) ||
        p.sku?.toLowerCase().includes(search)
      )
    }

    // 商品タイプ
    if (filter.product_type && filter.product_type !== 'all') {
      filtered = filtered.filter(p => p.product_type === filter.product_type)
    }

    // 在庫状態
    if (filter.stock_status && filter.stock_status !== 'all') {
      if (filter.stock_status === 'in_stock') {
        filtered = filtered.filter(p => p.physical_quantity > 0)
      } else {
        filtered = filtered.filter(p => p.physical_quantity === 0)
      }
    }

    // カテゴリ
    if (filter.category) {
      filtered = filtered.filter(p => p.category === filter.category)
    }

    // 状態
    if (filter.condition && filter.condition !== 'all') {
      filtered = filtered.filter(p => p.condition_name === filter.condition)
    }

    setFilteredProducts(filtered)
  }

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const handleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)))
    }
  }

  const handleSendToEditing = async (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    try {
      // yahoo_scraped_products に変換して挿入
      const { error } = await supabase
        .from('yahoo_scraped_products')
        .insert({
          source: 'tanaoroshi',
          source_item_id: product.unique_id,
          sku: product.sku,
          title: product.product_name,
          price_jpy: product.cost_price * 150, // USD → JPY概算
          current_stock: product.physical_quantity,
          scraped_data: {
            images: product.images,
            category: product.category,
            condition: product.condition_name,
            is_set: product.product_type === 'set',
            set_components: product.set_components
          }
        })

      if (error) throw error

      // /tools/editing に遷移
      router.push('/tools/editing?from=tanaoroshi')
    } catch (error) {
      console.error('Error sending to editing:', error)
      alert('出品データ作成に失敗しました')
    }
  }

  const handleEditProduct = (product: InventoryProduct) => {
    setEditingProduct(product)
    setShowProductModal(true)
  }

  const handleCreateSet = () => {
    if (selectedIds.size < 2) {
      alert('セット商品を作成するには2つ以上の商品を選択してください')
      return
    }
    setShowSetModal(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-6 py-8 max-w-[1800px]">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            📦 棚卸し管理
          </h1>
          <p className="text-slate-600">
            在庫の一元管理・セット商品作成・出品データ連携
          </p>
        </div>

        {/* 統計ヘッダー */}
        <StatsHeader stats={stats} selectedCount={selectedIds.size} />

        {/* アクションバー */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={() => {
                  setEditingProduct(null)
                  setShowProductModal(true)
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <i className="fas fa-plus mr-2"></i>
                新規商品登録
              </Button>

              <Button
                variant="secondary"
                disabled={selectedIds.size < 2}
                onClick={handleCreateSet}
              >
                <i className="fas fa-layer-group mr-2"></i>
                セット商品作成 ({selectedIds.size}件選択中)
              </Button>

              {selectedIds.size > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setSelectedIds(new Set())}
                >
                  <i className="fas fa-times mr-2"></i>
                  選択解除
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">
                {filteredProducts.length}件表示
              </span>
              <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                <button
                  className={`px-4 py-2 text-sm ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  onClick={() => setViewMode('grid')}
                >
                  <i className="fas fa-th mr-2"></i>
                  カード
                </button>
                <button
                  className={`px-4 py-2 text-sm ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  onClick={() => setViewMode('table')}
                >
                  <i className="fas fa-list mr-2"></i>
                  テーブル
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* フィルターパネル */}
        <FilterPanel
          filter={filter}
          onFilterChange={setFilter}
          categories={[...new Set(products.map(p => p.category))]}
        />

        {/* 商品グリッド */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                selected={selectedIds.has(product.id)}
                onToggleSelect={() => handleToggleSelect(product.id)}
                onEdit={() => handleEditProduct(product)}
                onSendToEditing={() => handleSendToEditing(product.id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">画像</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">商品名</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">タイプ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">原価</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">在庫</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => handleToggleSelect(product.id)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {product.images[0] ? (
                        <img src={product.images[0]} className="w-12 h-12 object-cover rounded" alt="" />
                      ) : (
                        <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
                          <i className="fas fa-image text-slate-300"></i>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 max-w-xs truncate">
                      {product.product_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                      {product.sku || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        product.product_type === 'stock' ? 'bg-green-100 text-green-700' :
                        product.product_type === 'dropship' ? 'bg-purple-100 text-purple-700' :
                        product.product_type === 'set' ? 'bg-amber-100 text-amber-700' :
                        'bg-cyan-100 text-cyan-700'
                      }`}>
                        {product.product_type === 'stock' ? '有在庫' :
                         product.product_type === 'dropship' ? '無在庫' :
                         product.product_type === 'set' ? 'セット' : 'ハイブリッド'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                      ${product.cost_price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={product.physical_quantity > 0 ? 'text-green-600 font-semibold' : 'text-red-600'}>
                        {product.physical_quantity}個
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditProduct(product)}
                        >
                          編集
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSendToEditing(product.id)}
                          disabled={product.physical_quantity === 0}
                        >
                          出品へ
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredProducts.length === 0 && !loading && (
          <div className="text-center py-20">
            <i className="fas fa-box-open text-6xl text-slate-300 mb-4"></i>
            <p className="text-slate-600 text-lg">商品が見つかりませんでした</p>
            <p className="text-slate-400 text-sm mt-2">フィルター条件を変更するか、新規商品を登録してください</p>
          </div>
        )}
      </div>

      {/* 商品登録モーダル */}
      {showProductModal && (
        <ProductRegistrationModal
          product={editingProduct}
          onClose={() => {
            setShowProductModal(false)
            setEditingProduct(null)
          }}
          onSuccess={() => {
            setShowProductModal(false)
            setEditingProduct(null)
            loadProducts()
          }}
        />
      )}

      {/* セット商品作成モーダル */}
      {showSetModal && (
        <SetProductModal
          selectedProducts={products.filter(p => selectedIds.has(p.id))}
          onClose={() => setShowSetModal(false)}
          onSuccess={(setProductId) => {
            setShowSetModal(false)
            setSelectedIds(new Set())
            loadProducts()
            // 作成したセット商品を出品画面へ
            handleSendToEditing(setProductId)
          }}
        />
      )}
    </div>
  )
}
