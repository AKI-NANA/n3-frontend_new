'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  CheckCircle2,
  XCircle,
  TrendingUp,
  AlertTriangle,
  Package,
  RefreshCw,
  PlayCircle,
  Settings,
  Download,
  ExternalLink,
  Clock,
  TrendingDown,
  Loader2,
} from 'lucide-react'
import type { MonitoringLog, InventoryChange, MonitoringSchedule } from '@/lib/inventory-monitoring/types'

export default function InventoryMonitoringPage() {
  const [logs, setLogs] = useState<MonitoringLog[]>([])
  const [changes, setChanges] = useState<InventoryChange[]>([])
  const [schedule, setSchedule] = useState<MonitoringSchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [selectedChanges, setSelectedChanges] = useState<string[]>([])

  // データ取得
  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // 実行履歴取得
      const logsRes = await fetch('/api/inventory-monitoring/logs?limit=10')
      const logsData = await logsRes.json()
      if (logsData.success) {
        setLogs(logsData.logs)
      }

      // 変動データ取得（未対応のみ）
      const changesRes = await fetch('/api/inventory-monitoring/changes?status=pending&limit=50')
      const changesData = await changesRes.json()
      if (changesData.success) {
        setChanges(changesData.changes)
      }

      // スケジュール取得
      const scheduleRes = await fetch('/api/inventory-monitoring/schedule')
      const scheduleData = await scheduleRes.json()
      if (scheduleData.success) {
        setSchedule(scheduleData.schedule)
      }
    } catch (error) {
      console.error('データ取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  // 手動実行
  async function executeNow() {
    if (executing) return

    setExecuting(true)
    try {
      const res = await fetch('/api/inventory-monitoring/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'manual' }),
      })

      const data = await res.json()
      if (data.success) {
        alert('在庫監視を開始しました。完了までしばらくお待ちください。')
        // 5秒後にデータ再取得
        setTimeout(fetchData, 5000)
      } else {
        alert(`エラー: ${data.error}`)
      }
    } catch (error) {
      console.error('実行エラー:', error)
      alert('実行に失敗しました')
    } finally {
      setExecuting(false)
    }
  }

  // eBayに適用
  async function applyToEbay() {
    if (selectedChanges.length === 0) {
      alert('適用する変動を選択してください')
      return
    }

    if (!confirm(`${selectedChanges.length}件の変動をeBayに反映しますか？`)) {
      return
    }

    try {
      const res = await fetch('/api/inventory-monitoring/changes/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeIds: selectedChanges }),
      })

      const data = await res.json()
      if (data.success) {
        alert(`${data.updated}件をeBayに反映しました`)
        setSelectedChanges([])
        fetchData()
      } else {
        alert(`エラー: ${data.error}`)
      }
    } catch (error) {
      console.error('適用エラー:', error)
      alert('適用に失敗しました')
    }
  }

  // CSV出力
  function exportCSV() {
    if (selectedChanges.length === 0) {
      alert('出力する変動を選択してください')
      return
    }

    window.open(
      `/api/inventory-monitoring/export-csv?changeIds=${selectedChanges.join(',')}&format=ebay`,
      '_blank'
    )
  }

  // スケジュール更新
  async function updateSchedule(updates: Partial<MonitoringSchedule>) {
    try {
      const res = await fetch('/api/inventory-monitoring/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...schedule, ...updates }),
      })

      const data = await res.json()
      if (data.success) {
        setSchedule(data.schedule)
        alert('スケジュールを更新しました')
      }
    } catch (error) {
      console.error('スケジュール更新エラー:', error)
    }
  }

  // 統計データ
  const stats = {
    total: changes.length,
    price: changes.filter((c) => c.change_type === 'price').length,
    stock: changes.filter((c) => c.change_type === 'stock').length,
    errors: changes.filter(
      (c) => c.change_type === 'page_deleted' || c.change_type === 'page_error'
    ).length,
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">在庫・価格監視</h1>
          <p className="text-muted-foreground">
            出品済み商品の在庫・価格を自動監視
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            更新
          </Button>
          <Button onClick={executeNow} disabled={executing}>
            {executing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <PlayCircle className="w-4 h-4 mr-2" />
            )}
            今すぐ実行
          </Button>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">変動総数</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">未対応の変動</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">価格変動</CardTitle>
            <TrendingDown className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.price}</div>
            <p className="text-xs text-muted-foreground">再計算が必要</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">在庫変動</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.stock}</div>
            <p className="text-xs text-muted-foreground">在庫数の変動</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">エラー</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
            <p className="text-xs text-muted-foreground">ページ削除等</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="changes" className="w-full">
        <TabsList>
          <TabsTrigger value="changes">変動データ ({changes.length})</TabsTrigger>
          <TabsTrigger value="history">実行履歴</TabsTrigger>
          <TabsTrigger value="schedule">スケジュール設定</TabsTrigger>
        </TabsList>

        {/* 変動データタブ */}
        <TabsContent value="changes" className="space-y-4">
          {selectedChanges.length > 0 && (
            <div className="flex gap-2 p-4 bg-muted rounded-lg">
              <span className="text-sm">
                {selectedChanges.length}件選択中
              </span>
              <div className="flex-1" />
              <Button size="sm" variant="outline" onClick={exportCSV}>
                <Download className="w-4 h-4 mr-2" />
                CSV出力
              </Button>
              <Button size="sm" onClick={applyToEbay}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                eBayに反映
              </Button>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>変動データ一覧</CardTitle>
              <CardDescription>未対応の在庫・価格変動</CardDescription>
            </CardHeader>
            <CardContent>
              {changes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  変動データはありません
                </div>
              ) : (
                <div className="space-y-2">
                  {changes.map((change) => (
                    <div
                      key={change.id}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedChanges.includes(change.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedChanges([...selectedChanges, change.id])
                          } else {
                            setSelectedChanges(
                              selectedChanges.filter((id) => id !== change.id)
                            )
                          }
                        }}
                        className="w-4 h-4"
                      />

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {change.product?.sku || 'N/A'}
                          </span>
                          <Badge variant={getChangeBadgeVariant(change.change_type)}>
                            {getChangeTypeLabel(change.change_type)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {change.product?.title || 'タイトルなし'}
                        </p>

                        <div className="flex items-center gap-4 mt-2 text-sm">
                          {change.change_type === 'price' && (
                            <>
                              <span>
                                価格: ¥{change.old_price_jpy?.toLocaleString()} →{' '}
                                ¥{change.new_price_jpy?.toLocaleString()}
                              </span>
                              {change.recalculated_ebay_price_usd && (
                                <span className="text-blue-600">
                                  eBay: ${change.recalculated_ebay_price_usd.toFixed(2)}
                                </span>
                              )}
                            </>
                          )}
                          {change.change_type === 'stock' && (
                            <span>
                              在庫: {change.old_stock}個 → {change.new_stock}個
                            </span>
                          )}
                          {change.change_type === 'page_deleted' && (
                            <span className="text-red-600">
                              ページが削除または終了しました
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {change.product?.source_url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              window.open(change.product!.source_url, '_blank')
                            }
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 実行履歴タブ */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>実行履歴</CardTitle>
              <CardDescription>過去の監視実行履歴</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  実行履歴はありません
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={log.status === 'completed' ? 'default' : 'destructive'}
                          >
                            {log.execution_type === 'scheduled' ? '自動' : '手動'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(log.created_at).toLocaleString('ja-JP')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span>
                            処理: {log.processed_count}/{log.target_count}
                          </span>
                          <span className="text-blue-600">
                            変動: {log.changes_detected}件
                          </span>
                          {log.duration_seconds && (
                            <span className="text-muted-foreground">
                              {Math.floor(log.duration_seconds / 60)}分
                            </span>
                          )}
                        </div>
                      </div>

                      {log.changes_detected > 0 && (
                        <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
                          <span>価格: {log.price_changes}件</span>
                          <span>在庫: {log.stock_changes}件</span>
                          <span>エラー: {log.page_errors}件</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* スケジュール設定タブ */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>スケジュール設定</CardTitle>
              <CardDescription>自動監視のスケジュール設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enabled">自動監視を有効化</Label>
                  <p className="text-sm text-muted-foreground">
                    スケジュールに従って自動的に在庫監視を実行
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={schedule?.enabled || false}
                  onCheckedChange={(checked) =>
                    updateSchedule({ enabled: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>実行頻度</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={schedule?.frequency || 'daily'}
                  onChange={(e) =>
                    updateSchedule({
                      frequency: e.target.value as 'hourly' | 'daily' | 'custom',
                    })
                  }
                >
                  <option value="daily">1日1回</option>
                  <option value="hourly">1時間ごと</option>
                  <option value="custom">カスタム</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>実行時間帯（開始）</Label>
                  <Input
                    type="time"
                    value={schedule?.time_window_start || '01:00:00'}
                    onChange={(e) =>
                      updateSchedule({ time_window_start: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>実行時間帯（終了）</Label>
                  <Input
                    type="time"
                    value={schedule?.time_window_end || '06:00:00'}
                    onChange={(e) =>
                      updateSchedule({ time_window_end: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>1回の最大処理件数</Label>
                <Input
                  type="number"
                  value={schedule?.max_items_per_batch || 50}
                  onChange={(e) =>
                    updateSchedule({
                      max_items_per_batch: parseInt(e.target.value),
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>待機時間（最小）秒</Label>
                  <Input
                    type="number"
                    value={schedule?.delay_min_seconds || 30}
                    onChange={(e) =>
                      updateSchedule({
                        delay_min_seconds: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>待機時間（最大）秒</Label>
                  <Input
                    type="number"
                    value={schedule?.delay_max_seconds || 120}
                    onChange={(e) =>
                      updateSchedule({
                        delay_max_seconds: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email">メール通知</Label>
                  <p className="text-sm text-muted-foreground">
                    完了時にメールで通知
                  </p>
                </div>
                <Switch
                  id="email"
                  checked={schedule?.email_notification || false}
                  onCheckedChange={(checked) =>
                    updateSchedule({ email_notification: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function getChangeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    price: '価格変動',
    stock: '在庫変動',
    page_deleted: 'ページ削除',
    page_changed: 'ページ変更',
    page_error: 'エラー',
  }
  return labels[type] || type
}

function getChangeBadgeVariant(type: string): 'default' | 'destructive' | 'secondary' {
  if (type === 'price') return 'default'
  if (type === 'page_deleted' || type === 'page_error') return 'destructive'
  return 'secondary'
}
