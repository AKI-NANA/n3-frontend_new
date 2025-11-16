'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  RefreshCw,
  Clock,
  Settings,
  Zap,
  DollarSign,
  BarChart3,
  Loader2,
  CheckSquare,
  Square,
  BookOpen
} from 'lucide-react'
import PricingDefaultsSettings from './components/PricingDefaultsSettings'
import { PriceAutomationTab } from '@/components/pricing-automation/PriceAutomationTab'
import { ManualTab } from './components/ManualTab'

// 統合変動データの型
interface UnifiedChange {
  id: string
  product_id: number
  ebay_listing_id?: string
  change_category: 'inventory' | 'price' | 'both' | 'page_error'
  inventory_change?: {
    old_stock?: number
    new_stock?: number
    available?: boolean
    page_exists?: boolean
    page_status?: string
  }
  price_change?: {
    old_price_jpy?: number
    new_price_jpy?: number
    price_diff_jpy?: number
    recalculated_ebay_price_usd?: number
    profit_impact?: number
  }
  status: string
  detected_at: string
  sku?: string
  title?: string
  source_url?: string
}

// 実行ログの型
interface ExecutionLog {
  id: string
  status: string
  products_processed: number
  changes_detected: number
  errors_count: number
  started_at: string
  completed_at?: string
  error_message?: string
}

// スケジュール設定の型
interface MonitoringSchedule {
  id: string
  name: string
  frequency: string
  enabled: boolean
  last_run?: string
  next_run?: string
}

export default function InventoryMonitoringPage() {
  // 統合変動データ
  const [unifiedChanges, setUnifiedChanges] = useState<UnifiedChange[]>([])
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set())
  const [loadingChanges, setLoadingChanges] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'applied'>('pending')
  const [filterCategory, setFilterCategory] = useState<'all' | 'inventory' | 'price' | 'both' | 'page_error'>('all')

  // 実行ログ
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // スケジュール設定
  const [schedules, setSchedules] = useState<MonitoringSchedule[]>([])
  const [loadingSchedules, setLoadingSchedules] = useState(false)

  // 実行中フラグ
  const [isExecuting, setIsExecuting] = useState(false)
  const [isApplying, setIsApplying] = useState(false)

  // サマリー統計
  const [stats, setStats] = useState({
    total_monitoring: 0,
    pending_changes: 0,
    price_changes: 0,
    inventory_changes: 0,
    page_errors: 0
  })

  const supabase = createClient()

  // 統合変動データを取得
  const fetchUnifiedChanges = async () => {
    setLoadingChanges(true)
    try {
      let query = supabase
        .from('unified_changes')
        .select(`
          *,
          products_master (
            sku,
            title,
            store_url
          )
        `)
        .order('detected_at', { ascending: false })
        .limit(100)

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      if (filterCategory !== 'all') {
        query = query.eq('change_category', filterCategory)
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ 変動データ取得エラー:', error)
        return
      }

      // products_master のデータをフラット化
      const formatted = (data || []).map(change => ({
        ...change,
        sku: change.products_master?.sku,
        title: change.products_master?.title,
        source_url: change.products_master?.store_url
      }))

      setUnifiedChanges(formatted)
    } finally {
      setLoadingChanges(false)
    }
  }

  // 実行ログを取得
  const fetchExecutionLogs = async () => {
    setLoadingLogs(true)
    try {
      const { data, error } = await supabase
        .from('inventory_monitoring_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('❌ ログ取得エラー:', error)
        return
      }

      setExecutionLogs(data || [])
    } finally {
      setLoadingLogs(false)
    }
  }

  // スケジュール設定を取得
  const fetchSchedules = async () => {
    setLoadingSchedules(true)
    try {
      const { data, error } = await supabase
        .from('monitoring_schedules')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('❌ スケジュール取得エラー:', error)
        return
      }

      setSchedules(data || [])
    } finally {
      setLoadingSchedules(false)
    }
  }

  // 統計情報を取得
  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('products_master')
        .select('inventory_monitoring_enabled')
        .eq('inventory_monitoring_enabled', true)

      const total_monitoring = data?.length || 0

      const { data: pending } = await supabase
        .from('unified_changes')
        .select('change_category')
        .eq('status', 'pending')

      const pending_changes = pending?.length || 0
      const price_changes = pending?.filter(c => c.change_category === 'price' || c.change_category === 'both').length || 0
      const inventory_changes = pending?.filter(c => c.change_category === 'inventory' || c.change_category === 'both').length || 0
      const page_errors = pending?.filter(c => c.change_category === 'page_error').length || 0

      setStats({
        total_monitoring,
        pending_changes,
        price_changes,
        inventory_changes,
        page_errors
      })
    } catch (error) {
      console.error('❌ 統計取得エラー:', error)
    }
  }

  useEffect(() => {
    fetchUnifiedChanges()
    fetchStats()
  }, [filterStatus, filterCategory])

  useEffect(() => {
    fetchExecutionLogs()
    fetchSchedules()
  }, [])

  // 在庫監視を手動実行
  const executeMonitoring = async () => {
    if (isExecuting) return

    setIsExecuting(true)
    try {
      const response = await fetch('/api/inventory-monitoring/execute')
      const result = await response.json()

      if (result.success) {
        alert(`✅ 監視完了\n処理: ${result.processed}件\n変動検知: ${result.changes_detected}件`)
        fetchUnifiedChanges()
        fetchExecutionLogs()
        fetchStats()
      } else {
        alert(`❌ エラー: ${result.error}`)
      }
    } catch (error) {
      console.error('❌ 実行エラー:', error)
      alert('実行中にエラーが発生しました')
    } finally {
      setIsExecuting(false)
    }
  }

  // 選択した変動をeBayに適用
  const applyChanges = async () => {
    if (selectedChanges.size === 0) {
      alert('変動を選択してください')
      return
    }

    if (!confirm(`${selectedChanges.size}件の変動をeBayに適用しますか？`)) {
      return
    }

    setIsApplying(true)
    try {
      const response = await fetch('/api/inventory-monitoring/changes/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeIds: Array.from(selectedChanges) })
      })

      const result = await response.json()

      if (result.success) {
        alert(`✅ ${result.updated}件を適用しました`)
        setSelectedChanges(new Set())
        fetchUnifiedChanges()
        fetchStats()
      } else {
        alert(`❌ エラー: ${result.error}`)
      }
    } catch (error) {
      console.error('❌ 適用エラー:', error)
      alert('適用中にエラーが発生しました')
    } finally {
      setIsApplying(false)
    }
  }

  // チェックボックスのトグル
  const toggleSelection = (changeId: string) => {
    const newSelection = new Set(selectedChanges)
    if (newSelection.has(changeId)) {
      newSelection.delete(changeId)
    } else {
      newSelection.add(changeId)
    }
    setSelectedChanges(newSelection)
  }

  // 全選択/全解除
  const toggleSelectAll = () => {
    if (selectedChanges.size === unifiedChanges.length) {
      setSelectedChanges(new Set())
    } else {
      setSelectedChanges(new Set(unifiedChanges.map(c => c.id)))
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">在庫・価格監視システム</h1>
          <p className="text-muted-foreground mt-1">
            在庫変動と価格変動を統合管理
          </p>
        </div>
        <Button
          onClick={executeMonitoring}
          disabled={isExecuting}
          size="lg"
          className="gap-2"
        >
          {isExecuting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              実行中...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              今すぐ監視実行
            </>
          )}
        </Button>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              監視中商品
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_monitoring}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <Package className="inline h-3 w-3 mr-1" />
              アクティブ
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              保留中変動
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending_changes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <AlertTriangle className="inline h-3 w-3 mr-1" />
              要確認
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              価格変動
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.price_changes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <DollarSign className="inline h-3 w-3 mr-1" />
              価格再計算
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              在庫変動
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.inventory_changes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <Package className="inline h-3 w-3 mr-1" />
              在庫数変化
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ページエラー
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.page_errors}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <XCircle className="inline h-3 w-3 mr-1" />
              削除/エラー
            </p>
          </CardContent>
        </Card>
      </div>

      {/* タブ */}
      <Tabs defaultValue="changes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="changes" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            統合変動管理
            {stats.pending_changes > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.pending_changes}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            価格自動更新
          </TabsTrigger>
          <TabsTrigger value="defaults" className="gap-2">
            <Settings className="h-4 w-4" />
            デフォルト設定
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <BookOpen className="h-4 w-4" />
            マニュアル
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="h-4 w-4" />
            実行履歴
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2">
            <Settings className="h-4 w-4" />
            スケジュール設定
          </TabsTrigger>
        </TabsList>

        {/* 統合変動管理タブ */}
        <TabsContent value="changes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>変動データ一覧</CardTitle>
                  <CardDescription>
                    在庫変動と価格変動を統合表示
                  </CardDescription>
                </div>
                {selectedChanges.size > 0 && (
                  <Button
                    onClick={applyChanges}
                    disabled={isApplying}
                    className="gap-2"
                  >
                    {isApplying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        適用中...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        {selectedChanges.size}件をeBayに適用
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* フィルター */}
              <div className="flex gap-2 flex-wrap">
                <div className="flex gap-1">
                  <Button
                    variant={filterStatus === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('all')}
                  >
                    全て
                  </Button>
                  <Button
                    variant={filterStatus === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('pending')}
                  >
                    保留中
                  </Button>
                  <Button
                    variant={filterStatus === 'approved' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('approved')}
                  >
                    承認済み
                  </Button>
                  <Button
                    variant={filterStatus === 'applied' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('applied')}
                  >
                    適用済み
                  </Button>
                </div>

                <div className="w-px bg-border" />

                <div className="flex gap-1">
                  <Button
                    variant={filterCategory === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterCategory('all')}
                  >
                    全カテゴリ
                  </Button>
                  <Button
                    variant={filterCategory === 'inventory' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterCategory('inventory')}
                  >
                    在庫のみ
                  </Button>
                  <Button
                    variant={filterCategory === 'price' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterCategory('price')}
                  >
                    価格のみ
                  </Button>
                  <Button
                    variant={filterCategory === 'both' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterCategory('both')}
                  >
                    両方
                  </Button>
                  <Button
                    variant={filterCategory === 'page_error' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterCategory('page_error')}
                  >
                    エラー
                  </Button>
                </div>
              </div>

              {/* 全選択チェックボックス */}
              {unifiedChanges.length > 0 && (
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    checked={selectedChanges.size === unifiedChanges.length}
                    onCheckedChange={toggleSelectAll}
                    id="select-all"
                  />
                  <label htmlFor="select-all" className="text-sm cursor-pointer">
                    全て選択 ({selectedChanges.size} / {unifiedChanges.length})
                  </label>
                </div>
              )}

              {/* 変動リスト */}
              {loadingChanges ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">読み込み中...</p>
                </div>
              ) : unifiedChanges.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">変動データがありません</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unifiedChanges.map((change) => (
                    <div
                      key={change.id}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedChanges.has(change.id)}
                          onCheckedChange={() => toggleSelection(change.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  change.change_category === 'page_error'
                                    ? 'destructive'
                                    : change.change_category === 'both'
                                    ? 'default'
                                    : 'secondary'
                                }
                              >
                                {change.change_category === 'inventory' && '在庫変動'}
                                {change.change_category === 'price' && '価格変動'}
                                {change.change_category === 'both' && '在庫+価格'}
                                {change.change_category === 'page_error' && 'ページエラー'}
                              </Badge>
                              <Badge
                                variant={
                                  change.status === 'pending'
                                    ? 'outline'
                                    : change.status === 'approved'
                                    ? 'secondary'
                                    : 'default'
                                }
                              >
                                {change.status === 'pending' && '保留中'}
                                {change.status === 'approved' && '承認済み'}
                                {change.status === 'applied' && '適用済み'}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(change.detected_at).toLocaleString('ja-JP')}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{change.title || `商品ID: ${change.product_id}`}</p>
                            <p className="text-sm text-muted-foreground">SKU: {change.sku || 'N/A'}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {change.inventory_change && (
                              <div className="space-y-1">
                                <p className="font-medium flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  在庫変動
                                </p>
                                {change.inventory_change.page_exists === false ? (
                                  <p className="text-red-600">❌ ページ削除/エラー</p>
                                ) : (
                                  <p>
                                    {change.inventory_change.old_stock || 0} →{' '}
                                    <span
                                      className={
                                        (change.inventory_change.new_stock || 0) === 0
                                          ? 'text-red-600 font-medium'
                                          : 'text-green-600 font-medium'
                                      }
                                    >
                                      {change.inventory_change.new_stock || 0}
                                    </span>
                                  </p>
                                )}
                              </div>
                            )}
                            {change.price_change && (
                              <div className="space-y-1">
                                <p className="font-medium flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  価格変動
                                </p>
                                <p>
                                  ¥{change.price_change.old_price_jpy?.toLocaleString() || 0} →{' '}
                                  <span className="font-medium">
                                    ¥{change.price_change.new_price_jpy?.toLocaleString() || 0}
                                  </span>
                                </p>
                                {change.price_change.recalculated_ebay_price_usd && (
                                  <p className="text-xs text-muted-foreground">
                                    再計算eBay価格: ${change.price_change.recalculated_ebay_price_usd.toFixed(2)}
                                  </p>
                                )}
                                {change.price_change.profit_impact !== undefined && (
                                  <p className="text-xs">
                                    利益影響:{' '}
                                    <span
                                      className={
                                        change.price_change.profit_impact >= 0
                                          ? 'text-green-600'
                                          : 'text-red-600'
                                      }
                                    >
                                      {change.price_change.profit_impact >= 0 ? '+' : ''}
                                      ${change.price_change.profit_impact.toFixed(2)}
                                    </span>
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 🆕 価格自動更新タブ */}
        <TabsContent value="automation">
          <PriceAutomationTab />
        </TabsContent>

        {/* デフォルト設定タブ */}
        <TabsContent value="defaults">
          <PricingDefaultsSettings />
        </TabsContent>

        {/* 📖 マニュアルタブ */}
        <TabsContent value="manual">
          <ManualTab />
        </TabsContent>

        {/* 実行履歴タブ */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>実行履歴</CardTitle>
              <CardDescription>過去の監視実行結果</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">読み込み中...</p>
                </div>
              ) : executionLogs.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">実行履歴がありません</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {executionLogs.map((log) => (
                    <div key={log.id} className="border rounded p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          variant={
                            log.status === 'completed'
                              ? 'default'
                              : log.status === 'running'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {log.status === 'completed' && '完了'}
                          {log.status === 'running' && '実行中'}
                          {log.status === 'failed' && '失敗'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(log.started_at).toLocaleString('ja-JP')}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">処理数</p>
                          <p className="font-medium">{log.products_processed}件</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">変動検知</p>
                          <p className="font-medium">{log.changes_detected}件</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">エラー</p>
                          <p className="font-medium text-red-600">{log.errors_count}件</p>
                        </div>
                      </div>
                      {log.error_message && (
                        <p className="text-sm text-red-600 mt-2">{log.error_message}</p>
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
              <CardDescription>自動監視のスケジュール管理</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSchedules ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">読み込み中...</p>
                </div>
              ) : schedules.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">スケジュールが設定されていません</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {schedules.map((schedule) => (
                    <div key={schedule.id} className="border rounded p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{schedule.name}</p>
                          <Badge variant={schedule.enabled ? 'default' : 'secondary'}>
                            {schedule.enabled ? '有効' : '無効'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{schedule.frequency}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">前回実行</p>
                          <p className="font-medium">
                            {schedule.last_run
                              ? new Date(schedule.last_run).toLocaleString('ja-JP')
                              : '未実行'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">次回実行</p>
                          <p className="font-medium">
                            {schedule.next_run
                              ? new Date(schedule.next_run).toLocaleString('ja-JP')
                              : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
