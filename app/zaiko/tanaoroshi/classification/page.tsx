'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Package, ShoppingCart, Trash2, SkipForward } from 'lucide-react'
import Link from 'next/link'

interface QueueItem {
  id: string
  marketplace: string
  account: string
  listing_id: string
  product_name: string
  images: string[]
  scraped_data: any
  created_at: string
}

export default function ClassificationPage() {
  const supabase = createClientComponentClient()
  
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [totalPending, setTotalPending] = useState(0)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [classifiedCount, setClassifiedCount] = useState(0)

  // データ読み込み
  const loadQueue = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/inventory/classification-queue?limit=50')
      const data = await response.json()
      
      if (data.success) {
        setQueue(data.data)
        setTotalPending(data.total_pending)
      } else {
        alert(`読み込みエラー: ${data.error}`)
      }
    } catch (error: any) {
      console.error('読み込みエラー:', error)
      alert(`読み込みエラー: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQueue()
  }, [])

  // 分類実行
  const handleClassify = async (classification: 'stock' | 'dropship' | 'skip') => {
    if (queue.length === 0) return
    
    const currentItem = queue[currentIndex]
    setProcessing(true)
    
    try {
      const response = await fetch('/api/inventory/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queue_id: currentItem.id,
          classification: classification
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        console.log(`✅ ${classification}として処理: ${currentItem.product_name}`)
        
        if (classification !== 'skip') {
          setClassifiedCount(prev => prev + 1)
        }
        
        // 次の商品へ
        if (currentIndex < queue.length - 1) {
          setCurrentIndex(currentIndex + 1)
        } else {
          // 最後の商品まで判定完了
          alert(`${classifiedCount + 1}件の判定が完了しました！`)
          loadQueue() // 新しいデータを読み込み
          setCurrentIndex(0)
          setClassifiedCount(0)
        }
      } else {
        alert(`エラー: ${data.error}`)
      }
    } catch (error: any) {
      console.error('分類エラー:', error)
      alert(`分類エラー: ${error.message}`)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-slate-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (queue.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* ヘッダー */}
          <div className="mb-6">
            <Link href="/zaiko/tanaoroshi">
              <Button variant="ghost" size="sm" className="mb-4">
                <ChevronLeft className="w-4 h-4 mr-2" />
                棚卸し管理に戻る
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">有在庫判定</h1>
            <p className="text-slate-600 mt-2">
              各モールの出品データから有在庫/無在庫を判定します
            </p>
          </div>

          {/* 空状態 */}
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              判定待ちデータがありません
            </h2>
            <p className="text-slate-600 mb-6">
              eBayやMercariからデータを同期すると、ここに表示されます
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={loadQueue} variant="outline">
                <i className="fas fa-sync mr-2"></i>
                更新
              </Button>
              <Link href="/zaiko/tanaoroshi">
                <Button>
                  棚卸し管理に戻る
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentItem = queue[currentIndex]
  const imageUrl = Array.isArray(currentItem.images) && currentItem.images.length > 0
    ? currentItem.images[0]
    : 'https://placehold.co/400x400/e2e8f0/64748b?text=No+Image'

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link href="/zaiko/tanaoroshi">
            <Button variant="ghost" size="sm" className="mb-4">
              <ChevronLeft className="w-4 h-4 mr-2" />
              棚卸し管理に戻る
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">有在庫判定</h1>
              <p className="text-slate-600 mt-2">
                {currentIndex + 1} / {queue.length} 件目
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-600">判定済み</div>
              <div className="text-3xl font-bold text-green-600">{classifiedCount}</div>
            </div>
          </div>
        </div>

        {/* プログレスバー */}
        <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">進捗状況</span>
            <span className="text-sm text-slate-600">
              残り {queue.length - currentIndex} 件
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / queue.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* 商品カード */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          {/* モールバッジ */}
          <div className="flex gap-2 mb-6">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {currentItem.marketplace.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              {currentItem.account}
            </Badge>
            <Badge variant="secondary">
              ID: {currentItem.listing_id}
            </Badge>
          </div>

          {/* 画像と商品情報 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 画像 */}
            <div>
              <img
                src={imageUrl}
                alt={currentItem.product_name}
                className="w-full rounded-lg border-2 border-slate-200 shadow-md"
                onError={(e) => {
                  e.currentTarget.src = 'https://placehold.co/400x400/e2e8f0/64748b?text=No+Image'
                }}
              />
            </div>

            {/* 商品情報 */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                {currentItem.product_name || '商品名なし'}
              </h2>
              
              {currentItem.scraped_data && (
                <div className="space-y-2 text-sm">
                  {currentItem.scraped_data.price && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">価格:</span>
                      <span className="font-semibold">{currentItem.scraped_data.price}</span>
                    </div>
                  )}
                  {currentItem.scraped_data.condition && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">状態:</span>
                      <span className="font-semibold">{currentItem.scraped_data.condition}</span>
                    </div>
                  )}
                  {currentItem.scraped_data.category && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">カテゴリ:</span>
                      <span className="font-semibold">{currentItem.scraped_data.category}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="grid grid-cols-3 gap-4">
          <Button
            onClick={() => handleClassify('stock')}
            disabled={processing}
            className="h-20 bg-green-600 hover:bg-green-700 text-white text-lg"
          >
            <Package className="w-6 h-6 mr-2" />
            有在庫として登録
          </Button>

          <Button
            onClick={() => handleClassify('dropship')}
            disabled={processing}
            variant="destructive"
            className="h-20 text-lg"
          >
            <ShoppingCart className="w-6 h-6 mr-2" />
            無在庫として破棄
          </Button>

          <Button
            onClick={() => handleClassify('skip')}
            disabled={processing}
            variant="outline"
            className="h-20 text-lg"
          >
            <SkipForward className="w-6 h-6 mr-2" />
            スキップ
          </Button>
        </div>

        {/* ヘルプテキスト */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">判定ガイド</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>有在庫</strong>: 実際に手元にある商品</li>
            <li>• <strong>無在庫</strong>: 受注後に仕入れる商品</li>
            <li>• <strong>スキップ</strong>: 後で判定する</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
