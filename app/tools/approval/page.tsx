'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Check, X, RefreshCw, Filter, ChevronLeft, ChevronRight, 
  ExternalLink, Search, Upload, Download, Trash2, Eye
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Product {
  id: string
  item_id: string
  title: string
  sku: string
  acquired_price_jpy: number | null
  ddp_price_usd: number | null
  ddu_price_usd: number | null
  stock_quantity: number | null
  condition: string | null
  category_name: string | null
  category_number: string | null
  image_urls: string[]
  image_count: number | null
  sm_profit_margin: number | null
  shipping_cost_usd: number | null
  shipping_policy: string | null
  ready_to_list: boolean
  listed_marketplaces: string[]
  listing_score: number | null
  created_at: string
  updated_at: string
}

type FilterType = 'all' | 'ready' | 'not_ready'

export default function ApprovalPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [filter, setFilter] = useState<FilterType>('ready')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const pageSize = 20
  const totalPages = Math.ceil(filteredProducts.length / pageSize)
  const paginatedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setProducts(data || [])
    } catch (error: any) {
      showToast(error.message || 'データ取得に失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    let filtered = products

    // ステータスフィルター
    if (filter === 'ready') {
      filtered = filtered.filter(p => p.ready_to_list)
    } else if (filter === 'not_ready') {
      filtered = filtered.filter(p => !p.ready_to_list)
    }

    // 検索フィルター
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(p => 
        p.title?.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term) ||
        p.category_name?.toLowerCase().includes(term)
      )
    }

    setFilteredProducts(filtered)
    setPage(1)
  }, [products, filter, searchTerm])

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) {
      showToast('商品を選択してください', 'error')
      return
    }

    if (!confirm(`${selectedIds.size}件を承認しますか？`)) return

    try {
      setProcessing(true)
      const { error } = await supabase
        .from('products')
        .update({ ready_to_list: true })
        .in('id', Array.from(selectedIds))

      if (error) throw error

      showToast(`${selectedIds.size}件承認しました`)
      setSelectedIds(new Set())
      await loadProducts()
    } catch (error: any) {
      showToast(error.message || '承認に失敗しました', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) {
      showToast('商品を選択してください', 'error')
      return
    }

    if (!confirm(`${selectedIds.size}件を却下しますか？`)) return

    try {
      setProcessing(true)
      const { error } = await supabase
        .from('products')
        .update({ ready_to_list: false })
        .in('id', Array.from(selectedIds))

      if (error) throw error

      showToast(`${selectedIds.size}件却下しました`)
      setSelectedIds(new Set())
      await loadProducts()
    } catch (error: any) {
      showToast(error.message || '却下に失敗しました', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      showToast('商品を選択してください', 'error')
      return
    }

    if (!confirm(`${selectedIds.size}件を削除しますか？この操作は取り消せません。`)) return

    try {
      setProcessing(true)
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', Array.from(selectedIds))

      if (error) throw error

      showToast(`${selectedIds.size}件削除しました`)
      setSelectedIds(new Set())
      await loadProducts()
    } catch (error: any) {
      showToast(error.message || '削除に失敗しました', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedProducts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedProducts.map(p => p.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  // 統計計算
  const stats = {
    total: products.length,
    ready: products.filter(p => p.ready_to_list).length,
    not_ready: products.filter(p => !p.ready_to_list).length,
    listed: products.filter(p => p.listed_marketplaces && p.listed_marketplaces.length > 0).length,
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">読み込み中...</div>
          <div className="text-sm text-muted-foreground">商品データを取得しています</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            商品承認システム
          </h1>
          <p className="text-sm text-muted-foreground">
            出品前の商品を確認・承認します
          </p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground">総商品数</div>
          </div>
          <div className="bg-card border border-blue-500/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.ready}</div>
            <div className="text-xs text-muted-foreground">出品準備完了</div>
          </div>
          <div className="bg-card border border-yellow-500/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.not_ready}</div>
            <div className="text-xs text-muted-foreground">未完了</div>
          </div>
          <div className="bg-card border border-green-500/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.listed}</div>
            <div className="text-xs text-muted-foreground">出品済み</div>
          </div>
        </div>

        {/* コントロールバー */}
        <div className="sticky top-0 z-40 bg-card border border-border rounded-lg p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size > 0 && `${selectedIds.size}件選択中`}
              </span>
              {selectedIds.size > 0 && (
                <Button
                  onClick={() => setSelectedIds(new Set())}
                  variant="ghost"
                  size="sm"
                  className="h-7"
                >
                  選択解除
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleBulkApprove}
                disabled={selectedIds.size === 0 || processing}
                variant="default"
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-1" />
                一括承認
              </Button>
              <Button
                onClick={handleBulkReject}
                disabled={selectedIds.size === 0 || processing}
                variant="outline"
                size="sm"
                className="border-red-500 text-red-600 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-1" />
                一括却下
              </Button>
              <Button
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0 || processing}
                variant="outline"
                size="sm"
                className="border-red-500 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                削除
              </Button>
              <Button
                onClick={loadProducts}
                disabled={processing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                更新
              </Button>
            </div>
          </div>
        </div>

        {/* フィルターバー */}
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="タイトル、SKU、ブランドで検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2">
              {(['all', 'ready', 'not_ready'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    filter === f
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {f === 'all' && '全て'}
                  {f === 'ready' && '出品可能'}
                  {f === 'not_ready' && '未完了'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 商品グリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          {paginatedProducts.map((product) => (
            <div
              key={product.id}
              className={`bg-card border rounded-lg overflow-hidden transition-all cursor-pointer hover:shadow-lg ${
                selectedIds.has(product.id)
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border'
              }`}
              onClick={() => toggleSelect(product.id)}
            >
              {/* 画像 */}
              <div className="relative h-48 bg-muted">
                {product.image_urls && product.image_urls.length > 0 ? (
                  <img
                    src={product.image_urls[0]}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    画像なし
                  </div>
                )}
                
                {/* チェックボックス */}
                <div className="absolute top-2 left-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product.id)}
                    onChange={() => toggleSelect(product.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5 rounded"
                  />
                </div>

                {/* ステータスバッジ */}
                <div className="absolute top-2 right-2">
                  {product.ready_to_list && (
                    <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                      出品可能
                    </span>
                  )}
                  {product.listed_marketplaces && product.listed_marketplaces.length > 0 && (
                    <span className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded">
                      出品済み
                    </span>
                  )}
                </div>
              </div>

              {/* 商品情報 */}
              <div className="p-3">
                <h3 className="font-medium text-sm mb-2 line-clamp-2" title={product.title}>
                  {product.title}
                </h3>
                
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>価格:</span>
                    <span className="font-semibold text-foreground">
                      ${product.ddp_price_usd?.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>利益率:</span>
                    <span className={`font-semibold ${
                      (product.sm_profit_margin || 0) >= 20 ? 'text-green-600' :
                      (product.sm_profit_margin || 0) >= 10 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {product.sm_profit_margin?.toFixed(1) || '-'}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>SKU:</span>
                    <span className="font-mono text-xs">{product.sku}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 商品がない場合 */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>商品が見つかりません</p>
          </div>
        )}

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              variant="outline"
              size="sm"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* トースト */}
      {toast && (
        <div className={`fixed bottom-8 right-8 px-6 py-3 rounded-lg shadow-lg text-white z-50 animate-in slide-in-from-right ${
          toast.type === 'error' ? 'bg-destructive' : 'bg-green-600'
        }`}>
          {toast.message}
        </div>
      )}

      {/* 処理中オーバーレイ */}
      {processing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-md border border-border">
            <div className="text-center">
              <div className="mb-4">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
              <div className="text-lg font-semibold">処理中...</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
