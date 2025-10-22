'use client'

import React, { useState } from 'react'
import { 
  Search, Package, ShoppingCart, Globe, 
  Zap, Trophy, Gamepad2, Activity, 
  Check, X, Loader2, ExternalLink,
  ChevronRight, ChevronDown, Upload, Download,
  RefreshCw, Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { platformsData } from './platformsData'

interface DataCollectionSystemProps {
  className?: string
}

export function DataCollectionSystem({ className }: DataCollectionSystemProps) {
  // UI状態
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    auction: true,
    ec: false,
    tcg: false,
    golf: false,
    hobby: false,
    others: false
  })
  
  const [activeTab, setActiveTab] = useState('collect')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [urlInput, setUrlInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [stats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    inProgress: 0
  })

  // カテゴリ展開トグル
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  // プラットフォーム選択
  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    )
  }

  // 全選択/全解除
  const toggleAllInCategory = (category: string) => {
    const categoryItems = platformsData[category].items.map(item => item.id)
    const allSelected = categoryItems.every(id => selectedPlatforms.includes(id))
    
    if (allSelected) {
      setSelectedPlatforms(prev => prev.filter(id => !categoryItems.includes(id)))
    } else {
      setSelectedPlatforms(prev => [...new Set([...prev, ...categoryItems])])
    }
  }

  // データ取得実行
  const executeDataCollection = async () => {
    if (!urlInput.trim() && selectedPlatforms.length === 0) {
      alert('URLを入力するか、プラットフォームを選択してください')
      return
    }

    setIsLoading(true)
    
    // APIコール
    try {
      const response = await fetch('/api/scraping/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: urlInput.split('\n').filter(url => url.trim()),
          platforms: selectedPlatforms
        })
      })
      
      const data = await response.json()

      // 警告メッセージがある場合は表示
      if (data.warning || data.isMockData) {
        const warningMsg = data.warning || 'モックデータを使用しています'
        const errorDetails = data.errors ? `\n\n詳細:\n${data.errors.join('\n')}` : ''
        alert(`⚠️ ${warningMsg}${errorDetails}`)
      }

      setResults(prev => [...data.results, ...prev])
    } catch (error) {
      console.error('データ取得エラー:', error)
      alert('データ取得に失敗しました。APIサーバーに接続できません。')
    } finally {
      setIsLoading(false)
      setUrlInput('')
    }
  }

  // 総プラットフォーム数を計算
  const totalPlatforms = Object.values(platformsData).reduce(
    (sum, category) => sum + category.items.length, 0
  )

  return (
    <div className={`flex h-screen bg-background ${className || ''}`}>
      {/* サイドバー */}
      <div className="w-[320px] border-r bg-card h-full overflow-y-auto">
        <div className="p-4">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-1">データ取得管理</h2>
            <p className="text-xs text-muted-foreground">{totalPlatforms}+ プラットフォーム対応</p>
          </div>

          {/* プラットフォームリスト */}
          <div className="space-y-2">
            {Object.entries(platformsData).map(([key, category]) => (
              <Card key={key}>
                <button
                  onClick={() => toggleCategory(key)}
                  className="w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {category.icon}
                    <span className="text-sm font-medium">{category.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({category.items.length})
                    </span>
                  </div>
                  {expandedCategories[key] ? 
                    <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  }
                </button>
                
                {expandedCategories[key] && (
                  <div className="px-3 pb-2 space-y-1 max-h-[400px] overflow-y-auto">
                    <div className="flex items-center justify-between py-1 sticky top-0 bg-card">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={category.items.every(item => selectedPlatforms.includes(item.id))}
                          onChange={() => toggleAllInCategory(key)}
                          className="rounded border-input"
                        />
                        すべて選択
                      </label>
                    </div>
                    {category.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent/50">
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={selectedPlatforms.includes(item.id)}
                            onChange={() => togglePlatform(item.id)}
                            className="rounded border-input"
                          />
                          <span className="text-sm">{item.name}</span>
                          {item.status === 'beta' && (
                            <Badge variant="outline" className="text-xs">Beta</Badge>
                          )}
                          {item.status === 'development' && (
                            <Badge variant="destructive" className="text-xs">開発中</Badge>
                          )}
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {item.count.toLocaleString()}
                          </span>
                          <a 
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-accent rounded"
                            title="個別ページを開く"
                          >
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* 追加予定通知 */}
          <Card className="mt-6">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">今後追加予定:</span><br/>
                コメ兵、質屋チェーン、海外ECサイトなど
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* コンテンツヘッダー */}
        <div className="border-b bg-card px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">統合データ取得システム</h1>
              <p className="text-sm text-muted-foreground mt-1">
                リアルタイムデータ収集・在庫監視・価格追跡
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-4 gap-4 p-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">総取得数</p>
                  <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">今月 +23.5%</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-full">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">成功</p>
                  <p className="text-2xl font-bold">{stats.success.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">成功率 92.8%</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-full">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">エラー</p>
                  <p className="text-2xl font-bold text-destructive">{stats.failed.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">エラー率 1.2%</p>
                </div>
                <div className="p-3 bg-destructive/10 rounded-full">
                  <X className="h-5 w-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">処理中</p>
                  <p className="text-2xl font-bold">{stats.inProgress.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">平均 1.8秒/件</p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-full">
                  <Loader2 className="h-5 w-5 text-orange-600 animate-spin" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* タブコンテンツ */}
        <div className="flex-1 overflow-auto px-6 pb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="collect">データ取得</TabsTrigger>
              <TabsTrigger value="monitor">在庫監視</TabsTrigger>
              <TabsTrigger value="history">取得履歴</TabsTrigger>
            </TabsList>

            <TabsContent value="collect" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>URL入力</CardTitle>
                    <span className="text-sm text-muted-foreground">
                      選択中: {selectedPlatforms.length}個のプラットフォーム
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <textarea
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="データ取得するURLを入力（1行1URL）&#10;&#10;例:&#10;https://page.auctions.yahoo.co.jp/jp/auction/xxxxx&#10;https://jp.mercari.com/item/xxxxx"
                    className="w-full p-3 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[150px]"
                  />
                  <div className="flex gap-3 mt-4">
                    <Button 
                      onClick={executeDataCollection}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          処理中...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          データ取得開始
                        </>
                      )}
                    </Button>
                    <Button variant="outline">
                      <Upload className="mr-2 h-4 w-4" />
                      CSVインポート
                    </Button>
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      テンプレート
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 結果表示 */}
              {results.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>取得結果</CardTitle>
                      <Button variant="link" size="sm">
                        <Download className="mr-1 h-3 w-3" />
                        CSVエクスポート
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {results.slice(0, 5).map(result => (
                        <div 
                          key={result.id}
                          className="p-4 rounded-lg border bg-background flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium">{result.title}</h4>
                              <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                                {result.status === 'success' ? '成功' : 'エラー'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>価格: ¥{result.price?.toLocaleString()}</span>
                              <span>•</span>
                              <span>{result.stock}</span>
                              <span>•</span>
                              <span>{result.condition}</span>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    {results.length > 5 && (
                      <div className="mt-4 text-center">
                        <Button variant="link">
                          さらに{results.length - 5}件を表示
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="monitor">
              <Card>
                <CardHeader>
                  <CardTitle>在庫監視設定</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    定期的な在庫チェックと価格変動の監視を設定できます。
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>取得履歴</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    過去のデータ取得結果を確認できます。
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
