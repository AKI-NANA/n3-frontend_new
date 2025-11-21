'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Trash2, RotateCcw, Clock, CheckCircle, XCircle, Loader } from 'lucide-react'
import { AmazonUpdateQueue, QueueStats } from '@/types/amazon-strategy'

export function QueueManagementPanel() {
  const [stats, setStats] = useState<QueueStats>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    bySource: {}
  })
  const [queueItems, setQueueItems] = useState<AmazonUpdateQueue[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadStats()
    loadQueue()
  }, [statusFilter])

  const loadStats = async () => {
    try {
      const response = await fetch('/api/amazon/queue?action=stats')
      const data = await response.json()
      if (data.stats) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Load stats error:', error)
    }
  }

  const loadQueue = async () => {
    try {
      setLoading(true)
      const url = statusFilter === 'all'
        ? '/api/amazon/queue'
        : `/api/amazon/queue?status=${statusFilter}`

      const response = await fetch(url)
      const data = await response.json()
      setQueueItems(data.queueItems || [])
    } catch (error) {
      console.error('Load queue error:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearCompleted = async () => {
    if (!confirm('完了済みのアイテムをすべて削除しますか？')) {
      return
    }

    try {
      const response = await fetch('/api/amazon/queue?action=clear_completed', {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to clear completed items')
      }

      alert('完了済みアイテムを削除しました')
      await loadStats()
      await loadQueue()
    } catch (error) {
      console.error('Clear completed error:', error)
      alert('削除に失敗しました')
    }
  }

  const resetFailed = async () => {
    if (!confirm('失敗したアイテムをすべてリセットしますか？')) {
      return
    }

    try {
      const response = await fetch('/api/amazon/queue?action=reset_failed', {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to reset failed items')
      }

      alert('失敗アイテムをリセットしました')
      await loadStats()
      await loadQueue()
    } catch (error) {
      console.error('Reset failed error:', error)
      alert('リセットに失敗しました')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-500" />
      case 'processing':
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'pending': 'secondary',
      'processing': 'default',
      'completed': 'outline',
      'failed': 'destructive'
    }
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>
  }

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      'inventory_protection': 'bg-green-100 text-green-800',
      'high_score': 'bg-blue-100 text-blue-800',
      'new_product': 'bg-purple-100 text-purple-800',
      'category': 'bg-yellow-100 text-yellow-800',
      'keyword': 'bg-pink-100 text-pink-800',
      'competitor': 'bg-orange-100 text-orange-800',
      'ebay_sold': 'bg-indigo-100 text-indigo-800',
      'manual': 'bg-gray-100 text-gray-800'
    }
    return colors[source] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">キュー管理</h2>
          <p className="text-muted-foreground mt-1">
            ASIN更新キューの状態を監視・管理します
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadQueue} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            更新
          </Button>
          <Button onClick={clearCompleted} variant="outline" size="sm">
            <Trash2 className="w-4 h-4 mr-2" />
            完了削除
          </Button>
          <Button onClick={resetFailed} variant="outline" size="sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            失敗リセット
          </Button>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">全体</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer ${statusFilter === 'pending' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              待機中
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer ${statusFilter === 'processing' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'processing' ? 'all' : 'processing')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Loader className="w-4 h-4 text-blue-500" />
              処理中
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer ${statusFilter === 'completed' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              完了
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer ${statusFilter === 'failed' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'failed' ? 'all' : 'failed')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              失敗
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* ソース別統計 */}
      {Object.keys(stats.bySource).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>ソース別内訳</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(stats.bySource).map(([source, count]) => (
                <div
                  key={source}
                  className={`p-3 rounded-lg ${getSourceColor(source)}`}
                >
                  <p className="text-xs font-medium">{source}</p>
                  <p className="text-xl font-bold">{count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 平均処理時間 */}
      {stats.avgProcessingTime && (
        <Card>
          <CardHeader>
            <CardTitle>平均処理時間</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.avgProcessingTime.toFixed(2)}秒
            </div>
          </CardContent>
        </Card>
      )}

      {/* キューアイテムリスト */}
      <Card>
        <CardHeader>
          <CardTitle>キューアイテム</CardTitle>
          <CardDescription>
            {statusFilter === 'all' ? '全てのアイテム' : `${statusFilter}のアイテム`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground mt-2">読み込み中...</p>
            </div>
          ) : queueItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">アイテムがありません</p>
            </div>
          ) : (
            <div className="space-y-2">
              {queueItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(item.status)}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.asin}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={`text-xs ${getSourceColor(item.source)}`}
                        >
                          {item.source}
                        </Badge>
                        {getStatusBadge(item.status)}
                        <Badge variant="outline" className="text-xs">
                          優先度: {item.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>作成: {new Date(item.created_at).toLocaleString('ja-JP')}</p>
                    {item.retry_count > 0 && (
                      <p className="text-orange-600">再試行: {item.retry_count}回</p>
                    )}
                    {item.last_error && (
                      <p className="text-red-600 max-w-xs truncate">{item.last_error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
