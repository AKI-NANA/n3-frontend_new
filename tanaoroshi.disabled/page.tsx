'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { InventoryProduct, InventoryFilter, InventoryStats } from '@/types/inventory'
import { StatsHeader } from './components/StatsHeader'
import { FilterPanel } from './components/FilterPanel'
import { ProductCard } from './components/ProductCard'
import { ProductRegistrationModal } from './components/ProductRegistrationModal'
import { SetProductModal } from './components/SetProductModal'
import { BulkImageUpload } from './components/BulkImageUpload'
import { MarketplaceSelector } from './components/MarketplaceSelector'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default function TanaoroshiPage() {
  const supabase = createClientComponentClient()
  
  // State
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
  const [filter, setFilter] = useState<InventoryFilter>({
    product_type: 'all',
    stock_status: 'all',
    condition: 'all'
  })
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  
  // Modal State
  const [showRegistrationModal, setShowRegistrationModal] = useState(false)
  const [showSetModal, setShowSetModal] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null)
  const [selectedMarketplace, setSelectedMarketplace] = useState('all')

  // データ取得
  const loadProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('inventory_master')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const inventoryProducts: InventoryProduct[] = (data || []).map(item => ({
        id: item.id,
        unique_id: item.unique_id,
        product_name: item.product_name,
        sku: item.sku,
        product_type: item.product_type,
        physical_quantity: item.physical_quantity || 0,
        listing_quantity: item.listing_quantity || 0,
        cost_price: item.cost_price || 0,
        selling_price: item.selling_price || 0,
        condition_name: item.condition_name,
        category: item.category,
        subcategory: item.subcategory,
        images: item.images || [],
        source_data: item.source_data,
        supplier_info: item.supplier_info,
        is_manual_entry: item.is_manual_entry,
        priority_score: item.priority_score || 0,
        notes: item.notes,
        created_at: item.created_at,
        updated_at: item.updated_at,
        marketplace: item.marketplace || 'manual',
        account: item.account
      }))

      setProducts(inventoryProducts)

      // カテゴリリストを抽出
      const uniqueCategories = [...new Set(inventoryProducts.map(p => p.category))]
      setCategories(uniqueCategories.filter(Boolean))

      // 統計計算
      const newStats: InventoryStats = {
        total: inventoryProducts.length,
        in_stock: inventoryProducts.filter(p => p.physical_quantity > 0).length,
        out_of_stock: inventoryProducts.filter(p => p.physical_quantity === 0).length,
        stock_count: inventoryProducts.filter(p => p.product_type === 'stock').length,
        dropship_count: inventoryProducts.filter(p => p.product_type === 'dropship').length,
        set_count: inventoryProducts.filter(p => p.product_type === 'set').length,
        total_value: inventoryProducts.reduce((sum, p) => sum + (p.cost_price * p.physical_quantity), 0)
      }
      setStats(newStats)

    } catch (error: any) {
      console.error('データ取得エラー:', error)
      alert(`データ取得失敗: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // フィルター適用
  useEffect(() => {
    let filtered = [...products]

    // マーケットプレイスフィルター
    if (selectedMarketplace !== 'all') {
      filtered = filtered.filter(p => p.marketplace === selectedMarketplace)
    }

    // 商品タイプフィルター
    if (filter.product_type && filter.product_type !== 'all') {
      filtered = filtered.filter(p => p.product_type === filter.product_type)
    }

    // 在庫状態フィルター
    if (filter.stock_status && filter.stock_status !== 'all') {
      if (filter.stock_status === 'in_stock') {
        filtered = filtered.filter(p => p.physical_quantity > 0)
      } else {
        filtered = filtered.filter(p => p.physical_quantity === 0)
      }
    }

    // コンディションフィルター
    if (filter.condition && filter.condition !== 'all') {
      filtered = filtered.filter(p => p.condition_name === filter.condition)
    }

    // カテゴリフィルター
    if (filter.category) {
      filtered = filtered.filter(p => p.category === filter.category)
    }

    // 検索フィルター
    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      filtered = filtered.filter(p =>
        p.product_name.toLowerCase().includes(searchLower) ||
        (p.sku && p.sku.toLowerCase().includes(searchLower))
      )
    }

    setFilteredProducts(filtered)
  }, [products, filter, selectedMarketplace])

  // 判定待ち件数取得
  const loadPendingCount = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_classification_queue')
        .select('*', { count: 'exact', head: true })
        .is('is_stock', null)
      
      if (!error && data !== null) {
        setPendingCount(data as any as number)
      }
    } catch (error) {
      console.error('判定待ち件数取得エラー:', error)
    }
  }

  // 初回ロード
  useEffect(() => {
    loadProducts()
    loadPendingCount()
  }, [])

  // 商品選択トグル
  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProducts)
    if (newSelection.has(productId)) {
      newSelection.delete(productId)
    } else {
      newSelection.add(productId)
    }
    setSelectedProducts(newSelection)
  }

  // 商品編集
  const handleEdit = (product: InventoryProduct) => {
    setEditingProduct(product)
    setShowRegistrationModal(true)
  }

  // 商品削除
  const handleDelete = async (product: InventoryProduct) => {
    if (!confirm(`「${product.product_name}」を削除しますか？`)) return

    try {
      const { error } = await supabase
        .from('inventory_master')
        .delete()
        .eq('id', product.id)

      if (error) throw error

      alert('商品を削除しました')
      loadProducts()
    } catch (error: any) {
      console.error('削除エラー:', error)
      alert(`削除失敗: ${error.message}`)
    }
  }

  // モーダル成功時
  const handleModalSuccess = () => {
    setShowRegistrationModal(false)
    setShowSetModal(false)
    setShowBulkUpload(false)
    setEditingProduct(null)
    loadProducts()
    loadPendingCount() // 判定待ち件数も更新
  }

  // eBay同期実行
  const handleEbaySync = async (account: 'mjt' | 'green' | 'all') => {
    if (!confirm(`eBay ${account.toUpperCase()}アカウントのデータを同期しますか？`)) return
    
    setSyncing(true)
    try {
      const response = await fetch('/api/sync/ebay-to-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account, limit: 100 })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`✅ 同期完了\n新規: ${data.total_synced}件\nスキップ: ${data.total_skipped}件`)
        loadPendingCount() // 判定待ち件数を更新
      } else {
        alert(`❌ 同期エラー: ${data.error}`)
      }
    } catch (error: any) {
      console.error('同期エラー:', error)
      alert(`同期エラー: ${error.message}`)
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
          <p className="text-lg text-slate-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          📦 棚卸し・在庫管理
        </h1>
        <p className="text-slate-600">
          全モールの在庫を一元管理。eBay、Amazon、Shopeeの出品中商品も統合表示されます。
        </p>
      </div>

      {/* 統計ヘッダー */}
      <StatsHeader stats={stats} selectedCount={selectedProducts.size} />

      {/* マーケットプレイス選択 */}
      <MarketplaceSelector
        selectedMarketplace={selectedMarketplace}
        onMarketplaceChange={setSelectedMarketplace}
      />

      {/* フィルターパネル */}
      <FilterPanel
        filter={filter}
        onFilterChange={setFilter}
        categories={categories}
      />

      {/* アクションボタン */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex gap-3 flex-wrap">
        {/* 有在庫判定バッジ（件数がある場合のみ表示） */}
        {pendingCount > 0 && (
          <Link href="/zaiko/tanaoroshi/classification">
            <Button className="bg-orange-600 hover:bg-orange-700 relative">
              <i className="fas fa-clipboard-check mr-2"></i>
              有在庫判定
              <Badge className="ml-2 bg-white text-orange-600 hover:bg-white">
                {pendingCount}
              </Badge>
            </Button>
          </Link>
        )}

        <Button
          onClick={() => {
            setEditingProduct(null)
            setShowRegistrationModal(true)
          }}
          className="bg-green-600 hover:bg-green-700"
        >
          <i className="fas fa-plus mr-2"></i>
          新規商品登録
        </Button>

        <Button
          onClick={() => setShowBulkUpload(true)}
          variant="outline"
        >
          <i className="fas fa-images mr-2"></i>
          画像一括登録
        </Button>

        <Button
          onClick={() => setShowSetModal(true)}
          disabled={selectedProducts.size < 2}
          variant="outline"
        >
          <i className="fas fa-layer-group mr-2"></i>
          セット商品作成 ({selectedProducts.size})
        </Button>

        {/* eBay同期ボタン */}
        <div className="relative">
          <Button
            onClick={() => handleEbaySync('all')}
            disabled={syncing}
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            {syncing ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                同期中...
              </>
            ) : (
              <>
                <i className="fas fa-cloud-download-alt mr-2"></i>
                eBay同期
              </>
            )}
          </Button>
        </div>

        <div className="flex-1"></div>

        <Button
          onClick={loadProducts}
          variant="outline"
        >
          <i className="fas fa-sync mr-2"></i>
          更新
        </Button>
      </div>

      {/* 商品一覧 */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <i className="fas fa-box-open text-6xl text-slate-300 mb-4"></i>
          <p className="text-xl text-slate-600 mb-2">商品がありません</p>
          <p className="text-slate-400 mb-6">
            新規商品を登録するか、他のモールからデータを同期してください
          </p>
          <Button
            onClick={() => setShowRegistrationModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <i className="fas fa-plus mr-2"></i>
            最初の商品を登録
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => handleEdit(product)}
              onDelete={() => handleDelete(product)}
            />
          ))}
        </div>
      )}

      {/* モーダル */}
      {showRegistrationModal && (
        <ProductRegistrationModal
          product={editingProduct}
          onClose={() => {
            setShowRegistrationModal(false)
            setEditingProduct(null)
          }}
          onSuccess={handleModalSuccess}
        />
      )}

      {showSetModal && (
        <SetProductModal
          selectedProductIds={Array.from(selectedProducts)}
          onClose={() => setShowSetModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {showBulkUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">画像一括登録</h2>
              <button
                onClick={() => setShowBulkUpload(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <i className="fas fa-times text-2xl"></i>
              </button>
            </div>
            <div className="p-6">
              <BulkImageUpload />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
