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
  const [selectedResult, setSelectedResult] = useState<any | null>(null)
  const [selectedResultIds, setSelectedResultIds] = useState<number[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [stats, setStats] = useState({
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

      // 結果を追加
      const newResults = [...data.results, ...results]
      setResults(newResults)

      // 統計を更新（累積）
      if (data.stats) {
        setStats(prev => ({
          total: prev.total + data.stats.total,
          success: prev.success + data.stats.success,
          failed: prev.failed + data.stats.failed,
          inProgress: 0
        }))
      }
    } catch (error) {
      console.error('データ取得エラー:', error)
      alert('データ取得に失敗しました')
    } finally {
      setIsLoading(false)
      setUrlInput('')
    }
  }

  // チェックボックスの選択/解除
  const toggleResultSelection = (resultId: number) => {
    setSelectedResultIds(prev =>
      prev.includes(resultId)
        ? prev.filter(id => id !== resultId)
        : [...prev, resultId]
    )
  }

  // 全選択/全解除
  const toggleAllResults = () => {
    if (selectedResultIds.length === results.length) {
      setSelectedResultIds([])
    } else {
      setSelectedResultIds(results.map(r => r.id))
    }
  }

  // インポート実行
  const handleImport = async () => {
    if (selectedResultIds.length === 0) {
      alert('インポートする商品を選択してください')
      return
    }

    const confirmed = confirm(`${selectedResultIds.length}件の商品を商品マスターにインポートしますか？`)
    if (!confirmed) return

    setIsImporting(true)

    try {
      const response = await fetch('/api/scraped-products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scrapedIds: selectedResultIds
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'インポートに失敗しました')
      }

      alert(`✅ ${data.imported}件の商品をインポートしました\n❌ ${data.failed}件が失敗しました`)

      // 選択をクリア
      setSelectedResultIds([])

      // オプション: /tools/editingにリダイレクト
      if (data.imported > 0) {
        const redirect = confirm('商品編集ページに移動しますか？')
        if (redirect) {
          window.location.href = '/tools/editing'
        }
      }

    } catch (error) {
      console.error('インポートエラー:', error)
      alert('インポートに失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'))
    } finally {
      setIsImporting(false)
    }
  }

  // CSVエクスポート
  const handleExportCSV = () => {
    if (results.length === 0) {
      alert('エクスポートするデータがありません')
      return
    }

    // CSVヘッダー
    const headers = ['タイトル', '価格', 'URL', '在庫状況', 'コンディション', '入札数', 'ステータス', '取得日時']

    // CSVデータ
    const rows = results.map(result => [
      result.title || '',
      result.price || '',
      result.url || '',
      result.stock || '',
      result.condition || '',
      result.bids || '',
      result.status || '',
      result.timestamp || ''
    ])

    // CSV文字列を作成
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // BOMを追加（Excelで文字化けしないように）
    const bom = '\uFEFF'
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })

    // ダウンロード
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `scraping_results_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    alert(`${results.length}件をCSVエクスポートしました`)
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
                      <div className="flex items-center gap-3">
                        <CardTitle>取得結果 ({results.length}件)</CardTitle>
                        {selectedResultIds.length > 0 && (
                          <Badge variant="secondary">
                            {selectedResultIds.length}件選択中
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedResultIds.length > 0 && (
                          <Button onClick={handleImport} disabled={isImporting}>
                            {isImporting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                インポート中...
                              </>
                            ) : (
                              <>
                                <Upload className="mr-2 h-4 w-4" />
                                商品として登録
                              </>
                            )}
                          </Button>
                        )}
                        <Button variant="link" size="sm" onClick={handleExportCSV}>
                          <Download className="mr-1 h-3 w-3" />
                          CSVエクスポート
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedResultIds.length === results.length && results.length > 0}
                        onChange={toggleAllResults}
                        className="rounded border-input"
                      />
                      <span className="text-sm text-muted-foreground">全て選択</span>
                    </div>
                    <div className="space-y-3">
                      {results.slice(0, 5).map(result => (
                        <div
                          key={result.id}
                          className="p-4 rounded-lg border bg-background flex items-center gap-3"
                        >
                          <input
                            type="checkbox"
                            checked={selectedResultIds.includes(result.id)}
                            onChange={() => toggleResultSelection(result.id)}
                            className="rounded border-input"
                          />
                          <div className="flex-1" onClick={() => setSelectedResult(result)} style={{ cursor: 'pointer' }}>
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium">{result.title}</h4>
                              <Badge variant={
                                result.status === 'success' ? 'default' :
                                result.status === 'partial' ? 'secondary' :
                                'destructive'
                              }>
                                {result.status === 'success' ? '成功' :
                                 result.status === 'partial' ? '部分成功' :
                                 'エラー'}
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
                          <Button variant="ghost" size="icon" onClick={() => setSelectedResult(result)}>
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

      {/* 詳細モーダル */}
      {selectedResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedResult(null)}>
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">スクレイピング詳細</h2>
              <Button variant="ghost" size="icon" onClick={() => setSelectedResult(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* タイトルとステータス */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-medium">{selectedResult.title}</h3>
                  <Badge variant={
                    selectedResult.status === 'success' ? 'default' :
                    selectedResult.status === 'partial' ? 'secondary' :
                    'destructive'
                  }>
                    {selectedResult.status === 'success' ? '成功' :
                     selectedResult.status === 'partial' ? '部分成功' :
                     'エラー'}
                  </Badge>
                </div>
                <a href={selectedResult.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline flex items-center gap-1">
                  {selectedResult.url} <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* 価格情報 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">価格情報</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">価格</p>
                    <p className="text-xl font-bold">¥{selectedResult.price?.toLocaleString() || '不明'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">送料</p>
                    <p className="text-xl font-bold">
                      {selectedResult.shippingCost === 0 ? '無料' :
                       selectedResult.shippingCost ? `¥${selectedResult.shippingCost.toLocaleString()}` : '不明'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">仕入れ値（合計）</p>
                    <p className="text-2xl font-bold text-green-600">
                      ¥{selectedResult.totalCost?.toLocaleString() || '不明'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">プラットフォーム</p>
                    <p className="text-lg font-medium">{selectedResult.platform}</p>
                  </div>
                </CardContent>
              </Card>

              {/* 商品情報 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">商品情報</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedResult.condition && (
                    <div>
                      <p className="text-sm text-muted-foreground">商品の状態</p>
                      <p>{selectedResult.condition}</p>
                    </div>
                  )}
                  {selectedResult.categoryPath && (
                    <div>
                      <p className="text-sm text-muted-foreground">カテゴリ</p>
                      <p>{selectedResult.categoryPath}</p>
                    </div>
                  )}
                  {selectedResult.auctionId && (
                    <div>
                      <p className="text-sm text-muted-foreground">商品ID</p>
                      <p className="font-mono">{selectedResult.auctionId}</p>
                    </div>
                  )}
                  {selectedResult.quantity && (
                    <div>
                      <p className="text-sm text-muted-foreground">個数</p>
                      <p>{selectedResult.quantity}</p>
                    </div>
                  )}
                  {selectedResult.shippingDays && (
                    <div>
                      <p className="text-sm text-muted-foreground">発送日数</p>
                      <p>{selectedResult.shippingDays}</p>
                    </div>
                  )}
                  {selectedResult.bids && (
                    <div>
                      <p className="text-sm text-muted-foreground">入札数</p>
                      <p>{selectedResult.bids}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 画像 */}
              {selectedResult.images && selectedResult.images.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">商品画像 ({selectedResult.images.length}枚)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {selectedResult.images.map((img: string, idx: number) => (
                        <div key={idx} className="border rounded overflow-hidden">
                          <img
                            src={img}
                            alt={`商品画像 ${idx + 1}`}
                            className="w-full h-40 object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 商品説明 */}
              {selectedResult.description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">商品説明</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm">{selectedResult.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* データ品質 */}
              {selectedResult.dataQuality && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">データ品質</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {Object.entries(selectedResult.dataQuality).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          {value ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-500" />}
                          <span className={value ? 'text-green-700' : 'text-red-700'}>
                            {key.replace('Found', '')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 警告 */}
              {selectedResult.warnings && selectedResult.warnings.length > 0 && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardHeader>
                    <CardTitle className="text-base text-yellow-800">警告</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                      {selectedResult.warnings.map((warning: string, idx: number) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* エラー */}
              {selectedResult.error && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-base text-red-800">エラー</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-red-700">{selectedResult.error}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
