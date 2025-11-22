'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert } from '@/components/ui/alert'

interface BatchStatus {
  batch_id: string
  batch_name: string
  status: string
  total_count: number
  processed_count: number
  success_count: number
  failed_count: number
  progress_percent: number
  queue_stats?: {
    pending: number
    processing: number
    completed: number
    failed: number
    permanently_failed: number
  }
  created_at: string
  started_at?: string
  completed_at?: string
  updated_at: string
}

interface BatchProgressDashboardProps {
  batchId: string
  onComplete?: () => void
  pollingInterval?: number // ミリ秒（デフォルト: 5000）
}

export function BatchProgressDashboard({
  batchId,
  onComplete,
  pollingInterval = 5000,
}: BatchProgressDashboardProps) {
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // ステータス取得関数
  const fetchBatchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/scraping/batch/status/${batchId}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'ステータスの取得に失敗しました')
      }

      setBatchStatus(result.data)
      setLastUpdated(new Date())
      setError(null)

      // 完了時のコールバック
      if (result.data.status === 'completed' && onComplete) {
        onComplete()
      }
    } catch (err) {
      console.error('[BatchProgressDashboard] エラー:', err)
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }, [batchId, onComplete])

  // 初回ロードとポーリング設定
  useEffect(() => {
    // 初回ロード
    fetchBatchStatus()

    // ポーリング設定（5秒ごと）
    const intervalId = setInterval(() => {
      fetchBatchStatus()
    }, pollingInterval)

    // クリーンアップ
    return () => {
      clearInterval(intervalId)
    }
  }, [fetchBatchStatus, pollingInterval])

  // ステータスバッジの色を取得
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary'
      case 'processing':
        return 'default'
      case 'completed':
        return 'default'
      case 'failed':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  // ステータスラベルを取得
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '待機中'
      case 'processing':
        return '処理中'
      case 'completed':
        return '完了'
      case 'failed':
        return '失敗'
      default:
        return status
    }
  }

  if (isLoading && !batchStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>バッチ進捗</CardTitle>
          <CardDescription>読み込み中...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !batchStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>バッチ進捗</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <p className="text-sm">{error}</p>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!batchStatus) {
    return null
  }

  const { queue_stats } = batchStatus

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{batchStatus.batch_name}</CardTitle>
            <CardDescription>
              バッチID: {batchStatus.batch_id.slice(0, 8)}...
            </CardDescription>
          </div>
          <Badge variant={getStatusBadgeVariant(batchStatus.status)}>
            {getStatusLabel(batchStatus.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 進捗バー */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">全体進捗</span>
            <span className="text-muted-foreground">
              {batchStatus.processed_count} / {batchStatus.total_count} 件（{batchStatus.progress_percent}%）
            </span>
          </div>
          <Progress value={batchStatus.progress_percent} className="h-2" />
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">総数</p>
            <p className="text-2xl font-bold">{batchStatus.total_count}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">処理済</p>
            <p className="text-2xl font-bold">{batchStatus.processed_count}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground text-green-600">成功</p>
            <p className="text-2xl font-bold text-green-600">{batchStatus.success_count}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground text-red-600">失敗</p>
            <p className="text-2xl font-bold text-red-600">{batchStatus.failed_count}</p>
          </div>
        </div>

        {/* キュー統計 */}
        {queue_stats && (
          <div className="space-y-2">
            <p className="text-sm font-medium">キューステータス</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-xs text-muted-foreground">待機中</span>
                <Badge variant="secondary">{queue_stats.pending}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                <span className="text-xs text-muted-foreground">処理中</span>
                <Badge variant="default">{queue_stats.processing}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                <span className="text-xs text-muted-foreground">完了</span>
                <Badge variant="default" className="bg-green-600">{queue_stats.completed}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                <span className="text-xs text-muted-foreground">失敗</span>
                <Badge variant="destructive">{queue_stats.failed}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                <span className="text-xs text-muted-foreground">永久失敗</span>
                <Badge variant="destructive">{queue_stats.permanently_failed}</Badge>
              </div>
            </div>
          </div>
        )}

        {/* タイムスタンプ情報 */}
        <div className="pt-4 border-t space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>作成日時:</span>
            <span>{new Date(batchStatus.created_at).toLocaleString('ja-JP')}</span>
          </div>
          {batchStatus.started_at && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>開始日時:</span>
              <span>{new Date(batchStatus.started_at).toLocaleString('ja-JP')}</span>
            </div>
          )}
          {batchStatus.completed_at && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>完了日時:</span>
              <span>{new Date(batchStatus.completed_at).toLocaleString('ja-JP')}</span>
            </div>
          )}
          {lastUpdated && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>最終更新:</span>
              <span>{lastUpdated.toLocaleTimeString('ja-JP')}</span>
            </div>
          )}
        </div>

        {/* エラー表示 */}
        {error && (
          <Alert variant="destructive">
            <p className="text-sm">{error}</p>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
