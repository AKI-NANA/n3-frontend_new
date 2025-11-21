'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  AlertCircle, CheckCircle, AlertTriangle, RefreshCw,
  Package, TrendingUp, TrendingDown, Clock, Plus,
  ExternalLink, Trash2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface EbayCategoryLimit {
  id: string
  category_name: string
  category_id: string
  current_count: number
  limit_count: number
  is_50k_tier: boolean
  created_at: string
  updated_at: string
}

interface InventoryItem {
  id: string
  sku: string
  product_url: string
  current_stock: number
  min_stock_threshold: number
  max_stock_threshold: number
  lowest_price: number
  competitor_count: number
  last_check_at: string
  next_check_at: string
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
  created_at: string
}

export default function InventoryDashboardPage() {
  const [ebayLimits, setEbayLimits] = useState<EbayCategoryLimit[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [bulkUrls, setBulkUrls] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadEbayLimits = async () => {
    try {
      const { data, error } = await supabase
        .from('ebay_category_limits')
        .select('*')
        .order('current_count', { ascending: false })

      if (error) throw error

      setEbayLimits(data || [])
    } catch (error: any) {
      showToast(error.message || 'Ebay制限データの取得に失敗しました', 'error')
    }
  }

  const loadInventoryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_monitoring')
        .select('*')
        .order('next_check_at', { ascending: true })

      if (error) throw error

      setInventoryItems(data || [])
    } catch (error: any) {
      showToast(error.message || '在庫データの取得に失敗しました', 'error')
    }
  }

  const loadAllData = async () => {
    try {
      setLoading(true)
      await Promise.all([loadEbayLimits(), loadInventoryItems()])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  const handleBulkRegister = async () => {
    if (!bulkUrls.trim()) {
      showToast('URLを入力してください', 'error')
      return
    }

    const urls = bulkUrls.split('\n').filter(url => url.trim())
    if (urls.length === 0) {
      showToast('有効なURLが見つかりません', 'error')
      return
    }

    try {
      setProcessing(true)

      const items = urls.map(url => ({
        product_url: url.trim(),
        status: 'pending',
        created_at: new Date().toISOString()
      }))

      const { error } = await supabase
        .from('inventory_monitoring')
        .insert(items)

      if (error) throw error

      showToast(`${urls.length}件のURLを登録しました`)
      setBulkUrls('')
      await loadInventoryItems()
    } catch (error: any) {
      showToast(error.message || '一括登録に失敗しました', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('この在庫監視項目を削除しますか？')) return

    try {
      setProcessing(true)

      const { error } = await supabase
        .from('inventory_monitoring')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      showToast('削除しました')
      await loadInventoryItems()
    } catch (error: any) {
      showToast(error.message || '削除に失敗しました', 'error')
    } finally {
      setProcessing(false)
    }
  }

  // Ebay制限の集計
  const ebayStats = {
    total10k: ebayLimits.filter(l => !l.is_50k_tier).reduce((sum, l) => sum + l.current_count, 0),
    limit10k: 10000,
    total50k: ebayLimits.filter(l => l.is_50k_tier).reduce((sum, l) => sum + l.current_count, 0),
    limit50k: 50000,
  }

  ebayStats.total10k = Math.min(ebayStats.total10k, ebayStats.limit10k)

  // 在庫アラート集計
  const inventoryStats = {
    total: inventoryItems.length,
    inStock: inventoryItems.filter(i => i.status === 'in_stock').length,
    lowStock: inventoryItems.filter(i => i.status === 'low_stock').length,
    outOfStock: inventoryItems.filter(i => i.status === 'out_of_stock').length,
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">読み込み中...</div>
          <div className="text-sm text-muted-foreground">データを取得しています</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            モール別出品制限/在庫管理ダッシュボード
          </h1>
          <p className="text-sm text-muted-foreground">
            Ebayの出品制限枠と在庫回転率の高い商品を管理します
          </p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                在庫監視中
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inventoryStats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                在庫あり
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {inventoryStats.inStock}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                在庫少
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {inventoryStats.lowStock}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                在庫切れ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {inventoryStats.outOfStock}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Ebayカテゴリ制限管理 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Ebay出品制限管理
              </CardTitle>
              <CardDescription>
                カテゴリーごとの出品数と残り許容枠
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 10,000件枠 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">10,000件枠</div>
                  <div className="text-sm text-muted-foreground">
                    {ebayStats.total10k} / {ebayStats.limit10k} 件
                  </div>
                </div>
                <Progress
                  value={(ebayStats.total10k / ebayStats.limit10k) * 100}
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground">
                  残り: {ebayStats.limit10k - ebayStats.total10k} 件
                </div>
              </div>

              {/* 50,000件枠 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">50,000件枠（別枠）</div>
                  <div className="text-sm text-muted-foreground">
                    {ebayStats.total50k} / {ebayStats.limit50k} 件
                  </div>
                </div>
                <Progress
                  value={(ebayStats.total50k / ebayStats.limit50k) * 100}
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground">
                  残り: {ebayStats.limit50k - ebayStats.total50k} 件
                </div>
              </div>

              {/* カテゴリー内訳 */}
              <div className="pt-4 border-t border-border">
                <div className="text-sm font-semibold mb-3">カテゴリー内訳</div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {ebayLimits.map((limit) => (
                    <div
                      key={limit.id}
                      className="flex items-center justify-between p-2 bg-muted rounded-md"
                    >
                      <div className="flex-1">
                        <div className="text-xs font-medium truncate">
                          {limit.category_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {limit.is_50k_tier && (
                            <Badge variant="secondary" className="text-xs mr-1">
                              50K枠
                            </Badge>
                          )}
                          {limit.category_id}
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <div className="text-sm font-semibold">
                          {limit.current_count}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          / {limit.limit_count}
                        </div>
                      </div>
                    </div>
                  ))}

                  {ebayLimits.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      データがありません
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 一括登録エリア */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                在庫監視URL一括登録
              </CardTitle>
              <CardDescription>
                URLを複数行ペーストして一括登録
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  商品URL（1行につき1つ）
                </label>
                <textarea
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  placeholder="https://example.com/product1&#10;https://example.com/product2&#10;https://example.com/product3"
                  className="w-full h-64 px-3 py-2 text-sm bg-background border border-border rounded-md resize-none font-mono"
                />
              </div>

              <Button
                onClick={handleBulkRegister}
                disabled={processing || !bulkUrls.trim()}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                一括登録
              </Button>

              <div className="text-xs text-muted-foreground">
                ※ 登録後、自動的に在庫状況の監視が開始されます
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 在庫状況リスト */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  在庫監視リスト
                </CardTitle>
                <CardDescription>
                  登録された商品の在庫状況と次回チェック予定
                </CardDescription>
              </div>
              <Button
                onClick={loadInventoryItems}
                variant="outline"
                size="sm"
                disabled={processing}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                更新
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inventoryItems.map((item) => {
                const isLowStock = item.status === 'low_stock'
                const isOutOfStock = item.status === 'out_of_stock'
                const isAlertStatus = isLowStock || isOutOfStock

                return (
                  <div
                    key={item.id}
                    className={`p-4 border rounded-lg ${
                      isOutOfStock
                        ? 'border-red-500 bg-red-50/50'
                        : isLowStock
                        ? 'border-yellow-500 bg-yellow-50/50'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* SKUとステータス */}
                        <div className="flex items-center gap-2 mb-2">
                          {item.sku ? (
                            <div className="font-semibold text-sm">{item.sku}</div>
                          ) : (
                            <div className="text-sm text-muted-foreground">SKU未設定</div>
                          )}

                          {isOutOfStock && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              在庫切れ
                            </Badge>
                          )}
                          {isLowStock && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              在庫少
                            </Badge>
                          )}
                          {item.status === 'in_stock' && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              在庫あり
                            </Badge>
                          )}
                        </div>

                        {/* URL */}
                        <div className="flex items-center gap-2 mb-3">
                          <a
                            href={item.product_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline truncate flex items-center gap-1"
                          >
                            {item.product_url}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </div>

                        {/* 詳細情報 */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                          <div>
                            <div className="text-muted-foreground mb-1">現在在庫</div>
                            <div className="font-semibold">
                              {item.current_stock !== null ? item.current_stock : '-'}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground mb-1">最安値</div>
                            <div className="font-semibold">
                              {item.lowest_price ? `$${item.lowest_price.toFixed(2)}` : '-'}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground mb-1">競合数</div>
                            <div className="font-semibold">
                              {item.competitor_count || 0}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground mb-1">最終確認</div>
                            <div className="font-semibold">
                              {item.last_check_at
                                ? new Date(item.last_check_at).toLocaleString('ja-JP', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '-'}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground mb-1">次回確認</div>
                            <div className="font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.next_check_at
                                ? new Date(item.next_check_at).toLocaleString('ja-JP', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '-'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 削除ボタン */}
                      <Button
                        onClick={() => handleDeleteItem(item.id)}
                        variant="ghost"
                        size="sm"
                        disabled={processing}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-600" />
                      </Button>
                    </div>
                  </div>
                )
              })}

              {inventoryItems.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>在庫監視中の商品がありません</p>
                  <p className="text-sm mt-2">
                    上記の一括登録エリアからURLを登録してください
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
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
          <Card className="p-6">
            <div className="text-center">
              <div className="mb-4">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
              <div className="text-lg font-semibold">処理中...</div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
