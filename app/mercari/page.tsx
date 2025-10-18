"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  ShoppingBag, TrendingUp, Package, DollarSign,
  Clock, CheckCircle, AlertCircle, RefreshCw,
  Upload, Download, Eye, Heart
} from "lucide-react"

interface MercariItem {
  id: string
  title: string
  price: number
  likes: number
  views: number
  status: "active" | "sold" | "draft"
  listedAt: string
  category: string
  image: string
}

const sampleItems: MercariItem[] = [
  {
    id: "M001",
    title: "Nintendo Switch 本体 有機ELモデル",
    price: 35000,
    likes: 45,
    views: 320,
    status: "active",
    listedAt: "2024-03-18",
    category: "ゲーム",
    image: "/api/placeholder/100/100"
  },
  {
    id: "M002",
    title: "ポケモンカード シャイニースターV BOX",
    price: 8500,
    likes: 23,
    views: 156,
    status: "sold",
    listedAt: "2024-03-15",
    category: "トレカ",
    image: "/api/placeholder/100/100"
  },
  {
    id: "M003",
    title: "Apple AirPods Pro 第2世代",
    price: 28000,
    likes: 67,
    views: 489,
    status: "active",
    listedAt: "2024-03-20",
    category: "家電",
    image: "/api/placeholder/100/100"
  }
]

export default function MercariPage() {
  const [items, setItems] = useState<MercariItem[]>(sampleItems)
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  const activeItems = items.filter(item => item.status === "active").length
  const soldItems = items.filter(item => item.status === "sold").length
  const totalSales = items.filter(item => item.status === "sold")
    .reduce((sum, item) => sum + item.price, 0)

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-8 w-8 text-red-500" />
            メルカリ管理
          </h1>
          <p className="text-muted-foreground mt-2">
            メルカリの出品商品を管理
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            同期
          </Button>
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            新規出品
          </Button>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">出品中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeItems}</div>
            <p className="text-xs text-muted-foreground">アクティブ商品</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">売上合計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{totalSales.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">今月の売上</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">販売済み</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{soldItems}</div>
            <p className="text-xs text-muted-foreground">取引完了</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">平均いいね</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="mr-1 h-3 w-3" />
              +12% 前週比
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 商品リスト */}
      <Card>
        <CardHeader>
          <CardTitle>商品一覧</CardTitle>
          <CardDescription>
            メルカリに出品中の商品
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <input type="checkbox" />
                </TableHead>
                <TableHead>商品</TableHead>
                <TableHead>カテゴリ</TableHead>
                <TableHead className="text-right">価格</TableHead>
                <TableHead className="text-center">いいね</TableHead>
                <TableHead className="text-center">閲覧数</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>出品日</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
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
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-10 h-10 rounded object-cover"
                      />
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell className="text-right font-medium">
                    ¥{item.price.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Heart className="h-3 w-3 text-red-500" />
                      <span>{item.likes}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Eye className="h-3 w-3 text-gray-500" />
                      <span>{item.views}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.status === "active" && (
                      <Badge className="bg-green-500">出品中</Badge>
                    )}
                    {item.status === "sold" && (
                      <Badge variant="secondary">売却済</Badge>
                    )}
                    {item.status === "draft" && (
                      <Badge variant="outline">下書き</Badge>
                    )}
                  </TableCell>
                  <TableCell>{item.listedAt}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">編集</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* パフォーマンス分析 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>カテゴリ別パフォーマンス</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {["ゲーム", "トレカ", "家電", "ファッション"].map((category) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{category}</span>
                  <span className="text-muted-foreground">
                    {Math.floor(Math.random() * 50 + 10)} 商品
                  </span>
                </div>
                <Progress value={Math.random() * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>価格帯分析</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { range: "¥1,000 - ¥5,000", count: 12 },
              { range: "¥5,000 - ¥10,000", count: 8 },
              { range: "¥10,000 - ¥30,000", count: 15 },
              { range: "¥30,000以上", count: 5 }
            ].map((range) => (
              <div key={range.range} className="flex items-center justify-between">
                <span className="text-sm">{range.range}</span>
                <div className="flex items-center gap-2">
                  <Progress value={(range.count / 40) * 100} className="w-24 h-2" />
                  <span className="text-sm font-medium">{range.count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
