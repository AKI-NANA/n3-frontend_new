"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  Filter, Upload, Package, Calculator,
  Tag, TrendingUp, AlertCircle, Settings,
  ArrowRight, CheckCircle, Clock, BarChart3
} from "lucide-react"

const managementModules = [
  {
    id: "filter",
    title: "フィルター管理",
    description: "出品禁止・制限項目の管理",
    icon: Filter,
    href: "/management/filter",
    status: "active",
    stats: { total: 156, active: 142 },
    color: "text-blue-500",
    bgColor: "bg-blue-50"
  },
  {
    id: "listing",
    title: "出品管理",
    description: "商品の出品とスケジューリング",
    icon: Upload,
    href: "/management/listing",
    status: "active",
    stats: { pending: 24, scheduled: 18 },
    color: "text-green-500",
    bgColor: "bg-green-50"
  },
  {
    id: "inventory",
    title: "在庫管理",
    description: "在庫数と在庫切れ管理",
    icon: Package,
    href: "/inventory",
    status: "active",
    stats: { total: 342, lowStock: 12 },
    color: "text-purple-500",
    bgColor: "bg-purple-50"
  },
  {
    id: "shipping",
    title: "送料計算",
    description: "国際配送料金の計算",
    icon: Calculator,
    href: "/shipping-calc",
    status: "active",
    stats: { zones: 5, carriers: 3 },
    color: "text-orange-500",
    bgColor: "bg-orange-50"
  },
  {
    id: "category",
    title: "カテゴリ管理",
    description: "eBayカテゴリマッピング",
    icon: Tag,
    href: "/category-management",
    status: "active",
    stats: { mapped: 156, accuracy: "94.5%" },
    color: "text-indigo-500",
    bgColor: "bg-indigo-50"
  }
]

const recentActivities = [
  { id: 1, action: "フィルター追加", detail: "パテントトロール: Apple Inc.", time: "5分前", type: "filter" },
  { id: 2, action: "出品完了", detail: "Canon EOS R5 - eBay US", time: "15分前", type: "success" },
  { id: 3, action: "在庫アラート", detail: "ポケモンカード - 残り2個", time: "1時間前", type: "warning" },
  { id: 4, action: "カテゴリマッピング", detail: "Electronics > Cameras", time: "2時間前", type: "info" },
  { id: 5, action: "送料計算", detail: "US向け - ¥2,450", time: "3時間前", type: "info" }
]

export default function ManagementPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold">管理ツール</h1>
        <p className="text-muted-foreground mt-2">
          出品関連の全機能を統合管理
        </p>
      </div>

      {/* 統計サマリー */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">本日の出品数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <Progress value={70} className="mt-2 h-1" />
            <p className="text-xs text-muted-foreground mt-1">目標: 60件</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">アクティブリスト</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <div className="flex items-center text-xs text-green-600 mt-2">
              <TrendingUp className="mr-1 h-3 w-3" />
              +12% 前週比
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">在庫アラート</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">8</div>
            <p className="text-xs text-muted-foreground mt-2">要確認商品</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">処理待ち</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground mt-2">承認待ち</p>
          </CardContent>
        </Card>
      </div>

      {/* モジュールカード */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {managementModules.map((module) => {
          const Icon = module.icon
          return (
            <Card key={module.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${module.bgColor}`}>
                    <Icon className={`h-6 w-6 ${module.color}`} />
                  </div>
                  <Badge variant={module.status === "active" ? "default" : "secondary"}>
                    稼働中
                  </Badge>
                </div>
                <CardTitle className="mt-4">{module.title}</CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {Object.entries(module.stats).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-muted-foreground capitalize">{key}</p>
                        <p className="font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                  <Link href={module.href}>
                    <Button className="w-full">
                      管理画面へ
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* アクティビティとクイックアクション */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 最近のアクティビティ */}
        <Card>
          <CardHeader>
            <CardTitle>最近のアクティビティ</CardTitle>
            <CardDescription>
              システム全体の直近の操作履歴
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="mt-1">
                    {activity.type === "success" && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {activity.type === "warning" && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                    {activity.type === "filter" && <Filter className="h-4 w-4 text-blue-500" />}
                    {activity.type === "info" && <Settings className="h-4 w-4 text-gray-500" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.detail}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {activity.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              すべて表示
            </Button>
          </CardContent>
        </Card>

        {/* クイックアクション */}
        <Card>
          <CardHeader>
            <CardTitle>クイックアクション</CardTitle>
            <CardDescription>
              よく使う機能へのショートカット
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/management/listing" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Upload className="mr-2 h-4 w-4" />
                新規出品を作成
              </Button>
            </Link>
            <Link href="/management/filter" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Filter className="mr-2 h-4 w-4" />
                フィルターを追加
              </Button>
            </Link>
            <Link href="/shipping-calc" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Calculator className="mr-2 h-4 w-4" />
                送料を計算
              </Button>
            </Link>
            <Link href="/inventory" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Package className="mr-2 h-4 w-4" />
                在庫を確認
              </Button>
            </Link>
            <Link href="/category-management" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Tag className="mr-2 h-4 w-4" />
                カテゴリマッピング
              </Button>
            </Link>
            
            <div className="pt-3 border-t">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">システムステータス</span>
                  <Badge variant="default" className="bg-green-500">
                    正常稼働中
                  </Badge>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>API接続</span>
                    <span className="text-green-600">✓ 接続中</span>
                  </div>
                  <div className="flex justify-between">
                    <span>データベース</span>
                    <span className="text-green-600">✓ 正常</span>
                  </div>
                  <div className="flex justify-between">
                    <span>最終同期</span>
                    <span>10分前</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
