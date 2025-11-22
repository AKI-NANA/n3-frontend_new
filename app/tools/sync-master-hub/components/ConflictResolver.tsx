'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Copy,
  RefreshCw,
  Sparkles,
  FileWarning,
  Code
} from 'lucide-react'

interface ConflictFile {
  file: string
  conflictCount: number
  exists: boolean
}

export default function ConflictResolver() {
  const [loading, setLoading] = useState(false)
  const [conflicts, setConflicts] = useState<ConflictFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [resolution, setResolution] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [resolving, setResolving] = useState(false)

  const [applying, setApplying] = useState(false)

  const loadConflicts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/sync/resolve-conflict')
      const data = await response.json()
      if (data.success) {
        setConflicts(data.conflicts || [])
      }
    } catch (error) {
      console.error('Failed to load conflicts:', error)
    } finally {
      setLoading(false)
    }
  }

  const resolveConflict = async (file: string) => {
    setResolving(true)
    setResolution(null)
    try {
      const response = await fetch('/api/sync/resolve-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conflictFile: file })
      })
      const data = await response.json()
      if (data.success) {
        setResolution(data)
        setSelectedFile(file)
      } else {
        alert(`エラー: ${data.error}`)
      }
    } catch (error: any) {
      alert(`エラー: ${error.message}`)
    } finally {
      setResolving(false)
    }
  }

  // ワンクリック自動適用
  const applyResolution = async () => {
    if (!confirm('AI統合案をファイルに自動適用します。\n\nバックアップを作成してから適用します。\nよろしいですか？')) {
      return
    }

    setApplying(true)
    try {
      const response = await fetch('/api/sync/apply-resolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conflictFile: resolution.conflict.file,
          resolvedContent: resolution.resolvedFileContent
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('✅ 競合解決を適用しました！\n\ngit commitして完了してください。\n\nバックアップ: ' + data.backup)
        setResolution(null)
        setSelectedFile(null)
        loadConflicts()
      } else {
        alert(`エラー: ${data.error}`)
      }
    } catch (error: any) {
      alert(`エラー: ${error.message}`)
    } finally {
      setApplying(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    loadConflicts()
  }, [])

  return (
    <div className="space-y-6">
      <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-orange-600" />
            AI競合解消アシスタント
          </CardTitle>
          <CardDescription>Git競合をClaudeが自動で解決（統合案を生成）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                競合ファイル: <span className="font-semibold text-orange-600">{conflicts.length}件</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                総競合数: <span className="font-semibold text-orange-600">
                  {conflicts.reduce((sum, c) => sum + c.conflictCount, 0)}箇所
                </span>
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={loadConflicts} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {conflicts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>競合ファイル一覧</CardTitle>
            <CardDescription>ファイルを選択してAIによる統合案を生成</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {conflicts.map((conflict, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <FileWarning className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-medium">{conflict.file}</p>
                    <p className="text-sm text-muted-foreground">競合箇所: {conflict.conflictCount}箇所</p>
                  </div>
                </div>
                <Button onClick={() => resolveConflict(conflict.file)} disabled={resolving} className="bg-orange-600 hover:bg-orange-700">
                  {resolving && selectedFile === conflict.file ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      解析中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      AI統合案を生成
                    </>
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
              <p className="font-semibold">競合ファイルはありません</p>
              <p className="text-sm mt-2">すべての変更が正常にマージされています</p>
            </div>
          </CardContent>
        </Card>
      )}

      {resolution && (
        <Card className="border-2 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              AI統合案
            </CardTitle>
            <CardDescription>
              {resolution.conflict.file} - {resolution.conflict.currentConflict}/{resolution.conflict.totalConflicts}箇所目
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <p className="font-semibold">{resolution.message}</p>
                {resolution.conflict.totalConflicts > 1 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    残り {resolution.conflict.totalConflicts - 1}箇所の競合があります
                  </p>
                )}
              </AlertDescription>
            </Alert>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">Mac側 (HEAD)</Badge>
              </div>
              <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <pre>{resolution.conflict.macSide}</pre>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">Git Origin側</Badge>
              </div>
              <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <pre>{resolution.conflict.gitSide}</pre>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-600">AIによる統合コード</Badge>
                  <Sparkles className="w-4 h-4 text-green-600" />
                </div>
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(resolution.conflict.resolvedCode)}>
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                      コピー済み
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      コピー
                    </>
                  )}
                </Button>
              </div>
              <div className="bg-gradient-to-r from-green-900 to-blue-900 text-green-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <pre>{resolution.conflict.resolvedCode}</pre>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">適用方法:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>上の「コピー」ボタンで統合コードをコピー</li>
                  <li>エディタで <code className="bg-muted px-1 py-0.5 rounded">{resolution.conflict.file}</code> を開く</li>
                  <li>競合マーカー（&lt;&lt;&lt;&lt;&lt;&lt;&lt; から &gt;&gt;&gt;&gt;&gt;&gt;&gt; まで）を削除</li>
                  <li>コピーした統合コードを貼り付け</li>
                  <li>保存してコミット</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => copyToClipboard(resolution.resolvedFileContent)}
                disabled={applying}
              >
                <Code className="w-4 h-4 mr-2" />
                ファイル全体をコピー
              </Button>
              <Button
                onClick={applyResolution}
                disabled={applying}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {applying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    適用中...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    ワンクリック自動適用
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setResolution(null)
                  setSelectedFile(null)
                  loadConflicts()
                }}
                disabled={applying}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                次の競合を解決
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
