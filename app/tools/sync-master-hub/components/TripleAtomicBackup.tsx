'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Database,
  HardDrive,
  GitBranch,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Shield,
  Clock
} from 'lucide-react'

interface BackupHistory {
  local: any[]
  github: any[]
  vps: any[]
}

export default function TripleAtomicBackup() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [history, setHistory] = useState<BackupHistory | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)

  const loadBackupHistory = async () => {
    setLoadingHistory(true)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      
      const response = await fetch('/api/sync/backup-all', {
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      const data = await response.json()
      if (data.success) {
        setHistory(data.backups)
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('Backup history load timeout (30s)')
      } else {
        console.error('Failed to load backup history:', error)
      }
    } finally {
      setLoadingHistory(false)
    }
  }

  const executeTripleBackup = async () => {
    if (!confirm('3つの環境すべてでバックアップを作成します。\n実行時間: 約30〜60秒\n\nよろしいですか？')) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/sync/backup-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        await loadBackupHistory()
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-600" />
            トリプル・アトミック・バックアップ
          </CardTitle>
          <CardDescription>
            Mac、GitHub、VPSの3環境を同時にバックアップ（ZIP/Branch/tar.gz）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg border-2 border-purple-300">
            <Button
              size="lg"
              onClick={executeTripleBackup}
              disabled={loading}
              className="w-full max-w-md h-16 text-lg font-semibold bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                  バックアップ実行中...
                </>
              ) : (
                <>
                  <Shield className="w-6 h-6 mr-2" />
                  トリプルバックアップ実行
                </>
              )}
            </Button>

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
                      <p>成功: {result.summary.successCount} / {result.summary.totalCount}</p>
                      <p>実行時間: {result.summary.executionTime}</p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold">Mac (ZIP)</h3>
              </div>
              {result?.results?.local?.success ? (
                <div className="space-y-1 text-sm">
                  <p className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    完了
                  </p>
                  <p className="text-muted-foreground">
                    {result.results.local.backup?.sizeReadable}
                  </p>
                </div>
              ) : result?.results?.local ? (
                <p className="flex items-center gap-1 text-red-600 text-sm">
                  <XCircle className="w-4 h-4" />
                  失敗
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">待機中</p>
              )}
            </div>

            <div className="p-4 bg-white rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold">GitHub (Branch)</h3>
              </div>
              {result?.results?.github?.success ? (
                <div className="space-y-1 text-sm">
                  <p className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    完了
                  </p>
                  <p className="text-muted-foreground truncate">
                    {result.results.github.backup?.branch}
                  </p>
                </div>
              ) : result?.results?.github ? (
                <p className="flex items-center gap-1 text-red-600 text-sm">
                  <XCircle className="w-4 h-4" />
                  失敗
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">待機中</p>
              )}
            </div>

            <div className="p-4 bg-white rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold">VPS (tar.gz)</h3>
              </div>
              {result?.results?.vps?.success ? (
                <div className="space-y-1 text-sm">
                  <p className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    完了
                  </p>
                  <p className="text-muted-foreground">
                    {result.results.vps.backup?.sizeReadable}
                  </p>
                </div>
              ) : result?.results?.vps ? (
                <p className="flex items-center gap-1 text-red-600 text-sm">
                  <XCircle className="w-4 h-4" />
                  失敗
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">待機中</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              バックアップ履歴
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={loadBackupHistory}
              disabled={loadingHistory}
            >
              {loadingHistory ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
          <CardDescription>
            各環境の最新10件のバックアップを表示（手動読み込み）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : history ? (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  Mac ({history.local?.length || 0})
                </h3>
                <div className="space-y-2">
                  {history.local?.slice(0, 5).map((backup, idx) => (
                    <div key={idx} className="p-2 bg-muted rounded text-sm">
                      <p className="font-medium truncate">{backup.fileName}</p>
                      <p className="text-xs text-muted-foreground">{backup.sizeReadable}</p>
                    </div>
                  ))}
                  {(!history.local || history.local.length === 0) && (
                    <p className="text-sm text-muted-foreground">履歴なし</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  GitHub ({history.github?.length || 0})
                </h3>
                <div className="space-y-2">
                  {history.github?.slice(0, 5).map((backup, idx) => (
                    <div key={idx} className="p-2 bg-muted rounded text-sm">
                      <p className="font-medium truncate">{backup.branch}</p>
                      <p className="text-xs text-muted-foreground">
                        {backup.timestamp || '不明'}
                      </p>
                    </div>
                  ))}
                  {(!history.github || history.github.length === 0) && (
                    <p className="text-sm text-muted-foreground">履歴なし</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  VPS ({history.vps?.length || 0})
                </h3>
                <div className="space-y-2">
                  {history.vps?.slice(0, 5).map((backup, idx) => (
                    <div key={idx} className="p-2 bg-muted rounded text-sm">
                      <p className="font-medium truncate">{backup.fileName}</p>
                      <p className="text-xs text-muted-foreground">{backup.size}</p>
                    </div>
                  ))}
                  {(!history.vps || history.vps.length === 0) && (
                    <p className="text-sm text-muted-foreground">履歴なし</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-semibold">履歴は手動読み込みです</p>
              <p className="text-sm mt-2">右上の更新ボタンをクリックして読み込んでください</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
