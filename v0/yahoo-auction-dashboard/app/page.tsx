import { Package, CheckCircle, ThumbsUp, Upload } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const statsCards = [
  {
    title: "総出品数",
    value: "2,847",
    change: "+12.5%",
    icon: Package,
    description: "今月の出品アイテム数",
  },
  {
    title: "承認済み",
    value: "2,234",
    change: "+8.2%",
    icon: CheckCircle,
    description: "承認されたオークション",
  },
  {
    title: "評価スコア",
    value: "98.7%",
    change: "+2.1%",
    icon: ThumbsUp,
    description: "平均評価率",
  },
  {
    title: "アップロード",
    value: "1,456",
    change: "+15.3%",
    icon: Upload,
    description: "今月のアップロード数",
  },
]

const toolCategories = [
  {
    title: "スクレイピング・データ収集",
    tools: [
      { name: "Yahoo商品スクレイピング", status: "active", id: "00" },
      { name: "eBayカテゴリ取得", status: "active", id: "01" },
      { name: "商品データ分析", status: "maintenance", id: "02" },
    ],
  },
  {
    title: "出品・在庫管理",
    tools: [
      { name: "一括出品システム", status: "active", id: "03" },
      { name: "在庫管理ツール", status: "active", id: "04" },
      { name: "価格調整システム", status: "active", id: "05" },
    ],
  },
  {
    title: "利益・配送計算",
    tools: [
      { name: "利益計算ツール", status: "active", id: "06" },
      { name: "配送料計算", status: "active", id: "07" },
      { name: "ROI分析システム", status: "active", id: "08" },
    ],
  },
  {
    title: "承認・品質管理",
    tools: [
      { name: "商品承認システム", status: "active", id: "09" },
      { name: "品質チェック", status: "active", id: "10" },
      { name: "画像最適化", status: "active", id: "11" },
    ],
  },
]

const recentActivities = [
  { action: "新規出品", item: "iPhone 15 Pro Max", time: "2分前", status: "success" },
  { action: "価格更新", item: "MacBook Air M2", time: "5分前", status: "info" },
  { action: "在庫警告", item: "AirPods Pro", time: "10分前", status: "warning" },
  { action: "売上確定", item: 'iPad Pro 12.9"', time: "15分前", status: "success" },
]

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">NAGANO-3</h1>
                  <p className="text-sm text-muted-foreground">Yahoo Auction Dashboard</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs">
                システム稼働中
              </Badge>
              <Button variant="outline" size="sm">
                設定
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Stats Cards */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statsCards.map((stat, index) => {
              const Icon = stat.icon
              return (
                <Card key={index} className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                          <span className="text-sm font-medium text-primary">{stat.change}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{stat.description}</p>
                      </div>
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tools Grid */}
          <section className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">管理ツール</h2>
              <Button variant="outline" size="sm">
                全て表示
              </Button>
            </div>

            <div className="grid gap-6">
              {toolCategories.map((category, categoryIndex) => (
                <Card key={categoryIndex} className="rounded-xl border bg-card shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg text-foreground">{category.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {category.tools.map((tool, toolIndex) => (
                        <Button
                          key={toolIndex}
                          variant="ghost"
                          className="h-auto p-4 justify-start text-left hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                tool.status === "active"
                                  ? "bg-green-500"
                                  : tool.status === "maintenance"
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{tool.name}</p>
                              <p className="text-xs text-muted-foreground">ID: {tool.id}</p>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Recent Activities */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">最近のアクティビティ</h2>

            <Card className="rounded-xl border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">リアルタイム更新</CardTitle>
                <CardDescription>システムの最新動作状況</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        activity.status === "success"
                          ? "bg-green-500"
                          : activity.status === "warning"
                            ? "bg-yellow-500"
                            : activity.status === "info"
                              ? "bg-blue-500"
                              : "bg-red-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{activity.action}</p>
                      <p className="text-xs text-muted-foreground truncate">{activity.item}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="rounded-xl border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">クイック統計</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">今日の売上</span>
                  <span className="text-lg font-bold text-foreground">¥847,230</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">アクティブ出品</span>
                  <span className="text-lg font-bold text-foreground">1,234</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">処理待ち</span>
                  <span className="text-lg font-bold text-foreground">56</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">システム稼働率</span>
                  <span className="text-lg font-bold text-primary">99.8%</span>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}
