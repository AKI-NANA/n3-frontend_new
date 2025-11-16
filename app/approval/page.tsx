'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ApprovalProductModal } from '@/components/approval/ApprovalProductModal'
import { ListingStrategyControl, ListingStrategy } from '@/components/approval/ListingStrategyControl'
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react'

interface Product {
  id: number
  sku: string
  title: string
  title_en: string
  images: string[]
  scraped_data?: { images?: string[]; seller?: string; store_name?: string }
  condition: string
  source: string
  source_table: string
  store_name?: string
  store_id?: string
  store_url?: string
  category_name: string
  profit_margin_percent: number
  ai_confidence_score: number
  approval_status: string
  hts_code?: string
  hts_duty_rate?: number
  origin_country?: string
  inventory_quantity?: number
  stock_quantity?: number
  primary_image_url?: string
  gallery_images?: string[]
  listing_priority?: string
  profit_amount?: number
  current_price?: number
  listing_price?: number
  ebay_api_data?: any
  filter_passed?: boolean  // 🔥 修正: filter_status → filter_passed
  filter_checked_at?: string
  filter_reasons?: string[] | string
}

// 不完全なフィールドを検出する関数
// ✅ エクセルの全項目をチェック（出品可否と出品ステータス以外）
function getIncompleteFields(product: Product): string[] {
  const incomplete: string[] = []
  
  // 📋 基本情報
  if (!product.sku) incomplete.push('SKU')
  if (!product.title && !product.title_en && !product.english_title) incomplete.push('商品タイトル')
  if (!product.description && !product.description_en) incomplete.push('商品説明')
  
  // 📦 商品詳細
  if (!product.condition && !product.condition_name) incomplete.push('コンディション')
  if (!product.category_name && !product.category) incomplete.push('カテゴリー')
  if (!product.ebay_category_id) incomplete.push('eBayカテゴリーID')
  
  // 🖼️ 画像
  const hasImages = (product.images && product.images.length > 0) || 
                    (product.gallery_images && product.gallery_images.length > 0) ||
                    product.primary_image_url
  if (!hasImages) incomplete.push('商品画像')
  
  // 💰 価格・利益
  const hasPrice = product.price_jpy || product.current_price || product.listing_price
  if (!hasPrice) incomplete.push('価格（円）')
  
  if (!product.ddp_price_usd && product.ddp_price_usd !== 0) incomplete.push('DDP価格(USD)')
  if (!product.profit_margin_percent && product.profit_margin_percent !== 0) incomplete.push('利益率(%)')
  if (!product.profit_amount_usd && product.profit_amount_usd !== 0) incomplete.push('利益額(USD)')
  
  // 📏 サイズ・重量 (listing_data内)
  if (!product.listing_data?.weight_g) incomplete.push('重量(g)')
  if (!product.listing_data?.width_cm) incomplete.push('幅(cm)')
  if (!product.listing_data?.length_cm) incomplete.push('奥行き(cm)')
  if (!product.listing_data?.height_cm) incomplete.push('高さ(cm)')
  
  // 🌍 関税情報
  if (!product.origin_country) incomplete.push('原産国')
  if (!product.hts_code) incomplete.push('HTSコード')
  
  // 🚢 配送情報
  if (!product.shipping_cost_usd && product.shipping_cost_usd !== 0) incomplete.push('配送料(USD)')
  if (!product.shipping_policy) incomplete.push('配送ポリシー')
  
  // 📊 SellerMirror分析
  if (product.sm_analyzed_at) {
    // SellerMirror分析済みの場合のみチェック
    if (product.sm_competitor_count === null || product.sm_competitor_count === undefined) incomplete.push('競合数')
    if (!product.sm_lowest_price && product.sm_lowest_price !== 0) incomplete.push('最低価格')
    if (!product.sm_average_price && product.sm_average_price !== 0) incomplete.push('平均価格')
  }
  
  // 🤖 AI・スコア
  if (!product.ai_confidence_score || product.ai_confidence_score === 0) incomplete.push('AIスコア')
  if (!product.listing_score) incomplete.push('出品スコア')
  
  // ✅ フィルターチェック（最重要）
  if (product.filter_passed === null || product.filter_passed === undefined) {
    incomplete.push('フィルターチェック未実行')
  }
  
  return incomplete
}

// 必須フィールドのチェック関数
function isDataComplete(product: Product): boolean {
  return getIncompleteFields(product).length === 0
}

// 確認モーダルコンポーネント
function ConfirmApprovalModal({ 
  incompleteProducts, 
  onConfirm, 
  onCancel 
}: { 
  incompleteProducts: Array<{ product: Product; missing: string[] }>, 
  onConfirm: () => void, 
  onCancel: () => void 
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-8 h-8 text-orange-500" />
            <h2 className="text-xl font-bold text-foreground">データ不完全な商品の承認確認</h2>
          </div>
          
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded p-4 mb-4">
            <p className="text-sm text-orange-800 dark:text-orange-300 mb-3">
              以下の商品はデータが不完全ですが、承認して出品スケジュールに追加しますか?
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-400">
              ※ 不完全な状態で出品すると、リスティングエラーや販売機会の損失につながる可能性があります。
            </p>
          </div>

          <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto">
            {incompleteProducts.map(({ product, missing }) => (
              <div key={product.id} className="bg-muted/50 rounded p-3 border border-border">
                <div className="font-semibold text-sm mb-2 text-foreground">
                  {product.sku} - {product.title_en || product.title || '(タイトルなし)'}
                </div>
                <div className="flex flex-wrap gap-1">
                  {missing.map((field) => (
                    <span 
                      key={field} 
                      className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-border rounded hover:bg-muted transition-colors text-foreground"
            >
              キャンセル
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors font-semibold"
            >
              不完全なまま承認する
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ApprovalPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [activeStatus, setActiveStatus] = useState<string>('all')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [incompleteProductsToApprove, setIncompleteProductsToApprove] = useState<Array<{ product: Product; missing: string[] }>>([])
  
  // 🔥 出品戦略コントロールの表示状態
  const [showListingStrategyControl, setShowListingStrategyControl] = useState(false)
  
  const [filters, setFilters] = useState({
    source: 'all',
    condition: 'all',
    category: 'all',
    minScore: '',
    maxScore: '',
    minProfit: '',
    maxProfit: '',
    minPrice: '',
    maxPrice: '',
    priority: 'all',
    search: '',
    dataCompleteness: 'all',
    listingReadiness: 'all',
  })

  const supabase = createClient()

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [products, filters, activeStatus])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products_master')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('商品取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...products]

    if (activeStatus !== 'all') {
      filtered = filtered.filter(p => p.approval_status === activeStatus)
    }

    if (filters.dataCompleteness === 'complete') {
      filtered = filtered.filter(p => isDataComplete(p))
    } else if (filters.dataCompleteness === 'incomplete') {
      filtered = filtered.filter(p => !isDataComplete(p))
    }
    
    if (filters.listingReadiness === 'ready') {
      filtered = filtered.filter(p => {
        const isComplete = isDataComplete(p)
        const isApproved = p.approval_status === 'approved'
        const hasStock = (p.inventory_quantity || p.stock_quantity || 0) > 0
        return isComplete && isApproved && hasStock
      })
    } else if (filters.listingReadiness === 'not_ready') {
      filtered = filtered.filter(p => {
        const isComplete = isDataComplete(p)
        const isApproved = p.approval_status === 'approved'
        const hasStock = (p.inventory_quantity || p.stock_quantity || 0) > 0
        return !(isComplete && isApproved && hasStock)
      })
    }

    if (filters.source !== 'all') {
      filtered = filtered.filter(p => p.source === filters.source)
    }
    if (filters.condition !== 'all') {
      filtered = filtered.filter(p => p.condition === filters.condition)
    }
    if (filters.category !== 'all') {
      filtered = filtered.filter(p => p.category_name === filters.category)
    }
    if (filters.priority !== 'all') {
      filtered = filtered.filter(p => p.listing_priority === filters.priority)
    }
    if (filters.minScore) {
      filtered = filtered.filter(p => (p.ai_confidence_score || 0) >= parseFloat(filters.minScore))
    }
    if (filters.maxScore) {
      filtered = filtered.filter(p => (p.ai_confidence_score || 0) <= parseFloat(filters.maxScore))
    }
    if (filters.minProfit) {
      filtered = filtered.filter(p => (p.profit_amount || 0) >= parseFloat(filters.minProfit))
    }
    if (filters.maxProfit) {
      filtered = filtered.filter(p => (p.profit_amount || 0) <= parseFloat(filters.maxProfit))
    }
    if (filters.minPrice) {
      filtered = filtered.filter(p => (p.current_price || 0) >= parseFloat(filters.minPrice))
    }
    if (filters.maxPrice) {
      filtered = filtered.filter(p => (p.current_price || 0) <= parseFloat(filters.maxPrice))
    }
    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(p => 
        p.title?.toLowerCase().includes(search) ||
        p.title_en?.toLowerCase().includes(search) ||
        p.sku?.toLowerCase().includes(search)
      )
    }

    setFilteredProducts(filtered)
  }

  const getImageUrl = (product: Product) => {
    if (product.primary_image_url) return product.primary_image_url
    if (product.gallery_images?.[0]) return product.gallery_images[0]
    if (product.images?.[0]) return product.images[0]
    if (product.scraped_data?.images?.[0]) return product.scraped_data.images[0]
    return 'https://via.placeholder.com/300x300/e2e8f0/64748b?text=No+Image'
  }

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  // 🔥 承認ボタン - 出品戦略コントロールを表示
  const handleApprove = async () => {
    if (selectedIds.size === 0) {
      alert('商品を選択してください')
      return
    }

    // データ完全性チェック
    const selectedProducts = products.filter(p => selectedIds.has(p.id))
    const incompleteProducts = selectedProducts
      .map(product => ({
        product,
        missing: getIncompleteFields(product)
      }))
      .filter(item => item.missing.length > 0)
    
    // 不完全な商品がある場合は確認モーダルを表示
    if (incompleteProducts.length > 0) {
      setIncompleteProductsToApprove(incompleteProducts)
      setShowConfirmModal(true)
      return
    }

    // 全て完全な場合は出品戦略コントロールを表示
    setShowListingStrategyControl(true)
  }

  // 🔥 出品戦略確定時の処理
  const handleStrategyConfirm = async (strategy: ListingStrategy) => {
    try {
      const response = await fetch('/api/approval/create-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productIds: Array.from(selectedIds),
          strategy
        })
      })

      const result = await response.json()
      
      console.log('[DEBUG] API Response:', { response, result })

      if (!response.ok) {
        console.error('[ERROR] API Error Details:', result)
        throw new Error(result.error || '承認処理に失敗しました')
      }

      alert(`✅ ${result.message}\n\n出品スケジュール管理ページで確認できます。`)
      setSelectedIds(new Set())
      setShowListingStrategyControl(false)
      setShowConfirmModal(false)
      setIncompleteProductsToApprove([])
      await loadProducts()

    } catch (error: any) {
      console.error('承認・スケジュール作成エラー:', error)
      alert(`承認に失敗しました: ${error.message || '不明なエラー'}`)
    }
  }

  // 確認モーダルからの続行（不完全なまま承認）
  const handleConfirmApproval = () => {
    setShowConfirmModal(false)
    setShowListingStrategyControl(true)
  }

  const handleUnapprove = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`${selectedIds.size}件の承認を取り消しますか？（スケジュールからも削除されます）`)) return

    try {
      const { error } = await supabase
        .from('products_master')
        .update({ 
          approval_status: 'pending', 
          approved_at: null,
          workflow_status: 'ready_to_list'
        })
        .in('id', Array.from(selectedIds))
      
      if (error) throw error
      alert(`↩️ ${selectedIds.size}件の承認を取り消しました。`)
      setSelectedIds(new Set())
      await loadProducts()
    } catch (error: any) {
      console.error('承認取消エラー:', error)
      alert(`承認取消に失敗しました: ${error.message || '不明なエラー'}`)
    }
  }

  const handleReject = async () => {
    if (selectedIds.size === 0) return
    const reason = prompt('否認理由を入力してください:')
    if (!reason) return

    try {
      const { error } = await supabase
        .from('products_master')
        .update({ 
          approval_status: 'rejected', 
          rejection_reason: reason,
          rejected_at: new Date().toISOString()
        })
        .in('id', Array.from(selectedIds))
      
      if (error) throw error
      alert(`❌ ${selectedIds.size}件否認しました。`)
      setSelectedIds(new Set())
      await loadProducts()
    } catch (error: any) {
      console.error('否認エラー:', error)
      alert(`否認に失敗しました: ${error.message || '不明なエラー'}`)
    }
  }

  const stats = {
    total: products.length,
    pending: products.filter(p => p.approval_status === 'pending' || !p.approval_status).length,
    approved: products.filter(p => p.approval_status === 'approved').length,
    rejected: products.filter(p => p.approval_status === 'rejected').length,
    complete: products.filter(p => isDataComplete(p)).length,
    incomplete: products.filter(p => !isDataComplete(p)).length,
  }

  const uniqueSources = [...new Set(products.map(p => p.source).filter(Boolean))]
  const uniqueConditions = [...new Set(products.map(p => p.condition).filter(Boolean))]
  const uniqueCategories = [...new Set(products.map(p => p.category_name).filter(Boolean))]

  return (
    <div className="min-h-screen bg-background">
      <div className="p-3">
        {/* ヘッダー */}
        <div className="mb-3">
          <h1 className="text-xl font-bold mb-1 text-foreground">商品承認システム</h1>
          <p className="text-xs text-muted-foreground">出品前の最終確認 - データ完全性とリスク評価</p>
        </div>

        {/* データ完全性サマリー */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded p-2 mb-3">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-green-700 dark:text-green-400 font-medium">完全: {stats.complete}件</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <span className="text-orange-700 dark:text-orange-400 font-medium">不完全: {stats.incomplete}件</span>
            </div>
            <div className="text-xs text-muted-foreground ml-auto">
              ※不完全なデータも確認後に承認可能です
            </div>
          </div>
        </div>

        {/* ステータスタブ */}
        <div className="flex items-center gap-2 mb-3 text-sm">
          <button
            onClick={() => setActiveStatus('all')}
            className={`px-3 py-1 rounded transition-colors ${
              activeStatus === 'all'
                ? 'bg-primary text-primary-foreground font-medium'
                : 'bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            全て: {stats.total}
          </button>
          <button
            onClick={() => setActiveStatus('pending')}
            className={`px-3 py-1 rounded transition-colors ${
              activeStatus === 'pending'
                ? 'bg-yellow-500 text-white font-medium'
                : 'bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            承認待ち: {stats.pending}
          </button>
          <button
            onClick={() => setActiveStatus('approved')}
            className={`px-3 py-1 rounded transition-colors ${
              activeStatus === 'approved'
                ? 'bg-green-600 text-white font-medium'
                : 'bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            承認済み: {stats.approved}
          </button>
          <button
            onClick={() => setActiveStatus('rejected')}
            className={`px-3 py-1 rounded transition-colors ${
              activeStatus === 'rejected'
                ? 'bg-red-600 text-white font-medium'
                : 'bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            否認済み: {stats.rejected}
          </button>
          <div className="ml-auto text-xs text-muted-foreground">
            選択: <span className="font-semibold text-primary">{selectedIds.size}</span> 件
          </div>
        </div>

        {/* コントロールバー */}
        <div className="bg-card border border-border rounded p-2 mb-3 flex items-center gap-2 flex-wrap text-sm">
          <button
            onClick={() => setSelectedIds(selectedIds.size === filteredProducts.length ? new Set() : new Set(filteredProducts.map(p => p.id)))}
            className="px-3 py-1 border border-border rounded hover:bg-muted transition-colors"
          >
            {selectedIds.size === filteredProducts.length ? '全解除' : '全選択'}
          </button>
          
          <button
            onClick={handleApprove}
            disabled={selectedIds.size === 0}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            承認・出品予約
          </button>
          
          <button
            onClick={handleReject}
            disabled={selectedIds.size === 0}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            一括否認
          </button>
          
          <button
            onClick={handleUnapprove}
            disabled={selectedIds.size === 0}
            className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            承認取消
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-1 border border-orange-400 text-orange-600 rounded hover:bg-orange-50 transition-colors ml-auto"
          >
            {showFilters ? '▼' : '▶'} フィルター
          </button>
        </div>

        {/* フィルター */}
        {showFilters && (
          <div className="bg-card border border-border rounded p-3 mb-3">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-sm">
              <FilterSelect
                label="データ完全性"
                value={filters.dataCompleteness}
                onChange={(v) => setFilters({ ...filters, dataCompleteness: v })}
                options={[
                  { value: 'all', label: 'すべて' },
                  { value: 'complete', label: '完全' },
                  { value: 'incomplete', label: '不完全' },
                ]}
              />
              <FilterSelect
                label="出品可否"
                value={filters.listingReadiness}
                onChange={(v) => setFilters({ ...filters, listingReadiness: v })}
                options={[
                  { value: 'all', label: 'すべて' },
                  { value: 'ready', label: '出品可' },
                  { value: 'not_ready', label: '出品不可' },
                ]}
              />
              <FilterSelect
                label="仕入れ元"
                value={filters.source}
                onChange={(v) => setFilters({ ...filters, source: v })}
                options={[
                  { value: 'all', label: 'すべて' },
                  ...uniqueSources.map(s => ({ value: s, label: s }))
                ]}
              />
              <FilterSelect
                label="コンディション"
                value={filters.condition}
                onChange={(v) => setFilters({ ...filters, condition: v })}
                options={[
                  { value: 'all', label: 'すべて' },
                  ...uniqueConditions.map(c => ({ value: c, label: c }))
                ]}
              />
              <FilterSelect
                label="カテゴリー"
                value={filters.category}
                onChange={(v) => setFilters({ ...filters, category: v })}
                options={[
                  { value: 'all', label: 'すべて' },
                  ...uniqueCategories.map(c => ({ value: c, label: c }))
                ]}
              />
              <FilterSelect
                label="優先度"
                value={filters.priority}
                onChange={(v) => setFilters({ ...filters, priority: v })}
                options={[
                  { value: 'all', label: 'すべて' },
                  { value: 'high', label: '高' },
                  { value: 'medium', label: '中' },
                  { value: 'low', label: '低' },
                ]}
              />
              <FilterInput
                label="最低スコア"
                value={filters.minScore}
                onChange={(v) => setFilters({ ...filters, minScore: v })}
                placeholder="0-100"
              />
              <FilterInput
                label="最高スコア"
                value={filters.maxScore}
                onChange={(v) => setFilters({ ...filters, maxScore: v })}
                placeholder="0-100"
              />
              <FilterInput
                label="最低利益"
                value={filters.minProfit}
                onChange={(v) => setFilters({ ...filters, minProfit: v })}
                placeholder="円"
              />
              <FilterInput
                label="最高利益"
                value={filters.maxProfit}
                onChange={(v) => setFilters({ ...filters, maxProfit: v })}
                placeholder="円"
              />
              <FilterInput
                label="最低価格"
                value={filters.minPrice}
                onChange={(v) => setFilters({ ...filters, minPrice: v })}
                placeholder="円"
              />
              <FilterInput
                label="最高価格"
                value={filters.maxPrice}
                onChange={(v) => setFilters({ ...filters, maxPrice: v })}
                placeholder="円"
              />
              <FilterInput
                label="検索"
                value={filters.search}
                onChange={(v) => setFilters({ ...filters, search: v })}
                placeholder="商品名、SKU..."
              />
              <button
                onClick={() => setFilters({
                  source: 'all',
                  condition: 'all',
                  category: 'all',
                  minScore: '',
                  maxScore: '',
                  minProfit: '',
                  maxProfit: '',
                  minPrice: '',
                  maxPrice: '',
                  priority: 'all',
                  search: '',
                  dataCompleteness: 'all',
                  listingReadiness: 'all',
                })}
                className="px-2 py-1 text-xs bg-muted text-foreground rounded hover:bg-muted/80 transition-colors"
              >
                リセット
              </button>
            </div>
          </div>
        )}

        {/* 商品グリッド */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-muted-foreground">読み込み中...</p>
          </div>
        ) : (
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isSelected={selectedIds.has(product.id)}
                onToggleSelect={() => toggleSelect(product.id)}
                onOpenModal={() => setSelectedProduct(product)}
                getImageUrl={getImageUrl}
                isComplete={isDataComplete(product)}
              />
            ))}
          </div>
        )}

        {filteredProducts.length === 0 && !loading && (
          <div className="text-center py-20 text-muted-foreground">
            <p>該当する商品がありません</p>
          </div>
        )}
      </div>

      {/* 確認モーダル（不完全データ） */}
      {showConfirmModal && (
        <ConfirmApprovalModal
          incompleteProducts={incompleteProductsToApprove}
          onConfirm={handleConfirmApproval}
          onCancel={() => {
            setShowConfirmModal(false)
            setIncompleteProductsToApprove([])
          }}
        />
      )}

      {/* 🔥 出品戦略コントロールモーダル */}
      {showListingStrategyControl && (
        <ListingStrategyControl
          selectedProductCount={selectedIds.size}
          onConfirm={handleStrategyConfirm}
          onCancel={() => {
            setShowListingStrategyControl(false)
            setIncompleteProductsToApprove([])
          }}
        />
      )}

      {/* 商品詳細モーダル */}
      {selectedProduct && (
        <ApprovalProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }: any) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-0.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs px-2 py-1 border border-border rounded bg-input text-foreground"
      >
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

function FilterInput({ label, value, onChange, placeholder }: any) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-0.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-xs px-2 py-1 border border-border rounded bg-input text-foreground"
      />
    </div>
  )
}

function ProductCard({ product, isSelected, onToggleSelect, onOpenModal, getImageUrl, isComplete }: any) {
  const stockType = (product.inventory_quantity || product.stock_quantity || 0) > 0 ? '有' : '無'
  const score = product.ai_confidence_score || 0
  const storeName = product.store_name || product.scraped_data?.store_name || product.scraped_data?.seller || '不明'
  
  // 🔥 利益率を正しく取得
  const profitMargin = product.profit_margin_percent || product.profit_margin || 0
  
  console.log(`ProductCard [${product.sku}] - 利益率:`, {
    profit_margin_percent: product.profit_margin_percent,
    profit_margin: product.profit_margin,
    profitMargin,
    profit_amount_usd: product.profit_amount_usd
  })

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-emerald-500/70'
    if (score >= 70) return 'bg-teal-500/70'
    if (score >= 55) return 'bg-amber-400/70'
    if (score >= 40) return 'bg-orange-400/70'
    return 'bg-rose-400/70'
  }

  return (
    <div
      className={`relative aspect-square rounded overflow-hidden cursor-pointer transition-all group ${
        isSelected ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-border'
      } ${!isComplete ? 'opacity-60' : ''}`}
      onClick={onToggleSelect}
    >
      {!isComplete && (
        <div className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-orange-600 text-white text-[10px] font-bold rounded z-10 shadow-lg">
          不完全
        </div>
      )}
      
      {product.filter_passed === false && product.filter_reasons && (
        <div className="absolute top-1.5 right-1.5 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded z-10 shadow-lg"
             title={Array.isArray(product.filter_reasons) ? product.filter_reasons.join(', ') : product.filter_reasons}>
          フィルター停止
        </div>
      )}

      <img
        src={getImageUrl(product)}
        alt={product.title_en || product.title}
        className="w-full h-full object-cover transition-all duration-300 group-hover:blur-sm"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onOpenModal()
        }}
        className="absolute bottom-1.5 right-1.5 px-2 py-1 bg-primary text-primary-foreground text-[10px] font-semibold rounded hover:bg-primary/90 transition-all z-10 shadow-lg"
        title="詳細を表示"
      >
        詳細
      </button>

      <div className="absolute inset-0 p-2 flex flex-col justify-between text-white transition-opacity duration-300 group-hover:opacity-50" 
           style={{ textShadow: '0 2px 4px rgba(0,0,0,1), 0 0 15px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.7)' }}>
        <div className="flex items-start gap-1">
          <div className={`px-1.5 py-0.5 rounded text-[11px] font-bold shadow-lg ${getScoreColor(score)}`}>
            {score}
          </div>
          <div className="text-[9px] font-mono opacity-90">
            {product.sku}
          </div>
        </div>

        <div>
          <div className="font-bold line-clamp-1 mb-1 text-[11px] leading-tight">
            {product.title_en || product.title}
          </div>

          <div className="grid grid-cols-2 gap-0.5 text-[9px] mb-0.5">
            <div className="truncate" title={product.condition}>
              {product.condition || '不明'}
            </div>
            <div className="text-right">
              {stockType}在庫
            </div>
          </div>

          <div className="mb-0.5 truncate text-[9px]" title={product.category_name}>
            📁 {product.category_name || 'カテゴリ不明'}
          </div>

          <div className="flex items-center gap-1 text-[10px] font-bold">
            <div className="flex-1 text-center" style={{ color: profitMargin >= 10 ? '#4ade80' : profitMargin > 0 ? '#fbbf24' : '#ef4444' }}>
              {profitMargin.toFixed(1)}%
            </div>
            <div className="flex-1 text-center">
              {product.origin_country || 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
