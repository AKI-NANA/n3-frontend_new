'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Info,
  TrendingUp,
  DollarSign
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"

interface Product {
  id: number
  source_item_id: string
  sku: string | null
  title: string
  english_title: string | null
  price_jpy: number | null
  price_usd: number | null
  scraped_data: any
  ebay_api_data: any
  listing_data: any
  status: string | null
  approval_status?: string | null
  ai_confidence_score?: number | null
  profit_margin?: number | null
  profit_amount_usd?: number | null
  export_filter_status?: boolean | null
  patent_filter_status?: boolean | null
  mall_filter_status?: boolean | null
  final_judgment?: string | null
  sm_lowest_price?: number | null
  sm_average_price?: number | null
  sm_competitor_count?: number | null
  current_stock?: number | null
  target_marketplaces?: string[]
  listing_priority?: string
  created_at: string
  updated_at: string
}

interface MarketplaceOption {
  id: string
  label: string
  marketplace: string
  account: string
}

export default function ApprovalPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<Set<string>>(new Set())
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium')

  const supabase = createClient()

  const marketplaceOptions: MarketplaceOption[] = [
    { id: 'ebay_main', label: 'eBay (Main)', marketplace: 'ebay', account: 'main' },
    { id: 'ebay_sub1', label: 'eBay (Sub1)', marketplace: 'ebay', account: 'sub1' },
    { id: 'yahoo_main', label: 'Yahoo (Main)', marketplace: 'yahoo', account: 'main' },
    { id: 'mercari_main', label: 'Mercari (Main)', marketplace: 'mercari', account: 'main' }
  ]

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('yahoo_scraped_products')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(200)

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('データ取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const isDataComplete = (product: Product) => {
    return !!(
      product.title &&
      product.price_jpy &&
      product.sku &&
      product.export_filter_status !== null &&
      product.patent_filter_status !== null &&
      product.mall_filter_status !== null
    )
  }

  const filteredProducts = products.filter(product => {
    if (filterStatus === 'pending') return !product.approval_status || product.approval_status === 'pending'
    if (filterStatus === 'approved') return product.approval_status === 'approved'
    if (filterStatus === 'rejected') return product.approval_status === 'rejected'
    return true
  })

  const stats = {
    total: products.length,
    pending: products.filter(p => !p.approval_status || p.approval_status === 'pending').length,
    approved: products.filter(p => p.approval_status === 'approved').length,
    rejected: products.filter(p => p.approval_status === 'rejected').length,
    complete: products.filter(p => isDataComplete(p)).length,
    incomplete: products.filter(p => !isDataComplete(p)).length
  }

  const getImageUrl = (product: Product) => {
    if (product.scraped_data?.images?.[0]) return product.scraped_data.images[0]
    if (product.ebay_api_data?.images?.[0]) return product.ebay_api_data.images[0]
    if (product.listing_data?.images?.[0]) return product.listing_data.images[0]
    return `https://placehold.co/400x400/1a1a1a/white?text=${encodeURIComponent(product.title.substring(0, 15))}`
  }

  const getCondition = (product: Product) => {
    return product.scraped_data?.condition || product.listing_data?.condition || '不明'
  }

  const getCategory = (product: Product) => {
    return product.scraped_data?.category || product.ebay_api_data?.category || '未分類'
  }

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds)
    newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id)
    setSelectedIds(newSelected)
  }

  const toggleMarketplace = (marketplaceId: string) => {
    const newSelected = new Set(selectedMarketplaces)
    newSelected.has(marketplaceId) ? newSelected.delete(marketplaceId) : newSelected.add(marketplaceId)
    setSelectedMarketplaces(newSelected)
  }

  const selectAllMarketplaces = () => {
    setSelectedMarketplaces(new Set(marketplaceOptions.map(m => m.id)))
  }

  const openApprovalDialog = () => {
    if (selectedIds.size === 0) {
      alert('商品を選択してください')
      return
    }
    setSelectedMarketplaces(new Set(['ebay_main'])) // デフォルト
    setPriority('medium')
    setShowApprovalDialog(true)
  }

  const bulkApprove = async () => {
    if (selectedMarketplaces.size === 0) {
      alert('出品先を選択してください')
      return
    }

    try {
      const targetMarketplaces = Array.from(selectedMarketplaces)
      
      await Promise.all(Array.from(selectedIds).map(id => 
        supabase.from('yahoo_scraped_products').update({ 
          approval_status: 'approved', 
          approved_at: new Date().toISOString(),
          status: 'ready_to_list',
          target_marketplaces: targetMarketplaces,
          listing_priority: priority
        }).eq('id', id)
      ))
      
      alert(`${selectedIds.size}件を承認しました。\n出品先: ${targetMarketplaces.join(', ')}\n優先度: ${priority}`)
      setSelectedIds(new Set())
      setShowApprovalDialog(false)
      loadProducts()
    } catch (error) {
      console.error('承認エラー:', error)
      alert('承認に失敗しました')
    }
  }

  const bulkReject = async () => {
    if (selectedIds.size === 0 || !confirm(`${selectedIds.size}件を否認しますか?`)) return
    try {
      await Promise.all(Array.from(selectedIds).map(id => 
        supabase.from('yahoo_scraped_products').update({ 
          approval_status: 'rejected',
          status: 'rejected'
        }).eq('id', id)
      ))
      alert(`${selectedIds.size}件を否認しました`)
      setSelectedIds(new Set())
      loadProducts()
    } catch (error) {
      alert('否認に失敗しました')
    }
  }

  const bulkUnapprove = async () => {
    if (selectedIds.size === 0 || !confirm(`${selectedIds.size}件の承認を取り消しますか?\nスケジュールからも削除されます。`)) return
    try {
      await Promise.all(Array.from(selectedIds).map(id => 
        supabase.from('yahoo_scraped_products').update({ 
          approval_status: 'pending',
          status: 'pending'
        }).eq('id', id)
      ))
      alert(`${selectedIds.size}件の承認を取り消しました`)
      setSelectedIds(new Set())
      loadProducts()
    } catch (error) {
      alert('承認取り消しに失敗しました')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">商品承認システム</h1>
          <p className="text-sm text-muted-foreground">フィルター確認・AI判定・モール選択・承認ワークフロー</p>
        </div>
        <Button onClick={loadProducts} variant="outline" size="sm">
          <Loader2 className="w-4 h-4 mr-2" />更新
        </Button>
      </div>

      {/* 統計バー */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { label: '全商品', value: stats.total, color: 'bg-gray-100 text-gray-900' },
          { label: '承認待ち', value: stats.pending, color: 'bg-yellow-100 text-yellow-900' },
          { label: '承認済み', value: stats.approved, color: 'bg-green-100 text-green-900' },
          { label: '否認済み', value: stats.rejected, color: 'bg-red-100 text-red-900' },
          { label: 'データ完全', value: stats.complete, color: 'bg-blue-100 text-blue-900' },
          { label: 'データ不足', value: stats.incomplete, color: 'bg-orange-100 text-orange-900' }
        ].map((stat, i) => (
          <div key={i} className={`px-4 py-2 rounded-lg ${stat.color} whitespace-nowrap cursor-pointer hover:opacity-80`}
            onClick={() => {
              if (stat.label === '承認待ち') setFilterStatus('pending')
              else if (stat.label === '承認済み') setFilterStatus('approved')
              else if (stat.label === '否認済み') setFilterStatus('rejected')
              else setFilterStatus('all')
            }}
          >
            <div className="text-xs font-medium">{stat.label}</div>
            <div className="text-xl font-bold">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* コントロールバー */}
      <div className="flex flex-wrap gap-2 items-center justify-between bg-card p-4 rounded-lg border">
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <Button key={f} variant={filterStatus === f ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus(f)}>
              {f === 'all' ? 'すべて' : f === 'pending' ? '承認待ち' : f === 'approved' ? '承認済み' : '否認済み'}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set(filteredProducts.map(p => p.id)))}>全選択</Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>解除 ({selectedIds.size})</Button>
          <Button variant="default" size="sm" onClick={openApprovalDialog} disabled={selectedIds.size === 0} className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="w-4 h-4 mr-1" />承認 ({selectedIds.size})
          </Button>
          <Button variant="destructive" size="sm" onClick={bulkReject} disabled={selectedIds.size === 0}>
            <XCircle className="w-4 h-4 mr-1" />否認
          </Button>
          <Button variant="outline" size="sm" onClick={bulkUnapprove} disabled={selectedIds.size === 0} className="border-orange-500 text-orange-600 hover:bg-orange-50">
            <AlertTriangle className="w-4 h-4 mr-1" />承認取消
          </Button>
        </div>
      </div>

      {/* 商品グリッド */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {filteredProducts.map(product => {
          const dataComplete = isDataComplete(product)
          const aiScore = product.ai_confidence_score || 0
          const condition = getCondition(product)
          const isNew = condition === '新品' || condition === 'new' || condition === 'New'
          
          return (
            <Card 
              key={product.id}
              className={`group hover:shadow-xl transition-all cursor-pointer ${
                selectedIds.has(product.id) ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => toggleSelect(product.id)}
            >
              <div className="relative">
                <div className="relative aspect-square bg-gray-50 overflow-hidden">
                  <Image src={getImageUrl(product)} alt={product.title} fill className="object-contain p-2 group-hover:scale-105 transition-transform" unoptimized />
                  
                  <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.has(product.id)} onCheckedChange={() => toggleSelect(product.id)} className="bg-white border-2 shadow-sm" />
                  </div>
                  
                  {aiScore > 0 && (
                    <div className="absolute top-2 right-2">
                      <Badge className={`${aiScore >= 80 ? 'bg-green-500' : aiScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'} text-white font-bold shadow-lg text-xs px-1.5 py-0.5`}>
                        {aiScore}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="absolute bottom-2 left-2">
                    <Badge className={`${isNew ? 'bg-blue-500' : 'bg-orange-500'} text-white text-xs px-1.5 py-0.5`}>
                      {isNew ? '新品' : '中古'}
                    </Badge>
                  </div>

                  {!dataComplete && (
                    <div className="absolute bottom-2 right-2">
                      <Badge variant="destructive" className="bg-orange-500 px-1 py-0"><AlertTriangle className="w-3 h-3" /></Badge>
                    </div>
                  )}
                </div>

                <div className="p-2 space-y-1">
                  <p className="text-[9px] text-muted-foreground truncate">{product.sku || product.source_item_id}</p>
                  <h3 className="text-[10px] font-medium line-clamp-2 leading-tight min-h-[28px]">{product.title}</h3>
                  <p className="text-[9px] text-muted-foreground truncate">{getCategory(product)}</p>

                  <div className="space-y-0.5 pt-1 border-t">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[9px] text-muted-foreground">仕入</span>
                      <span className="text-xs font-bold">¥{product.price_jpy?.toLocaleString() || '---'}</span>
                    </div>
                    {product.price_usd && (
                      <div className="flex items-baseline justify-between">
                        <span className="text-[9px] text-muted-foreground">販売</span>
                        <span className="text-xs font-bold text-blue-600">${product.price_usd.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {product.profit_amount_usd && product.profit_amount_usd > 0 && (
                    <div className="bg-green-50 rounded p-1.5 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-0.5">
                          <DollarSign className="w-2.5 h-2.5 text-green-600" />
                          <span className="text-[9px] font-medium text-green-900">純利益</span>
                        </div>
                        <span className="text-xs font-bold text-green-700">${product.profit_amount_usd.toFixed(2)}</span>
                      </div>
                      {product.profit_margin && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-0.5">
                            <TrendingUp className="w-2.5 h-2.5 text-green-600" />
                            <span className="text-[9px] font-medium text-green-900">利益率</span>
                          </div>
                          <span className="text-[10px] font-bold text-green-700">{product.profit_margin.toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  )}

                  {product.sm_lowest_price && (
                    <div className="text-[9px] space-y-0.5 pt-1 border-t">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SM最安</span>
                        <span className="font-semibold">${product.sm_lowest_price.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-0.5 pt-1" title="輸出/特許/モール">
                    <div className={`flex-1 h-1 rounded ${product.export_filter_status ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div className={`flex-1 h-1 rounded ${product.patent_filter_status ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div className={`flex-1 h-1 rounded ${product.mall_filter_status ? 'bg-green-500' : 'bg-red-500'}`} />
                  </div>

                  <div className="flex gap-1 pt-1">
                    {product.approval_status === 'approved' && <Badge className="flex-1 justify-center bg-green-500 text-[9px] py-0">承認済</Badge>}
                    {product.approval_status === 'rejected' && <Badge className="flex-1 justify-center bg-red-500 text-[9px] py-0">否認済</Badge>}
                    {(!product.approval_status || product.approval_status === 'pending') && <Badge variant="outline" className="flex-1 justify-center text-[9px] py-0">承認待ち</Badge>}
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); }}>
                      <Info className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* 出品先表示 */}
                  {product.target_marketplaces && product.target_marketplaces.length > 0 && (
                    <div className="text-[8px] text-muted-foreground truncate pt-1 border-t">
                      {product.target_marketplaces.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 bg-card rounded-lg border">
          <p className="text-muted-foreground">該当する商品がありません</p>
        </div>
      )}

      {/* 承認ダイアログ */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>出品先とモール選択</DialogTitle>
            <DialogDescription>
              {selectedIds.size}件の商品を承認します。出品先を選択してください。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* モール選択 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">出品先モール</Label>
                <Button variant="link" size="sm" onClick={selectAllMarketplaces}>全選択</Button>
              </div>
              <div className="space-y-2 border rounded-lg p-3">
                {marketplaceOptions.map(option => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.id}
                      checked={selectedMarketplaces.has(option.id)}
                      onCheckedChange={() => toggleMarketplace(option.id)}
                    />
                    <label htmlFor={option.id} className="text-sm cursor-pointer flex-1">
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* 優先度選択 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">出品優先度</Label>
              <div className="flex gap-2">
                {['high', 'medium', 'low'].map(p => (
                  <Button
                    key={p}
                    variant={priority === p ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setPriority(p as any)}
                  >
                    {p === 'high' ? '高' : p === 'medium' ? '中' : '低'}
                  </Button>
                ))}
              </div>
            </div>

            {/* 選択サマリー */}
            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg space-y-1 text-sm">
              <p><strong>商品数:</strong> {selectedIds.size}件</p>
              <p><strong>出品先:</strong> {selectedMarketplaces.size}モール</p>
              <p><strong>優先度:</strong> {priority === 'high' ? '高' : priority === 'medium' ? '中' : '低'}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={bulkApprove} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              承認して出品待ちリストへ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 詳細モーダル */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>商品詳細情報</DialogTitle></DialogHeader>
          {selectedProduct && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="font-semibold mb-2">基本情報</p>
                  <div className="space-y-1 text-xs">
                    <p><span className="text-muted-foreground">SKU:</span> {selectedProduct.sku || '未設定'}</p>
                    <p><span className="text-muted-foreground">状態:</span> {getCondition(selectedProduct)}</p>
                    <p><span className="text-muted-foreground">カテゴリー:</span> {getCategory(selectedProduct)}</p>
                    <p><span className="text-muted-foreground">在庫:</span> {selectedProduct.current_stock || 0}</p>
                  </div>
                </div>
                <div><p className="font-semibold mb-2">価格・利益</p>
                  <div className="space-y-1 text-xs">
                    <p><span className="text-muted-foreground">仕入:</span> ¥{selectedProduct.price_jpy?.toLocaleString() || '---'}</p>
                    <p><span className="text-muted-foreground">販売:</span> ${selectedProduct.price_usd?.toFixed(2) || '---'}</p>
                    <p><span className="text-muted-foreground">純利益:</span> ${selectedProduct.profit_amount_usd?.toFixed(2) || '---'}</p>
                    <p><span className="text-muted-foreground">利益率:</span> {selectedProduct.profit_margin?.toFixed(1) || '---'}%</p>
                  </div>
                </div>
                <div><p className="font-semibold mb-2">フィルター</p>
                  <div className="space-y-1 text-xs">
                    <p><span className="text-muted-foreground">輸出:</span> {selectedProduct.export_filter_status ? '✓ OK' : '✗ NG'}</p>
                    <p><span className="text-muted-foreground">特許:</span> {selectedProduct.patent_filter_status ? '✓ OK' : '✗ NG'}</p>
                    <p><span className="text-muted-foreground">モール:</span> {selectedProduct.mall_filter_status ? '✓ OK' : '✗ NG'}</p>
                    <p><span className="text-muted-foreground">最終判定:</span> {selectedProduct.final_judgment || '---'}</p>
                  </div>
                </div>
                <div><p className="font-semibold mb-2">競合分析 (SM)</p>
                  <div className="space-y-1 text-xs">
                    <p><span className="text-muted-foreground">最安値:</span> ${selectedProduct.sm_lowest_price?.toFixed(2) || '---'}</p>
                    <p><span className="text-muted-foreground">平均:</span> ${selectedProduct.sm_average_price?.toFixed(2) || '---'}</p>
                    <p><span className="text-muted-foreground">競合数:</span> {selectedProduct.sm_competitor_count || '---'}</p>
                    <p><span className="text-muted-foreground">AIスコア:</span> {selectedProduct.ai_confidence_score || '---'}点</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="font-semibold mb-1">タイトル</p>
                <p className="text-xs">{selectedProduct.title}</p>
                {selectedProduct.english_title && <p className="text-xs text-muted-foreground mt-1">{selectedProduct.english_title}</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
