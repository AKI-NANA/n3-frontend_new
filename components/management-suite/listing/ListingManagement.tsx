'use client'

import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Upload,
  Download,
  Calendar,
  Clock,
  Globe,
  Package,
  DollarSign,
  Image as ImageIcon,
  FileText,
  Zap,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  Send,
  Save
} from 'lucide-react'
import { DataTable } from '../shared/DataTable'
import { FileUploader } from '../shared/FileUploader'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// 型定義
interface ListingItem {
  id: string
  sku: string
  title: string
  platform: 'ebay' | 'yahoo' | 'mercari' | 'rakuten'
  status: 'draft' | 'scheduled' | 'active' | 'ended' | 'error'
  price: number
  quantity: number
  category: string
  scheduled_time?: string
  listed_time?: string
  views?: number
  watchers?: number
  bids?: number
  images: string[]
  description: string
  condition: string
  shipping_method: string
  item_specifics?: Record<string, string>
}

interface Template {
  id: string
  name: string
  platform: string
  category: string
  shipping_method: string
  return_policy: string
  payment_methods: string[]
  template_data: Record<string, any>
}

interface ScheduleJob {
  id: string
  name: string
  items: string[]
  scheduled_time: string
  recurrence?: 'once' | 'daily' | 'weekly' | 'monthly'
  status: 'pending' | 'running' | 'completed' | 'failed'
  last_run?: string
  next_run?: string
}

export function ListingManagement() {
  // 状態管理
  const [activeTab, setActiveTab] = useState('listings')
  const [listings, setListings] = useState<ListingItem[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [scheduleJobs, setScheduleJobs] = useState<ScheduleJob[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ListingItem | null>(null)
  
  // 統計データ
  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    scheduled: 0,
    draft: 0,
    revenue: 0,
    platforms: {
      ebay: 0,
      yahoo: 0,
      mercari: 0,
      rakuten: 0
    }
  })

  // データ取得
  useEffect(() => {
    fetchListings()
    fetchTemplates()
    fetchScheduleJobs()
    fetchStatistics()
  }, [])

  const fetchListings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/listing')
      if (response.ok) {
        const data = await response.json()
        setListings(data.listings || [])
      }
    } catch (error) {
      console.error('出品データ取得エラー:', error)
      // モックデータ
      setListings(generateMockListings())
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/listing/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      // モックテンプレート
      setTemplates(generateMockTemplates())
    }
  }

  const fetchScheduleJobs = async () => {
    try {
      const response = await fetch('/api/listing/schedule')
      if (response.ok) {
        const data = await response.json()
        setScheduleJobs(data.jobs || [])
      }
    } catch (error) {
      // モックスケジュール
      setScheduleJobs(generateMockScheduleJobs())
    }
  }

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/listing/statistics')
      if (response.ok) {
        const data = await response.json()
        setStatistics(data)
      }
    } catch (error) {
      // モック統計
      setStatistics({
        total: 1234,
        active: 856,
        scheduled: 234,
        draft: 144,
        revenue: 458960,
        platforms: {
          ebay: 456,
          yahoo: 389,
          mercari: 234,
          rakuten: 155
        }
      })
    }
  }

  // モックデータ生成
  const generateMockListings = (): ListingItem[] => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: `item-${i + 1}`,
      sku: `SKU-${1000 + i}`,
      title: `テスト商品 ${i + 1} - 高品質アイテム`,
      platform: ['ebay', 'yahoo', 'mercari', 'rakuten'][Math.floor(Math.random() * 4)] as any,
      status: ['draft', 'scheduled', 'active', 'ended'][Math.floor(Math.random() * 4)] as any,
      price: Math.floor(Math.random() * 10000) + 1000,
      quantity: Math.floor(Math.random() * 50) + 1,
      category: ['Electronics', 'Fashion', 'Home', 'Sports'][Math.floor(Math.random() * 4)],
      scheduled_time: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      views: Math.floor(Math.random() * 1000),
      watchers: Math.floor(Math.random() * 100),
      bids: Math.floor(Math.random() * 20),
      images: [`image${i + 1}.jpg`],
      description: `これは商品${i + 1}の説明文です。`,
      condition: ['New', 'Used - Like New', 'Used - Good'][Math.floor(Math.random() * 3)],
      shipping_method: ['Free Shipping', 'Standard', 'Express'][Math.floor(Math.random() * 3)]
    }))
  }

  const generateMockTemplates = (): Template[] => {
    return [
      {
        id: 'template-1',
        name: 'eBay標準テンプレート',
        platform: 'ebay',
        category: 'Electronics',
        shipping_method: 'Free Shipping',
        return_policy: '30 days',
        payment_methods: ['PayPal', 'Credit Card'],
        template_data: {}
      },
      {
        id: 'template-2',
        name: 'Yahoo!オークション用',
        platform: 'yahoo',
        category: 'ファッション',
        shipping_method: '送料込み',
        return_policy: '返品不可',
        payment_methods: ['Yahoo!かんたん決済'],
        template_data: {}
      }
    ]
  }

  const generateMockScheduleJobs = (): ScheduleJob[] => {
    return [
      {
        id: 'job-1',
        name: '毎日の自動出品',
        items: ['item-1', 'item-2', 'item-3'],
        scheduled_time: '09:00',
        recurrence: 'daily',
        status: 'pending',
        next_run: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'job-2',
        name: '週末セール出品',
        items: ['item-4', 'item-5'],
        scheduled_time: '20:00',
        recurrence: 'weekly',
        status: 'completed',
        last_run: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  }

  // 出品テーブルのカラム定義
  const listingColumns = [
    {
      key: 'sku',
      label: 'SKU',
      sortable: true,
      width: '100px'
    },
    {
      key: 'title',
      label: '商品名',
      sortable: true,
      render: (value: string, row: ListingItem) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{value}</span>
          {row.images.length > 0 && <ImageIcon className="h-4 w-4 text-muted-foreground" />}
        </div>
      )
    },
    {
      key: 'platform',
      label: 'プラットフォーム',
      sortable: true,
      width: '120px',
      render: (value: string) => (
        <Badge variant="outline">
          {value.toUpperCase()}
        </Badge>
      )
    },
    {
      key: 'status',
      label: 'ステータス',
      sortable: true,
      width: '100px',
      render: (value: string) => {
        const statusConfig = {
          draft: { label: '下書き', variant: 'outline' as const, icon: FileText },
          scheduled: { label: '予約', variant: 'secondary' as const, icon: Clock },
          active: { label: '出品中', variant: 'default' as const, icon: CheckCircle },
          ended: { label: '終了', variant: 'outline' as const, icon: XCircle },
          error: { label: 'エラー', variant: 'destructive' as const, icon: AlertCircle }
        }
        const config = statusConfig[value as keyof typeof statusConfig]
        const Icon = config?.icon || FileText
        return (
          <Badge variant={config?.variant}>
            <Icon className="h-3 w-3 mr-1" />
            {config?.label || value}
          </Badge>
        )
      }
    },
    {
      key: 'price',
      label: '価格',
      sortable: true,
      width: '100px',
      render: (value: number) => `¥${value.toLocaleString()}`
    },
    {
      key: 'quantity',
      label: '在庫',
      sortable: true,
      width: '80px'
    },
    {
      key: 'views',
      label: '閲覧',
      sortable: true,
      width: '80px',
      render: (value: number) => value?.toLocaleString() || '-'
    },
    {
      key: 'actions',
      label: '操作',
      width: '120px',
      render: (_: any, row: ListingItem) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(row)}
            title="編集"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDuplicate(row)}
            title="複製"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleView(row)}
            title="詳細"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  // ハンドラー
  const handleEdit = (item: ListingItem) => {
    setEditingItem(item)
    setIsCreateDialogOpen(true)
  }

  const handleDuplicate = async (item: ListingItem) => {
    const duplicated = {
      ...item,
      id: `item-${Date.now()}`,
      sku: `${item.sku}-COPY`,
      title: `${item.title} (コピー)`,
      status: 'draft' as const
    }
    setListings([duplicated, ...listings])
  }

  const handleView = (item: ListingItem) => {
    window.open(`/listing/preview/${item.id}`, '_blank')
  }

  const handleBulkAction = async (action: string) => {
    if (selectedItems.length === 0) {
      alert('アイテムを選択してください')
      return
    }

    switch (action) {
      case 'activate':
        // 一括出品
        console.log('一括出品:', selectedItems)
        break
      case 'schedule':
        setIsScheduleDialogOpen(true)
        break
      case 'delete':
        if (confirm(`${selectedItems.length}件のアイテムを削除しますか？`)) {
          setListings(listings.filter(l => !selectedItems.includes(l.id)))
          setSelectedItems([])
        }
        break
    }
  }

  const handleGenerateCSV = () => {
    const csv = convertToCSV(listings)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `listings_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
  }

  const handleImportCSV = async (files: File[]) => {
    const file = files[0]
    if (!file) return

    const text = await file.text()
    // CSVパース処理
    console.log('CSV インポート:', text)
    fetchListings()
  }

  const convertToCSV = (data: ListingItem[]) => {
    const headers = ['SKU', 'Title', 'Platform', 'Status', 'Price', 'Quantity', 'Category']
    const rows = data.map(item => [
      item.sku,
      item.title,
      item.platform,
      item.status,
      item.price,
      item.quantity,
      item.category
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* ヘッダー */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">出品管理システム</h1>
              <p className="text-muted-foreground mt-2">
                マルチプラットフォーム対応の統合出品管理
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                新規出品
              </Button>
              <Button variant="outline" onClick={handleGenerateCSV}>
                <Download className="mr-2 h-4 w-4" />
                CSV生成
              </Button>
            </div>
          </div>

          {/* 統計カード */}
          <div className="grid grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">総出品数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.total}</div>
                <p className="text-xs text-muted-foreground">全プラットフォーム</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">出品中</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{statistics.active}</div>
                <p className="text-xs text-muted-foreground">アクティブ</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">予約済み</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{statistics.scheduled}</div>
                <p className="text-xs text-muted-foreground">スケジュール</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">下書き</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{statistics.draft}</div>
                <p className="text-xs text-muted-foreground">未公開</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">総売上</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">¥{statistics.revenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">今月</p>
              </CardContent>
            </Card>
          </div>

          {/* タブコンテンツ */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full max-w-lg">
              <TabsTrigger value="listings">出品一覧</TabsTrigger>
              <TabsTrigger value="templates">テンプレート</TabsTrigger>
              <TabsTrigger value="schedule">スケジュール</TabsTrigger>
              <TabsTrigger value="csv">CSV管理</TabsTrigger>
            </TabsList>

            <TabsContent value="listings" className="space-y-4">
              {/* 一括操作バー */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleBulkAction('activate')}
                        disabled={selectedItems.length === 0}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        一括出品
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleBulkAction('schedule')}
                        disabled={selectedItems.length === 0}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        スケジュール
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleBulkAction('delete')}
                        disabled={selectedItems.length === 0}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        削除
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedItems.length > 0 && `${selectedItems.length}件選択中`}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 出品リストテーブル */}
              <Card>
                <CardContent className="p-0">
                  <DataTable
                    data={listings}
                    columns={listingColumns}
                    loading={loading}
                    searchPlaceholder="SKU、商品名で検索..."
                    selectable
                    onSelectionChange={(selected) => setSelectedItems(selected.map(s => s.id))}
                    pageSize={25}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>出品テンプレート</CardTitle>
                  <CardDescription>
                    よく使う設定をテンプレートとして保存
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {templates.map(template => (
                      <Card key={template.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{template.name}</h4>
                            <Badge variant="outline">{template.platform}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            カテゴリ: {template.category}
                          </p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Edit className="mr-2 h-4 w-4" />
                              編集
                            </Button>
                            <Button size="sm">
                              使用する
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>自動出品スケジュール</CardTitle>
                  <CardDescription>
                    定期的な自動出品の設定
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {scheduleJobs.map(job => (
                      <Card key={job.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{job.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {job.items.length}件のアイテム • {job.recurrence === 'daily' ? '毎日' : job.recurrence === 'weekly' ? '毎週' : '毎月'} {job.scheduled_time}
                              </p>
                              {job.next_run && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  次回実行: {new Date(job.next_run).toLocaleString('ja-JP')}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={job.status === 'pending' ? 'outline' : job.status === 'running' ? 'default' : job.status === 'completed' ? 'secondary' : 'destructive'}>
                                {job.status}
                              </Badge>
                              <Button size="icon" variant="ghost">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost">
                                {job.status === 'running' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="csv" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>CSV一括処理</CardTitle>
                  <CardDescription>
                    CSVファイルで商品を一括登録・編集
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FileUploader
                    accept=".csv,.xlsx"
                    onUpload={handleImportCSV}
                    uploadText="CSVまたはExcelファイルをドラッグ&ドロップ"
                    maxSize={50}
                  />
                  
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">CSVフォーマット</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      以下の形式でCSVファイルを準備してください：
                    </p>
                    <div className="bg-background p-3 rounded border font-mono text-xs">
                      SKU,Title,Platform,Price,Quantity,Category,Description<br/>
                      SKU001,商品名1,ebay,10000,5,Electronics,商品説明<br/>
                      SKU002,商品名2,yahoo,15000,3,Fashion,商品説明
                    </div>
                    <Button size="sm" variant="outline" className="mt-3">
                      <Download className="mr-2 h-4 w-4" />
                      テンプレートダウンロード
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* 新規出品/編集ダイアログ */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? '出品編集' : '新規出品'}
                </DialogTitle>
                <DialogDescription>
                  商品情報を入力して出品を作成します
                </DialogDescription>
              </DialogHeader>
              
              <ListingForm
                initialData={editingItem}
                onSave={(data) => {
                  console.log('保存:', data)
                  setIsCreateDialogOpen(false)
                  setEditingItem(null)
                  fetchListings()
                }}
                onCancel={() => {
                  setIsCreateDialogOpen(false)
                  setEditingItem(null)
                }}
              />
            </DialogContent>
          </Dialog>

          {/* スケジュール設定ダイアログ */}
          <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>出品スケジュール設定</DialogTitle>
                <DialogDescription>
                  選択したアイテムの出品スケジュールを設定します
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label>出品日時</Label>
                  <Input type="datetime-local" />
                </div>
                
                <div>
                  <Label>繰り返し設定</Label>
                  <Select defaultValue="once">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">1回のみ</SelectItem>
                      <SelectItem value="daily">毎日</SelectItem>
                      <SelectItem value="weekly">毎週</SelectItem>
                      <SelectItem value="monthly">毎月</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
                    キャンセル
                  </Button>
                  <Button onClick={() => {
                    console.log('スケジュール設定:', selectedItems)
                    setIsScheduleDialogOpen(false)
                  }}>
                    設定
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}

// 出品フォームコンポーネント
function ListingForm({
  initialData,
  onSave,
  onCancel
}: {
  initialData: ListingItem | null
  onSave: (data: Partial<ListingItem>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    sku: initialData?.sku || '',
    title: initialData?.title || '',
    platform: initialData?.platform || 'ebay',
    price: initialData?.price || 0,
    quantity: initialData?.quantity || 1,
    category: initialData?.category || '',
    description: initialData?.description || '',
    condition: initialData?.condition || 'New',
    shipping_method: initialData?.shipping_method || 'Free Shipping'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sku">SKU</Label>
          <Input
            id="sku"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="platform">プラットフォーム</Label>
          <Select value={formData.platform} onValueChange={(value) => setFormData({ ...formData, platform: value as any })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ebay">eBay</SelectItem>
              <SelectItem value="yahoo">Yahoo!オークション</SelectItem>
              <SelectItem value="mercari">メルカリ</SelectItem>
              <SelectItem value="rakuten">楽天</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label htmlFor="title">商品名</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="price">価格</Label>
          <Input
            id="price"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="quantity">数量</Label>
          <Input
            id="quantity"
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="condition">状態</Label>
          <Select value={formData.condition} onValueChange={(value) => setFormData({ ...formData, condition: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="New">新品</SelectItem>
              <SelectItem value="Used - Like New">中古 - ほぼ新品</SelectItem>
              <SelectItem value="Used - Good">中古 - 良い</SelectItem>
              <SelectItem value="Used - Acceptable">中古 - 可</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label htmlFor="description">商品説明</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={5}
          required
        />
      </div>
      
      <div>
        <Label>画像アップロード</Label>
        <FileUploader
          accept=".jpg,.jpeg,.png,.webp"
          multiple
          maxSize={5}
          onUpload={(files) => console.log('画像アップロード:', files)}
          uploadText="商品画像をドラッグ&ドロップ"
        />
      </div>
      
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit">
          <Save className="mr-2 h-4 w-4" />
          保存
        </Button>
      </DialogFooter>
    </form>
  )
}
