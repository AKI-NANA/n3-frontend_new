// app/approval/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Check, X, RefreshCw, AlertTriangle, ExternalLink, Edit,
  Shield, Ban, Globe, DollarSign, TrendingUp, Package
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface FilterStatus {
  vero_filter?: boolean
  vero_detected?: string[]
  export_filter?: boolean
  export_detected?: string[]
  patent_filter?: boolean
  patent_detected?: string[]
  mall_filter?: boolean
  mall_detected?: string[]
}

interface Product {
  id: string
  item_id?: string
  title: string
  description?: string
  sku?: string
  
  // 価格情報
  acquired_price_jpy?: number
  ddp_price_usd?: number
  ddu_price_usd?: number
  shipping_cost_usd?: number
  
  // 利益情報
  profit_margin?: number
  profit_amount_usd?: number
  sm_profit_margin?: number
  
  // 競合情報
  competitor_lowest_price?: number
  
  // 在庫・状態
  stock_quantity?: number
  condition?: string
  
  // カテゴリ・画像
  category_name?: string
  image_urls?: string[]
  image_count?: number
  
  // フィルター結果
  filter_status?: FilterStatus
  
  // 承認状態
  ready_to_list?: boolean
  approval_status?: 'approved' | 'pending' | 'rejected'
  
  // その他
  created_at?: string
  updated_at?: string
}

interface MissingFields {
  required: string[]
  optional: string[]
}

export default function ApprovalPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [completeProducts, setCompleteProducts] = useState<Product[]>([])
  const [incompleteProducts, setIncompleteProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const supabase = createClient()

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // 必須フィールドのチェック
  const checkMissingFields = (product: Product): MissingFields => {
    const required: string[] = []
    const optional: string[] = []

    // 必須項目チェック
    if (!product.title) required.push('商品タイトル')
    if (!product.acquired_price_jpy && !product.ddp_price_usd) required.push('仕入価格')
    if (!product.image_urls || product.image_urls.length === 0) required.push('商品画像')
    if (!product.category_name) required.push('カテゴリ')
    if (!product.stock_quantity) required.push('在庫数')
    if (!product.condition) required.push('商品状態')

    // 推奨項目チェック
    if (!product.description) optional.push('商品説明')
    if (!product.sku) optional.push('SKU')
    if (!product.shipping_cost_usd) optional.push('送料')
    if (product.profit_margin === undefined || product.profit_margin === null) optional.push('利益率')
    if (!product.competitor_lowest_price) optional.push('競合最安値')

    return { required, optional }
  }

  // データ完全性チェック
  const isDataComplete = (product: Product): boolean => {
    const missing = checkMissingFields(product)
    return missing.required.length === 0
  }

  // フィルター警告があるかチェック
  const hasFilterWarnings = (product: Product): boolean => {
    const fs = product.filter_status
    if (!fs) return false
    
    return fs.vero_filter === false || 
           fs.export_filter === false || 
           fs.patent_filter === false || 
           fs.mall_filter === false
  }

  // 商品データ読み込み
  const loadProducts = async () => {
    try {
      setLoading(true)
      
      // まずproductsテーブルから取得を試みる
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      // productsテーブルにデータがない場合、items_dataテーブルも試す
      if (!productsData || productsData.length === 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('items_data')
          .select('*')
          .order('created_at', { ascending: false })

        if (itemsError) {
          console.error('items_data取得エラー:', itemsError)
        } else if (itemsData && itemsData.length > 0) {
          setProducts(itemsData as Product[])
          categorizeProducts(itemsData as Product[])
          setLoading(false)
          return
        }
      }

      if (productsError) throw productsError

      if (productsData && productsData.length > 0) {
        setProducts(productsData as Product[])
        categorizeProducts(productsData as Product[])
      } else {
        // データがない場合はダミーデータを表示
        const dummyProducts = createDummyProducts()
        setProducts(dummyProducts)
        categorizeProducts(dummyProducts)
      }
    } catch (error: any) {
      console.error('データ取得エラー:', error)
      showToast(error.message || 'データ取得に失敗しました', 'error')
      
      // エラー時もダミーデータを表示
      const dummyProducts = createDummyProducts()
      setProducts(dummyProducts)
      categorizeProducts(dummyProducts)
    } finally {
      setLoading(false)
    }
  }

  // ダミーデータ作成（データがない場合の表示用）
  const createDummyProducts = (): Product[] => {
    return [
      // データ完全な商品例
      {
        id: 'dummy-1',
        item_id: 'ITEM-001',
        title: 'ソニー ワイヤレスヘッドホン WH-1000XM4',
        description: '業界最高クラスのノイズキャンセリング機能搭載',
        sku: 'SKU-SONY-WH1000XM4',
        acquired_price_jpy: 25000,
        ddp_price_usd: 299,
        ddu_price_usd: 279,
        shipping_cost_usd: 15,
        profit_margin: 28.5,
        profit_amount_usd: 85,
        sm_profit_margin: 25.2,
        competitor_lowest_price: 320,
        stock_quantity: 5,
        condition: 'new',
        category_name: 'Electronics > Headphones',
        image_urls: ['https://placehold.co/400x400/4a90e2/white?text=Sony+WH-1000XM4'],
        image_count: 1,
        filter_status: {
          vero_filter: true,
          export_filter: true,
          patent_filter: true,
          mall_filter: true,
        },
        ready_to_list: true,
        approval_status: 'pending',
        created_at: new Date().toISOString(),
      },
      // VeROフィルター引っかかり例
      {
        id: 'dummy-2',
        item_id: 'ITEM-002',
        title: 'ルイヴィトン風 ハンドバッグ',
        description: 'ルイヴィトンスタイルのバッグ',
        sku: 'SKU-BAG-LV-001',
        acquired_price_jpy: 8000,
        ddp_price_usd: 120,
        profit_margin: 35.0,
        stock_quantity: 3,
        condition: 'new',
        category_name: 'Fashion > Bags',
        image_urls: ['https://placehold.co/400x400/e74c3c/white?text=VeRO+Warning'],
        image_count: 1,
        filter_status: {
          vero_filter: false,
          vero_detected: ['ルイヴィトン', 'Louis Vuitton'],
          export_filter: true,
          patent_filter: true,
          mall_filter: true,
        },
        ready_to_list: false,
        approval_status: 'rejected',
        created_at: new Date().toISOString(),
      },
      // データ不足例
      {
        id: 'dummy-3',
        item_id: 'ITEM-003',
        title: 'ノーブランド ウォッチ',
        // description なし
        // sku なし
        acquired_price_jpy: 1500,
        // 送料なし、利益率なし、競合価格なし
        stock_quantity: 10,
        condition: 'new',
        // category_name なし
        // image_urls なし
        filter_status: {
          export_filter: true,
          patent_filter: true,
        },
        ready_to_list: false,
        approval_status: 'pending',
        created_at: new Date().toISOString(),
      },
      // 輸出禁止フィルター引っかかり例
      {
        id: 'dummy-4',
        item_id: 'ITEM-004',
        title: '希少動物の牙を使用した工芸品',
        description: '象牙を使用した伝統工芸品',
        sku: 'SKU-IVORY-001',
        acquired_price_jpy: 50000,
        stock_quantity: 1,
        condition: 'used',
        category_name: 'Collectibles > Art',
        image_urls: ['https://placehold.co/400x400/e67e22/white?text=Export+Prohibited'],
        image_count: 1,
        filter_status: {
          vero_filter: true,
          export_filter: false,
          export_detected: ['象牙', 'ivory'],
          patent_filter: true,
          mall_filter: true,
        },
        ready_to_list: false,
        approval_status: 'rejected',
        created_at: new Date().toISOString(),
      },
    ]
  }

  // 商品を完全/不完全に分類
  const categorizeProducts = (allProducts: Product[]) => {
    const complete: Product[] = []
    const incomplete: Product[] = []

    allProducts.forEach(product => {
      if (isDataComplete(product)) {
        complete.push(product)
      } else {
        incomplete.push(product)
      }
    })

    setCompleteProducts(complete)
    setIncompleteProducts(incomplete)
  }

  useEffect(() => {
    loadProducts()
  }, [])

  // 一括承認
  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) {
      showToast('商品を選択してください', 'error')
      return
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          approval_status: 'approved',
          ready_to_list: true 
        })
        .in('id', Array.from(selectedIds))

      if (error) throw error

      showToast(`${selectedIds.size}件を承認しました`)
      setSelectedIds(new Set())
      await loadProducts()
    } catch (error: any) {
      showToast(error.message || '承認に失敗しました', 'error')
    }
  }

  // 選択トグル
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-lg font-semibold text-slate-700">読み込み中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            商品承認システム
          </h1>
          <p className="text-slate-600">
            フィルターを通過した商品を確認し、出品を承認します
          </p>
        </div>

        {/* 統計サマリー */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-800">{products.length}</div>
                <div className="text-sm text-slate-500 mt-1">総商品数</div>
              </div>
              <Package className="w-10 h-10 text-blue-500 opacity-20" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 shadow-sm text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{completeProducts.length}</div>
                <div className="text-sm opacity-90 mt-1">データ完全</div>
              </div>
              <Check className="w-10 h-10 opacity-30" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-6 shadow-sm text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{incompleteProducts.length}</div>
                <div className="text-sm opacity-90 mt-1">データ不足</div>
              </div>
              <AlertTriangle className="w-10 h-10 opacity-30" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-blue-600">{selectedIds.size}</div>
                <div className="text-sm text-slate-500 mt-1">選択中</div>
              </div>
              <Check className="w-10 h-10 text-blue-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* アクションバー */}
        {selectedIds.size > 0 && (
          <div className="bg-white rounded-xl p-4 mb-6 shadow-lg border-2 border-blue-500 sticky top-4 z-40">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-slate-700">
                {selectedIds.size}件選択中
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleBulkApprove}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  一括承認して出品へ
                </Button>
                <Button
                  onClick={() => setSelectedIds(new Set())}
                  variant="outline"
                >
                  選択解除
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* データ完全グループ */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-2">
              <Check className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">データ完全 - 承認可能</h2>
              <p className="text-sm text-slate-500">すべての必須項目が揃っている商品</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {completeProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isSelected={selectedIds.has(product.id)}
                onToggleSelect={toggleSelect}
                isComplete={true}
              />
            ))}
          </div>

          {completeProducts.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Check className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>データが完全な商品はまだありません</p>
            </div>
          )}
        </div>

        {/* データ不足グループ */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg p-2">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">データ不足 - 要編集</h2>
              <p className="text-sm text-slate-500">必須項目が不足している商品</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {incompleteProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isSelected={false}
                onToggleSelect={() => {}}
                isComplete={false}
                missingFields={checkMissingFields(product)}
              />
            ))}
          </div>

          {incompleteProducts.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>データ不足の商品はありません</p>
            </div>
          )}
        </div>
      </div>

      {/* トースト通知 */}
      {toast && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-lg shadow-2xl text-white z-50 animate-in slide-in-from-right ${
          toast.type === 'error' 
            ? 'bg-gradient-to-r from-red-500 to-rose-600' 
            : 'bg-gradient-to-r from-green-500 to-emerald-600'
        }`}>
          <div className="flex items-center gap-3">
            {toast.type === 'error' ? (
              <X className="w-5 h-5" />
            ) : (
              <Check className="w-5 h-5" />
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// 商品カードコンポーネント
function ProductCard({ 
  product, 
  isSelected, 
  onToggleSelect, 
  isComplete,
  missingFields 
}: { 
  product: Product
  isSelected: boolean
  onToggleSelect: (id: string) => void
  isComplete: boolean
  missingFields?: MissingFields
}) {
  const fs = product.filter_status || {}
  const hasFilterWarnings = fs.vero_filter === false || fs.export_filter === false || 
                           fs.patent_filter === false || fs.mall_filter === false

  return (
    <div
      className={`relative rounded-xl overflow-hidden shadow-lg transition-all hover:shadow-2xl cursor-pointer
        ${isSelected ? 'ring-4 ring-blue-500' : 'ring-1 ring-slate-200'}
        ${!isComplete ? 'opacity-75' : ''}
      `}
      onClick={() => isComplete && onToggleSelect(product.id)}
      style={{
        backgroundImage: product.image_urls && product.image_urls[0] 
          ? `url(${product.image_urls[0]})` 
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* オーバーレイ */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>

      {/* コンテンツ */}
      <div className="relative h-[400px] p-5 flex flex-col">
        {/* 上部: チェックボックスとバッジ */}
        <div className="flex items-start justify-between mb-auto">
          {isComplete && (
            <div 
              className="bg-white rounded-lg p-1 shadow-lg"
              onClick={(e) => {
                e.stopPropagation()
                onToggleSelect(product.id)
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {}}
                className="w-5 h-5 rounded cursor-pointer"
              />
            </div>
          )}

          <div className="flex flex-col gap-2 ml-auto">
            {/* フィルター警告バッジ */}
            {fs.vero_filter === false && (
              <div className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                <Shield className="w-3 h-3" />
                VeRO
              </div>
            )}
            {fs.export_filter === false && (
              <div className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                <Ban className="w-3 h-3" />
                輸出禁止
              </div>
            )}
            {fs.patent_filter === false && (
              <div className="bg-amber-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                <AlertTriangle className="w-3 h-3" />
                パテント
              </div>
            )}
            {fs.mall_filter === false && (
              <div className="bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                <Globe className="w-3 h-3" />
                モール制限
              </div>
            )}

            {/* 承認ステータス */}
            {isComplete && !hasFilterWarnings && (
              <div className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                承認可能
              </div>
            )}
          </div>
        </div>

        {/* 下部: 商品情報 */}
        <div className="space-y-3">
          {/* タイトル */}
          <h3 className="text-white font-bold text-lg line-clamp-2 drop-shadow-lg">
            {product.title || '商品名なし'}
          </h3>

          {/* 価格・利益情報 */}
          {isComplete ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-2 border border-white/30">
                <div className="text-white/80 text-xs mb-1">販売価格</div>
                <div className="text-white font-bold text-lg">
                  ${product.ddp_price_usd || product.ddu_price_usd || '---'}
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-2 border border-white/30">
                <div className="text-white/80 text-xs mb-1">利益率</div>
                <div className={`font-bold text-lg ${
                  (product.profit_margin || 0) >= 20 ? 'text-green-300' :
                  (product.profit_margin || 0) >= 10 ? 'text-yellow-300' :
                  'text-red-300'
                }`}>
                  {product.profit_margin?.toFixed(1) || '---'}%
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-2 border border-white/30">
                <div className="text-white/80 text-xs mb-1">競合最安</div>
                <div className="text-white font-bold">
                  ${product.competitor_lowest_price || '---'}
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-2 border border-white/30">
                <div className="text-white/80 text-xs mb-1">利益額</div>
                <div className="text-green-300 font-bold">
                  ${product.profit_amount_usd || '---'}
                </div>
              </div>
            </div>
          ) : (
            /* データ不足表示 */
            <div className="bg-red-500/90 backdrop-blur-md rounded-lg p-4 border-2 border-red-300">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-white" />
                <div className="text-white font-bold">データ不足</div>
              </div>
              
              {missingFields && missingFields.required.length > 0 && (
                <div className="mb-3">
                  <div className="text-white text-xs font-semibold mb-1">必須項目:</div>
                  <div className="space-y-1">
                    {missingFields.required.map((field, idx) => (
                      <div key={idx} className="text-white text-xs flex items-center gap-1">
                        <X className="w-3 h-3" />
                        {field}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <a
                href={`/tools/editing?id=${product.id}`}
                className="flex items-center justify-center gap-2 bg-white text-red-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-50 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Edit className="w-4 h-4" />
                データ編集へ
              </a>
            </div>
          )}

          {/* SKU・在庫 */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/70">
              SKU: {product.sku || '未設定'}
            </span>
            <span className="text-white/70">
              在庫: {product.stock_quantity || 0}個
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
