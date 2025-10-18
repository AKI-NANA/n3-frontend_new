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
  Shield, 
  Ban, 
  Globe, 
  ShoppingBag, 
  AlertTriangle,
  Plus,
  Save,
  Trash2,
  Edit,
  Check,
  X,
  Download,
  Upload,
  Search,
  Filter as FilterIcon
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
interface FilterItem {
  id: number
  keyword: string
  type: string
  reason: string
  created_at: string
  updated_at: string
  is_active: boolean
  priority: number
  notes?: string
}

interface FilterStatistics {
  total: number
  active: number
  inactive: number
  by_type: Record<string, number>
}

// フィルタータイプ定義
const FILTER_TYPES = {
  patent: {
    id: 'patent',
    label: 'パテントトロール',
    icon: Shield,
    description: '特許侵害リスクのあるキーワード',
    color: 'text-red-600'
  },
  export: {
    id: 'export',
    label: '輸出禁止',
    icon: Ban,
    description: '輸出が制限されている商品',
    color: 'text-orange-600'
  },
  country: {
    id: 'country',
    label: '国別禁止',
    icon: Globe,
    description: '特定の国で禁止されている商品',
    color: 'text-yellow-600'
  },
  mall: {
    id: 'mall',
    label: 'モール別禁止',
    icon: ShoppingBag,
    description: 'プラットフォーム固有の禁止商品',
    color: 'text-blue-600'
  },
  vero: {
    id: 'vero',
    label: 'VERO禁止',
    icon: AlertTriangle,
    description: 'eBay知的財産権保護プログラム',
    color: 'text-purple-600'
  }
}

export function FilterManagement() {
  // 状態管理
  const [activeTab, setActiveTab] = useState('patent')
  const [filters, setFilters] = useState<FilterItem[]>([])
  const [loading, setLoading] = useState(false)
  const [statistics, setStatistics] = useState<FilterStatistics>({
    total: 0,
    active: 0,
    inactive: 0,
    by_type: {}
  })
  const [editingItem, setEditingItem] = useState<FilterItem | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // データ取得
  useEffect(() => {
    fetchFilters(activeTab)
    fetchStatistics()
  }, [activeTab])

  const fetchFilters = async (type: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/filters?type=${type}`)
      if (response.ok) {
        const data = await response.json()
        setFilters(data.filters || [])
      }
    } catch (error) {
      console.error('フィルター取得エラー:', error)
      // モックデータ
      setFilters(generateMockFilters(type))
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/filters/statistics')
      if (response.ok) {
        const data = await response.json()
        setStatistics(data)
      }
    } catch (error) {
      // モック統計
      setStatistics({
        total: 1234,
        active: 1089,
        inactive: 145,
        by_type: {
          patent: 456,
          export: 234,
          country: 189,
          mall: 267,
          vero: 88
        }
      })
    }
  }

  // モックデータ生成
  const generateMockFilters = (type: string): FilterItem[] => {
    const mockKeywords = {
      patent: ['Apple', 'Samsung', 'Sony', 'Microsoft', 'Nintendo'],
      export: ['武器', '薬品', '危険物', 'ドローン', '暗号化'],
      country: ['象牙', 'ワシントン条約', '文化財', '医薬品', '食品'],
      mall: ['偽ブランド', 'コピー品', '海賊版', '非正規品', '転売'],
      vero: ['Louis Vuitton', 'Chanel', 'Rolex', 'Nike', 'Adidas']
    }

    return (mockKeywords[type as keyof typeof mockKeywords] || []).map((keyword, index) => ({
      id: index + 1,
      keyword,
      type,
      reason: `${FILTER_TYPES[type as keyof typeof FILTER_TYPES].label}に該当`,
      created_at: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
      updated_at: new Date().toISOString(),
      is_active: Math.random() > 0.2,
      priority: Math.floor(Math.random() * 10) + 1,
      notes: `自動生成されたフィルター項目 #${index + 1}`
    }))
  }

  // テーブルカラム定義
  const columns = [
    {
      key: 'keyword',
      label: 'キーワード',
      sortable: true,
      render: (value: string) => (
        <span className="font-medium">{value}</span>
      )
    },
    {
      key: 'reason',
      label: '理由',
      sortable: true
    },
    {
      key: 'priority',
      label: '優先度',
      sortable: true,
      width: '100px',
      render: (value: number) => (
        <Badge variant={value > 7 ? 'destructive' : value > 4 ? 'default' : 'secondary'}>
          {value}
        </Badge>
      )
    },
    {
      key: 'is_active',
      label: 'ステータス',
      sortable: true,
      width: '120px',
      render: (value: boolean) => (
        <Badge variant={value ? 'default' : 'outline'}>
          {value ? '有効' : '無効'}
        </Badge>
      )
    },
    {
      key: 'updated_at',
      label: '更新日',
      sortable: true,
      width: '150px',
      render: (value: string) => new Date(value).toLocaleDateString('ja-JP')
    },
    {
      key: 'actions',
      label: '操作',
      width: '100px',
      render: (_: any, row: FilterItem) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(row.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  // ハンドラー
  const handleEdit = (item: FilterItem) => {
    setEditingItem(item)
    setIsAddDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('このフィルターを削除しますか？')) return

    try {
      await fetch(`/api/filters/${id}`, { method: 'DELETE' })
      fetchFilters(activeTab)
    } catch (error) {
      console.error('削除エラー:', error)
    }
  }

  const handleSave = async (data: Partial<FilterItem>) => {
    try {
      const url = editingItem 
        ? `/api/filters/${editingItem.id}`
        : '/api/filters'
      
      const method = editingItem ? 'PUT' : 'POST'
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, type: activeTab })
      })

      setIsAddDialogOpen(false)
      setEditingItem(null)
      fetchFilters(activeTab)
    } catch (error) {
      console.error('保存エラー:', error)
    }
  }

  const handleExport = async () => {
    const csv = convertToCSV(filters)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `filters_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
  }

  const handleImport = async (files: File[]) => {
    const file = files[0]
    if (!file) return

    const text = await file.text()
    // CSVパース処理
    console.log('インポート処理:', text)
    fetchFilters(activeTab)
  }

  const convertToCSV = (data: FilterItem[]) => {
    const headers = ['キーワード', '理由', '優先度', 'ステータス', 'メモ']
    const rows = data.map(item => [
      item.keyword,
      item.reason,
      item.priority,
      item.is_active ? '有効' : '無効',
      item.notes || ''
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  const CurrentIcon = FILTER_TYPES[activeTab as keyof typeof FILTER_TYPES]?.icon || Shield

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">フィルター管理システム</h1>
          <p className="text-muted-foreground mt-2">
            5段階フィルターで不適切な商品を自動除外
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新規追加
          </Button>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">総フィルター数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">有効</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statistics.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">無効</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">{statistics.inactive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">最終更新</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">{new Date().toLocaleDateString('ja-JP')}</div>
          </CardContent>
        </Card>
      </div>

      {/* タブとコンテンツ */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          {Object.entries(FILTER_TYPES).map(([key, config]) => {
            const Icon = config.icon
            return (
              <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{config.label}</span>
                <Badge variant="outline" className="ml-2">
                  {statistics.by_type[key] || 0}
                </Badge>
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CurrentIcon className={`h-6 w-6 ${FILTER_TYPES[activeTab as keyof typeof FILTER_TYPES]?.color}`} />
                  <div>
                    <CardTitle>{FILTER_TYPES[activeTab as keyof typeof FILTER_TYPES]?.label}</CardTitle>
                    <CardDescription>
                      {FILTER_TYPES[activeTab as keyof typeof FILTER_TYPES]?.description}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={filters}
                columns={columns}
                loading={loading}
                searchPlaceholder="キーワードを検索..."
                onExport={handleExport}
                selectable
                pageSize={25}
              />
            </CardContent>
          </Card>

          {/* CSV インポート */}
          <Card>
            <CardHeader>
              <CardTitle>CSVインポート</CardTitle>
              <CardDescription>
                CSVファイルから一括でフィルターを追加
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploader
                accept=".csv"
                onUpload={handleImport}
                uploadText="CSVファイルをドラッグ&ドロップまたは選択"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 追加/編集ダイアログ */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'フィルター編集' : '新規フィルター追加'}
            </DialogTitle>
            <DialogDescription>
              フィルター情報を入力してください
            </DialogDescription>
          </DialogHeader>
          
          <FilterForm
            initialData={editingItem}
            onSave={handleSave}
            onCancel={() => {
              setIsAddDialogOpen(false)
              setEditingItem(null)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// フィルターフォームコンポーネント
function FilterForm({
  initialData,
  onSave,
  onCancel
}: {
  initialData: FilterItem | null
  onSave: (data: Partial<FilterItem>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    keyword: initialData?.keyword || '',
    reason: initialData?.reason || '',
    priority: initialData?.priority || 5,
    is_active: initialData?.is_active ?? true,
    notes: initialData?.notes || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="keyword">キーワード</Label>
        <Input
          id="keyword"
          value={formData.keyword}
          onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="reason">理由</Label>
        <Input
          id="reason"
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="priority">優先度 (1-10)</Label>
        <Input
          id="priority"
          type="number"
          min="1"
          max="10"
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
        />
      </div>
      
      <div>
        <Label htmlFor="notes">メモ</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="rounded border-input"
        />
        <Label htmlFor="is_active">有効にする</Label>
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
