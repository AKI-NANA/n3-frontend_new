'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertCircle, AlertTriangle, CheckCircle, Copy,
  RefreshCw, ExternalLink, Shield, FileText
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface VeroProduct {
  id: string
  sku: string
  title: string
  title_en?: string
  original_title?: string
  primary_image_url?: string
  brand_name?: string
  vero_risk_level: 'high' | 'medium' | 'low'
  vero_reason?: string
  suggested_title?: string
  suggested_listing_type?: 'new_variation_no_brand' | 'used'
  suggested_description_note?: string
  can_list_as_used?: boolean
  approval_status?: string
  created_at: string
}

export default function VeroDashboardPage() {
  const [products, setProducts] = useState<VeroProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [acceptedNotes, setAcceptedNotes] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

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
        .eq('vero_risk_level', 'high')
        .in('approval_status', ['pending', 'under_review'])
        .order('created_at', { ascending: false })
        .limit(50)

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

  const handleCopyTitle = (title: string) => {
    navigator.clipboard.writeText(title)
    showToast('タイトルをコピーしました')
  }

  const handleCopyNote = (note: string) => {
    navigator.clipboard.writeText(note)
    showToast('説明文をコピーしました')
  }

  const handleApproveWithVeroMitigation = async (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    if (product.suggested_description_note && !acceptedNotes[productId]) {
      showToast('商品ページ記載文言の確認チェックを入れてください', 'error')
      return
    }

    try {
      setProcessing(true)

      const updateData: any = {
        approval_status: 'approved_with_vero_mitigation',
        title_en: product.suggested_title || product.title_en,
        listing_type: product.suggested_listing_type,
        vero_mitigation_applied: true,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (product.suggested_description_note) {
        updateData.description_vero_note = product.suggested_description_note
      }

      const { error } = await supabase
        .from('products_master')
        .update(updateData)
        .eq('id', productId)

      if (error) throw error

      // 自動出品キューへの転送
      await supabase.from('listing_queue').insert({
        product_id: productId,
        sku: product.sku,
        listing_format: 'single',
        listing_type: product.suggested_listing_type,
        vero_safe: true,
        priority: 50,
        status: 'queued',
        created_at: new Date().toISOString()
      })

      showToast('VERO対策を適用して承認しました')
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
          rejection_reason: 'vero_risk_too_high',
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

  // 統計
  const stats = {
    total: products.length,
    canListAsUsed: products.filter(p => p.can_list_as_used).length,
    newVariation: products.filter(p => p.suggested_listing_type === 'new_variation_no_brand').length,
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">読み込み中...</div>
          <div className="text-sm text-muted-foreground">VERO対象商品を取得しています</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
            VERO対策ダッシュボード
          </h1>
          <p className="text-sm text-muted-foreground">
            知的財産権侵害リスクのある商品に対する安全な出品方法を提示します
          </p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                VERO対象商品
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                中古出品可能
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.canListAsUsed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                バリエーション出品推奨
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.newVariation}</div>
            </CardContent>
          </Card>
        </div>

        {/* 更新ボタン */}
        <div className="flex justify-end mb-6">
          <Button
            onClick={loadProducts}
            variant="outline"
            size="sm"
            disabled={processing}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            更新
          </Button>
        </div>

        {/* 商品リスト */}
        <div className="space-y-6">
          {products.map((product) => (
            <Card
              key={product.id}
              className="border-2 border-red-500 overflow-hidden"
            >
              <CardHeader className="bg-red-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-red-600" />
                      VERO対象商品
                    </CardTitle>
                    <CardDescription>
                      SKU: {product.sku}
                    </CardDescription>
                  </div>
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    高リスク
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* 商品画像と基本情報 */}
                  <div className="space-y-4">
                    {/* 画像 */}
                    <div className="relative h-48 bg-muted rounded-lg overflow-hidden">
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

                    {/* 元のタイトル */}
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-1">
                        元のタイトル
                      </div>
                      <div className="text-sm p-2 bg-muted rounded-md">
                        {product.original_title || product.title}
                      </div>
                    </div>

                    {/* リスク理由 */}
                    {product.vero_reason && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <div className="text-xs font-semibold text-red-900 mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          VEROリスク理由
                        </div>
                        <div className="text-xs text-red-700">
                          {product.vero_reason}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* VERO対策提案 */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* 自動タイトル変更案 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold">
                          リスク回避タイトル案
                        </div>
                        {product.suggested_title && (
                          <Button
                            onClick={() => handleCopyTitle(product.suggested_title!)}
                            variant="outline"
                            size="sm"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            コピー
                          </Button>
                        )}
                      </div>
                      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="text-sm text-green-900">
                          {product.suggested_title || '自動生成されたタイトルがありません'}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ※ このタイトルをコピーして出品時に使用してください
                      </div>
                    </div>

                    {/* 出品指示 */}
                    <div>
                      <div className="text-sm font-semibold mb-2">
                        出品方法の指示
                      </div>
                      <div className="space-y-2">
                        {product.suggested_listing_type === 'new_variation_no_brand' && (
                          <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                            <div className="flex items-start gap-2">
                              <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <div className="font-semibold text-sm text-purple-900 mb-1">
                                  新品/ブランド名なしのバリエーション出品
                                </div>
                                <div className="text-xs text-purple-700">
                                  バリエーション商品として出品し、ブランド名を記載しないでください。
                                  商品の特徴や機能のみを記載してください。
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {product.can_list_as_used && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <div className="flex items-start gap-2">
                              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <div className="font-semibold text-sm text-blue-900 mb-1">
                                  中古出品が可能
                                </div>
                                <div className="text-xs text-blue-700">
                                  この商品は中古品として出品することで、VEROリスクを軽減できます。
                                  コンディションを「中古」に設定してください。
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {!product.suggested_listing_type && !product.can_list_as_used && (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <div className="font-semibold text-sm text-yellow-900 mb-1">
                                  出品推奨方法が未設定
                                </div>
                                <div className="text-xs text-yellow-700">
                                  この商品の安全な出品方法が特定できていません。
                                  手動で確認してください。
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 商品ページ記載文言 */}
                    {product.suggested_description_note && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-semibold">
                            商品ページ記載文言
                          </div>
                          <Button
                            onClick={() => handleCopyNote(product.suggested_description_note!)}
                            variant="outline"
                            size="sm"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            コピー
                          </Button>
                        </div>
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                          <div className="text-xs text-amber-900">
                            {product.suggested_description_note}
                          </div>
                        </div>
                        <div className="flex items-start gap-2 mt-3 p-2 bg-muted rounded-md">
                          <Checkbox
                            id={`note-${product.id}`}
                            checked={acceptedNotes[product.id] || false}
                            onCheckedChange={(checked) => {
                              setAcceptedNotes({
                                ...acceptedNotes,
                                [product.id]: checked as boolean
                              })
                            }}
                          />
                          <label
                            htmlFor={`note-${product.id}`}
                            className="text-xs text-muted-foreground cursor-pointer"
                          >
                            この文言を商品ページに自動追加することを確認しました
                          </label>
                        </div>
                      </div>
                    )}

                    {/* アクションボタン */}
                    <div className="flex gap-2 pt-4 border-t border-border">
                      <Button
                        onClick={() => handleApproveWithVeroMitigation(product.id)}
                        disabled={processing}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        VERO対策を適用して承認
                      </Button>
                      <Button
                        onClick={() => handleReject(product.id)}
                        disabled={processing}
                        variant="destructive"
                        className="flex-1"
                      >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        却下
                      </Button>
                    </div>

                    {/* 注意事項 */}
                    <div className="bg-muted p-3 rounded-md">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-muted-foreground">
                          <div className="font-semibold mb-1">注意事項</div>
                          <ul className="list-disc list-inside space-y-1">
                            <li>提案されたタイトルと出品方法を必ず守ってください</li>
                            <li>ブランド名の記載が制限されている場合は記載しないでください</li>
                            <li>商品ページ記載文言を確認し、チェックボックスにチェックを入れてください</li>
                            <li>不明な点がある場合は、必ず管理者に確認してください</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 商品がない場合 */}
        {products.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>VERO対象商品はありません</p>
              <p className="text-sm mt-2">
                全ての商品が安全に出品可能です
              </p>
            </CardContent>
          </Card>
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
