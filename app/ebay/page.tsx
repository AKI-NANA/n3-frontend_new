"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Globe, TrendingUp, Package, DollarSign,
  Clock, CheckCircle, AlertCircle, RefreshCw,
  Upload, Download, Star, BarChart3
} from "lucide-react"

interface EbayListing {
  id: string
  itemId: string
  title: string
  price: number
  quantity: number
  sold: number
  watchers: number
  views: number
  status: "active" | "ended" | "sold"
  endTime: string
  site: string
}

const sampleListings: EbayListing[] = [
  {
    id: "1",
    itemId: "123456789012",
    title: "Canon EOS R5 Mirrorless Camera Body - Excellent Condition",
    price: 3200,
    quantity: 1,
    sold: 0,
    watchers: 12,
    views: 156,
    status: "active",
    endTime: "2024-03-25 15:30",
    site: "eBay US"
  },
  {
    id: "2",
    itemId: "123456789013",
    title: "Pokemon Card Charizard VSTAR - PSA 10",
    price: 450,
    quantity: 3,
    sold: 2,
    watchers: 45,
    views: 892,
    status: "active",
    endTime: "2024-03-24 20:00",
    site: "eBay US"
  },
  {
    id: "3",
    itemId: "123456789014",
    title: "Vintage Seiko Automatic Watch - 1970s",
    price: 850,
    quantity: 1,
    sold: 1,
    watchers: 8,
    views: 234,
    status: "sold",
    endTime: "2024-03-20 12:00",
    site: "eBay UK"
  }
]

export default function EbayPage() {
  const [listings, setListings] = useState<EbayListing[]>(sampleListings)
  const [selectedTab, setSelectedTab] = useState("active")

  const activeListings = listings.filter(l => l.status === "active").length
  const totalSold = listings.reduce((sum, l) => sum + l.sold, 0)
  const totalRevenue = listings.reduce((sum, l) => sum + (l.price * l.sold), 0)
  const totalWatchers = listings.reduce((sum, l) => sum + l.watchers, 0)

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="h-8 w-8 text-blue-600" />
            eBay管理
          </h1>
          <p className="text-muted-foreground mt-2">
            eBayの出品商品と売上を管理
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
            <CardTitle className="text-sm font-medium">アクティブ出品</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeListings}</div>
            <p className="text-xs text-muted-foreground">現在出品中</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">総売上</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="mr-1 h-3 w-3" />
              +23% 前月比
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">販売数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSold}</div>
            <p className="text-xs text-muted-foreground">今月の販売</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ウォッチャー</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWatchers}</div>
            <p className="text-xs text-muted-foreground">合計</p>
          </CardContent>
        </Card>
      </div>

      {/* タブコンテンツ */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="active">出品中</TabsTrigger>
          <TabsTrigger value="sold">販売済み</TabsTrigger>
          <TabsTrigger value="performance">パフォーマンス</TabsTrigger>
          <TabsTrigger value="feedback">フィードバック</TabsTrigger>
        </TabsList>

        {/* 出品中タブ */}
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>アクティブリスト</CardTitle>
              <CardDescription>
                現在eBayに出品中の商品
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {listings.filter(l => l.status === "active").map((listing) => (
                  <div key={listing.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div>
                          <p className="font-medium">{listing.title}</p>
                          <p className="text-sm text-muted-foreground">Item ID: {listing.itemId}</p>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            <span>在庫: {listing.quantity - listing.sold}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            <span>{listing.watchers} watchers</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            <span>{listing.views} views</span>
                          </div>
                          <Badge variant="outline">{listing.site}</Badge>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <p className="text-2xl font-bold">${listing.price}</p>
                        <div className="text-sm text-muted-foreground">
                          終了: {listing.endTime}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">編集</Button>
                          <Button size="sm" variant="outline">終了</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 販売済みタブ */}
        <TabsContent value="sold">
          <Card>
            <CardHeader>
              <CardTitle>販売履歴</CardTitle>
              <CardDescription>
                最近の販売実績
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {listings.filter(l => l.status === "sold" || l.sold > 0).map((listing) => (
                  <div key={listing.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{listing.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          販売日: {listing.endTime} | 販売数: {listing.sold}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-green-600">
                          ${(listing.price * listing.sold).toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ${listing.price} × {listing.sold}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* パフォーマンスタブ */}
        <TabsContent value="performance">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>コンバージョン率</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>ビュー → ウォッチャー</span>
                    <span className="font-medium">8.2%</span>
                  </div>
                  <Progress value={8.2} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>ウォッチャー → 購入</span>
                    <span className="font-medium">15.3%</span>
                  </div>
                  <Progress value={15.3} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>全体コンバージョン</span>
                    <span className="font-medium">1.25%</span>
                  </div>
                  <Progress value={1.25 * 10} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>カテゴリ別売上</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { category: "カメラ・写真", sales: 4500 },
                  { category: "トレーディングカード", sales: 2800 },
                  { category: "時計", sales: 1200 },
                  { category: "電子機器", sales: 3200 }
                ].map((item) => (
                  <div key={item.category} className="flex items-center justify-between">
                    <span className="text-sm">{item.category}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={(item.sales / 5000) * 100} className="w-24 h-2" />
                      <span className="text-sm font-medium">${item.sales}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* フィードバックタブ */}
        <TabsContent value="feedback">
          <Card>
            <CardHeader>
              <CardTitle>フィードバック統計</CardTitle>
              <CardDescription>
                セラー評価とバイヤーフィードバック
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="text-center p-6 border rounded-lg">
                  <div className="text-4xl font-bold text-green-600">99.8%</div>
                  <p className="text-sm text-muted-foreground mt-2">ポジティブ評価率</p>
                  <div className="flex items-center justify-center gap-1 mt-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                </div>
                <div className="text-center p-6 border rounded-lg">
                  <div className="text-4xl font-bold">1,234</div>
                  <p className="text-sm text-muted-foreground mt-2">総フィードバック数</p>
                  <Progress value={85} className="mt-4" />
                </div>
                <div className="text-center p-6 border rounded-lg">
                  <div className="text-4xl font-bold text-blue-600">トップセラー</div>
                  <p className="text-sm text-muted-foreground mt-2">ステータス</p>
                  <Badge className="mt-4" variant="default">維持中</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
