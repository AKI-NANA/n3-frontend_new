"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Upload, FileSpreadsheet, CheckCircle, AlertCircle,
  Download, Play, Pause, RotateCw, List,
  Globe, ShoppingCart, Tag, Clock
} from "lucide-react"

interface BulkItem {
  id: string
  title: string
  price: number
  quantity: number
  category: string
  platforms: string[]
  status: "pending" | "processing" | "completed" | "failed"
  error?: string
}

const sampleBulkItems: BulkItem[] = [
  {
    id: "B001",
    title: "Canon EOS R5 ボディ",
    price: 450000,
    quantity: 2,
    category: "カメラ",
    platforms: ["ebay", "yahoo", "mercari"],
    status: "completed"
  },
  {
    id: "B002",
    title: "ポケモンカード 25th Anniversary Collection",
    price: 15000,
    quantity: 10,
    category: "トレーディングカード",
    platforms: ["ebay", "mercari"],
    status: "processing"
  },
  {
    id: "B003",
    title: "Apple AirPods Pro 第2世代",
    price: 35000,
    quantity: 5,
    category: "オーディオ",
    platforms: ["mercari"],
    status: "pending"
  },
  {
    id: "B004",
    title: "Nintendo Switch 有機ELモデル",
    price: 37000,
    quantity: 3,
    category: "ゲーム",
    platforms: ["yahoo", "mercari"],
    status: "failed",
    error: "在庫不足"
  }
]

export default function BulkListingPage() {
  const [items, setItems] = useState<BulkItem[]>(sampleBulkItems)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const pendingCount = items.filter(i => i.status === "pending").length
  const processingCount = items.filter(i => i.status === "processing").length
  const completedCount = items.filter(i => i.status === "completed").length
  const failedCount = items.filter(i => i.status === "failed").length

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(items.map(i => i.id))
    }
  }

  const handleStartBulkListing = () => {
    setIsProcessing(true)
    setUploadProgress(0)
    
    // シミュレーション
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsProcessing(false)
          return 100
        }
        return prev + 10
      })
    }, 500)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold">一括出品</h1>
        <p className="text-muted-foreground mt-2">
          複数商品を複数プラットフォームに一括で出品
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">待機中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">出品待ち</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">処理中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{processingCount}</div>
            <p className="text-xs text-muted-foreground">出品処理中</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">完了</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            <p className="text-xs text-muted-foreground">出品成功</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">エラー</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedCount}</div>
            <p className="text-xs text-muted-foreground">出品失敗</p>
          </CardContent>
        </Card>
      </div>

      {/* アップロードセクション */}
      <Card>
        <CardHeader>
          <CardTitle>CSVアップロード</CardTitle>
          <CardDescription>
            商品リストをCSVファイルでアップロード
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              CSVファイルをドラッグ&ドロップまたは
            </p>
            <Button className="mt-4" variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              ファイルを選択
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              最大500商品まで一括アップロード可能
            </p>
          </div>

          <div className="flex justify-between items-center mt-4">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              テンプレートをダウンロード
            </Button>
            <div className="text-sm text-muted-foreground">
              対応形式: CSV, XLSX
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 商品リスト */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>出品リスト</CardTitle>
              <CardDescription>
                一括出品する商品一覧
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedItems.length > 0 && (
                <Badge variant="secondary">
                  {selectedItems.length} 件選択中
                </Badge>
              )}
              <Button 
                onClick={handleStartBulkListing}
                disabled={selectedItems.length === 0 || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    処理中...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    一括出品開始
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isProcessing && (
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>出品処理中...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-4 border-b">
              <Checkbox 
                checked={selectedItems.length === items.length}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium">すべて選択</span>
            </div>

            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <Checkbox
                  checked={selectedItems.includes(item.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedItems([...selectedItems, item.id])
                    } else {
                      setSelectedItems(selectedItems.filter(id => id !== item.id))
                    }
                  }}
                />
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>¥{item.price.toLocaleString()}</span>
                        <span>在庫: {item.quantity}</span>
                        <Badge variant="outline">{item.category}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      {item.status === "pending" && (
                        <Badge variant="secondary">
                          <Clock className="mr-1 h-3 w-3" />
                          待機中
                        </Badge>
                      )}
                      {item.status === "processing" && (
                        <Badge className="bg-blue-500">
                          <RotateCw className="mr-1 h-3 w-3 animate-spin" />
                          処理中
                        </Badge>
                      )}
                      {item.status === "completed" && (
                        <Badge className="bg-green-500">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          完了
                        </Badge>
                      )}
                      {item.status === "failed" && (
                        <Badge variant="destructive">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          失敗
                        </Badge>
                      )}
                      {item.error && (
                        <p className="text-xs text-red-500 mt-1">{item.error}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">出品先:</span>
                    {item.platforms.includes("ebay") && (
                      <Badge variant="outline" className="text-xs">
                        <Globe className="mr-1 h-3 w-3" />
                        eBay
                      </Badge>
                    )}
                    {item.platforms.includes("yahoo") && (
                      <Badge variant="outline" className="text-xs">
                        <ShoppingCart className="mr-1 h-3 w-3" />
                        Yahoo
                      </Badge>
                    )}
                    {item.platforms.includes("mercari") && (
                      <Badge variant="outline" className="text-xs">
                        <Tag className="mr-1 h-3 w-3" />
                        メルカリ
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 処理履歴 */}
      <Card>
        <CardHeader>
          <CardTitle>処理履歴</CardTitle>
          <CardDescription>
            最近の一括出品履歴
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { date: "2024-03-20 14:30", items: 25, success: 23, failed: 2 },
              { date: "2024-03-19 10:15", items: 50, success: 48, failed: 2 },
              { date: "2024-03-18 16:45", items: 15, success: 15, failed: 0 },
            ].map((history, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-4">
                  <List className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{history.date}</p>
                    <p className="text-xs text-muted-foreground">
                      {history.items} 商品を処理
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500">
                    成功: {history.success}
                  </Badge>
                  {history.failed > 0 && (
                    <Badge variant="destructive">
                      失敗: {history.failed}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
