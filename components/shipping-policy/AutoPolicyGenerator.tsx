'use client'

import { useState, useEffect } from 'react'
import { Package, Trash2, AlertCircle, CheckCircle, Loader2, Zap, Database, Info, RefreshCw, List } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'

interface SystemStatus {
  rateTables: number
  policies: number
  excludedLocations: number
  lastUpdate: string | null
}

interface GenerationProgress {
  stage: 'idle' | 'cleanup' | 'rate_tables' | 'policies' | 'complete' | 'error'
  current: number
  total: number
  message: string
}

interface Policy {
  id: number
  policy_name: string
  handling_time_days: number
  is_active: boolean
  marketplace_id: string
  created_at: string
}

interface RateTable {
  id: number
  name: string
  price_min: number
  price_max: number
  tariff_rate: number
  calculated_ddp_cost: number
}

export function AutoPolicyGenerator() {
  const [status, setStatus] = useState<SystemStatus>({
    rateTables: 0,
    policies: 0,
    excludedLocations: 0,
    lastUpdate: null
  })
  const [progress, setProgress] = useState<GenerationProgress>({
    stage: 'idle',
    current: 0,
    total: 0,
    message: ''
  })
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [policies, setPolicies] = useState<Policy[]>([])
  const [rateTables, setRateTables] = useState<RateTable[]>([])
  const [showPolicies, setShowPolicies] = useState(false)
  const [showRateTables, setShowRateTables] = useState(false)

  useEffect(() => {
    loadSystemStatus()
    loadPolicies()
    loadRateTables()
  }, [])

  async function loadSystemStatus() {
    try {
      setRefreshing(true)
      const response = await fetch('/api/shipping/status')
      const data = await response.json()
      console.log('✅ Status loaded:', data)
      setStatus(data)
      setLoading(false)
      setRefreshing(false)
    } catch (error) {
      console.error('❌ Failed to load status:', error)
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function loadPolicies() {
    try {
      const response = await fetch('/api/shipping/policies')
      const data = await response.json()
      setPolicies(data.policies || [])
    } catch (error) {
      console.error('Failed to load policies:', error)
    }
  }

  async function loadRateTables() {
    try {
      const response = await fetch('/api/shipping/rate-tables')
      const data = await response.json()
      setRateTables(data.rateTables || [])
    } catch (error) {
      console.error('Failed to load rate tables:', error)
    }
  }

  async function handleCleanup() {
    if (!confirm('既存のすべてのRate TableとPolicyを削除します。よろしいですか？\n\nDelete all existing Rate Tables and Policies?')) {
      return
    }

    setProgress({ stage: 'cleanup', current: 0, total: 1, message: 'クリーンアップ中...' })
    addLog('🗑️ クリーンアップ開始 / Starting cleanup')

    try {
      const response = await fetch('/api/shipping/cleanup', { method: 'POST' })
      const data = await response.json()

      if (data.success) {
        addLog(`✅ クリーンアップ完了: ${data.deleted} 項目削除 / Cleanup complete: ${data.deleted} items deleted`)
        await loadSystemStatus()
        await loadPolicies()
        await loadRateTables()
        setProgress({ stage: 'idle', current: 0, total: 0, message: '' })
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      addLog(`❌ エラー / Error: ${error.message}`)
      setProgress({ stage: 'error', current: 0, total: 0, message: error.message })
    }
  }

  async function handleGenerateRateTables() {
    if (status.rateTables > 0) {
      if (!confirm(`既に${status.rateTables}個のRate Tableが存在します。\n再生成すると既存データが削除されます。続けますか？\n\nRate Tables already exist (${status.rateTables} items).\nRegeneration will delete existing data. Continue?`)) {
        return
      }
    }

    setProgress({ stage: 'rate_tables', current: 0, total: 240, message: 'Rate Table生成中...' })
    addLog('📊 Rate Table生成開始（240個） / Starting Rate Table generation (240 items)')

    try {
      const response = await fetch('/api/shipping/generate-rate-tables', { method: 'POST' })
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('Stream not available')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            
            if (data.progress) {
              setProgress({
                stage: 'rate_tables',
                current: data.current,
                total: data.total,
                message: data.message
              })
              addLog(`📈 進捗 / Progress: ${data.current}/${data.total} - ${data.message}`)
            }

            if (data.complete) {
              addLog(`✅ Rate Table生成完了: ${data.count}個 / Rate Table generation complete: ${data.count} items`)
              setProgress({ stage: 'complete', current: data.count, total: data.count, message: '完了 / Complete' })
              await loadSystemStatus()
              await loadRateTables()
            }
          }
        }
      }
    } catch (error: any) {
      addLog(`❌ エラー / Error: ${error.message}`)
      setProgress({ stage: 'error', current: 0, total: 0, message: error.message })
    }
  }

  async function handleGeneratePolicies() {
    console.log('🔍 handleGeneratePolicies called, status:', status)
    
    if (status.rateTables === 0) {
      alert('先にRate Tableを生成してください。\n\nPlease generate Rate Tables first.')
      return
    }

    setProgress({ stage: 'policies', current: 0, total: 3, message: 'Policy生成中...' })
    addLog('📦 配送ポリシー生成開始（3個） / Starting Policy generation (3 items)')

    try {
      const response = await fetch('/api/shipping/generate-policies', { method: 'POST' })
      const data = await response.json()

      if (data.success) {
        addLog(`✅ 配送ポリシー生成完了: ${data.count}個 / Policy generation complete: ${data.count} items`)
        if (data.excluded_count) {
          addLog(`   除外国設定: ${data.excluded_count}カ国 / Excluded locations: ${data.excluded_count} countries`)
        }
        setProgress({ stage: 'complete', current: data.count, total: data.count, message: '完了 / Complete' })
        await loadSystemStatus()
        await loadPolicies()
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      addLog(`❌ エラー / Error: ${error.message}`)
      setProgress({ stage: 'error', current: 0, total: 0, message: error.message })
    }
  }

  async function handleExportJSON() {
    addLog('💾 JSONエクスポート開始 / Starting JSON export')
    
    try {
      const response = await fetch('/api/shipping/export')
      const data = await response.json()
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shipping-data-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      
      addLog('✅ JSONエクスポート完了 / JSON export complete')
    } catch (error: any) {
      addLog(`❌ エラー / Error: ${error.message}`)
    }
  }

  function addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString('ja-JP')
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 100))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const rateTablesComplete = status.rateTables > 0
  const policiesExist = status.policies > 0
  
  console.log('🎯 Render state:', { 
    rateTables: status.rateTables, 
    rateTablesComplete, 
    buttonDisabled: !rateTablesComplete || progress.stage === 'policies' 
  })

  return (
    <div className="space-y-6">
      {/* システム状態 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                System Status / システム状態
              </CardTitle>
              <CardDescription>
                Current shipping configuration / 現在の配送設定
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                loadSystemStatus()
                loadPolicies()
                loadRateTables()
              }}
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold text-blue-600">{status.rateTables}</div>
              <div className="text-sm text-gray-600">Rate Tables</div>
              {status.rateTables === 240 ? (
                <div className="text-xs text-green-600 mt-1">✓ Complete (240/240)</div>
              ) : status.rateTables > 0 ? (
                <div className="text-xs text-amber-600 mt-1">⚠️ Incomplete ({status.rateTables}/240)</div>
              ) : (
                <div className="text-xs text-gray-500 mt-1">Not generated</div>
              )}
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold text-purple-600">{status.policies}</div>
              <div className="text-sm text-gray-600">Policies / ポリシー</div>
              {policiesExist && (
                <div className="text-xs text-green-600 mt-1">✓ Generated</div>
              )}
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold text-orange-600">{status.excludedLocations}</div>
              <div className="text-sm text-gray-600">Excluded / 除外国</div>
            </div>
          </div>
          {status.lastUpdate && (
            <div className="text-xs text-gray-500 mt-4 text-center">
              Last update: {new Date(status.lastUpdate).toLocaleString('ja-JP')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 推奨フロー */}
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          <strong>Recommended Setup Flow / 推奨セットアップ手順:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
            <li>Generate Rate Tables (240 items) - <strong>一度だけ実行 / Execute once only</strong></li>
            <li>Generate Policies (3 items) - 必要に応じて実行 / Execute as needed</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* アクション */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rate Table生成 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              1. Rate Tables
            </CardTitle>
            <CardDescription>
              基本料金データ（240個）<br />
              <strong className="text-orange-600">⚠️ 初回のみ実行</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleGenerateRateTables}
              disabled={progress.stage === 'rate_tables'}
              className="w-full"
              variant={status.rateTables === 240 ? "outline" : "default"}
            >
              {progress.stage === 'rate_tables' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中... / Generating...
                </>
              ) : status.rateTables === 240 ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  再生成 / Regenerate
                </>
              ) : status.rateTables > 0 ? (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  続きから生成 / Continue
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  生成 / Generate
                </>
              )}
            </Button>
            {status.rateTables > 0 && (
              <Button
                onClick={() => setShowRateTables(!showRateTables)}
                variant="outline"
                className="w-full"
              >
                <List className="w-4 h-4 mr-2" />
                {showRateTables ? '非表示 / Hide' : '一覧表示 / Show List'}
              </Button>
            )}
            {status.rateTables === 240 && (
              <div className="text-xs text-green-600 text-center">
                ✓ Rate Tables are ready / Rate Tableは準備完了
              </div>
            )}
          </CardContent>
        </Card>

        {/* Policy生成 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              2. Policies
            </CardTitle>
            <CardDescription>
              配送ポリシー（3個）<br />
              Economy / Standard / Express
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleGeneratePolicies}
              disabled={!rateTablesComplete || progress.stage === 'policies'}
              className="w-full"
            >
              {progress.stage === 'policies' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中... / Generating...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4 mr-2" />
                  {policiesExist ? '再生成 / Regenerate' : '生成 / Generate'}
                </>
              )}
            </Button>
            {policiesExist && (
              <Button
                onClick={() => setShowPolicies(!showPolicies)}
                variant="outline"
                className="w-full"
              >
                <List className="w-4 h-4 mr-2" />
                {showPolicies ? '非表示 / Hide' : '一覧表示 / Show List'}
              </Button>
            )}
            {!rateTablesComplete && (
              <div className="text-xs text-amber-600 text-center">
                ⚠️ Rate Tablesを先に生成してください
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Policies一覧 */}
      {showPolicies && policies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Policies List / ポリシー一覧</CardTitle>
            <CardDescription>
              {policies.length}個のポリシー / {policies.length} policies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {policies.map((policy) => (
                <div key={policy.id} className="border rounded p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{policy.policy_name}</div>
                      <div className="text-sm text-gray-600">
                        Handling: {policy.handling_time_days} days | {policy.marketplace_id}
                      </div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${policy.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {policy.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rate Tables一覧 (サンプル表示) */}
      {showRateTables && rateTables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rate Tables List / 料金表一覧</CardTitle>
            <CardDescription>
              {rateTables.length}個の料金表（最初の10件を表示） / {rateTables.length} rate tables (showing first 10)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {rateTables.slice(0, 10).map((table) => (
                <div key={table.id} className="border rounded p-3 hover:bg-gray-50">
                  <div className="font-medium text-sm">{table.name}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Price: ${table.price_min} - ${table.price_max} | 
                    Tariff: {(table.tariff_rate * 100).toFixed(1)}% | 
                    DDP Cost: ${table.calculated_ddp_cost.toFixed(2)}
                  </div>
                </div>
              ))}
              {rateTables.length > 10 && (
                <div className="text-center text-sm text-gray-500 py-2">
                  ... and {rateTables.length - 10} more
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 管理機能 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Management / 管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <Button
              onClick={handleExportJSON}
              variant="outline"
              className="flex-1"
            >
              <Database className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
            <Button
              onClick={handleCleanup}
              variant="destructive"
              className="flex-1"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              全削除 / Delete All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 進捗 */}
      {progress.stage !== 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progress / 進捗</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{progress.message}</span>
                <span>{progress.current}/{progress.total}</span>
              </div>
              <Progress value={(progress.current / progress.total) * 100} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ログ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Log / ログ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-xs h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet / ログなし</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
