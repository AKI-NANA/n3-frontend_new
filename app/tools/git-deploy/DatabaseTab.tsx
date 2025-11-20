'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Database,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Play,
  RotateCcw,
  Terminal
} from 'lucide-react'

export default function DatabaseTab() {
  const [migrations, setMigrations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [operationResult, setOperationResult] = useState<any>(null)

  useEffect(() => {
    loadMigrations()
  }, [])

  const loadMigrations = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/database/migrate')
      const data = await response.json()
      if (data.success) {
        setMigrations(data.migrations)
      }
    } catch (error) {
      console.error('Failed to load migrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMigration = async (migrationId: string, action: 'apply' | 'rollback') => {
    setOperationResult(null)
    setLoading(true)

    try {
      const response = await fetch('/api/database/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ migrationId, action })
      })

      const data = await response.json()
      setOperationResult(data)

      if (data.success) {
        await loadMigrations()
      }
    } catch (error) {
      console.error('Migration operation failed:', error)
      setOperationResult({
        success: false,
        message: 'マイグレーション操作に失敗しました'
      })
    } finally {
      setLoading(false)
    }
  }

  const pendingMigrations = migrations.filter(m => !m.applied)
  const appliedMigrations = migrations.filter(m => m.applied)

  return (
    <div className="space-y-6">
      {/* サマリー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            📊 マイグレーション状態
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold">{migrations.length}</div>
              <div className="text-sm text-muted-foreground">合計</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{appliedMigrations.length}</div>
              <div className="text-sm text-muted-foreground">適用済み</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{pendingMigrations.length}</div>
              <div className="text-sm text-muted-foreground">未適用</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supabase CLI案内 */}
      <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
        <Terminal className="w-4 h-4 text-blue-600" />
        <AlertDescription>
          <strong>💡 マイグレーション管理について:</strong><br/>
          Supabaseプロジェクトでは、マイグレーションはSupabase CLIで管理することを推奨します。
          <div className="mt-3 bg-slate-900 text-green-400 p-3 rounded text-xs font-mono">
            <div># マイグレーション適用</div>
            <div>supabase db push</div>
            <div className="mt-2"># マイグレーション作成</div>
            <div>supabase migration new &lt;migration_name&gt;</div>
            <div className="mt-2"># マイグレーション修復</div>
            <div>supabase migration repair</div>
          </div>
        </AlertDescription>
      </Alert>

      {/* 未適用マイグレーション */}
      {pendingMigrations.length > 0 && (
        <Card className="border-2 border-yellow-200 dark:border-yellow-800">
          <CardHeader className="bg-yellow-50 dark:bg-yellow-900/20">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              ⚠️ 未適用のマイグレーション
            </CardTitle>
            <CardDescription>
              以下のマイグレーションがまだ適用されていません
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {pendingMigrations.map((migration, idx) => (
              <div key={migration.id} className="border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="font-mono text-sm font-semibold">{migration.name}</div>
                  <div className="text-xs text-muted-foreground">ID: {migration.id}</div>
                </div>
                <Button
                  onClick={() => handleMigration(migration.id, 'apply')}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                  className="bg-green-50 hover:bg-green-100"
                >
                  <Terminal className="w-3 h-3 mr-1" />
                  CLI実行
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {pendingMigrations.length === 0 && migrations.length > 0 && (
        <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription>
            ✅ <strong>すべてのマイグレーションが適用されています！</strong>
          </AlertDescription>
        </Alert>
      )}

      {migrations.length === 0 && !loading && (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            マイグレーションファイルが見つかりません。<br/>
            <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs">
              supabase/migrations/
            </code> ディレクトリにマイグレーションファイルを配置してください。
          </AlertDescription>
        </Alert>
      )}

      {/* 適用済みマイグレーション */}
      {appliedMigrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              ✅ 適用済みマイグレーション
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {appliedMigrations.map((migration) => (
              <div key={migration.id} className="border rounded p-3 flex items-center justify-between bg-green-50/50 dark:bg-green-900/10">
                <div>
                  <div className="font-mono text-sm">{migration.name}</div>
                  <div className="text-xs text-muted-foreground">
                    適用日時: {migration.appliedAt ? new Date(migration.appliedAt).toLocaleString('ja-JP') : 'N/A'}
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-100 dark:bg-green-900/20">
                  適用済み
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 操作結果 */}
      {operationResult && (
        <Alert variant={operationResult.success ? 'default' : 'destructive'}>
          {operationResult.success ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          <AlertDescription>
            {operationResult.message}
            {operationResult.command && (
              <div className="mt-3 bg-slate-900 text-green-400 p-3 rounded text-xs font-mono">
                $ {operationResult.command}
              </div>
            )}
            {operationResult.logs && (
              <div className="mt-3 bg-slate-900 text-green-400 p-3 rounded text-xs font-mono max-h-32 overflow-y-auto">
                {operationResult.logs.map((log: string, idx: number) => (
                  <div key={idx}>{log}</div>
                ))}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
