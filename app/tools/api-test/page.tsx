'use client'

import { useState } from 'react'

export default function ApiTestPage() {
  const [keyword, setKeyword] = useState('SONY WH-1000XM5 Wireless Headphones Black')
  const [categoryId, setCategoryId] = useState('99999')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const clearLogs = () => {
    setLogs([])
    setResults(null)
  }

  // Finding API テスト（販売済み商品）
  const testFindingAPI = async () => {
    setLoading(true)
    clearLogs()
    
    try {
      addLog('📡 Finding API (findCompletedItems) テスト開始...')
      addLog(`キーワード: ${keyword}`)
      
      const response = await fetch('/api/ebay/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: keyword,
          categoryId: categoryId !== '99999' ? categoryId : undefined,
          entriesPerPage: 100,
          sortOrder: 'PricePlusShippingLowest'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        addLog(`✅ 成功: ${data.count}件取得`)
        addLog(`総数: ${data.total}件`)
        
        if (data.items && data.items.length > 0) {
          // 最安値を計算
          const prices = data.items
            .map((item: any) => item.price?.value || 0)
            .filter((p: number) => p > 0)
          
          if (prices.length > 0) {
            const lowestPrice = Math.min(...prices)
            const averagePrice = prices.reduce((sum: number, p: number) => sum + p, 0) / prices.length
            
            addLog(`💰 最安値: $${lowestPrice.toFixed(2)}`)
            addLog(`💰 平均価格: $${averagePrice.toFixed(2)}`)
            addLog(`📊 価格データ数: ${prices.length}件`)
          }
        }
        
        setResults({
          api: 'Finding API',
          success: true,
          data: data
        })
      } else {
        addLog(`❌ エラー: ${data.error}`)
        setResults({
          api: 'Finding API',
          success: false,
          error: data.error
        })
      }
    } catch (error: any) {
      addLog(`❌ エラー: ${error.message}`)
      setResults({
        api: 'Finding API',
        success: false,
        error: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  // Browse API テスト
  const testBrowseAPI = async () => {
    setLoading(true)
    clearLogs()
    
    try {
      addLog('📡 Browse API テスト開始...')
      addLog(`キーワード: ${keyword}`)
      
      const response = await fetch('/api/ebay/browse/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ebayTitle: keyword,
          ebayCategoryId: categoryId,
          weightG: 500,
          actualCostJPY: 10000
        })
      })

      const data = await response.json()
      
      if (data.success) {
        addLog(`✅ 成功`)
        addLog(`💰 最安値: $${data.lowestPrice}`)
        addLog(`💰 平均価格: $${data.averagePrice}`)
        addLog(`📊 競合数: ${data.competitorCount}件`)
        addLog(`💵 利益額: $${data.profitAmount}`)
        addLog(`📈 利益率: ${data.profitMargin}%`)
        
        setResults({
          api: 'Browse API',
          success: true,
          data: data
        })
      } else {
        addLog(`❌ エラー: ${data.error}`)
        setResults({
          api: 'Browse API',
          success: false,
          error: data.error
        })
      }
    } catch (error: any) {
      addLog(`❌ エラー: ${error.message}`)
      setResults({
        api: 'Browse API',
        success: false,
        error: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  // Refresh Token再取得
  const refreshTokenAuth = () => {
    window.open('/api/ebay/auth/authorize', '_blank')
  }

  // 環境変数とAPI診断
  const debugEnvironment = async () => {
    setLoading(true)
    clearLogs()
    
    try {
      addLog('🔍 環境変数とAPI診断を開始...')
      
      const response = await fetch('/api/ebay/debug-env')
      const data = await response.json()
      
      if (data.success) {
        addLog('\n📋 環境変数:')
        Object.entries(data.environment).forEach(([key, value]) => {
          addLog(`  ${key}: ${value}`)
        })
        
        addLog('\n🔑 実際に使用されるAPP_ID:')
        addLog(`  ${data.actualAppIdUsed}`)
        
        addLog('\n📡 Finding API テスト結果 (APP_IDのみ):')
        addLog(`  HTTPステータス: ${data.findingApiTest.status}`)
        addLog(`  ACK: ${data.findingApiTest.ack}`)
        
        if (data.findingApiTest.error) {
          addLog(`  ❌ エラーID: ${data.findingApiTest.error.errorId}`)
          addLog(`  ❌ エラーメッセージ: ${data.findingApiTest.error.message}`)
          addLog(`  ❌ 深刻度: ${data.findingApiTest.error.severity}`)
          
          if (data.findingApiTest.error.errorId === '10001') {
            addLog('  ⚠️  このAPP_IDは1日の上限に達しています')
            addLog('  ⚠️  別のシステムで使用中の可能性があります')
          }
        } else {
          addLog(`  ✅ 取得件数: ${data.findingApiTest.itemsFound}件`)
        }
        
        addLog('\n🔍 Browse API テスト結果 (Refresh Token):')
        if (data.browseApiTest.skipped) {
          addLog(`  ⏭️ スキップ: ${data.browseApiTest.reason}`)
        } else if (data.browseApiTest.success) {
          addLog(`  ✅ 成功`)
          addLog(`  ✅ 取得件数: ${data.browseApiTest.itemCount}件`)
          addLog(`  ✅ Refresh Tokenのスコープは正常です`)
        } else {
          addLog(`  ❌ 失敗`)
          addLog(`  HTTPステータス: ${data.browseApiTest.status}`)
          if (data.browseApiTest.error) {
            const error = data.browseApiTest.error
            if (error.errorId === 1100) {
              addLog(`  ❌ エラー: 権限不足 (${error.errorId})`)
              addLog(`  ⚠️  Refresh TokenにBrowse API用のスコープがありません`)
              addLog(`  🔑 上の黄色いボタンでRefresh Tokenを再取得してください`)
            } else {
              addLog(`  ❌ エラー: ${error.message || error}`)
            }
          }
        }
        
        addLog('\n💡 結論:')
        if (!data.findingApiTest.error && data.browseApiTest.success) {
          addLog('  ✅ 両方のAPIが正常に動作しています！')
        } else if (data.findingApiTest.error?.errorId === '10001') {
          addLog('  ⚠️  APP_IDのレート制限問題（Browse APIを使用してください）')
        } else if (data.browseApiTest.error?.errorId === 1100) {
          addLog('  🔑 Refresh Tokenのスコープが不足しています（再取得が必要）')
        }
        
        setResults({
          api: 'Environment Debug',
          success: true,
          data: data
        })
      } else {
        addLog(`❌ エラー: ${data.error}`)
        setResults({
          api: 'Environment Debug',
          success: false,
          error: data.error
        })
      }
    } catch (error: any) {
      addLog(`❌ エラー: ${error.message}`)
      setResults({
        api: 'Environment Debug',
        success: false,
        error: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  // トークン確認
  const checkToken = async () => {
    setLoading(true)
    clearLogs()
    
    try {
      addLog('🔑 eBayトークン確認...')
      
      const response = await fetch('/api/ebay/check-token', {
        method: 'POST'
      })

      const data = await response.json()
      
      if (data.success) {
        addLog(`✅ トークン有効`)
        addLog(`有効期限: ${data.expires_in}秒`)
        
        setResults({
          api: 'Token Check',
          success: true,
          data: data
        })
      } else {
        addLog(`❌ エラー: ${data.error}`)
        setResults({
          api: 'Token Check',
          success: false,
          error: data.error
        })
      }
    } catch (error: any) {
      addLog(`❌ エラー: ${error.message}`)
      setResults({
        api: 'Token Check',
        success: false,
        error: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🧪 eBay API テストツール</h1>

        {/* 検索フォーム */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">検索条件</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                キーワード
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="商品名を入力"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                カテゴリID（オプション）
              </label>
              <input
                type="text"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="99999 = Other"
              />
            </div>
          </div>
        </div>

        {/* テストボタン */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">テスト実行</h2>
          
          {/* Refresh Token再取得 */}
          <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ Browse APIの403エラーを解決</h3>
            <p className="text-sm text-gray-700 mb-3">
              Browse APIに必要なスコープを含むRefresh Tokenを再取得します。<br />
              取得後、表示されるRefresh Tokenを<code className="bg-gray-200 px-2 py-1 rounded">.env.local</code>に貼り付けてください。
            </p>
            <button
              onClick={refreshTokenAuth}
              className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-semibold"
            >
              🔑 Refresh Tokenを再取得（新しいタブで開く）
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={debugEnvironment}
              disabled={loading}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? '実行中...' : '🔍 環境診断'}
            </button>

            <button
              onClick={testFindingAPI}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? '実行中...' : '📡 Finding API'}
            </button>

            <button
              onClick={testBrowseAPI}
              disabled={loading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? '実行中...' : '🔍 Browse API'}
            </button>

            <button
              onClick={checkToken}
              disabled={loading}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? '実行中...' : '🔑 トークン確認'}
            </button>
          </div>
        </div>

        {/* ログ表示 */}
        {logs.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">📋 実行ログ</h2>
              <button
                onClick={clearLogs}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                クリア
              </button>
            </div>
            
            <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 結果表示 */}
        {results && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📊 詳細結果</h2>
            
            <div className="bg-gray-50 p-4 rounded">
              <div className="mb-2 font-semibold">
                {results.api} - {results.success ? '✅ 成功' : '❌ 失敗'}
              </div>
              
              <pre className="text-xs overflow-auto max-h-96 bg-white p-4 rounded">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
