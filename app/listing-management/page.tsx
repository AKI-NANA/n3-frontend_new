'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  CheckCircle2,
  Clock,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Settings,
  Zap,
  RefreshCw,
  Loader2,
  AlertCircle,
  Filter,
  Search,
  Plus,
  Trash2,
  PlayCircle,
  XCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SmartScheduleGeneratorV2, saveSchedulesToDatabaseV2, type ScheduleSettings, type MarketplaceSettings } from '@/lib/smart-scheduler-v2'

const ITEMS_PER_PAGE = 100

const DEFAULT_MARKETPLACE_SETTINGS: MarketplaceSettings[] = [
  {
    marketplace: 'ebay',
    account: 'account1',
    dailyLimit: 30,
    enabled: true,
    randomization: {
      enabled: true,
      sessionsPerDay: { min: 2, max: 6 },
      timeRandomization: { enabled: true, range: 30 },
      itemInterval: { min: 20, max: 120 }
    }
  },
  {
    marketplace: 'ebay',
    account: 'account2',
    dailyLimit: 25,
    enabled: true,
    randomization: {
      enabled: true,
      sessionsPerDay: { min: 2, max: 5 },
      timeRandomization: { enabled: true, range: 30 },
      itemInterval: { min: 20, max: 120 }
    }
  },
  {
    marketplace: 'shopee',
    account: 'main',
    dailyLimit: 100,
    enabled: true,
    randomization: {
      enabled: false,
      sessionsPerDay: { min: 1, max: 1 },
      timeRandomization: { enabled: false, range: 0 },
      itemInterval: { min: 5, max: 10 }
    }
  },
  {
    marketplace: 'amazon_jp',
    account: 'main',
    dailyLimit: 50,
    enabled: true,
    randomization: {
      enabled: false,
      sessionsPerDay: { min: 1, max: 1 },
      timeRandomization: { enabled: false, range: 0 },
      itemInterval: { min: 5, max: 10 }
    }
  },
  {
    marketplace: 'shopify',
    account: 'main',
    dailyLimit: 20,
    enabled: true,
    randomization: {
      enabled: false,
      sessionsPerDay: { min: 1, max: 1 },
      timeRandomization: { enabled: false, range: 0 },
      itemInterval: { min: 3, max: 5 }
    }
  }
]

export default function ListingManagementPage() {
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [error, setError] = useState<string | null>(null)
  
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  
  const [filters, setFilters] = useState({
    minScore: 0,
    maxScore: 100,
    minPrice: 0,
    maxPrice: 100000,
    priority: 'all',
    marketplace: 'all',
    account: 'all',
    status: 'all',
    search: '',
    scheduledDateFrom: '',
    scheduledDateTo: ''
  })
  
  const [settings, setSettings] = useState<ScheduleSettings>({
    limits: {
      dailyMin: 10,
      dailyMax: 50,
      weeklyMin: 70,
      weeklyMax: 200,
      monthlyMax: 500
    },
    marketplaceAccounts: DEFAULT_MARKETPLACE_SETTINGS,
    categoryDistribution: {
      enabled: true,
      lookbackDays: 7,
      minCategoriesPerDay: 1,
      categoryBalanceWeight: 0.3
    }
  })

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [currentPage, filters])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)
      
      // listing_scheduleテーブルから出品スケジュールを取得
      let query = supabase
        .from('listing_schedule')
        .select(`
          *,
          products_master (
            id,
            sku,
            title,
            title_en,
            current_price,
            listing_price,
            ai_confidence_score,
            listing_priority,
            category_name,
            primary_image_url
          )
        `, { count: 'exact' })

      // フィルター適用
      if (filters.marketplace !== 'all') {
        query = query.eq('marketplace', filters.marketplace)
      }
      
      if (filters.account !== 'all') {
        query = query.eq('account_id', filters.account)
      }
      
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      
      if (filters.scheduledDateFrom) {
        query = query.gte('scheduled_at', filters.scheduledDateFrom)
      }
      
      if (filters.scheduledDateTo) {
        const endDate = new Date(filters.scheduledDateTo)
        endDate.setHours(23, 59, 59, 999)
        query = query.lte('scheduled_at', endDate.toISOString())
      }
      
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      
      const { data: schedulesData, error: schedulesError, count } = await query
        .order('scheduled_at', { ascending: true })
        .range(from, to)

      if (schedulesError) {
        setError(`スケジュール取得エラー: ${schedulesError.message}`)
        console.error('Supabase error:', schedulesError)
      } else {
        setSchedules(schedulesData || [])
        setTotalCount(count || 0)
      }
      
    } catch (error: any) {
      setError(`データ取得エラー: ${error.message}`)
      console.error('Load data error:', error)
    } finally {
      setLoading(false)
    }
  }

  // 即時実行機能
  async function executeImmediately(scheduleIds: string[]) {
    if (scheduleIds.length === 0) {
      alert('スケジュールを選択してください')
      return
    }
    
    if (!confirm(`${scheduleIds.length}件のスケジュールを今すぐ実行しますか？`)) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('listing_schedule')
        .update({
          scheduled_at: new Date().toISOString(),
          status: 'PENDING',
          priority: 999,
          updated_at: new Date().toISOString()
        })
        .in('id', scheduleIds)

      if (error) {
        alert(`エラー: ${error.message}`)
        return
      }

      alert(`✅ ${scheduleIds.length}件のスケジュールを即時実行に設定しました`)
      await loadData()
      
    } catch (error: any) {
      alert(`エラー: ${error.message}`)
    }
  }

  // スケジュールキャンセル
  async function cancelSchedules(scheduleIds: string[]) {
    if (scheduleIds.length === 0) {
      alert('スケジュールを選択してください')
      return
    }
    
    if (!confirm(`${scheduleIds.length}件のスケジュールをキャンセルしますか？`)) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('listing_schedule')
        .update({
          status: 'CANCELLED',
          updated_at: new Date().toISOString()
        })
        .in('id', scheduleIds)

      if (error) {
        alert(`エラー: ${error.message}`)
        return
      }

      alert(`✅ ${scheduleIds.length}件のスケジュールをキャンセルしました`)
      await loadData()
      
    } catch (error: any) {
      alert(`エラー: ${error.message}`)
    }
  }

  // スケジュール削除
  async function deleteSchedules(scheduleIds: string[]) {
    if (scheduleIds.length === 0) {
      alert('スケジュールを選択してください')
      return
    }
    
    if (!confirm(`${scheduleIds.length}件のスケジュールを完全に削除しますか？この操作は取り消せません。`)) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('listing_schedule')
        .delete()
        .in('id', scheduleIds)

      if (error) {
        alert(`エラー: ${error.message}`)
        return
      }

      alert(`✅ ${scheduleIds.length}件のスケジュールを削除しました`)
      await loadData()
      
    } catch (error: any) {
      alert(`エラー: ${error.message}`)
    }
  }

  async function generateSchedule() {
    if (totalCount === 0) {
      alert('出品スケジュールがありません。\n承認ページで商品を承認してください。')
      return
    }
    
    alert('この機能は承認ページの出品戦略コントロールに統合されました。\n承認ページで商品を承認する際にスケジュールが自動的に作成されます。')
  }

  const addMarketplace = () => {
    setSettings({
      ...settings,
      marketplaceAccounts: [
        ...settings.marketplaceAccounts,
        {
          marketplace: '',
          account: '',
          dailyLimit: 20,
          enabled: true,
          randomization: {
            enabled: false,
            sessionsPerDay: { min: 1, max: 1 },
            timeRandomization: { enabled: false, range: 0 },
            itemInterval: { min: 5, max: 10 }
          }
        }
      ]
    })
  }

  const removeMarketplace = (index: number) => {
    const newAccounts = settings.marketplaceAccounts.filter((_, i) => i !== index)
    setSettings({ ...settings, marketplaceAccounts: newAccounts })
  }

  const updateMarketplace = (index: number, updates: Partial<MarketplaceSettings>) => {
    const newAccounts = [...settings.marketplaceAccounts]
    newAccounts[index] = { ...newAccounts[index], ...updates }
    setSettings({ ...settings, marketplaceAccounts: newAccounts })
  }

  const stats = {
    total: totalCount,
    pending: schedules.filter(s => s.status === 'PENDING' || s.status === 'SCHEDULED').length,
    completed: schedules.filter(s => s.status === 'COMPLETED').length,
    error: schedules.filter(s => s.status === 'ERROR').length,
    cancelled: schedules.filter(s => s.status === 'CANCELLED').length,
    avgScore: schedules.length > 0 
      ? Math.round(schedules.reduce((sum, s) => sum + (s.products_master?.ai_confidence_score || 0), 0) / schedules.length)
      : 0,
  }

  // マーケットプレイス・アカウントの一覧を取得
  const uniqueMarketplaces = [...new Set(schedules.map(s => s.marketplace))].filter(Boolean)
  const uniqueAccounts = [...new Set(schedules.map(s => s.account_id))].filter(Boolean)

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  const monthName = currentMonth.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })

  // カレンダー生成（スケジュールデータを使用）
  const generateCalendarGrid = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startingDayOfWeek = firstDay.getDay()
    const daysInMonth = lastDay.getDate()
    const calendarDays = []
    
    for (let i = 0; i < startingDayOfWeek; i++) calendarDays.push(null)
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().split('T')[0]
      const daySessions = schedules.filter(s => s.scheduled_at?.startsWith(dateStr))
      calendarDays.push({ date, sessions: daySessions })
    }
    return calendarDays
  }

  const calendarDays = generateCalendarGrid()
  const weekDays = ['日', '月', '火', '水', '木', '金', '土']
  const upcomingSchedule = schedules.filter(s => new Date(s.scheduled_at) >= new Date() && (s.status === 'PENDING' || s.status === 'SCHEDULED'))

  const marketplaceStats = settings.marketplaceAccounts.filter(ma => ma.enabled).map(ma => {
    const sessions = schedules.filter(s => s.marketplace === ma.marketplace && s.account_id === ma.account)
    return {
      ...ma,
      sessions: sessions.length,
      products: sessions.length
    }
  })

  // ステータス表示用のバッジ
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-500">待機中</Badge>
      case 'SCHEDULED':
        return <Badge className="bg-blue-500">予約済み</Badge>
      case 'RUNNING':
        return <Badge className="bg-orange-500">実行中</Badge>
      case 'COMPLETED':
        return <Badge className="bg-green-500">完了</Badge>
      case 'ERROR':
        return <Badge className="bg-red-500">エラー</Badge>
      case 'CANCELLED':
        return <Badge className="bg-gray-500">キャンセル</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading && currentPage === 1) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">スマート出品スケジューラー</h1>
          <p className="text-muted-foreground mt-1">モール別設定・eBay API統合・完全ランダム化</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}><Clock className="mr-2 h-4 w-4" />更新</Button>
          <Button onClick={generateSchedule} disabled={generating} className="bg-purple-600 hover:bg-purple-700">
            {generating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />生成中...</> : <><RefreshCw className="mr-2 h-4 w-4" />スケジュール生成</>}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 dark:text-red-100">エラー</h4>
                <p className="text-sm text-red-800 dark:text-red-200 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">出品待ち商品</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.pending.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">全{totalCount.toLocaleString()}件中</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">スケジュール済み</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.completed}件完了</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">平均AIスコア</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{stats.avgScore}</div>
            <p className="text-xs text-muted-foreground mt-1">表示中商品の平均</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">スコア分布</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-600">エラー</span><span className="font-bold">{stats.error}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-yellow-600">キャンセル</span><span className="font-bold">{stats.cancelled}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">次回出品予定</CardTitle></CardHeader>
          <CardContent>
            {upcomingSchedule.length > 0 ? (
              <>
                <div className="text-2xl font-bold text-orange-600">
                  {new Date(upcomingSchedule[0].scheduled_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(upcomingSchedule[0].scheduled_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} - {upcomingSchedule[0].marketplace}
                </p>
              </>
            ) : (
              <div className="text-xl font-bold text-muted-foreground">予定なし</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar"><CalendarIcon className="mr-2 h-4 w-4" />カレンダー</TabsTrigger>
          <TabsTrigger value="products"><Filter className="mr-2 h-4 w-4" />商品一覧 ({totalCount.toLocaleString()})</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4" />モール別設定</TabsTrigger>
          <TabsTrigger value="category"><Zap className="mr-2 h-4 w-4" />カテゴリ分散</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-5 gap-3">
            {marketplaceStats.map((ms, idx) => (
              <Card key={idx} className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{ms.marketplace}</Badge>
                    <Badge variant="secondary" className="text-xs">{ms.account}</Badge>
                  </div>
                  <div className="text-2xl font-bold">{ms.products}</div>
                  <p className="text-xs text-muted-foreground">{ms.sessions}セッション{ms.randomization.enabled ? '・ランダム' : '・固定'}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>出品カレンダー</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="font-medium min-w-[150px] text-center">{monthName}</span>
                  <Button variant="outline" size="sm" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map((day, idx) => (
                  <div key={day} className={`text-center font-bold py-2 ${idx === 0 ? 'text-red-600' : idx === 6 ? 'text-blue-600' : ''}`}>{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} className="aspect-square" />
                  const { date, sessions } = day
                  const isToday = date.toDateString() === new Date().toDateString()
                  const totalItems = sessions.length
                  const avgScore = sessions.length > 0 ? Math.round(sessions.reduce((sum, s) => sum + (s.products_master?.ai_confidence_score || 0), 0) / sessions.length) : 0
                  const hasCompleted = sessions.some(s => s.status === 'COMPLETED')
                  const hasPending = sessions.some(s => s.status === 'PENDING' || s.status === 'SCHEDULED')
                  
                  return (
                    <Card key={date.toISOString()} className={`aspect-square p-2 ${isToday ? 'ring-2 ring-primary' : ''} ${totalItems === 0 ? 'opacity-50' : ''}`}>
                      <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-bold ${isToday ? 'text-primary' : ''}`}>{date.getDate()}</span>
                          {hasCompleted && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                          {hasPending && <Clock className="w-3 h-3 text-orange-500" />}
                        </div>
                        {totalItems > 0 && (
                          <div className="space-y-1 text-xs flex-1">
                            <div className="font-semibold text-blue-600">{totalItems}件</div>
                            {avgScore > 0 && <div className={`text-[10px] ${avgScore >= 80 ? 'text-green-600' : avgScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>スコア: {avgScore}</div>}
                            {sessions.slice(0, 2).map((session, i) => (
                              <div key={i} className="text-[10px] text-muted-foreground truncate">
                                {new Date(session.scheduled_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} {session.marketplace}
                              </div>
                            ))}
                            {sessions.length > 2 && <div className="text-[10px] text-muted-foreground">+{sessions.length - 2}件</div>}
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" />フィルター</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Label>検索</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="商品名・SKU" className="pl-8" value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>マーケットプレイス</Label>
                  <Select value={filters.marketplace} onValueChange={(v) => setFilters({...filters, marketplace: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      {uniqueMarketplaces.map(mp => (
                        <SelectItem key={mp} value={mp}>{mp}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>アカウント</Label>
                  <Select value={filters.account} onValueChange={(v) => setFilters({...filters, account: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      {uniqueAccounts.map(acc => (
                        <SelectItem key={acc} value={acc}>{acc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ステータス</Label>
                  <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="PENDING">待機中</SelectItem>
                      <SelectItem value="SCHEDULED">予約済み</SelectItem>
                      <SelectItem value="COMPLETED">完了</SelectItem>
                      <SelectItem value="ERROR">エラー</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>出品予定日（開始）</Label>
                  <Input type="date" value={filters.scheduledDateFrom} onChange={(e) => setFilters({...filters, scheduledDateFrom: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>出品予定日（終了）</Label>
                  <Input type="date" value={filters.scheduledDateTo} onChange={(e) => setFilters({...filters, scheduledDateTo: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setFilters({ minScore: 0, maxScore: 100, minPrice: 0, maxPrice: 100000, priority: 'all', marketplace: 'all', account: 'all', status: 'all', search: '', scheduledDateFrom: '', scheduledDateTo: '' })}>リセット</Button>
                <Button size="sm" onClick={() => { setCurrentPage(1); loadData(); }}>適用</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>商品一覧（{totalCount.toLocaleString()}件）</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">ページ {currentPage} / {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>前へ</Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>次へ</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {schedules.map(schedule => {
                  const product = schedule.products_master
                  
                  return (
                    <div key={schedule.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent">
                      <div className="flex-1">
                        <h4 className="font-medium line-clamp-1">{product?.title_en || product?.title || 'タイトルなし'}</h4>
                        <p className="text-sm text-muted-foreground">SKU: {product?.sku || 'N/A'}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline">{schedule.marketplace}</Badge>
                        <Badge variant="secondary" className="text-xs">{schedule.account_id}</Badge>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-orange-600">
                          {new Date(schedule.scheduled_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(schedule.scheduled_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {getStatusBadge(schedule.status)}
                      {product?.ai_confidence_score !== undefined && (
                        <Badge className={`${product.ai_confidence_score >= 80 ? 'bg-green-500' : product.ai_confidence_score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                          {product.ai_confidence_score}
                        </Badge>
                      )}
                      <div className="flex gap-2">
                        {(schedule.status === 'PENDING' || schedule.status === 'SCHEDULED') && (
                          <Button size="sm" variant="default" onClick={() => executeImmediately([schedule.id])}>
                            <PlayCircle className="w-4 h-4 mr-1" />即時実行
                          </Button>
                        )}
                        {schedule.status !== 'COMPLETED' && schedule.status !== 'CANCELLED' && (
                          <Button size="sm" variant="outline" onClick={() => cancelSchedules([schedule.id])}>
                            <XCircle className="w-4 h-4 mr-1" />キャンセル
                          </Button>
                        )}
                        {(schedule.status === 'CANCELLED' || schedule.status === 'ERROR') && (
                          <Button size="sm" variant="destructive" onClick={() => deleteSchedules([schedule.id])}>
                            <Trash2 className="w-4 h-4 mr-1" />削除
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {schedules.length === 0 && !loading && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>スケジュールがありません</p>
                  <p className="text-sm mt-2">承認ページで商品を承認してスケジュールを作成してください</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">出品戦略は承認ページで設定</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    マーケットプレイス・アカウント設定は承認ページの「承認・出品予約」ボタンから行います。
                    商品ごとに異なる出品戦略を設定できます。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>モール・アカウント設定（参考表示）</CardTitle>
                  <CardDescription>実際の設定は承認ページで行います</CardDescription>
                </div>
                <Button onClick={addMarketplace} size="sm" disabled><Plus className="mr-2 h-4 w-4" />追加</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.marketplaceAccounts.map((ma, idx) => (
                <Card key={idx} className="p-4 opacity-60">
                  <div className="space-y-4">
                    <div className="grid grid-cols-5 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">モール</Label>
                        <Input placeholder="ebay" value={ma.marketplace} disabled />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">アカウント</Label>
                        <Input placeholder="account1" value={ma.account} disabled />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">1日上限</Label>
                        <Input type="number" value={ma.dailyLimit} disabled />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">ランダム化</Label>
                        <div className="flex items-center h-10">
                          <Switch checked={ma.randomization.enabled} disabled />
                          <span className="ml-2 text-xs">{ma.randomization.enabled ? 'ON' : 'OFF'}</span>
                        </div>
                      </div>
                      <div className="flex items-end gap-2">
                        <Switch checked={ma.enabled} disabled />
                        <Button variant="destructive" size="sm" disabled><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="category" className="space-y-4">
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">カテゴリ分散設定について</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    この機能は将来実装予定です。現在は承認ページの出品戦略コントロールでスケジュール設定を行ってください。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
