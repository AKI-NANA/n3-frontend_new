"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Upload, Globe, ShoppingCart, Tag,
  Image, DollarSign, Clock, CheckCircle,
  AlertCircle, Zap, Send, Save
} from "lucide-react"

interface ListingPlatform {
  id: string
  name: string
  icon: any
  enabled: boolean
  fee: number
}

const platforms: ListingPlatform[] = [
  { id: "ebay", name: "eBay", icon: Globe, enabled: true, fee: 10 },
  { id: "yahoo", name: "Yahoo!オークション", icon: ShoppingCart, enabled: true, fee: 8.8 },
  { id: "mercari", name: "メルカリ", icon: Tag, enabled: true, fee: 10 },
]

export default function ListingToolPage() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [condition, setCondition] = useState("new")
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["ebay"])
  const [images, setImages] = useState<string[]>([])

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold">出品ツール</h1>
        <p className="text-muted-foreground mt-2">
          複数プラットフォームへの一括出品
        </p>
      </div>

      {/* プラットフォーム選択 */}
      <Card>
        <CardHeader>
          <CardTitle>出品先プラットフォーム</CardTitle>
          <CardDescription>
            出品するプラットフォームを選択してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {platforms.map((platform) => {
              const Icon = platform.icon
              const isSelected = selectedPlatforms.includes(platform.id)
              return (
                <div
                  key={platform.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all
                    ${isSelected ? 'border-primary bg-primary/5' : 'hover:border-gray-400'}`}
                  onClick={() => handlePlatformToggle(platform.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{platform.name}</p>
                        <p className="text-xs text-muted-foreground">手数料: {platform.fee}%</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-1"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">基本情報</TabsTrigger>
          <TabsTrigger value="images">画像</TabsTrigger>
          <TabsTrigger value="pricing">価格設定</TabsTrigger>
          <TabsTrigger value="shipping">配送</TabsTrigger>
          <TabsTrigger value="schedule">スケジュール</TabsTrigger>
        </TabsList>

        {/* 基本情報 */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>商品情報</CardTitle>
              <CardDescription>
                商品の基本情報を入力してください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>商品タイトル</Label>
                <Input
                  placeholder="例: Canon EOS R5 ミラーレスカメラ ボディ 美品"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {title.length}/80 文字
                </p>
              </div>

              <div>
                <Label>商品説明</Label>
                <Textarea
                  placeholder="商品の詳細な説明を入力してください..."
                  className="min-h-[200px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>商品状態</Label>
                  <Select value={condition} onValueChange={setCondition}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">新品・未使用</SelectItem>
                      <SelectItem value="like-new">未使用に近い</SelectItem>
                      <SelectItem value="very-good">目立った傷や汚れなし</SelectItem>
                      <SelectItem value="good">やや傷や汚れあり</SelectItem>
                      <SelectItem value="acceptable">傷や汚れあり</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>カテゴリ</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="カテゴリを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="electronics">家電・カメラ</SelectItem>
                      <SelectItem value="collectibles">コレクション</SelectItem>
                      <SelectItem value="fashion">ファッション</SelectItem>
                      <SelectItem value="home">ホーム・ガーデン</SelectItem>
                      <SelectItem value="sports">スポーツ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 画像 */}
        <TabsContent value="images">
          <Card>
            <CardHeader>
              <CardTitle>商品画像</CardTitle>
              <CardDescription>
                最大12枚まで画像をアップロード可能
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    {i < images.length ? (
                      <div className="relative w-full h-full">
                        <img
                          src={`/api/placeholder/200/200`}
                          alt={`商品画像${i + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <Badge className="absolute top-2 left-2" variant="secondary">
                          {i === 0 ? "メイン" : `画像${i + 1}`}
                        </Badge>
                      </div>
                    ) : (
                      <>
                        <Image className="h-8 w-8 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground mt-2">
                          {i === 0 ? "メイン画像" : "追加画像"}
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <Button className="w-full mt-4" variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                画像をアップロード
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 価格設定 */}
        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>価格設定</CardTitle>
              <CardDescription>
                販売価格と在庫数を設定
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>販売価格 (JPY)</Label>
                  <Input
                    type="number"
                    placeholder="10000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                <div>
                  <Label>在庫数</Label>
                  <Input
                    type="number"
                    placeholder="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
              </div>

              {selectedPlatforms.length > 0 && price && (
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <p className="font-medium text-sm">手数料計算</p>
                  {selectedPlatforms.map(platformId => {
                    const platform = platforms.find(p => p.id === platformId)
                    if (!platform) return null
                    const fee = Math.round(parseInt(price) * platform.fee / 100)
                    const net = parseInt(price) - fee
                    return (
                      <div key={platformId} className="flex items-center justify-between text-sm">
                        <span>{platform.name}</span>
                        <div className="text-right">
                          <span className="text-muted-foreground">手数料: ¥{fee.toLocaleString()}</span>
                          <span className="ml-3 font-medium">純利益: ¥{net.toLocaleString()}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 配送 */}
        <TabsContent value="shipping">
          <Card>
            <CardHeader>
              <CardTitle>配送設定</CardTitle>
              <CardDescription>
                配送方法と送料を設定
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>配送方法</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="配送方法を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">通常配送 (3-5日)</SelectItem>
                    <SelectItem value="express">速達配送 (1-2日)</SelectItem>
                    <SelectItem value="economy">エコノミー配送 (7-14日)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>送料設定</Label>
                <div className="grid gap-2">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="shipping" value="free" />
                    <span>送料無料</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="shipping" value="buyer" />
                    <span>購入者負担</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="shipping" value="custom" />
                    <span>カスタム送料</span>
                  </label>
                </div>
              </div>

              <div>
                <Label>発送元地域</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="都道府県を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tokyo">東京都</SelectItem>
                    <SelectItem value="osaka">大阪府</SelectItem>
                    <SelectItem value="nagoya">愛知県</SelectItem>
                    <SelectItem value="fukuoka">福岡県</SelectItem>
                    <SelectItem value="hokkaido">北海道</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* スケジュール */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>出品スケジュール</CardTitle>
              <CardDescription>
                出品のタイミングを設定
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>出品タイミング</Label>
                <div className="grid gap-2">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="schedule" value="now" defaultChecked />
                    <span>今すぐ出品</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="schedule" value="scheduled" />
                    <span>スケジュール出品</span>
                  </label>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>出品日</Label>
                  <Input type="date" />
                </div>
                <div>
                  <Label>出品時刻</Label>
                  <Input type="time" />
                </div>
              </div>

              <div>
                <Label>終了タイプ</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="終了タイプを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auction">オークション形式</SelectItem>
                    <SelectItem value="fixed">固定価格</SelectItem>
                    <SelectItem value="best-offer">価格交渉可</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>出品期間</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="期間を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3日間</SelectItem>
                    <SelectItem value="7">7日間</SelectItem>
                    <SelectItem value="10">10日間</SelectItem>
                    <SelectItem value="30">30日間</SelectItem>
                    <SelectItem value="gtc">終了日なし (GTC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* アクションボタン */}
      <Card>
        <CardContent className="flex justify-between items-center p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>すべての必須項目を入力してください</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Save className="mr-2 h-4 w-4" />
              下書き保存
            </Button>
            <Button>
              <Send className="mr-2 h-4 w-4" />
              出品する
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
