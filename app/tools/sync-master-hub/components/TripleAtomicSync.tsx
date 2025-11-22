'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Activity,
  GitBranch,
  Database,
  HardDrive
} from 'lucide-react'

interface SyncStep {
  name: string
  status: 'pending' | 'running' | 'success' | 'error'
  message?: string
  details?: any
}

export default function TripleAtomicSync() {
  const [loading, setLoading] = useState(false)
  const [commitMessage, setCommitMessage] = useState('chore: triple atomic sync')
  const [syncMode, setSyncMode] = useState<'differential' | 'clean'>('differential')
  const [result, setResult] = useState<any>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [steps, setSteps] = useState<SyncStep[]>([])

  const executeSync = async () => {
    if (!commitMessage.trim()) {
      alert('コミットメッセージを入力してください')
      return
    }

    if (!confirm('トリプル・アトミック同期を実行します。\n\nMac → GitHub → VPS を完全同期します。\n実行時間: 約2〜5分\n\nよろしいですか？')) {
      return
    }

    setLoading(true)
    setResult(null)
    setLogs([])
    setSteps([])

    try {
      const response = await fetch('/api/sync/triple-atomic-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commitMessage, syncMode })
      })

      const data = await response.json()
      setResult(data)
      setLogs(data.logs || [])
      setSteps(data.steps || [])

      if (data.conflict) {
        alert('競合が発生しました！\n\nAI競合解消タブで解決してください。\n\n競合ファイル:\n' + data.conflictFiles.join('\n'))
      }

    } catch (error: any) {
      setResult({
        success: false,
        error: error.message
      })
      setLogs([...logs, `❌ エラー: ${error.message}`])
    } finally {
      setLoading(false)
    }
  }

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Activity className="w-5 h-5 text-gray-400" />
    }
  }

  const getStepLabel = (name: string) => {
    const labels: Record<string, string> = {
      hygiene_check: '衛生チェック',
      backup_all: 'トリプルバックアップ',
      git_pull: 'Git Pull',
      git_push: 'Git Push',
      vps_sync: 'VPS同期',
      verification: '同期検証'
    }
    return labels[name] || name
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-blue-600" />
            トリプル・アトミック同期
          </CardTitle>
          <CardDescription>
            Mac → GitHub → VPS を完全同期（バックアップ自動作成）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="commitMessage">コミットメッセージ</Label>
            <Input
              id="commitMessage"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="例: feat: 新機能追加"
              disabled={loading}
            />
          </div>

          <div className="space-y-3">
            <Label>同期モード</Label>
            <div className="flex gap-4">
              <div 
                className={`flex-1 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  syncMode === 'differential' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => !loading && setSyncMode('differential')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    checked={syncMode === 'differential'}
                    onChange={() => setSyncMode('differential')}
                    disabled={loading}
                    className="w-4 h-4"
                  />
                  <span className="font-semibold">📊 差分同期</span>
                  <Badge variant="secondary">推奨</Badge>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  変更分のみを同期（通常の開発作業向け）
                </p>
              </div>

              <div 
                className={`flex-1 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  syncMode === 'clean' 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => !loading && setSyncMode('clean')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    checked={syncMode === 'clean'}
                    onChange={() => setSyncMode('clean')}
                    disabled={loading}
                    className="w-4 h-4"
                  />
                  <span className="font-semibold">🧼 クリーン同期</span>
                  <Badge variant="destructive">完全上書き</Badge>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  VPSを完全削除して再構築（確実な同期）
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg border-2 border-blue-300">
            <Button
              size="lg"
              onClick={executeSync}
              disabled={loading}
              className="w-full max-w-md h-16 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                  同期実行中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-6 h-6 mr-2" />
                  トリプル・アトミック同期実行
                </>
              )}
            </Button>
          </div>

          {result && (
            <Alert className={result.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription>
                <p className="font-semibold">{result.message}</p>
                {result.summary && (
                  <div className="mt-2 text-sm space-y-1">
                    <p>実行時間: {result.summary.executionTime}</p>
                    <p>
                      同期状態:{' '}
                      {result.summary.allSynced ? (
                        <Badge variant="default" className="ml-1">完全同期</Badge>
                      ) : (
                        <Badge variant="destructive" className="ml-1">不一致あり</Badge>
                      )}
                    </p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>実行ステータス</CardTitle>
            <CardDescription>各ステップの進行状況</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  step.status === 'success' ? 'bg-green-50 border-green-200' :
                  step.status === 'error' ? 'bg-red-50 border-red-200' :
                  step.status === 'running' ? 'bg-blue-50 border-blue-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStepIcon(step.status)}
                    <div>
                      <p className="font-medium">
                        {idx + 1}. {getStepLabel(step.name)}
                      </p>
                      {step.message && (
                        <p className="text-sm text-muted-foreground">{step.message}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={
                    step.status === 'success' ? 'default' :
                    step.status === 'error' ? 'destructive' :
                    step.status === 'running' ? 'secondary' :
                    'outline'
                  }>
                    {step.status === 'pending' ? '待機中' :
                     step.status === 'running' ? '実行中' :
                     step.status === 'success' ? '完了' :
                     'エラー'}
                  </Badge>
                </div>

                {step.details && step.name === 'verification' && (
                  <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4" />
                      <span>Mac: {step.details.local}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4" />
                      <span>GitHub: {step.details.github}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      <span>VPS: {step.details.vps}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>実行ログ</CardTitle>
            <CardDescription>詳細な実行履歴</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {logs.map((log, idx) => (
                <div key={idx}>{log}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
