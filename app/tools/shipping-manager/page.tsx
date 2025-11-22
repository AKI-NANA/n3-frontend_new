// /app/tools/shipping-manager/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertTriangle, Truck, Package, Clock, RefreshCw } from 'lucide-react'
import ShippingActionModal from '@/components/ShippingActionModal'

// 仮のデータ構造 (DBから取得されるデータ)
interface Task {
  id: string
  orderId: string
  marketplace: string
  product: string
  isSourced: boolean
  isDelayedRisk: boolean
  expectedDate: string
  trackingNumber?: string
}

interface State {
  Pending: Task[]
  Picking: Task[]
  Packed: Task[]
  Shipped: Task[]
}

const initialData: State = {
  Pending: [
    {
      id: '1',
      orderId: 'OR-1001',
      marketplace: 'eBay',
      product: 'Vintage Watch',
      isSourced: true,
      isDelayedRisk: false,
      expectedDate: '2025-12-01'
    },
    {
      id: '2',
      orderId: 'OR-1002',
      marketplace: 'Shopee',
      product: 'Toy Figure Set',
      isSourced: false,
      isDelayedRisk: true,
      expectedDate: '2025-11-28'
    },
  ],
  Picking: [
    {
      id: '3',
      orderId: 'OR-1003',
      marketplace: 'BUYMA',
      product: 'Luxury Handbag',
      isSourced: true,
      isDelayedRisk: false,
      expectedDate: '2025-11-26'
    },
  ],
  Packed: [],
  Shipped: [],
}

const columnTitles: Record<keyof State, string> = {
  Pending: '仕入れ待ち (Phase 1連携)',
  Picking: 'ピッキング',
  Packed: '梱包',
  Shipped: '出荷完了',
}

// 💡 D&Dアイテムのレンダリングコンポーネント
interface TaskCardProps {
  task: Task
  index: number
  onActionClick: (task: Task) => void
}

const TaskCard = ({ task, index, onActionClick }: TaskCardProps) => (
  <Draggable draggableId={task.id} index={index}>
    {(provided, snapshot) => (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        className={`p-3 bg-white rounded-lg shadow-md mb-3 border-l-4
          ${task.isDelayedRisk ? 'border-red-500' : 'border-blue-500'}
          ${snapshot.isDragging ? 'shadow-2xl scale-105' : 'shadow-md'}
          transition-all hover:shadow-lg cursor-pointer`}
        onClick={() => onActionClick(task)}
      >
        <div className="flex justify-between items-center text-sm font-semibold mb-1">
          <span>{task.orderId} - {task.marketplace}</span>
          <div className="flex space-x-1">
            {/* T48: 仕入れ済みアイコン点灯 */}
            {task.isSourced ? (
              <Badge className="bg-green-500 hover:bg-green-600 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" /> 仕入れ済
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-500 text-xs">
                <Clock className="h-3 w-3 mr-1" /> 仕入れ待
              </Badge>
            )}
            {/* T49: 遅延リスク警告 */}
            {task.isDelayedRisk && (
              <Badge className="bg-red-500 hover:bg-red-600 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" /> 遅延リスク
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-700">{task.product}</p>
        {task.isDelayedRisk && (
          <p className="text-xs text-red-600 mt-1">予測出荷日: {task.expectedDate}</p>
        )}
        {task.trackingNumber && (
          <p className="text-xs text-green-600 mt-1">追跡番号: {task.trackingNumber}</p>
        )}
      </div>
    )}
  </Draggable>
)

export default function ShippingManagerPage() {
  const [state, setState] = useState<State>(initialData)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Task | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // データ読み込み
  const loadShippingQueue = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/shipping/queue')

      if (!response.ok) {
        throw new Error('データの取得に失敗しました')
      }

      const data = await response.json()
      if (data.success) {
        setState(data.data)
      }
    } catch (error: any) {
      showToast(error.message || 'データの取得に失敗しました', 'error')
      // エラー時はモックデータを使用
      setState(initialData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadShippingQueue()
  }, [])

  // 💡 T47: D&Dロジックの実装
  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result

    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const sourceColumn = state[source.droppableId as keyof State]
    const destColumn = state[destination.droppableId as keyof State]

    if (sourceColumn === destColumn) {
      // 同一カラム内の並び替え
      const newTasks = Array.from(sourceColumn)
      const [movedTask] = newTasks.splice(source.index, 1)
      newTasks.splice(destination.index, 0, movedTask)
      setState({ ...state, [source.droppableId]: newTasks })
    } else {
      // 異なるカラムへの移動
      const sourceTasks = Array.from(sourceColumn)
      const [movedTask] = sourceTasks.splice(source.index, 1)

      const destTasks = Array.from(destColumn)
      destTasks.splice(destination.index, 0, movedTask)

      setState({
        ...state,
        [source.droppableId]: sourceTasks,
        [destination.droppableId]: destTasks,
      })

      // 💡 API呼び出し: データベースのqueue_statusを更新
      try {
        const response = await fetch('/api/shipping/update-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: draggableId,
            newStatus: destination.droppableId,
          }),
        })

        if (!response.ok) {
          throw new Error('ステータスの更新に失敗しました')
        }

        showToast(`${movedTask.orderId} を ${columnTitles[destination.droppableId as keyof State]} に移動しました`)
      } catch (error: any) {
        showToast(error.message || 'ステータスの更新に失敗しました', 'error')
        // エラー時は元に戻す
        loadShippingQueue()
      }
    }
  }

  const handleActionClick = (order: Task) => {
    setSelectedOrder(order)
    setIsModalOpen(true)
  }

  const handleModalUpdate = () => {
    // モーダルでの更新後にデータをリロード
    loadShippingQueue()
  }

  // 統計情報
  const stats = {
    total: Object.values(state).flat().length,
    pending: state.Pending.length,
    picking: state.Picking.length,
    packed: state.Packed.length,
    shipped: state.Shipped.length,
    delayedRisk: Object.values(state).flat().filter(t => t.isDelayedRisk).length,
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">読み込み中...</div>
          <div className="text-sm text-muted-foreground">出荷キューを取得しています</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold flex items-center">
              <Truck className="mr-3 h-7 w-7 text-indigo-600" />
              出荷管理システム V1.0 (Kanban)
            </h1>
            <Button onClick={loadShippingQueue} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              更新
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            D&Dで出荷ステータスを管理します
          </p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">総件数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">仕入れ待ち</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">ピッキング</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">{stats.picking}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">梱包</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.packed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">出荷完了</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.shipped}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">遅延リスク</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.delayedRisk}</div>
            </CardContent>
          </Card>
        </div>

        {/* Kanbanボード */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {(Object.entries(state) as [keyof State, Task[]][]).map(([columnId, tasks]) => (
              <Droppable key={columnId} droppableId={columnId}>
                {(provided, snapshot) => (
                  <Card className={`flex flex-col h-full ${
                    snapshot.isDraggingOver ? 'bg-blue-50 border-blue-300' : 'bg-gray-50'
                  } transition-colors`}>
                    <CardHeader className={`py-3 ${
                      columnId === 'Shipped' ? 'bg-green-100' :
                      columnId === 'Packed' ? 'bg-blue-100' :
                      columnId === 'Picking' ? 'bg-indigo-100' :
                      'bg-gray-200'
                    }`}>
                      <CardTitle className="text-lg flex justify-between items-center">
                        <span>{columnTitles[columnId]} ({tasks.length})</span>
                        {/* ステータスに応じたアイコン */}
                        {columnId === 'Picking' && <Package className="h-5 w-5 text-indigo-600" />}
                        {columnId === 'Packed' && <Package className="h-5 w-5 text-blue-600" />}
                        {columnId === 'Shipped' && <CheckCircle className="h-5 w-5 text-green-600" />}
                        {columnId === 'Pending' && <Clock className="h-5 w-5 text-gray-600" />}
                      </CardTitle>
                    </CardHeader>
                    <CardContent
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="p-3 flex-grow min-h-[400px]"
                    >
                      {tasks.map((task, index) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          index={index}
                          onActionClick={handleActionClick}
                        />
                      ))}
                      {provided.placeholder}
                      {tasks.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground text-sm">
                          <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>アイテムなし</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>

        {/* T51/T52: 出荷アクションモーダル */}
        {selectedOrder && (
          <ShippingActionModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            order={selectedOrder}
            onUpdate={handleModalUpdate}
          />
        )}
      </div>

      {/* トースト */}
      {toast && (
        <div
          className={`fixed bottom-8 right-8 px-6 py-3 rounded-lg shadow-lg text-white z-50 animate-in slide-in-from-right ${
            toast.type === 'error' ? 'bg-destructive' : 'bg-green-600'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}
