"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Package, TrendingUp, AlertTriangle, Archive,
  Search, Download, Upload, BarChart3,
  Clock, CheckCircle, XCircle, RefreshCw
} from "lucide-react"

interface InventoryItem {
  id: string
  sku: string
  name: string
  category: string
  quantity: number
  reserved: number
  available: number
  location: string
  lastUpdated: string
  status: "in-stock" | "low-stock" | "out-of-stock"
  price: number
  cost: number
}

const sampleInventory: InventoryItem[] = [
  {
    id: "1",
    sku: "CAM-001",
    name: "Canon EOS R5 ボディ",
    category: "カメラ",
    quantity: 5,
    reserved: 2,
    available: 3,
    location: "A-01-02",
    lastUpdated: "2024-03-20 10:30",
    status: "in-stock",
    price: 450000,
    cost: 380000
  },
  {
    id: "2",
    sku: "CARD-042",
    name: "ポケモンカード リザードンex SAR",
    category: "トレーディングカード",
    quantity: 2,
    reserved: 1,
    available: 1,
    location: "B-05-10",
    lastUpdated: "2024-03-20 09:15",
    status: "low-stock",
    price: 28000,
    cost: 20000
  },
  {
    id: "3",
    sku: "WATCH-015",
    name: "Rolex Submariner Date",
    category: "腕時計",
    quantity: 0,
    reserved: 0,
    available: 0,
    location: "C-02-01",
    lastUpdated: "2024-03-19 18:00",
    status: "out-of-stock",
    price: 1800000,
    cost: 1500000
  },
  {
    id: "4",
    sku: "LENS-008",
    name: "Canon RF 24-70mm F2.8L IS USM",
    category: "レンズ",
    quantity: 8,
    reserved: 3,
    available: 5,
    location: "A-02-05",
    lastUpdated: "2024-03-20 11:00",
    status: "in-stock",
    price: 280000,
    cost: 240000
  }
]

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>(sampleInventory)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  // 在庫統計の計算
  const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0)
  const totalValue = inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const lowStockItems = inventory.filter(item => item.status === "low-stock").length
  const outOfStockItems = inventory.filter(item => item.status === "out-of-stock").length

  // フィルタリング
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === "all" || item.status === selectedStatus
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
    return matchesSearch && matchesStatus && matchesCategory
  })

  // カテゴリ一覧取得
  const categories = Array.from(new Set(inventory.map(item => item.category)))

  // ステータスバッジのスタイル
  const getStatusBadge = (status: string) => {
    switch(status) {
      case "in-stock":
        return <Badge className="bg-green-500">在庫あり</Badge>
      case "low-stock":
        return <Badge className="bg-yellow-500">在庫少</Badge>
      case "out-of-stock":
        return <Badge variant="destructive">在庫切れ</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold">在庫管理</h1>
        <p className="text-muted-foreground mt-2">
          商品在庫の確認と管理
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">総在庫数</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {inventory.length} SKU
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">在庫総額</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{(totalValue / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">
              評価額
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">在庫少</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              補充が必要
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">在庫切れ</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{outOfStockItems}</div>
            <p className="text-xs text-muted-foreground">
              即座に対応必要
            </p>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <Card>
        <CardHeader>
          <CardTitle>在庫検索</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="商品名やSKUで検索..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="カテゴリ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="in-stock">在庫あり</SelectItem>
                <SelectItem value="low-stock">在庫少</SelectItem>
                <SelectItem value="out-of-stock">在庫切れ</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              更新
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              エクスポート
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 在庫テーブル */}
      <Card>
        <CardHeader>
          <CardTitle>在庫一覧</CardTitle>
          <CardDescription>
            {filteredInventory.length} 件の商品
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>商品名</TableHead>
                <TableHead>カテゴリ</TableHead>
                <TableHead className="text-center">在庫数</TableHead>
                <TableHead className="text-center">予約</TableHead>
                <TableHead className="text-center">利用可能</TableHead>
                <TableHead>ロケーション</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead className="text-right">販売価格</TableHead>
                <TableHead>最終更新</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium">{item.quantity}</span>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {item.reserved}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium text-green-600">{item.available}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.location}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell className="text-right font-medium">
                    ¥{item.price.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.lastUpdated}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">編集</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 在庫推移グラフ */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>カテゴリ別在庫分布</CardTitle>
            <CardDescription>
              各カテゴリの在庫割合
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categories.map(cat => {
                const catItems = inventory.filter(item => item.category === cat)
                const catQuantity = catItems.reduce((sum, item) => sum + item.quantity, 0)
                const percentage = (catQuantity / totalItems) * 100
                return (
                  <div key={cat} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{cat}</span>
                      <span className="font-medium">{catQuantity} 個</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>在庫アラート</CardTitle>
            <CardDescription>
              注意が必要な商品
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inventory
                .filter(item => item.status !== "in-stock")
                .map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(item.status)}
                      <p className="text-xs text-muted-foreground mt-1">
                        残り {item.available} 個
                      </p>
                    </div>
                  </div>
                ))}
            </div>
            <Button className="w-full mt-4" variant="outline">
              <Archive className="mr-2 h-4 w-4" />
              一括補充発注
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
