'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Loader2, 
  Package, 
  Zap, 
  Plane,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Trash2,
  Download,
  Database
} from 'lucide-react'
import Link from 'next/link'

interface RateTableStats {
  RT_Standard: { entries: number; countries: number; weight_ranges: number }
  RT_Express: { entries: number; countries: number; weight_ranges: number }
  RT_Economy: { entries: number; countries: number; weight_ranges: number }
  total: number
}

interface RateTableEntry {
  id: number
  weight_from_kg: number
  weight_to_kg: number
  country_code: string
  country_name: string
  recommended_price_usd: number
  additional_item_usd: number
  service_name: string
}

export default function RateTablesPage() {
  const [stats, setStats] = useState<RateTableStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [rebuilding, setRebuilding] = useState(false)
  const [previewTable, setPreviewTable] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<RateTableEntry[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 統計情報読み込み
  const loadStats = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ebay/rate-tables')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('統計取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  // 初期読み込み
  useEffect(() => {
    loadStats()
  }, [])

  // Rate Table再構築
  const handleRebuild = async () => {
    if (!confirm('⚠️ Rate Tableを再構築します。\n\n変更内容:\n- 重量帯を60種類に統一\n- アフリカ諸国を1つにまとめる\n- USAを除外\n\n既存のデータは上書きされます。よろしいですか？')) {
      return
    }

    setRebuilding(true)
    setMessage(null)

    try {
      const response = await fetch('/api/ebay/rate-tables/rebuild', {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `✅ Rate Table再構築完了: ${data.totalEntries.toLocaleString()}件` 
        })
        await loadStats()
      } else {
        setMessage({ 
          type: 'error', 
          text: `❌ エラー: ${data.error || '再構築に失敗しました'}` 
        })
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: `❌ エラー: ${(error as Error).message}` 
      })
    } finally {
      setRebuilding(false)
    }
  }

  // Rate Table生成
  const handleGenerate = async () => {
    if (!confirm('Rate Tableを生成します。既存のデータは上書きされます。よろしいですか？')) {
      return
    }

    setGenerating(true)
    setMessage(null)

    try {
      const response = await fetch('/api/ebay/rate-tables', {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `✅ ${data.total_entries}件のRate Tableを生成しました` 
        })
        await loadStats()
      } else {
        setMessage({ 
          type: 'error', 
          text: `❌ エラー: ${data.error || '生成に失敗しました'}` 
        })
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: `❌ エラー: ${(error as Error).message}` 
      })
    } finally {
      setGenerating(false)
    }
  }

  // プレビュー表示
  const handlePreview = async (tableName: string) => {
    setLoading(true)
    setPreviewTable(tableName)

    try {
      const response = await fetch(`/api/ebay/rate-tables?preview=true&table=${tableName}&limit=50`)
      const data = await response.json()

      if (data.success) {
        setPreviewData(data.data)
      }
    } catch (error) {
      console.error('プレビュー取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  // 全削除
  const handleDelete = async () => {
    if (!confirm('全Rate Tableを削除します。本当によろしいですか？')) {
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/ebay/rate-tables', {
        method: 'DELETE'
      })
      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: '✅ 全Rate Tableを削除しました' })
        setStats(null)
        setPreviewTable(null)
        setPreviewData([])
      }
    } catch (error) {
      setMessage({ type: 'error', text: `❌ エラー: ${(error as Error).message}` })
    } finally {
      setLoading(false)
    }
  }

  const getRateTableIcon = (name: string) => {
    if (name.includes('Standard')) return <Package className="h-5 w-5" />
    if (name.includes('Express')) return <Zap className="h-5 w-5" />
    if (name.includes('Economy')) return <Plane className="h-5 w-5" />
    return <Package className="h-5 w-5" />
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">eBay Rate Tables</h1>
          <p className="text-muted-foreground mt-2">
            配送ポリシー用のRate Tableを管理
          </p>
        </div>
        
        <div className="flex gap-2">
          <Link href="/ebay/rate-tables-detail">
            <Button variant="outline">
              <Database className="h-4 w-4 mr-2" />
              詳細データ確認
            </Button>
          </Link>
          
          <Button
            onClick={loadStats}
            variant="outline"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            更新
          </Button>
          
          <Button
            onClick={handleDelete}
            variant="outline"
            disabled={loading || !stats}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            全削除
          </Button>
          
          <Button
            onClick={handleRebuild}
            variant="outline"
            disabled={rebuilding || loading}
            className="bg-orange-50 hover:bg-orange-100 border-orange-300"
          >
            {rebuilding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                再構築中...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Rate Table再構築
              </>
            )}
          </Button>
          
          <Button
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Rate Table生成
              </>
            )}
          </Button>
        </div>
      </div>

      {/* メッセージ */}
      {message && (
        <Card className={message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {message.text}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 統計カード */}
      {stats ? (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Standard */}
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                RT_Standard
              </CardTitle>
              <CardDescription>標準配送（郵便等）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">総データ数:</span>
                <span className="font-bold">{stats.RT_Standard.entries.toLocaleString()}件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">対応国数:</span>
                <span className="font-bold">{stats.RT_Standard.countries}カ国</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">重量帯:</span>
                <span className="font-bold">{stats.RT_Standard.weight_ranges}種類</span>
              </div>
              <Button 
                onClick={() => handlePreview('RT_Standard')}
                variant="outline"
                className="w-full mt-4"
              >
                <Eye className="h-4 w-4 mr-2" />
                プレビュー
              </Button>
            </CardContent>
          </Card>

          {/* Express */}
          <Card className="border-yellow-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                RT_Express
              </CardTitle>
              <CardDescription>速達便（FedEx/DHL等）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">総データ数:</span>
                <span className="font-bold">{stats.RT_Express.entries.toLocaleString()}件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">対応国数:</span>
                <span className="font-bold">{stats.RT_Express.countries}カ国</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">重量帯:</span>
                <span className="font-bold">{stats.RT_Express.weight_ranges}種類</span>
              </div>
              <Button 
                onClick={() => handlePreview('RT_Express')}
                variant="outline"
                className="w-full mt-4"
              >
                <Eye className="h-4 w-4 mr-2" />
                プレビュー
              </Button>
            </CardContent>
          </Card>

          {/* Economy */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5 text-green-600" />
                RT_Economy
              </CardTitle>
              <CardDescription>エコノミー便</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">総データ数:</span>
                <span className="font-bold">{stats.RT_Economy.entries.toLocaleString()}件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">対応国数:</span>
                <span className="font-bold">{stats.RT_Economy.countries}カ国</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">重量帯:</span>
                <span className="font-bold">{stats.RT_Economy.weight_ranges}種類</span>
              </div>
              <Button 
                onClick={() => handlePreview('RT_Economy')}
                variant="outline"
                className="w-full mt-4"
              >
                <Eye className="h-4 w-4 mr-2" />
                プレビュー
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Rate Tableが存在しません。上部の「Rate Table生成」ボタンから作成してください。
            </p>
          </CardContent>
        </Card>
      )}

      {/* プレビューテーブル */}
      {previewTable && previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getRateTableIcon(previewTable)}
              {previewTable} プレビュー（先頭50件）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>重量範囲</TableHead>
                    <TableHead>国コード</TableHead>
                    <TableHead>国名</TableHead>
                    <TableHead className="text-right">推奨価格</TableHead>
                    <TableHead className="text-right">追加アイテム</TableHead>
                    <TableHead>サービス</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-sm">
                        {entry.weight_from_kg}kg - {entry.weight_to_kg}kg
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.country_code}</Badge>
                      </TableCell>
                      <TableCell>{entry.country_name}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ${entry.recommended_price_usd.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ${entry.additional_item_usd.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {entry.service_name}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
