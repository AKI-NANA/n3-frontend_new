'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle, Package, Truck, Clock, ShoppingCart } from 'lucide-react'
import { ShippingActionModal } from '@/components/shipping/ShippingActionModal'
import { useToast } from '@/hooks/use-toast'

interface QueueItem {
  id: number
  order_id: string
  queue_status: 'Pending' | 'Picking' | 'Packed' | 'Shipped'
  picker_user_id?: string
  tracking_number?: string
  shipping_method_id?: string
  created_at: string
  updated_at: string
  shipped_at?: string
  is_delayed_risk?: boolean
  expected_ship_date?: string
  delay_reason?: string
}

const STATUS_COLUMNS = [
  { id: 'Pending', label: '仕入れ待ち', icon: Clock, color: 'bg-gray-100' },
  { id: 'Picking', label: 'ピッキング', icon: ShoppingCart, color: 'bg-blue-100' },
  { id: 'Packed', label: '梱包済み', icon: Package, color: 'bg-yellow-100' },
  { id: 'Shipped', label: '出荷済み', icon: Truck, color: 'bg-green-100' }
] as const

export default function ShippingManagerPage() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedItem, setDraggedItem] = useState<QueueItem | null>(null)
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { toast } = useToast()

  const fetchQueue = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/shipping/queue')
      const data = await res.json()
      if (Array.isArray(data)) {
        setQueueItems(data)
      }
    } catch (error) {
      console.error('Failed to fetch queue:', error)
      toast({
        title: 'エラー',
        description: '出荷キューの取得に失敗しました',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQueue()
  }, [])

  const handleDragStart = (item: QueueItem) => {
    setDraggedItem(item)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (newStatus: QueueItem['queue_status']) => {
    if (!draggedItem) return

    // 同じステータスにドロップした場合は何もしない
    if (draggedItem.queue_status === newStatus) {
      setDraggedItem(null)
      return
    }

    try {
      const res = await fetch('/api/shipping/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draggedItem.id,
          queue_status: newStatus
        })
      })

      if (!res.ok) {
        throw new Error('Failed to update status')
      }

      toast({
        title: '成功',
        description: `ステータスを「${newStatus}」に更新しました`,
      })

      await fetchQueue()
    } catch (error) {
      console.error('Failed to update status:', error)
      toast({
        title: 'エラー',
        description: 'ステータスの更新に失敗しました',
        variant: 'destructive'
      })
    } finally {
      setDraggedItem(null)
    }
  }

  const handleCardClick = (item: QueueItem) => {
    setSelectedItem(item)
    setIsModalOpen(true)
  }

  const getItemsByStatus = (status: QueueItem['queue_status']) => {
    return queueItems.filter(item => item.queue_status === status)
  }

  const renderCard = (item: QueueItem) => {
    const isSourced = !item.is_delayed_risk || item.delay_reason !== 'Sourcing_Pending'

    return (
      <div
        key={item.id}
        draggable
        onDragStart={() => handleDragStart(item)}
        onClick={() => handleCardClick(item)}
        className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-shadow mb-2"
      >
        <div className="flex justify-between items-start mb-2">
          <div className="font-semibold text-sm">注文 #{item.order_id}</div>
          <div className="flex gap-1">
            {/* T48: 仕入れ済みアイコン点灯 */}
            {isSourced && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                仕入れ済み
              </Badge>
            )}
            {/* T49: 遅延リスク警告 */}
            {item.is_delayed_risk && (
              <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                遅延リスク
              </Badge>
            )}
          </div>
        </div>

        <div className="text-xs text-gray-600 space-y-1">
          {item.tracking_number && (
            <div className="flex items-center">
              <Truck className="h-3 w-3 mr-1" />
              追跡: {item.tracking_number}
            </div>
          )}
          {item.expected_ship_date && item.is_delayed_risk && (
            <div className="flex items-center text-red-600">
              <Clock className="h-3 w-3 mr-1" />
              予測出荷: {item.expected_ship_date}
            </div>
          )}
          {item.delay_reason && (
            <div className="text-xs text-red-600">
              理由: {item.delay_reason === 'Holiday' ? '休日' :
                    item.delay_reason === 'Sourcing_Pending' ? '仕入れ待ち' :
                    item.delay_reason === 'Capacity_Issue' ? '処理能力不足' : item.delay_reason}
            </div>
          )}
        </div>

        <div className="mt-2 text-xs text-gray-400">
          {new Date(item.created_at).toLocaleDateString('ja-JP')}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">出荷管理システム V1.0</h1>
        <p className="text-gray-600">D&Dで簡単にステータス更新。遅延リスクを可視化して、アカウントヘルスをゼロ化。</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">読み込み中...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_COLUMNS.map(column => {
            const items = getItemsByStatus(column.id)
            const Icon = column.icon

            return (
              <div
                key={column.id}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(column.id)}
                className="min-h-[400px]"
              >
                <Card className={`${column.color} h-full`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center">
                        <Icon className="h-5 w-5 mr-2" />
                        {column.label}
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        {items.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {items.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        アイテムなし
                      </div>
                    ) : (
                      items.map(item => renderCard(item))
                    )}
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      )}

      {/* 統計情報 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{queueItems.length}</div>
            <div className="text-sm text-gray-600">総アイテム数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {queueItems.filter(item => item.is_delayed_risk).length}
            </div>
            <div className="text-sm text-gray-600">遅延リスク</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {queueItems.filter(item => item.queue_status === 'Shipped').length}
            </div>
            <div className="text-sm text-gray-600">出荷済み</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {queueItems.filter(item => item.queue_status === 'Picking' || item.queue_status === 'Packed').length}
            </div>
            <div className="text-sm text-gray-600">処理中</div>
          </CardContent>
        </Card>
      </div>

      {/* 出荷アクションモーダル */}
      {selectedItem && (
        <ShippingActionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedItem(null)
          }}
          queueItem={selectedItem}
          onSuccess={fetchQueue}
        />
      )}
    </div>
  )
}
