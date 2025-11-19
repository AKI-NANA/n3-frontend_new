'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  HardDrive,
  RefreshCw,
  Database,
  GitBranch,
  Cloud,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Download,
  Upload,
  Server,
  History,
  Shield,
  Clock
} from 'lucide-react'

interface LocalCapacity {
  totalGB: number
  usedGB: number
  freeGB: number
  usagePercent: number
  gitReposTotal: number
  gitReposTotalGB: number
  recommendations: string[]
}

interface SyncStatus {
  gitPush: 'pending' | 'running' | 'success' | 'error'
  gitPull: 'pending' | 'running' | 'success' | 'error'
  driveCheck: 'pending' | 'running' | 'success' | 'error'
  vpsSnapshot: 'pending' | 'running' | 'success' | 'error'
  message?: string
  lastExecuted?: string
}

interface Snapshot {
  id: string
  timestamp: string
  type: 'db' | 'code' | 'full'
  status: 'success' | 'failed'
  size?: string
  location?: string
}

export default function SyncMasterHub() {
  const [loading, setLoading] = useState(false)
  const [capacityData, setCapacityData] = useState<LocalCapacity | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    gitPush: 'pending',
    gitPull: 'pending',
    driveCheck: 'pending',
    vpsSnapshot: 'pending',
  })
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null)
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null)
  const [showRecoveryConfirm, setShowRecoveryConfirm] = useState(false)

  // ローカル容量データを取得
  const fetchCapacityData = async () => {
    try {
      const response = await fetch('/api/sync/local-capacity')
      if (!response.ok) throw new Error('容量データの取得に失敗しました')
      const data = await response.json()
      setCapacityData(data)
    } catch (error: any) {
      console.error('容量データ取得エラー:', error)
    }
  }

  // スナップショット一覧を取得
  const fetchSnapshots = async () => {
    try {
      const response = await fetch('/api/sync/get-snapshots')
      if (!response.ok) throw new Error('スナップショットの取得に失敗しました')
      const data = await response.json()
      setSnapshots(data.snapshots || [])
      setLastSyncDate(data.lastSync || null)
    } catch (error: any) {
      console.error('スナップショット取得エラー:', error)
    }
  }

  // 一括同期＆スナップショット実行
  const executeFullSync = async () => {
    setLoading(true)

    // 1. Git Push
    setSyncStatus(prev => ({ ...prev, gitPush: 'running' }))
    try {
      const pushResponse = await fetch('/api/sync/execute-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'git-push' })
      })
      const pushData = await pushResponse.json()

      if (pushData.success) {
        setSyncStatus(prev => ({ ...prev, gitPush: 'success' }))
      } else {
        setSyncStatus(prev => ({ ...prev, gitPush: 'error', message: pushData.message }))
      }
    } catch (error: any) {
      setSyncStatus(prev => ({ ...prev, gitPush: 'error', message: error.message }))
    }

    // 2. Git Pull
    setSyncStatus(prev => ({ ...prev, gitPull: 'running' }))
    try {
      const pullResponse = await fetch('/api/sync/execute-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'git-pull' })
      })
      const pullData = await pullResponse.json()

      if (pullData.success) {
        setSyncStatus(prev => ({ ...prev, gitPull: 'success' }))
      } else {
        setSyncStatus(prev => ({ ...prev, gitPull: 'error', message: pullData.message }))
      }
    } catch (error: any) {
      setSyncStatus(prev => ({ ...prev, gitPull: 'error', message: error.message }))
    }

    // 3. Drive同期チェック
    setSyncStatus(prev => ({ ...prev, driveCheck: 'running' }))
    try {
      const driveResponse = await fetch('/api/sync/execute-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'drive-check' })
      })
      const driveData = await driveResponse.json()

      if (driveData.success) {
        setSyncStatus(prev => ({ ...prev, driveCheck: 'success' }))
      } else {
        setSyncStatus(prev => ({ ...prev, driveCheck: 'error', message: driveData.message }))
      }
    } catch (error: any) {
      setSyncStatus(prev => ({ ...prev, driveCheck: 'error', message: error.message }))
    }

    // 4. VPSスナップショット
    setSyncStatus(prev => ({ ...prev, vpsSnapshot: 'running' }))
    try {
      const snapshotResponse = await fetch('/api/sync/execute-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vps-snapshot' })
      })
      const snapshotData = await snapshotResponse.json()

      if (snapshotData.success) {
        setSyncStatus(prev => ({ ...prev, vpsSnapshot: 'success' }))
        setLastSyncDate(new Date().toISOString())
      } else {
        setSyncStatus(prev => ({ ...prev, vpsSnapshot: 'error', message: snapshotData.message }))
      }
    } catch (error: any) {
      setSyncStatus(prev => ({ ...prev, vpsSnapshot: 'error', message: error.message }))
    }

    setLoading(false)

    // 完了後、データを再取得
    await fetchSnapshots()
    await fetchCapacityData()
  }

  // リカバリ実行
  const executeRecovery = async (snapshotId: string) => {
    if (!confirm('本当にこの時点にリカバリしますか？この操作は元に戻せません。')) {
      return
    }

    try {
      const response = await fetch('/api/sync/execute-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId })
      })

      const data = await response.json()

      if (data.success) {
        alert('リカバリが完了しました')
        await fetchSnapshots()
      } else {
        alert(`リカバリに失敗しました: ${data.message}`)
      }
    } catch (error: any) {
      alert(`リカバリエラー: ${error.message}`)
    }
  }

  // 初期データ読み込み
  useEffect(() => {
    fetchCapacityData()
    fetchSnapshots()
  }, [])

  // ステータスアイコンの取得
  const getStatusIcon = (status: 'pending' | 'running' | 'success' | 'error') => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SyncMaster Hub</h1>
          <p className="text-muted-foreground mt-1">
            統合バックアップ＆一括同期管理システム
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Server className="w-4 h-4 mr-2" />
          SDIM クライアント
        </Badge>
      </div>

      {/* 1. Mac/ローカル容量監視モジュール */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Mac/ローカル容量監視
          </CardTitle>
          <CardDescription>
            ローカル環境のストレージ使用状況とGitリポジトリ容量を監視
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {capacityData ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Mac SSD 容量</span>
                  <span className="font-semibold">
                    {capacityData.usedGB.toFixed(1)}GB / {capacityData.totalGB.toFixed(1)}GB
                    （空き {capacityData.usagePercent.toFixed(0)}%）
                  </span>
                </div>
                <Progress value={capacityData.usagePercent} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">ローカルGit合計容量</p>
                  <p className="text-2xl font-bold">
                    {capacityData.gitReposTotalGB.toFixed(2)} GB
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {capacityData.gitReposTotal} リポジトリ
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">空き容量</p>
                  <p className="text-2xl font-bold text-green-600">
                    {capacityData.freeGB.toFixed(1)} GB
                  </p>
                </div>
              </div>

              {capacityData.recommendations.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-2">推奨事項:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {capacityData.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm">{rec}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. 統合同期＆バックアップパネル */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            統合同期＆バックアップ
          </CardTitle>
          <CardDescription>
            Git、Drive、VPSデータベースの一括同期とバックアップ実行
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* メインボタン */}
          <div className="flex flex-col items-center gap-4 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
            <Button
              size="lg"
              onClick={executeFullSync}
              disabled={loading}
              className="w-full max-w-md h-16 text-lg font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                  同期実行中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-6 h-6 mr-2" />
                  一括同期＆スナップショット実行
                </>
              )}
            </Button>

            {lastSyncDate && (
              <p className="text-sm text-muted-foreground">
                最終実行: {new Date(lastSyncDate).toLocaleString('ja-JP')}
              </p>
            )}
          </div>

          {/* 実行状況 */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">実行状況</h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(syncStatus.gitPush)}
                  <div>
                    <p className="font-medium">1. Git Push</p>
                    <p className="text-xs text-muted-foreground">
                      ローカルの変更をリモートに保存
                    </p>
                  </div>
                </div>
                <Upload className="w-4 h-4 text-muted-foreground" />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(syncStatus.gitPull)}
                  <div>
                    <p className="font-medium">2. Git Pull</p>
                    <p className="text-xs text-muted-foreground">
                      最新のコードを取得
                    </p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-muted-foreground" />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(syncStatus.driveCheck)}
                  <div>
                    <p className="font-medium">3. Drive同期チェック</p>
                    <p className="text-xs text-muted-foreground">
                      Google Drive/Dropbox同期確認
                    </p>
                  </div>
                </div>
                <Cloud className="w-4 h-4 text-muted-foreground" />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(syncStatus.vpsSnapshot)}
                  <div>
                    <p className="font-medium">4. VPSスナップショット</p>
                    <p className="text-xs text-muted-foreground">
                      DBとコードを自動バックアップ
                    </p>
                  </div>
                </div>
                <Database className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. VPSリカバリ・ステータスモジュール */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            VPSリカバリ・ステータス
          </CardTitle>
          <CardDescription>
            バックアップ履歴の確認とポイントインタイムリカバリ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {snapshots.length > 0 ? (
            <div className="space-y-2">
              {snapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <History className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {new Date(snapshot.timestamp).toLocaleString('ja-JP')}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={snapshot.type === 'full' ? 'default' : 'secondary'}>
                          {snapshot.type.toUpperCase()}
                        </Badge>
                        <Badge variant={snapshot.status === 'success' ? 'default' : 'destructive'}>
                          {snapshot.status === 'success' ? '成功' : '失敗'}
                        </Badge>
                        {snapshot.size && (
                          <span className="text-xs text-muted-foreground">{snapshot.size}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {snapshot.status === 'success' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => executeRecovery(snapshot.id)}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      リカバリ
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>スナップショット履歴がありません</p>
              <p className="text-sm mt-1">
                「一括同期＆スナップショット実行」ボタンから最初のバックアップを作成してください
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
