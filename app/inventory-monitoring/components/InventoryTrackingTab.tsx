'use client'

/**
 * 在庫追従システムタブ - 複数URL管理とチェック頻度制御
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import {
  RefreshCw,
  ExternalLink,
  Clock,
  TrendingUp,
  Package,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react'

interface ReferenceUrl {
  url: string
  price: number
  is_available: boolean
}

interface ProductWithTracking {
  id: string
  sku: string
  title: string
  reference_urls: ReferenceUrl[]
  median_price: number | null
  current_stock_count: number | null
  last_check_time: string | null
  check_frequency: string
}

interface TrackingLog {
  id: string
  product_id: string
  checked_at: string
  reference_url: string
  check_status: string
  price_at_check: number
  stock_at_check: number
  source_switched: boolean
  switched_from_url: string | null
  switched_to_url: string | null
}

export function InventoryTrackingTab() {
  const [products, setProducts] = useState<ProductWithTracking[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductWithTracking | null>(null)
  const [trackingLogs, setTrackingLogs] = useState<TrackingLog[]>([])
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)

  const supabase = createClient()

  // 商品一覧を取得
  const loadProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, sku, title, reference_urls, median_price, current_stock_count, last_check_time, check_frequency')
        .not('reference_urls', 'is', null)
        .order('last_check_time', { ascending: true, nullsFirst: true })
        .limit(100)

      if (error) throw error

      const filtered = (data || []).filter(
        (p: any) => p.reference_urls && Array.isArray(p.reference_urls) && p.reference_urls.length > 0
      )

      setProducts(filtered)
    } catch (error) {
      console.error('商品取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  // 選択商品のログを取得
  const loadTrackingLogs = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('inventory_tracking_logs')
        .select('*')
        .eq('product_id', productId)
        .order('checked_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setTrackingLogs(data || [])
    } catch (error) {
      console.error('ログ取得エラー:', error)
    }
  }

  // バッチ実行
  const executeBatch = async (frequency?: string) => {
    setExecuting(true)
    try {
      const params = new URLSearchParams()
      if (frequency) params.append('check_frequency', frequency)
      params.append('max_items', '50')

      const response = await fetch(`/api/inventory-tracking/execute?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        alert(`バッチ実行完了\n処理: ${result.result.total_processed}件\n変動: ${result.result.changes_detected}件\n切替: ${result.result.sources_switched}件`)
        loadProducts()
      } else {
        alert(`エラー: ${result.error}`)
      }
    } catch (error) {
      console.error('バッチ実行エラー:', error)
      alert('バッチ実行に失敗しました')
    } finally {
      setExecuting(false)
    }
  }

  // 単一商品チェック
  const checkSingleProduct = async (productId: string) => {
    setExecuting(true)
    try {
      const response = await fetch('/api/inventory-tracking/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId }),
      })
      const result = await response.json()

      if (result.success) {
        const r = result.result
        let message = `チェック完了: ${r.sku}\n`
        if (r.changes_detected) {
          message += `\n変動検知:`
          if (r.source_switched) {
            message += `\n  仕入先切替: ${r.switched_from_url} → ${r.switched_to_url}`
          }
          if (r.old_price !== r.new_price) {
            message += `\n  価格変動: ¥${r.old_price} → ¥${r.new_price}`
          }
          if (r.old_stock !== r.new_stock) {
            message += `\n  在庫変動: ${r.old_stock} → ${r.new_stock}`
          }
        } else {
          message += `変動なし`
        }
        alert(message)
        loadProducts()
        if (selectedProduct?.id === productId) {
          loadTrackingLogs(productId)
        }
      } else {
        alert(`エラー: ${result.error}`)
      }
    } catch (error) {
      console.error('チェックエラー:', error)
      alert('チェックに失敗しました')
    } finally {
      setExecuting(false)
    }
  }

  // チェック頻度変更
  const changeFrequency = async (productId: string, frequency: string) => {
    try {
      const response = await fetch('/api/inventory-tracking/frequency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_ids: [productId],
          frequency,
        }),
      })
      const result = await response.json()

      if (result.success) {
        alert(`チェック頻度を${frequency}に変更しました`)
        loadProducts()
      } else {
        alert(`エラー: ${result.error}`)
      }
    } catch (error) {
      console.error('頻度変更エラー:', error)
      alert('頻度変更に失敗しました')
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    if (selectedProduct) {
      loadTrackingLogs(selectedProduct.id)
    }
  }, [selectedProduct])

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">在庫追従システム</h2>
          <p className="text-sm text-muted-foreground">複数URL管理と自動切替</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => executeBatch()} disabled={executing}>
            {executing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            全件チェック
          </Button>
          <Button onClick={() => executeBatch('高頻度')} disabled={executing} variant="secondary">
            高頻度のみチェック
          </Button>
        </div>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">登録商品</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">通常頻度</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.filter((p) => p.check_frequency === '通常').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">高頻度</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.filter((p) => p.check_frequency === '高頻度').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">平均URL数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.length > 0 ? (products.reduce((sum, p) => sum + (p.reference_urls?.length || 0), 0) / products.length).toFixed(1) : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 商品一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>登録商品一覧</CardTitle>
          <CardDescription>在庫追従が設定されている商品</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>在庫追従が設定されている商品がありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={`border rounded-lg p-4 cursor-pointer hover:bg-accent transition-colors ${
                    selectedProduct?.id === product.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold">{product.sku}</span>
                        <Badge variant={product.check_frequency === '高頻度' ? 'default' : 'secondary'}>
                          {product.check_frequency}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{product.title}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); checkSingleProduct(product.id) }} disabled={executing}>
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                      <select
                        className="text-xs border rounded px-2 py-1"
                        value={product.check_frequency}
                        onChange={(e) => { e.stopPropagation(); changeFrequency(product.id, e.target.value) }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="通常">通常</option>
                        <option value="高頻度">高頻度</option>
                      </select>
                    </div>
                  </div>

                  {/* 参照URL一覧 */}
                  <div className="space-y-1 mt-3">
                    <div className="text-xs font-semibold text-muted-foreground">参照URL ({product.reference_urls?.length || 0}件)</div>
                    {product.reference_urls?.slice(0, 3).map((ref, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs bg-background rounded px-2 py-1">
                        <Badge variant={ref.is_available ? 'default' : 'destructive'} className="text-xs px-1">
                          {idx + 1}
                        </Badge>
                        {ref.is_available ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span className="font-mono">¥{ref.price.toLocaleString()}</span>
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline truncate flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {new URL(ref.url).hostname}
                        </a>
                      </div>
                    ))}
                  </div>

                  {/* 統計情報 */}
                  <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">中央値: </span>
                      <span className="font-mono">¥{product.median_price?.toLocaleString() || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">在庫: </span>
                      <span className="font-mono">{product.current_stock_count ?? '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">最終: </span>
                      <span className="font-mono">
                        {product.last_check_time ? new Date(product.last_check_time).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 選択商品の履歴 */}
      {selectedProduct && (
        <Card>
          <CardHeader>
            <CardTitle>チェック履歴: {selectedProduct.sku}</CardTitle>
            <CardDescription>{selectedProduct.title}</CardDescription>
          </CardHeader>
          <CardContent>
            {trackingLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>履歴がありません</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trackingLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {log.check_status === 'success' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : log.check_status === 'out_of_stock' ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="text-sm font-semibold">{log.check_status}</span>
                        {log.source_switched && (
                          <Badge variant="destructive" className="text-xs">仕入先切替</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.checked_at).toLocaleString('ja-JP')}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="font-mono">
                        価格: ¥{log.price_at_check?.toLocaleString() || '-'} / 在庫: {log.stock_at_check ?? '-'}
                      </div>
                      {log.source_switched && (
                        <div className="text-orange-600">
                          ⚠️ {new URL(log.switched_from_url || '').hostname} → {new URL(log.switched_to_url || '').hostname}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
