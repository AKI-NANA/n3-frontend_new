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
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Settings,
  Zap,
  Users,
  ShoppingCart,
  PlayCircle,
  PauseCircle,
  Plus,
  Trash2
} from 'lucide-react'

export default function ListingManagementPage() {
  // スケジュール設定
  const [scheduleSettings, setScheduleSettings] = useState({
    enabled: true,
    // 週間パターン
    weeklyPattern: {
      monday: 20,
      tuesday: 15,
      wednesday: 20,
      thursday: 0,
      friday: 15,
      saturday: 25,
      sunday: 0
    },
    randomizeDays: true,
    
    // ランダム化設定
    timeRandomRange: 30, // ±30分
    itemIntervalRange: [20, 90], // 20-90秒
    
    // 1日の分散
    dailySessions: [
      { start: '10:00', end: '12:00', items: 20 },
      { start: '14:00', end: '16:00', items: 15 },
      { start: '18:00', end: '20:00', items: 10 }
    ],
    
    // 月間上限
    monthlyLimits: {
      ebay: 500,
      yahoo: 9999,
      mercari: 600,
      amazon: 9999
    }
  })

  // 統計データ
  const [stats] = useState({
    thisMonthCount: 245,
    successRate: 98,
    pendingCount: 12,
    failedCount: 3
  })

  // 月間カウンター
  const [monthlyCounters] = useState({
    ebay: { current: 245, limit: 500 },
    yahoo: { current: 1234, limit: null },
    mercari: { current: 18, limit: 20, type: 'daily' },
    amazon: { current: 456, limit: null }
  })

  // 実行履歴
  const [executionHistory] = useState([
    {
      id: '1',
      executedAt: '2025-09-29 10:23:15',
      scheduledAt: '2025-09-29 10:00:00',
      randomDelay: 23,
      totalItems: 45,
      successCount: 44,
      failedCount: 1,
      intervalRange: '25-78秒'
    },
    {
      id: '2',
      executedAt: '2025-09-29 14:18:42',
      scheduledAt: '2025-09-29 14:00:00',
      randomDelay: 18,
      totalItems: 35,
      successCount: 35,
      failedCount: 0,
      intervalRange: '32-85秒'
    },
    {
      id: '3',
      executedAt: '2025-09-28 18:12:33',
      scheduledAt: '2025-09-28 18:00:00',
      randomDelay: 12,
      totalItems: 28,
      successCount: 27,
      failedCount: 1,
      intervalRange: '20-65秒'
    }
  ])

  const weekDays = ['月', '火', '水', '木', '金', '土', '日']
  const weekDaysEn = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  const handleDayToggle = (day: string) => {
    setScheduleSettings(prev => ({
      ...prev,
      weeklyPattern: {
        ...prev.weeklyPattern,
        [day]: prev.weeklyPattern[day] > 0 ? 0 : 15
      }
    }))
  }

  const handleDayCountChange = (day: string, value: number) => {
    setScheduleSettings(prev => ({
      ...prev,
      weeklyPattern: {
        ...prev.weeklyPattern,
        [day]: value
      }
    }))
  }

  const addSession = () => {
    setScheduleSettings(prev => ({
      ...prev,
      dailySessions: [
        ...prev.dailySessions,
        { start: '20:00', end: '22:00', items: 10 }
      ]
    }))
  }

  const removeSession = (index: number) => {
    setScheduleSettings(prev => ({
      ...prev,
      dailySessions: prev.dailySessions.filter((_, i) => i !== index)
    }))
  }

  const getMarketplaceName = (key: string) => {
    const names = {
      ebay: 'eBay',
      yahoo: 'Yahoo!',
      mercari: 'メルカリ',
      amazon: 'Amazon'
    }
    return names[key] || key
  }

  const getProgressColor = (current: number, limit: number | null) => {
    if (!limit) return 'bg-blue-500'
    const percentage = (current / limit) * 100
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">出品管理システム</h1>
          <p className="text-muted-foreground mt-1">
            ロボット検知回避 & 自動スケジューリング
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            詳細設定
          </Button>
          <Button>
            <PlayCircle className="mr-2 h-4 w-4" />
            今すぐ実行
          </Button>
        </div>
      </div>

      {/* ダッシュボード概要 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">今月の出品数</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats.thisMonthCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              残り {scheduleSettings.monthlyLimits.ebay - stats.thisMonthCount} 枠
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">成功率</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.successRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              非常に良好
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">待機中</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {stats.pendingCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              次回実行予定
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">失敗</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {stats.failedCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              要確認
            </p>
          </CardContent>
        </Card>
      </div>

      {/* タブコンテンツ */}
      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedule">
            <Calendar className="mr-2 h-4 w-4" />
            スケジュール設定
          </TabsTrigger>
          <TabsTrigger value="limits">
            <ShoppingCart className="mr-2 h-4 w-4" />
            月間上限管理
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="mr-2 h-4 w-4" />
            実行履歴
          </TabsTrigger>
        </TabsList>

        {/* スケジュール設定タブ */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>週間スケジュール</CardTitle>
              <CardDescription>
                各曜日の出品数を設定（0 = 休止）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 曜日選択 */}
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day, index) => {
                  const dayEn = weekDaysEn[index]
                  const count = scheduleSettings.weeklyPattern[dayEn]
                  const isActive = count > 0
                  
                  return (
                    <div key={day} className="space-y-2">
                      <Button
                        variant={isActive ? "default" : "outline"}
                        className="w-full"
                        onClick={() => handleDayToggle(dayEn)}
                      >
                        {day}
                      </Button>
                      {isActive && (
                        <Input
                          type="number"
                          value={count}
                          onChange={(e) => handleDayCountChange(dayEn, parseInt(e.target.value) || 0)}
                          className="text-center"
                          min={0}
                          max={100}
                        />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* 曜日パターンランダム化 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>曜日パターンを毎週変更</Label>
                  <p className="text-sm text-muted-foreground">
                    ロボット検知を回避するため、出品曜日を毎週ランダム化
                  </p>
                </div>
                <Switch
                  checked={scheduleSettings.randomizeDays}
                  onCheckedChange={(checked) => 
                    setScheduleSettings({...scheduleSettings, randomizeDays: checked})
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* ランダム化設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                ランダム化設定（ロボット対策）
              </CardTitle>
              <CardDescription>
                出品時刻と間隔をランダム化してパターンを避ける
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 時刻ランダム幅 */}
              <div className="space-y-2">
                <Label>時刻ランダム幅</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[scheduleSettings.timeRandomRange]}
                    onValueChange={(value) => 
                      setScheduleSettings({...scheduleSettings, timeRandomRange: value[0]})
                    }
                    min={0}
                    max={60}
                    step={5}
                    className="flex-1"
                  />
                  <span className="w-16 text-center font-medium">
                    ±{scheduleSettings.timeRandomRange}分
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  予定時刻から前後にランダムにずらす時間
                </p>
              </div>

              {/* 商品間間隔 */}
              <div className="space-y-2">
                <Label>商品間間隔（秒）</Label>
                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>最小: {scheduleSettings.itemIntervalRange[0]}秒</span>
                      <span>最大: {scheduleSettings.itemIntervalRange[1]}秒</span>
                    </div>
                    <Slider
                      value={scheduleSettings.itemIntervalRange}
                      onValueChange={(value) => 
                        setScheduleSettings({...scheduleSettings, itemIntervalRange: value as [number, number]})
                      }
                      min={10}
                      max={120}
                      step={5}
                      className="flex-1"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  各商品の出品後に待機する時間（ランダム範囲）
                </p>
              </div>

              {/* プレビュー */}
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  動作イメージ
                </h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    • 予定時刻 10:00 → 実際の実行: 09:45-10:15の間でランダム
                  </p>
                  <p>
                    • 商品1: 10:05:00 → 商品2: 10:05:34 (34秒後) → 商品3: 10:06:19 (45秒後)
                  </p>
                  <p className="text-green-600 font-medium">
                    ✓ 毎回異なるパターンでロボット検知を回避
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 1日の分散設定 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>1日の出品分散</CardTitle>
                  <CardDescription>
                    複数の時間帯に分けて出品（より自然な動作）
                  </CardDescription>
                </div>
                <Button size="sm" onClick={addSession}>
                  <Plus className="mr-2 h-4 w-4" />
                  セッション追加
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {scheduleSettings.dailySessions.map((session, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">開始時刻</Label>
                      <Input
                        type="time"
                        value={session.start}
                        onChange={(e) => {
                          const newSessions = [...scheduleSettings.dailySessions]
                          newSessions[index].start = e.target.value
                          setScheduleSettings({...scheduleSettings, dailySessions: newSessions})
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">終了時刻</Label>
                      <Input
                        type="time"
                        value={session.end}
                        onChange={(e) => {
                          const newSessions = [...scheduleSettings.dailySessions]
                          newSessions[index].end = e.target.value
                          setScheduleSettings({...scheduleSettings, dailySessions: newSessions})
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">出品数</Label>
                      <Input
                        type="number"
                        value={session.items}
                        onChange={(e) => {
                          const newSessions = [...scheduleSettings.dailySessions]
                          newSessions[index].items = parseInt(e.target.value) || 0
                          setScheduleSettings({...scheduleSettings, dailySessions: newSessions})
                        }}
                        min={0}
                        max={100}
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSession(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 月間上限管理タブ */}
        <TabsContent value="limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>プラットフォーム別 出品状況</CardTitle>
              <CardDescription>
                各モールの出品数と上限を管理
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(monthlyCounters).map(([key, data]) => {
                const percentage = data.limit ? (data.current / data.limit) * 100 : 0
                const color = getProgressColor(data.current, data.limit)
                
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{getMarketplaceName(key)}</h4>
                        {data.type === 'daily' && (
                          <p className="text-xs text-muted-foreground">今日の出品数</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {data.current}
                          {data.limit && <span className="text-muted-foreground">/{data.limit}</span>}
                        </p>
                        {data.limit && (
                          <p className="text-xs text-muted-foreground">
                            {percentage.toFixed(1)}% 使用中
                          </p>
                        )}
                        {!data.limit && (
                          <p className="text-xs text-muted-foreground">制限なし</p>
                        )}
                      </div>
                    </div>
                    {data.limit && (
                      <Progress value={percentage} className={`h-2 ${color}`} />
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 実行履歴タブ */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>最新実行履歴</CardTitle>
              <CardDescription>
                ランダム化が正常に動作しているか確認
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {executionHistory.map((exec) => (
                <div
                  key={exec.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">実行: {exec.executedAt}</span>
                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/20">
                          <Zap className="h-3 w-3 mr-1" />
                          +{exec.randomDelay}分遅延
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        予定: {exec.scheduledAt} | 間隔: {exec.intervalRange}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">処理総数</p>
                      <p className="text-2xl font-bold">{exec.totalItems}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        成功
                      </p>
                      <p className="text-2xl font-bold text-green-600">{exec.successCount}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        失敗
                      </p>
                      <p className="text-2xl font-bold text-red-600">{exec.failedCount}</p>
                    </div>
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
