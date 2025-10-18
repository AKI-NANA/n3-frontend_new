"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Shield, Ban, Globe, Store, AlertTriangle,
  Search, Download, Upload, Plus, Trash2,
  Edit, Check, X
} from "lucide-react"
import { createClient } from '@supabase/supabase-js'
import VeROManagementTab from '@/components/filter/VeROManagementTab'

// フィルタータイプの定義
type FilterType = "PATENT" | "EXPORT" | "MALL" | "VERO"

interface FilterItem {
  id: string
  keyword: string
  type: FilterType
  priority: string
  category?: string
  mall_name?: string
  is_active: boolean
  detection_count: number
  description?: string
  created_at: string
  updated_at: string
}

export default function FilterManagementPage() {
  const [filters, setFilters] = useState<FilterItem[]>([])
  const [selectedTab, setSelectedTab] = useState<FilterType>("PATENT")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newFilterValue, setNewFilterValue] = useState("")
  const [newFilterNotes, setNewFilterNotes] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // タブ設定
  const tabs = [
    { id: "PATENT" as FilterType, label: "パテントトロール", icon: Shield, color: "text-blue-500" },
    { id: "EXPORT" as FilterType, label: "輸出禁止", icon: Ban, color: "text-red-500" },
    { id: "MALL" as FilterType, label: "モール別禁止", icon: Store, color: "text-purple-500" },
    { id: "VERO" as FilterType, label: "VERO禁止", icon: AlertTriangle, color: "text-orange-500" },
  ]

  // データベースからフィルターを取得
  const fetchFilters = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('filter_keywords')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setFilters(data || [])
    } catch (error) {
      console.error('Error fetching filters:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFilters()
  }, [])

  // フィルターされたアイテムを取得
  const filteredItems = filters.filter(item => {
    if (item.type !== selectedTab) return false
    if (searchQuery && !item.keyword.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // 新規フィルター追加
  const handleAddFilter = async () => {
    if (!newFilterValue) return

    try {
      const { data, error } = await supabase
        .from('filter_keywords')
        .insert([
          {
            keyword: newFilterValue,
            type: selectedTab,
            priority: 'MEDIUM',
            is_active: true,
            description: newFilterNotes,
            detection_count: 0
          }
        ])
        .select()

      if (error) throw error

      await fetchFilters()
      setNewFilterValue("")
      setNewFilterNotes("")
      setIsAddingNew(false)
    } catch (error) {
      console.error('Error adding filter:', error)
      alert('フィルターの追加に失敗しました')
    }
  }

  // フィルター削除
  const handleDeleteFilter = async (id: string) => {
    try {
      const { error } = await supabase
        .from('filter_keywords')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchFilters()
      setSelectedItems(selectedItems.filter(item => item !== id))
    } catch (error) {
      console.error('Error deleting filter:', error)
      alert('フィルターの削除に失敗しました')
    }
  }

  // 一括削除
  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase
        .from('filter_keywords')
        .delete()
        .in('id', selectedItems)

      if (error) throw error

      await fetchFilters()
      setSelectedItems([])
    } catch (error) {
      console.error('Error bulk deleting filters:', error)
      alert('一括削除に失敗しました')
    }
  }

  // CSVエクスポート
  const handleExportCSV = () => {
    const csvContent = [
      ["ID", "キーワード", "タイプ", "優先度", "ステータス", "検出回数", "作成日", "更新日", "備考"],
      ...filteredItems.map(item => [
        item.id,
        item.keyword,
        item.type,
        item.priority,
        item.is_active ? "有効" : "無効",
        item.detection_count,
        item.created_at,
        item.updated_at,
        item.description || ""
      ])
    ].map(row => row.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `filters_${selectedTab}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const currentTabInfo = tabs.find(tab => tab.id === selectedTab)!
  const Icon = currentTabInfo.icon

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center">
        <p>読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">フィルター管理</h1>
          <p className="text-muted-foreground mt-2">
            出品禁止・制限項目を管理します
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            CSVエクスポート
          </Button>
          <Button variant="outline" onClick={fetchFilters}>
            <Search className="mr-2 h-4 w-4" />
            更新
          </Button>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-4">
        {tabs.map(tab => {
          const TabIcon = tab.icon
          const count = filters.filter(f => f.type === tab.id).length
          return (
            <Card key={tab.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedTab(tab.id)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <TabIcon className={`h-5 w-5 ${tab.color}`} />
                  <Badge variant="secondary">{count}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">{tab.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* メインコンテンツ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${currentTabInfo.color}`} />
              <CardTitle>{currentTabInfo.label}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="検索..."
                  className="pl-8 w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button onClick={() => setIsAddingNew(true)}>
                <Plus className="mr-2 h-4 w-4" />
                新規追加
              </Button>
              {selectedItems.length > 0 && (
                <Button variant="destructive" onClick={handleBulkDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  選択項目を削除 ({selectedItems.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 新規追加フォーム */}
          {isAddingNew && (
            <div className="mb-4 p-4 border rounded-lg bg-muted/50">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>フィルターキーワード</Label>
                  <Input
                    placeholder="禁止するキーワードを入力..."
                    value={newFilterValue}
                    onChange={(e) => setNewFilterValue(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>説明（オプション）</Label>
                  <Input
                    placeholder="メモや理由を入力..."
                    value={newFilterNotes}
                    onChange={(e) => setNewFilterNotes(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddFilter}>
                    <Check className="mr-2 h-4 w-4" />
                    追加
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setIsAddingNew(false)
                    setNewFilterValue("")
                    setNewFilterNotes("")
                  }}>
                    <X className="mr-2 h-4 w-4" />
                    キャンセル
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* フィルターテーブル */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(filteredItems.map(item => item.id))
                        } else {
                          setSelectedItems([])
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>キーワード</TableHead>
                  <TableHead>優先度</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>検出回数</TableHead>
                  <TableHead>作成日</TableHead>
                  <TableHead>説明</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      フィルターが登録されていません
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems([...selectedItems, item.id])
                            } else {
                              setSelectedItems(selectedItems.filter(id => id !== item.id))
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.keyword}</TableCell>
                      <TableCell>
                        <Badge variant={
                          item.priority === 'HIGH' ? 'destructive' :
                          item.priority === 'MEDIUM' ? 'default' : 'secondary'
                        }>
                          {item.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.is_active ? "default" : "secondary"}>
                          {item.is_active ? "有効" : "無効"}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.detection_count}</TableCell>
                      <TableCell>{new Date(item.created_at).toLocaleDateString('ja-JP')}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {item.description || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteFilter(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
