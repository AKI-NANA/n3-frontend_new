'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import {
  CheckCircle2,
  XCircle,
  TrendingUp,
  AlertTriangle,
  Package,
  RefreshCw,
  PlayCircle,
  StopCircle,
  Trash2,
  Eye,
  BarChart3,
  Clock,
  ShoppingCart,
  Star,
  Settings,
  Zap,
  Database
} from 'lucide-react'

export default function InventoryMonitoringPage() {
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  
  // スケジュール設定
  const [scheduleSettings, setScheduleSettings] = useState({
    enabled: true,
    baseTime: '10:00',
    randomRange: 30, // 分
    intervalHours: 4,
    enableRandomDelay: true,
    delayBetweenProducts: 8, // 秒
    batchSize: 5
  })

  // サンプルデータ
  const dashboardStats = {
    monitoring: 1234,
    priceUpdated: 45,
    zeroStock: 12,
    errors: 3
  }

  const executionHistory = [
    {
      id: '1',
      executedAt: '2025-09-29 10:23:15',
      type: 'scheduled' as const,
      totalProducts: 1234,
      successCount: 1200,
      priceUpdateCount: 45,
      errorCount: 3,
      durationSeconds: 245,
      randomDelay: 23 // 分
    },
    {
      id: '2',
      executedAt: '2025-09-29 06:14:32',
      type: 'scheduled' as const,
      totalProducts: 1230,
      successCount: 1228,
      priceUpdateCount: 12,
      errorCount: 2,
      durationSeconds: 198,
      randomDelay: 14
    },
    {
      id: '3',
      executedAt: '2025-09-28 22:08:45',
      type: 'manual' as const,
      totalProducts: 50,
      successCount: 48,
      priceUpdateCount: 5,
      errorCount: 2,
      durationSeconds: 42,
      randomDelay: 0
    }
  ]

  const zeroStockProducts = [
    {
      id: '1',
      sku: 'CARD-042',
      name: 'ポケモンカード リザードンex SAR',
      imageUrl: 'https://via.placeholder.com/80',
      marketplaces: ['yahoo', 'mercari'],
      score: 4.2,
      lastStockZeroAt: '2025-09-29 09:30:00',
      sourceUrl: 'https://auction.yahoo.co.jp/...',
      lastScrapedAt: '2025-09-29 10:23:15'
    },
    {
      id: '2',
      sku: 'WATCH-015',
      name: 'Rolex Submariner Date',
      imageUrl: 'https://via.placeholder.com/80',
      marketplaces: ['yahoo', 'rakuten', 'ebay'],
      score: 4.8,
      lastStockZeroAt: '2025-09-28 18:00:00',
      sourceUrl: 'https://item.rakuten.co.jp/...',
      lastScrapedAt: '2025-09-29 10:25:42'
    },
    {
      id: '3',
      sku: 'CAM-089',
      name: 'Canon EF 70-200mm f/2.8L IS III',
      imageUrl: 'https://via.placeholder.com/80',
      marketplaces: ['amazon', 'yahoo'],
      score: 3.9,
      lastStockZeroAt: '2025-09-27 14:20:00',
      sourceUrl: 'https://www.amazon.co.jp/...',
      lastScrapedAt: '2025-09-29 10:28:19'
    }
  ]

  const errorProducts = [
    {
      id: '1',
      productName: 'Canon EOS R5 ボディ',
      errorType: 'scraping_timeout',
      errorMessage: '仕入れ先URLへの接続に失敗しました',
      occurredAt: '2025-09-29 10:15:23',
      retryCount: 2,
      nextRetryAt: '2025-09-29 14:00:00'
    },
    {
      id: '2',
      productName: 'ポケモンカード バイオレット',
      errorType: 'price_calculation_error',
      errorMessage: '利益計算APIエラー: 為替レート取得失敗',
      occurredAt: '2025-09-29 10:12:45',
      retryCount: 1,
      nextRetryAt: '2025-09-29 14:00:00'
    },
    {
      id: '3',
      productName: 'MacBook Pro 14inch',
      errorType: 'api_sync_error',
      errorMessage: 'Yahoo API: 在庫更新レスポンスタイムアウト',
      occurredAt: '2025-09-29 09:58:12',
      retryCount: 3,
      nextRetryAt: '2025-09-29 18:00:00'
    }
  ]

  const marketplaceIcons = {
    yahoo: { name: 'Yahoo!', color: 'bg-red-500' },
    mercari: { name: 'メルカリ', color: 'bg-red-400' },
    rakuten: { name: '楽天', color: 'bg-red-600' },
    amazon: { name: 'Amazon', color: 'bg-orange-500' },
    ebay: { name: 'eBay', color: 'bg-blue-600' }
  }

  const renderStars = (score: number) => {
    const fullStars = Math.floor(score)
    const hasHalfStar = score % 1 >= 0.5
    const stars = []
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)
    }
    if (hasHalfStar) {
      stars.push(<Star key="half" className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />)
    }
    const remaining = 5 - stars.length
    for (let i = 0; i < remaining; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />)
    }
    
    return stars
  }

  const handleSaveSettings = () => {
    console.log('Settings saved:', scheduleSettings)
    setShowSettingsModal(false)
    // TODO: API呼び出し
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">在庫管理監視システム</h1>
          <p className="text-muted-foreground mt-1">
            自動在庫連動 & ロボット対策機能
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setShowSettingsModal(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            スケジュール設定
          </Button>
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            手動実行
          </Button>
          <Button variant="outline">
            <BarChart3 className="mr-2 h-4 w-4" />
            レポート
          </Button>
        </div>
      </div>

      {/* スケジュール設定モーダル */}
      {showSettingsModal && (
        <Card className="fixed inset-0 z-50 m-auto w-[600px] h-fit max-h-[80vh] overflow-auto shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              スケジュール設定
            </CardTitle>
            <CardDescription>
              ロボット検知を回避するための設定
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 自動実行の有効化 */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>自動実行を有効化</Label>
                <p className="text-sm text-muted-foreground">
                  定期的な在庫チェックを実行
                </p>
              </div>
              <Switch
                checked={scheduleSettings.enabled}
                onCheckedChange={(checked) => 
                  setScheduleSettings({...scheduleSettings, enabled: checked})
                }
              />
            </div>

            {/* 基準時刻 */}
            <div className="space-y-2">
              <Label>基準実行時刻</Label>
              <Input
                type="time"
                value={scheduleSettings.baseTime}
                onChange={(e) => 
                  setScheduleSettings({...scheduleSettings, baseTime: e.target.value})
                }
              />
              <p className="text-xs text-muted-foreground">
                例: 10:00に設定すると、10:00, 14:00, 18:00, 22:00に実行
              </p>
            </div>

            {/* 実行間隔 */}
            <div className="space-y-2">
              <Label>実行間隔（時間）</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[scheduleSettings.intervalHours]}
                  onValueChange={(value) => 
                    setScheduleSettings({...scheduleSettings, intervalHours: value[0]})
                  }
                  min={1}
                  max={12}
                  step={1}
                  className="flex-1"
                />
                <span className="w-12 text-center font-medium">
                  {scheduleSettings.intervalHours}h
                </span>
              </div>
            </div>

            {/* ランダム遅延 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>ランダム遅延を有効化</Label>
                <Switch
                  checked={scheduleSettings.enableRandomDelay}
                  onCheckedChange={(checked) => 
                    setScheduleSettings({...scheduleSettings, enableRandomDelay: checked})
                  }
                />
              </div>
              {scheduleSettings.enableRandomDelay && (
                <>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[scheduleSettings.randomRange]}
                      onValueChange={(value) => 
                        setScheduleSettings({...scheduleSettings, randomRange: value[0]})
                      }
                      min={5}
                      max={60}
                      step={5}
                      className="flex-1"
                    />
                    <span className="w-16 text-center font-medium">
                      ±{scheduleSettings.randomRange}分
                    </span>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded text-sm">
                    <p className="text-blue-700 dark:text-blue-400">
                      <Zap className="inline h-4 w-4 mr-1" />
                      実行時刻を{scheduleSettings.randomRange}分以内でランダム化し、
                      ロボット検知を回避します
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* 商品間待機時間 */}
            <div className="space-y-2">
              <Label>商品間待機時間（秒）</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[scheduleSettings.delayBetweenProducts]}
                  onValueChange={(value) => 
                    setScheduleSettings({...scheduleSettings, delayBetweenProducts: value[0]})
                  }
                  min={3}
                  max={30}
                  step={1}
                  className="flex-1"
                />
                <span className="w-12 text-center font-medium">
                  {scheduleSettings.delayBetweenProducts}秒
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                各商品のスクレイピング後に待機する時間
              </p>
            </div>

            {/* バッチサイズ */}
            <div className="space-y-2">
              <Label>バッチサイズ（商品数）</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[scheduleSettings.batchSize]}
                  onValueChange={(value) => 
                    setScheduleSettings({...scheduleSettings, batchSize: value[0]})
                  }
                  min={1}
                  max={20}
                  step={1}
                  className="flex-1"
                />
                <span className="w-12 text-center font-medium">
                  {scheduleSettings.batchSize}件
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                一度に処理する商品数（少ないほど安全）
              </p>
            </div>

            {/* 予測実行時刻 */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                次回実行予測
              </h4>
              <div className="space-y-1 text-sm">
                <p>
                  基準: {scheduleSettings.baseTime}
                  {scheduleSettings.enableRandomDelay && 
                    ` ± ${scheduleSettings.randomRange}分`
                  }
                </p>
                <p className="text-muted-foreground">
                  例: 10:00に設定の場合 → 
                  {scheduleSettings.enableRandomDelay 
                    ? " 09:45~10:15の間にランダム実行"
                    : " 10:00ちょうどに実行"
                  }
                </p>
                <p className="text-muted-foreground">
                  処理速度: 約{scheduleSettings.batchSize * scheduleSettings.delayBetweenProducts}秒/バッチ
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                className="flex-1"
                onClick={handleSaveSettings}
              >
                設定を保存
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowSettingsModal(false)}
              >
                キャンセル
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* モーダル背景 */}
      {showSettingsModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowSettingsModal(false)}
        />
      )}

      {/* ダッシュボード概要 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">監視中商品</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {dashboardStats.monitoring.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              アクティブな商品数
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">価格更新</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {dashboardStats.priceUpdated}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              最新実行で更新
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">在庫切れ</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {dashboardStats.zeroStock}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              対応が必要
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">エラー</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {dashboardStats.errors}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              即座に対応必要
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 残りのタブコンテンツは前のUIと同じ */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">
            <Clock className="mr-2 h-4 w-4" />
            実行履歴
          </TabsTrigger>
          <TabsTrigger value="zero-stock">
            <Package className="mr-2 h-4 w-4" />
            在庫0商品 ({zeroStockProducts.length})
          </TabsTrigger>
          <TabsTrigger value="errors">
            <AlertTriangle className="mr-2 h-4 w-4" />
            エラー ({errorProducts.length})
          </TabsTrigger>
        </TabsList>

        {/* 実行履歴タブ - ランダム遅延を表示 */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>最新実行履歴</CardTitle>
              <CardDescription>
                ランダム遅延機能でロボット検知を回避
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {executionHistory.map((exec) => (
                <div
                  key={exec.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{exec.executedAt}</span>
                        <Badge variant={exec.type === 'scheduled' ? 'default' : 'secondary'}>
                          {exec.type === 'scheduled' ? '定期実行' : '手動実行'}
                        </Badge>
                        {exec.randomDelay > 0 && (
                          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/20">
                            <Zap className="h-3 w-3 mr-1" />
                            +{exec.randomDelay}分遅延
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        実行時間: {exec.durationSeconds}秒
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="mr-2 h-4 w-4" />
                      詳細
                    </Button>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">処理総数</p>
                      <p className="text-2xl font-bold">{exec.totalProducts}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        成功
                      </p>
                      <p className="text-2xl font-bold text-green-600">{exec.successCount}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-blue-600 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        価格更新
                      </p>
                      <p className="text-2xl font-bold text-blue-600">{exec.priceUpdateCount}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        エラー
                      </p>
                      <p className="text-2xl font-bold text-red-600">{exec.errorCount}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 在庫0商品タブ - ソースURL表示追加 */}
        <TabsContent value="zero-stock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>在庫切れ商品</CardTitle>
              <CardDescription>
                出品停止または再出品の判断が必要な商品
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {zeroStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="border rounded-lg p-4 flex gap-4 hover:bg-accent/50 transition-colors"
                >
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-20 h-20 object-cover rounded"
                  />
                  <div className="flex-1 space-y-2">
                    <div>
                      <h3 className="font-medium">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">出品先:</span>
                      {product.marketplaces.map((mp) => (
                        <Badge
                          key={mp}
                          variant="outline"
                          className={`${marketplaceIcons[mp].color} text-white border-0`}
                        >
                          {marketplaceIcons[mp].name}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">スコア:</span>
                      <div className="flex items-center gap-1">
                        {renderStars(product.score)}
                        <span className="ml-2 text-sm font-medium">{product.score}</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        仕入れ先: {product.sourceUrl}
                      </p>
                      <p>在庫切れ: {product.lastStockZeroAt}</p>
                      <p>最終確認: {product.lastScrapedAt}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button variant="destructive" size="sm">
                      <StopCircle className="mr-2 h-4 w-4" />
                      出品停止
                    </Button>
                    <Button variant="default" size="sm">
                      <PlayCircle className="mr-2 h-4 w-4" />
                      再出品
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      削除
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* エラー一覧タブ - 次回リトライ時刻追加 */}
        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>エラー商品</CardTitle>
              <CardDescription>
                処理中にエラーが発生した商品
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorProducts.map((error) => (
                <div
                  key={error.id}
                  className="border border-red-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-500" />
                        <h3 className="font-medium">{error.productName}</h3>
                      </div>
                      <Badge variant="destructive">{error.errorType}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        再試行
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        詳細
                      </Button>
                    </div>
                  </div>

                  <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded">
                    <p className="text-sm text-red-700 dark:text-red-400">
                      {error.errorMessage}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div>
                      <p>発生時刻: {error.occurredAt}</p>
                      <p>次回リトライ: {error.nextRetryAt}</p>
                    </div>
                    <span>再試行回数: {error.retryCount}回</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
