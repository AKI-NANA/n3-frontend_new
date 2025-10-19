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
  PlayCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SmartScheduleGenerator, saveSchedulesToDatabase, type ScheduleSettings, type MarketplaceSettings } from '@/lib/smart-scheduler'

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
  const [readyProducts, setReadyProducts] = useState<any[]>([])
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
    marketplaceAccounts: DEFAULT_MARKETPLACE_SETTINGS
  })

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [currentPage, filters])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)
      
      let query = supabase
        .from('yahoo_scraped_products')
        .select('*', { count: 'exact' })
        .eq('status', 'ready_to_list')

      if (filters.minScore > 0) query = query.gte('ai_confidence_score', filters.minScore)
      if (filters.maxScore < 100) query = query.lte('ai_confidence_score', filters.maxScore)
      if (filters.minPrice > 0) query = query.gte('price_jpy', filters.minPrice)
      if (filters.maxPrice < 100000) query = query.lte('price_jpy', filters.maxPrice)
      if (filters.priority !== 'all') query = query.eq('listing_priority', filters.priority)
      if (filters.search) query = query.ilike('title', `%${filters.search}%`)
      if (filters.scheduledDateFrom) query = query.gte('scheduled_listing_date', filters.scheduledDateFrom)
      if (filters.scheduledDateTo) query = query.lte('scheduled_listing_date', filters.scheduledDateTo)
      
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      
      const { data: products, error: productsError, count } = await query
        .order('scheduled_listing_date', { ascending: true, nullsFirst: false })
        .order('ai_confidence_score', { ascending: false, nullsFirst: false })
        .range(from, to)

      if (productsError) {
        setError(`商品取得エラー: ${productsError.message}`)
      } else {
        setReadyProducts(products || [])
        setTotalCount(count || 0)
      }
      
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('listing_schedules')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('scheduled_time', { ascending: true })

      if (schedulesError) {
        console.error('スケジュール取得エラー:', schedulesError)
      } else {
        setSchedules(schedulesData || [])
      }
      
    } catch (error: any) {
      setError(`データ取得エラー: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function generateSchedule() {
    if (totalCount === 0) {
      alert('出品待ち商品がありません')
      return
    }
    
    if (!confirm(`${totalCount}件の商品でスケジュールを生成しますか?\n既存のスケジュールは削除されます。`)) {
      return
    }
    
    try {
      setGenerating(true)
      setError(null)
      
      const { data: allProducts } = await supabase
        .from('yahoo_scraped_products')
        .select('*')
        .eq('status', 'ready_to_list')
        .order('ai_confidence_score', { ascending: false, nullsFirst: false })
      
      if (!allProducts || allProducts.length === 0) {
        alert('商品が見つかりません')
        return
      }
      
      const generator = new SmartScheduleGenerator(settings)
      const startDate = new Date()
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 2, 0)
      
      const sessions = generator.generateMonthlySchedule(allProducts, startDate, endDate)
      
      await saveSchedulesToDatabase(sessions, supabase)
      
      alert(`✅ スケジュールを生成しました！\n・セッション数: ${sessions.length}\n・商品数: ${allProducts.length}`)
      
      await loadData()
      
    } catch (error: any) {
      setError(`スケジュール生成エラー: ${error.message}`)
      alert(`スケジュール生成に失敗しました: ${error.message}`)
    } finally {
      setGenerating(false)
    }
  }

  async function listNow(date: string, marketplace: string, account: string) {
    if (!confirm(`${date}の${marketplace} (${account})の商品を今すぐ出品しますか？`)) {
      return
    }
    
    try {
      const response = await fetch('/api/listing/now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, marketplace, account })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        alert(`✅ 出品完了\n成功: ${result.success}件\n失敗: ${result.failed}件`)
        await loadData()
      } else {
        alert(`❌ 出品失敗: ${result.error}`)
      }
    } catch (error: any) {
      alert(`❌ エラー: ${error.message}`)
    }
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
    ready: totalCount,
    avgScore: readyProducts.length > 0 
      ? Math.round(readyProducts.reduce((sum, p) => sum + (p.ai_confidence_score || 0), 0) / readyProducts.length)
      : 0,
    highScore: readyProducts.filter(p => (p.ai_confidence_score || 0) >= 80).length,
    mediumScore: readyProducts.filter(p => (p.ai_confidence_score || 0) >= 50 && (p.ai_confidence_score || 0) < 80).length,
    lowScore: readyProducts.filter(p => (p.ai_confidence_score || 0) < 50).length,
    scheduledSessions: schedules.length,
    scheduledProducts: schedules.reduce((sum, s) => sum + (s.planned_count || 0), 0)
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  const monthName = currentMonth.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })

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
      const daySessions = schedules.filter(s => s.date === dateStr)
      calendarDays.push({ date, sessions: daySessions })
    }
    return calendarDays
  }

  const calendarDays = generateCalendarGrid()
  const weekDays = ['日', '月', '火', '水', '木', '金', '土']
  const upcomingSchedule = schedules.filter(s => new Date(s.scheduled_time) >= new Date())

  const marketplaceStats = settings.marketplaceAccounts.filter(ma => ma.enabled).map(ma => {
    const sessions = schedules.filter(s => s.marketplace === ma.marketplace && s.account === ma.account)
    return {
      ...ma,
      sessions: sessions.length,
      products: sessions.reduce((sum, s) => sum + (s.planned_count || 0), 0)
    }
  })

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
          <Button onClick={generateSchedule} disabled={generating || totalCount === 0} className="bg-purple-600 hover:bg-purple-700">
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
            <div className="text-3xl font-bold text-blue-600">{stats.ready.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">全{totalCount.toLocaleString()}件中</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">スケジュール済み</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.scheduledProducts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.scheduledSessions}セッション</p>
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
                <span className="text-green-600">高 (80+)</span><span className="font-bold">{stats.highScore}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-yellow-600">中 (50-79)</span><span className="font-bold">{stats.mediumScore}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-600">低 (0-49)</span><span className="font-bold">{stats.lowScore}</span>
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
                  {new Date(upcomingSchedule[0].scheduled_time).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(upcomingSchedule[0].scheduled_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} - {upcomingSchedule[0].planned_count}件
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
                  const totalItems = sessions.reduce((sum, s) => sum + (s.planned_count || 0), 0)
                  const avgScore = sessions.length > 0 ? Math.round(sessions.reduce((sum, s) => sum + (s.avg_ai_score || 0), 0) / sessions.length) : 0
                  const status = sessions[0]?.status
                  const dateStr = date.toISOString().split('T')[0]
                  
                  return (
                    <Card key={date.toISOString()} className={`aspect-square p-2 ${isToday ? 'ring-2 ring-primary' : ''} ${totalItems === 0 ? 'opacity-50' : ''}`}>
                      <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-bold ${isToday ? 'text-primary' : ''}`}>{date.getDate()}</span>
                          {status === 'completed' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                          {status === 'in_progress' && <Clock className="w-3 h-3 text-orange-500" />}
                        </div>
                        {totalItems > 0 && (
                          <div className="space-y-1 text-xs flex-1">
                            <div className="font-semibold text-blue-600">{totalItems}件</div>
                            {avgScore > 0 && <div className={`text-[10px] ${avgScore >= 80 ? 'text-green-600' : avgScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>スコア: {avgScore}</div>}
                            {sessions.slice(0, 1).map((session, i) => (
                              <div key={i} className="text-[10px] text-muted-foreground truncate">
                                {new Date(session.scheduled_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} {session.marketplace}
                              </div>
                            ))}
                            {sessions.length > 1 && <div className="text-[10px] text-muted-foreground">+{sessions.length - 1}件</div>}
                          </div>
                        )}
                        {totalItems > 0 && status === 'pending' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-6 text-[10px] mt-auto"
                            onClick={() => {
                              const session = sessions[0]
                              listNow(dateStr, session.marketplace, session.account)
                            }}
                          >
                            <PlayCircle className="w-3 h-3 mr-1" />
                            今すぐ出品
                          </Button>
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
              <div className="grid grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>検索</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="商品名" className="pl-8" value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>優先度</Label>
                  <Select value={filters.priority} onValueChange={(v) => setFilters({...filters, priority: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="high">高</SelectItem>
                      <SelectItem value="medium">中</SelectItem>
                      <SelectItem value="low">低</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>AIスコア</Label>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="最小" value={filters.minScore} onChange={(e) => setFilters({...filters, minScore: parseInt(e.target.value) || 0})} />
                    <Input type="number" placeholder="最大" value={filters.maxScore} onChange={(e) => setFilters({...filters, maxScore: parseInt(e.target.value) || 100})} />
                  </div>
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
                <Button variant="outline" size="sm" onClick={() => setFilters({ minScore: 0, maxScore: 100, minPrice: 0, maxPrice: 100000, priority: 'all', marketplace: 'all', search: '', scheduledDateFrom: '', scheduledDateTo: '' })}>リセット</Button>
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
                {readyProducts.map(product => (
                  <div key={product.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent">
                    <div className="flex-1">
                      <h4 className="font-medium line-clamp-1">{product.title}</h4>
                      <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                    </div>
                    {product.scheduled_listing_date && (
                      <div className="text-sm">
                        <div className="font-medium text-orange-600">
                          {new Date(product.scheduled_listing_date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(product.scheduled_listing_date).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    )}
                    <Badge className={`${(product.ai_confidence_score || 0) >= 80 ? 'bg-green-500' : (product.ai_confidence_score || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                      {product.ai_confidence_score || 0}
                    </Badge>
                    <Badge variant="outline">{product.listing_priority || 'medium'}</Badge>
                    <div className="text-right">
                      <div className="text-sm font-medium">¥{product.price_jpy?.toLocaleString() || '---'}</div>
                      <div className="text-xs text-muted-foreground">${product.price_usd?.toFixed(2) || '---'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>モール・アカウント設定</CardTitle>
                  <CardDescription>各モールごとにランダム化設定を個別に管理</CardDescription>
                </div>
                <Button onClick={addMarketplace} size="sm"><Plus className="mr-2 h-4 w-4" />追加</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.marketplaceAccounts.map((ma, idx) => (
                <Card key={idx} className="p-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-5 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">モール</Label>
                        <Input placeholder="ebay" value={ma.marketplace} onChange={(e) => updateMarketplace(idx, { marketplace: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">アカウント</Label>
                        <Input placeholder="account1" value={ma.account} onChange={(e) => updateMarketplace(idx, { account: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">1日上限</Label>
                        <Input type="number" value={ma.dailyLimit} onChange={(e) => updateMarketplace(idx, { dailyLimit: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">ランダム化</Label>
                        <div className="flex items-center h-10">
                          <Switch checked={ma.randomization.enabled} onCheckedChange={(checked) => updateMarketplace(idx, { randomization: { ...ma.randomization, enabled: checked } })} />
                          <span className="ml-2 text-xs">{ma.randomization.enabled ? 'ON' : 'OFF'}</span>
                        </div>
                      </div>
                      <div className="flex items-end gap-2">
                        <Switch checked={ma.enabled} onCheckedChange={(checked) => updateMarketplace(idx, { enabled: checked })} />
                        <Button variant="destructive" size="sm" onClick={() => removeMarketplace(idx)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    
                    {ma.randomization.enabled && (
                      <div className="grid grid-cols-3 gap-4 pl-4 border-l-2">
                        <div className="space-y-2">
                          <Label className="text-xs">セッション回数/日</Label>
                          <div className="flex gap-2">
                            <Input type="number" placeholder="最小" value={ma.randomization.sessionsPerDay.min} onChange={(e) => updateMarketplace(idx, { randomization: { ...ma.randomization, sessionsPerDay: { ...ma.randomization.sessionsPerDay, min: parseInt(e.target.value) || 1 } } })} />
                            <Input type="number" placeholder="最大" value={ma.randomization.sessionsPerDay.max} onChange={(e) => updateMarketplace(idx, { randomization: { ...ma.randomization, sessionsPerDay: { ...ma.randomization.sessionsPerDay, max: parseInt(e.target.value) || 1 } } })} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">時刻ランダム幅（分）</Label>
                          <Input type="number" value={ma.randomization.timeRandomization.range} onChange={(e) => updateMarketplace(idx, { randomization: { ...ma.randomization, timeRandomization: { ...ma.randomization.timeRandomization, range: parseInt(e.target.value) || 0 } } })} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">商品間間隔（秒）</Label>
                          <div className="flex gap-2">
                            <Input type="number" placeholder="最小" value={ma.randomization.itemInterval.min} onChange={(e) => updateMarketplace(idx, { randomization: { ...ma.randomization, itemInterval: { ...ma.randomization.itemInterval, min: parseInt(e.target.value) || 1 } } })} />
                            <Input type="number" placeholder="最大" value={ma.randomization.itemInterval.max} onChange={(e) => updateMarketplace(idx, { randomization: { ...ma.randomization, itemInterval: { ...ma.randomization.itemInterval, max: parseInt(e.target.value) || 1 } } })} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>全体上限設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>1日の最小/最大</Label>
                  <div className="flex gap-2">
                    <Input type="number" value={settings.limits.dailyMin} onChange={(e) => setSettings({...settings, limits: {...settings.limits, dailyMin: parseInt(e.target.value) || 0}})} />
                    <Input type="number" value={settings.limits.dailyMax} onChange={(e) => setSettings({...settings, limits: {...settings.limits, dailyMax: parseInt(e.target.value) || 0}})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>1週間の最小/最大</Label>
                  <div className="flex gap-2">
                    <Input type="number" value={settings.limits.weeklyMin} onChange={(e) => setSettings({...settings, limits: {...settings.limits, weeklyMin: parseInt(e.target.value) || 0}})} />
                    <Input type="number" value={settings.limits.weeklyMax} onChange={(e) => setSettings({...settings, limits: {...settings.limits, weeklyMax: parseInt(e.target.value) || 0}})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>1ヶ月の上限</Label>
                  <Input type="number" value={settings.limits.monthlyMax} onChange={(e) => setSettings({...settings, limits: {...settings.limits, monthlyMax: parseInt(e.target.value) || 0}})} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
