'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  AlertCircle, CheckCircle, XCircle, AlertTriangle,
  Sparkles, RefreshCw, ChevronLeft, ChevronRight, Filter
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface GeminiRiskAssessment {
  vero: { risk: boolean; reason?: string }
  patent_troll: { risk: boolean; reason?: string }
  hazardous: { risk: boolean; reason?: string }
}

interface GeminiListingFormat {
  variation: { recommended: boolean; reason?: string }
  single: { recommended: boolean; reason?: string }
  bundle: { recommended: boolean; reason?: string }
  series_suggestion?: string
}

interface Product {
  id: string
  sku: string
  title: string
  title_en?: string
  primary_image_url?: string
  gallery_images?: string[]
  current_price?: number
  profit_margin?: number
  priority_score?: number
  gemini_risk_assessment?: GeminiRiskAssessment
  gemini_listing_format?: GeminiListingFormat
  status?: string
  approval_status?: string
  condition_name?: string
  category?: string
  created_at: string
}

type ListingFormat = 'single' | 'bundle' | 'variation'

export default function ApprovalDashboardPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [page, setPage] = useState(1)
  const [filterRisk, setFilterRisk] = useState<'all' | 'safe' | 'risk'>('all')
  const [selectedFormats, setSelectedFormats] = useState<Record<string, ListingFormat>>({})
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const pageSize = 12
  const totalPages = Math.ceil(products.length / pageSize)
  const paginatedProducts = products.slice((page - 1) * pageSize, page * pageSize)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadProducts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products_master')
        .select('*')
        .in('approval_status', ['pending', 'under_review'])
        .order('priority_score', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(100)

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

  const getRiskLevel = (product: Product): 'high' | 'medium' | 'safe' => {
    const risk = product.gemini_risk_assessment
    if (!risk) return 'safe'

    if (risk.vero?.risk || risk.patent_troll?.risk || risk.hazardous?.risk) {
      return 'high'
    }

    return 'safe'
  }

  const getRecommendedFormat = (product: Product): ListingFormat => {
    const format = product.gemini_listing_format
    if (!format) return 'single'

    if (format.variation?.recommended) return 'variation'
    if (format.bundle?.recommended) return 'bundle'
    return 'single'
  }

  const handleApprove = async (productId: string) => {
    const format = selectedFormats[productId] || getRecommendedFormat(
      products.find(p => p.id === productId)!
    )

    try {
      setProcessing(true)

      const { error } = await supabase
        .from('products_master')
        .update({
          approval_status: 'approved',
          listing_format: format,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', productId)

      if (error) throw error

      // 自動出品キューへの転送
      const product = products.find(p => p.id === productId)
      if (product) {
        await supabase.from('listing_queue').insert({
          product_id: productId,
          sku: product.sku,
          listing_format: format,
          priority: product.priority_score || 0,
          status: 'queued',
          created_at: new Date().toISOString()
        })
      }

      showToast('商品を承認しました')
      await loadProducts()
    } catch (error: any) {
      showToast(error.message || '承認に失敗しました', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async (productId: string) => {
    if (!confirm('この商品を却下しますか？')) return

    try {
      setProcessing(true)

      const { error } = await supabase
        .from('products_master')
        .update({
          approval_status: 'rejected',
          rejected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', productId)

      if (error) throw error

      showToast('商品を却下しました')
      await loadProducts()
    } catch (error: any) {
      showToast(error.message || '却下に失敗しました', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const filteredProducts = products.filter(product => {
    if (filterRisk === 'all') return true
    const risk = getRiskLevel(product)
    if (filterRisk === 'risk') return risk === 'high' || risk === 'medium'
    return risk === 'safe'
  })

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
            AI承認・出品形式決定ダッシュボード
          </h1>
          <p className="text-sm text-muted-foreground">
            外注スタッフ向け：商品の承認と最適な出品形式を決定します
          </p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                承認待ち
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                リスクあり
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {products.filter(p => getRiskLevel(p) === 'high').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                安全
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {products.filter(p => getRiskLevel(p) === 'safe').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                平均優先度
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.length > 0
                  ? (products.reduce((sum, p) => sum + (p.priority_score || 0), 0) / products.length).toFixed(1)
                  : '0.0'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* フィルターバー */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">フィルター:</span>
              </div>

              <div className="flex gap-2">
                {['all', 'safe', 'risk'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setFilterRisk(filter as any)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      filterRisk === filter
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted border border-border'
                    }`}
                  >
                    {filter === 'all' && '全て'}
                    {filter === 'safe' && '安全'}
                    {filter === 'risk' && 'リスクあり'}
                  </button>
                ))}
              </div>

              <Button
                onClick={loadProducts}
                variant="outline"
                size="sm"
                disabled={processing}
                className="ml-auto"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                更新
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 商品グリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {paginatedProducts.map((product) => {
            const riskLevel = getRiskLevel(product)
            const recommendedFormat = getRecommendedFormat(product)
            const selectedFormat = selectedFormats[product.id] || recommendedFormat
            const risk = product.gemini_risk_assessment
            const format = product.gemini_listing_format

            return (
              <Card
                key={product.id}
                className={`overflow-hidden ${
                  riskLevel === 'high' ? 'border-red-500 border-2' : ''
                }`}
              >
                {/* 優先度スコア */}
                <div className="absolute top-2 left-2 z-10">
                  <Badge variant="secondary" className="bg-black/70 text-white">
                    優先度: {product.priority_score?.toFixed(1) || 'N/A'}
                  </Badge>
                </div>

                {/* 商品画像 */}
                <div className="relative h-48 bg-muted">
                  {product.primary_image_url ? (
                    <img
                      src={product.primary_image_url}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      画像なし
                    </div>
                  )}
                </div>

                <CardHeader>
                  <CardTitle className="text-sm line-clamp-2">
                    {product.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    SKU: {product.sku}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* リスク判定 */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground mb-2">
                      リスク判定
                    </div>

                    <div className="flex items-center gap-2">
                      {risk?.vero?.risk ? (
                        <XCircle className="w-4 h-4 text-red-600" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                      <span className="text-xs">VERO</span>
                      {risk?.vero?.risk && (
                        <Badge variant="destructive" className="ml-auto text-xs">
                          要注意
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {risk?.patent_troll?.risk ? (
                        <XCircle className="w-4 h-4 text-red-600" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                      <span className="text-xs">パテントトロール</span>
                      {risk?.patent_troll?.risk && (
                        <Badge variant="destructive" className="ml-auto text-xs">
                          要注意
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {risk?.hazardous?.risk ? (
                        <XCircle className="w-4 h-4 text-red-600" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                      <span className="text-xs">危険物</span>
                      {risk?.hazardous?.risk && (
                        <Badge variant="destructive" className="ml-auto text-xs">
                          要注意
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* 出品形式推奨 */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground mb-2">
                      出品形式推奨
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {format?.variation?.recommended && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                          <Sparkles className="w-3 h-3 mr-1" />
                          バリエーション
                        </Badge>
                      )}
                      {format?.single?.recommended && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          <Sparkles className="w-3 h-3 mr-1" />
                          単品
                        </Badge>
                      )}
                      {format?.bundle?.recommended && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          <Sparkles className="w-3 h-3 mr-1" />
                          セット
                        </Badge>
                      )}
                    </div>

                    {/* バリエーション推奨の場合のシリーズ提案 */}
                    {format?.variation?.recommended && format?.series_suggestion && (
                      <div className="bg-purple-50 border border-purple-200 rounded-md p-2 mt-2">
                        <div className="text-xs font-medium text-purple-900 mb-1">
                          シリーズ追加の提案
                        </div>
                        <div className="text-xs text-purple-700">
                          {format.series_suggestion}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 出品形式選択 */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">
                      出品形式を選択
                    </label>
                    <select
                      value={selectedFormat}
                      onChange={(e) => setSelectedFormats({
                        ...selectedFormats,
                        [product.id]: e.target.value as ListingFormat
                      })}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
                    >
                      <option value="single">単品</option>
                      <option value="bundle">セット</option>
                      <option value="variation">バリエーション</option>
                    </select>
                  </div>

                  {/* 商品情報 */}
                  <div className="pt-2 border-t border-border space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">価格:</span>
                      <span className="font-semibold">
                        ${product.current_price?.toFixed(2) || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">利益率:</span>
                      <span className={`font-semibold ${
                        (product.profit_margin || 0) >= 20 ? 'text-green-600' :
                        (product.profit_margin || 0) >= 10 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {product.profit_margin?.toFixed(1) || '0'}%
                      </span>
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleApprove(product.id)}
                      disabled={processing}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      承認
                    </Button>
                    <Button
                      onClick={() => handleReject(product.id)}
                      disabled={processing}
                      variant="destructive"
                      className="flex-1"
                      size="sm"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      却下
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* 商品がない場合 */}
        {filteredProducts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>承認待ちの商品がありません</p>
            </CardContent>
          </Card>
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
