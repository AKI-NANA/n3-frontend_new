"use client"

import { useState } from "react"
import { CategoryFeeManager } from '@/components/ebay-pricing/category-fee-manager'
import { CategoryTreeFiltered } from '@/components/ebay-pricing/category-tree-filtered'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tag, Brain, Info, CheckCircle
} from "lucide-react"

interface CategoryMapping {
  localCategory: string
  ebayCategory: string
  confidence: number
  lastUsed: string
}

const recentMappings: CategoryMapping[] = [
  { localCategory: "ポケモンカード", ebayCategory: "Collectibles > Trading Cards > Pokémon", confidence: 95, lastUsed: "2024-03-20" },
  { localCategory: "デジタルカメラ", ebayCategory: "Electronics > Cameras & Photo > Digital Cameras", confidence: 98, lastUsed: "2024-03-19" },
  { localCategory: "ノートパソコン", ebayCategory: "Electronics > Computers > Laptops", confidence: 92, lastUsed: "2024-03-18" },
]

export default function CategoryManagementPage() {
  const [aiSuggestion, setAiSuggestion] = useState<string>("")
  const [itemTitle, setItemTitle] = useState("")
  const [itemDescription, setItemDescription] = useState("")

  const detectCategoryWithAI = () => {
    if (!itemTitle && !itemDescription) return
    
    const text = `${itemTitle} ${itemDescription}`.toLowerCase()
    if (text.includes("camera") || text.includes("カメラ")) {
      setAiSuggestion("Electronics > Cameras & Photo > Digital Cameras")
    } else if (text.includes("pokemon") || text.includes("ポケモン")) {
      setAiSuggestion("Collectibles > Trading Cards > Pokémon")
    } else if (text.includes("laptop") || text.includes("ノート")) {
      setAiSuggestion("Electronics > Computers > Laptops")
    } else {
      setAiSuggestion("Electronics")
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">カテゴリ管理</h1>
        <p className="text-muted-foreground mt-2">
          eBayカテゴリのマッピングと手数料を管理します
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">総カテゴリ数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">17,104</div>
            <p className="text-xs text-muted-foreground">eBayから取得</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">AI判定精度</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.5%</div>
            <p className="text-xs text-muted-foreground">過去30日間</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">平均手数料</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">10.8%</div>
            <p className="text-xs text-muted-foreground">全カテゴリ</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">更新頻度</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">週1回</div>
            <p className="text-xs text-muted-foreground">eBay同期</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tree" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tree">カテゴリツリー</TabsTrigger>
          <TabsTrigger value="ai">AI判定</TabsTrigger>
          <TabsTrigger value="mapping">マッピング履歴</TabsTrigger>
          <TabsTrigger value="fees">手数料設定</TabsTrigger>
        </TabsList>

        <TabsContent value="tree">
          <CategoryTreeFiltered />
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AIカテゴリ判定</CardTitle>
              <CardDescription>
                商品情報から最適なeBayカテゴリを自動判定
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label>商品タイトル</Label>
                    <Input
                      placeholder="例: Canon EOS R5 ミラーレスカメラ"
                      value={itemTitle}
                      onChange={(e) => setItemTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>商品説明</Label>
                    <textarea
                      className="w-full min-h-[100px] px-3 py-2 border rounded-md"
                      placeholder="商品の詳細説明を入力..."
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                    />
                  </div>
                  <Button onClick={detectCategoryWithAI} className="w-full">
                    <Brain className="mr-2 h-4 w-4" />
                    AIで判定
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Label>判定結果</Label>
                      {aiSuggestion && (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          信頼度: 95%
                        </Badge>
                      )}
                    </div>
                    {aiSuggestion ? (
                      <div className="space-y-2">
                        <p className="font-medium">{aiSuggestion}</p>
                        <Button variant="outline" size="sm" className="w-full">
                          このカテゴリを適用
                        </Button>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        商品情報を入力してAI判定を実行してください
                      </p>
                    )}
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium mb-1">AI判定のヒント</p>
                        <ul className="text-muted-foreground space-y-1">
                          <li>• 詳細な説明ほど精度が向上</li>
                          <li>• ブランド名や型番を含める</li>
                          <li>• 状態や付属品も記載</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping">
          <Card>
            <CardHeader>
              <CardTitle>カテゴリマッピング履歴</CardTitle>
              <CardDescription>
                最近使用したカテゴリマッピング
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentMappings.map((mapping, index) => (
                  <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{mapping.localCategory}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">→ {mapping.ebayCategory}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={mapping.confidence > 90 ? "default" : "secondary"}>
                          {mapping.confidence}% 一致
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{mapping.lastUsed}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees">
          <div className="space-y-6">
            <CategoryFeeManager />

            <Card>
              <CardHeader>
                <CardTitle>カテゴリ別手数料</CardTitle>
                <CardDescription>
                  eBayカテゴリごとの手数料率設定
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4">
                    {[
                      { category: "Musical Instruments > Guitars & Basses", fee: 3.5, volume: "中" },
                      { category: "Musical Instruments > Other", fee: 6.35, volume: "低" },
                      { category: "Electronics", fee: 13.15, volume: "高" },
                      { category: "Collectibles", fee: 13.15, volume: "中" },
                      { category: "Art", fee: 15, volume: "低" },
                      { category: "Clothing", fee: 15, volume: "高" },
                    ].map((item) => (
                      <div key={item.category} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <Tag className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="font-medium">{item.category}</p>
                            <p className="text-sm text-muted-foreground">取引量: {item.volume}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold">{item.fee}%</p>
                            <p className="text-xs text-muted-foreground">FVF手数料</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
