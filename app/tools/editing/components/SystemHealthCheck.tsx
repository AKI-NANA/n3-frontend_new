// app/tools/editing/components/SystemHealthCheck.tsx
'use client'

import { useState } from 'react'

interface HealthCheckResult {
  overall_status: 'HEALTHY' | 'NEEDS_FIX'
  productId: string
  timestamp: string
  checks: Record<string, any>
  summary: {
    total_checks: number
    passed: number
    failed: number
    warnings: number
  }
  recommended_actions?: Array<{
    action: string
    sql?: string
    message?: string
    reason: string
  }>
}

export function SystemHealthCheck() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<HealthCheckResult | null>(null)
  const [productId, setProductId] = useState('322')

  const runCheck = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/debug/system-check?id=${productId}`)
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Health check failed:', error)
      alert('健全性チェックに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true)
          runCheck()
        }}
        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium"
      >
        🏥 システム診断
      </button>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-green-600 bg-green-50'
      case 'failed': return 'text-red-600 bg-red-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      case 'info': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return '✅'
      case 'failed': return '❌'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      default: return '🔍'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold">🏥 システム健全性チェック</h2>
            {result && (
              <p className="text-sm text-gray-600 mt-1">
                検査時刻: {new Date(result.timestamp).toLocaleString('ja-JP')}
              </p>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* 商品ID入力 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium">商品ID:</label>
            <input
              type="text"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="px-3 py-1 border rounded w-32"
            />
            <button
              onClick={runCheck}
              disabled={loading}
              className="px-4 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
            >
              {loading ? '検査中...' : '再検査'}
            </button>
          </div>
        </div>

        {/* 結果表示 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin text-4xl mb-4">🔍</div>
                <p className="text-gray-600">システムを診断中...</p>
              </div>
            </div>
          )}

          {!loading && result && (
            <div className="space-y-4">
              {/* 総合ステータス */}
              <div className={`p-4 rounded-lg ${
                result.overall_status === 'HEALTHY' 
                  ? 'bg-green-50 border-2 border-green-500' 
                  : 'bg-red-50 border-2 border-red-500'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="text-4xl">
                    {result.overall_status === 'HEALTHY' ? '✅' : '❌'}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      {result.overall_status === 'HEALTHY' ? '正常' : '要修正'}
                    </h3>
                    <p className="text-sm mt-1">
                      合格: {result.summary.passed} / 
                      失敗: {result.summary.failed} / 
                      警告: {result.summary.warnings}
                    </p>
                  </div>
                </div>
              </div>

              {/* 各チェック項目 */}
              <div className="space-y-2">
                {Object.entries(result.checks).map(([key, check]: [string, any]) => (
                  <div
                    key={key}
                    className={`p-3 rounded border ${getStatusColor(check.status)}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xl">{getStatusIcon(check.status)}</span>
                      <div className="flex-1">
                        <h4 className="font-medium">{check.name}</h4>
                        {check.message && (
                          <p className="text-sm mt-1">{check.message}</p>
                        )}
                        {check.value !== undefined && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-800">
                              詳細を表示
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                              {JSON.stringify(check, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 推奨アクション */}
              {result.recommended_actions && result.recommended_actions.length > 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-4">
                  <h3 className="font-bold text-lg mb-3">🔧 推奨される修正アクション</h3>
                  <div className="space-y-3">
                    {result.recommended_actions.map((action, index) => (
                      <div key={index} className="bg-white p-3 rounded border border-yellow-200">
                        <div className="font-medium text-sm mb-1">{action.action}</div>
                        <div className="text-xs text-gray-600 mb-2">{action.reason}</div>
                        {action.sql && (
                          <div className="bg-gray-100 p-2 rounded font-mono text-xs overflow-x-auto">
                            {action.sql}
                          </div>
                        )}
                        {action.message && (
                          <div className="text-sm text-orange-600 mt-2">
                            {action.message}
                          </div>
                        )}
                        {action.sql && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(action.sql!)
                              alert('SQLをコピーしました！Supabase管理画面で実行してください。')
                            }}
                            className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                          >
                            📋 SQLをコピー
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <div className="text-xs text-gray-500">
            💡 ヒント: 問題が見つかった場合は、推奨アクションのSQLを実行してください
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
