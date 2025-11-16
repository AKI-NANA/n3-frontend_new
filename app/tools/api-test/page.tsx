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
        
        setResults({ api: 'Finding API', success: true, data: data })
      } else {
        addLog(`❌ エラー: ${data.error}`)
        setResults({ api: 'Finding API', success: false, error: data.error })
      }
    } catch (error: any) {
      addLog(`❌ エラー: ${error.message}`)
      setResults({ api: 'Finding API', success: false, error: error.message })
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
        
        setResults({ api: 'Browse API', success: true, data: data })
      } else {
        addLog(`❌ エラー: ${data.error}`)
        setResults({ api: 'Browse API', success: false, error: data.error })
      }
    } catch (error: any) {
      addLog(`❌ エラー: ${error.message}`)
      setResults({ api: 'Browse API', success: false, error: error.message })
    } finally {
      setLoading(false)
    }
  }

  // Sell API テスト
  const testSellAPI = async () => {
    setLoading(true)
    clearLogs()
    
    try {
      addLog('📦 Sell API テスト開始...')
      addLog('🔑 Refresh TokenでUser Access Tokenを取得中...')
      
      const response = await fetch('/api/ebay/sell/test')
      const data = await response.json()
      
      if (data.success) {
        addLog('✅ Refresh Tokenは有効です')
        addLog('✅ Account APIが正常に動作しています')
        addLog('')
        addLog('📊 アカウント情報:')
        addLog(`  Fulfillment Policy数: ${data.accountData.fulfillmentPolicyCount}件`)
        
        if (data.accountData.policies.length > 0) {
          addLog('')
          addLog('📝 設定済みポリシー:')
          data.accountData.policies.forEach((policy: any, index: number) => {
            addLog(`  ${index + 1}. ${policy.name} (${policy.marketplaceId})`)
          })
        }
        
        addLog('')
        addLog('🔑 トークン情報:')
        addLog(`  有効期限: ${data.tokenInfo.expiresIn}秒 (${Math.floor(data.tokenInfo.expiresIn / 60)}分)`)
        addLog(`  タイプ: ${data.tokenInfo.tokenType}`)
        
        setResults({ api: 'Sell API', success: true, data: data })
      } else {
        if (data.tokenValid && data.apiError) {
          addLog('✅ Refresh Tokenは有効です')
          addLog(`❌ Account APIエラー: ${data.error.message || data.error}`)
          addLog(`💡 ${data.hint}`)
        } else {
          addLog(`❌ エラー: ${data.error}`)
          if (data.hint) {
            addLog(`💡 ${data.hint}`)
          }
        }
        
        setResults({ api: 'Sell API', success: false, error: data.error })
      }
    } catch (error: any) {
      addLog(`❌ エラー: ${error.message}`)
      setResults({ api: 'Sell API', success: false, error: error.message })
    } finally {
      setLoading(false)
    }
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
        
        addLog('\n🔍 Browse API テスト結果 (Application Token):')
        if (data.browseApiTest.skipped) {
          addLog(`  ⏭️ スキップ: ${data.browseApiTest.reason}`)
        } else if (data.browseApiTest.success) {
          addLog(`  ✅ 成功`)
          addLog(`  ✅ 取得件数: ${data.browseApiTest.itemCount}件`)
          addLog(`  ✅ Application Tokenで正常に動作しています`)
        } else {
          addLog(`  ❌ 失敗`)
          addLog(`  HTTPステータス: ${data.browseApiTest.status}`)
          if (data.browseApiTest.error) {
            const error = data.browseApiTest.error
            if (typeof error === 'string') {
              addLog(`  ❌ エラー: ${error}`)
            } else if (error.errorId) {
              addLog(`  ❌ エラーID: ${error.errorId}`)
              addLog(`  ❌ メッセージ: ${error.message || error.longMessage}`)
            } else {
              addLog(`  ❌ エラー: ${JSON.stringify(error)}`)
            }
          }
        }
        
        addLog('\n📦 Sell API テスト結果 (Refresh Token):')
        if (data.sellApiTest.skipped) {
          addLog(`  ⏭️ スキップ: ${data.sellApiTest.reason}`)
        } else if (data.sellApiTest.success) {
          addLog(`  ✅ 成功`)
          addLog(`  ✅ Refresh Tokenは有効です`)
          addLog(`  ✅ Account APIが正常に動作しています`)
          addLog(`  📊 Fulfillment Policy数: ${data.sellApiTest.policyCount}件`)
          addLog(`  🕑 トークン有効期限: ${Math.floor(data.sellApiTest.expiresIn / 60)}分`)
        } else {
          addLog(`  ❌ 失敗`)
          addLog(`  HTTPステータス: ${data.sellApiTest.status}`)
          if (data.sellApiTest.tokenValid === false) {
            addLog(`  ❌ Refresh Tokenが無効または期限切れ`)
            addLog(`  💡 Refresh Tokenを再取得してください`)
          } else if (data.sellApiTest.error) {
            const error = data.sellApiTest.error
            if (typeof error === 'string') {
              addLog(`  ❌ エラー: ${error}`)
            } else if (error.errorId) {
              addLog(`  ❌ エラーID: ${error.errorId}`)
              addLog(`  ❌ メッセージ: ${error.message || error.longMessage}`)
            } else {
              addLog(`  ❌ エラー: ${JSON.stringify(error)}`)
            }
          }
        }
        
        addLog('\n💡 結論:')
        const allSuccess = !data.findingApiTest.error && data.browseApiTest.success && data.sellApiTest.success
        if (allSuccess) {
          addLog('  ✅ 全てのAPIが正常に動作しています！')
        } else if (data.findingApiTest.error?.errorId === '10001') {
          addLog('  ⚠️  APP_IDのレート制限問題（Browse APIを使用してください）')
        } else {
          const failedApis = []
          if (data.findingApiTest.error) failedApis.push('Finding API')
          if (!data.browseApiTest.success) failedApis.push('Browse API')
          if (!data.sellApiTest.success) failedApis.push('Sell API')
          addLog(`  ❌ 失敗したAPI: ${failedApis.join(', ')}`)
        }
        
        if (data.explanation) {
          addLog('\n📚 補足説明:')
          addLog(`  ・ Finding API: ${data.explanation.findingApi}`)
          addLog(`  ・ Browse API: ${data.explanation.browseApi}`)
          addLog(`  ・ Sell API: ${data.explanation.sellApi}`)
        }
        
        setResults({ api: 'Environment Debug', success: true, data: data })
      } else {
        addLog(`❌ エラー: ${data.error}`)
        setResults({ api: 'Environment Debug', success: false, error: data.error })
      }
    } catch (error: any) {
      addLog(`❌ エラー: ${error.message}`)
      setResults({ api: 'Environment Debug', success: false, error: error.message })
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
        
        setResults({ api: 'Token Check', success: true, data: data })
      } else {
        addLog(`❌ エラー: ${data.error}`)
        setResults({ api: 'Token Check', success: false, error: data.error })
      }
    } catch (error: any) {
      addLog(`❌ エラー: ${error.message}`)
      setResults({ api: 'Token Check', success: false, error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🧪 eBay API テストツール</h1>

        {/* ドキュメントリンク */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg shadow-lg p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold mb-2">📚 eBay API 開発ガイド</h2>
              <p className="text-sm opacity-90">
                APIの詳細情報、認証方式、コード例、トラブルシューティングなどを確認できます。<br />
                クロードに説明する際は、ドキュメントページからコピーしてください。
              </p>
            </div>
            <a
              href="/tools/api-test/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-gray-100 font-semibold shadow-md whitespace-nowrap"
            >
              📝 ドキュメントを開く
            </a>
          </div>
        </div>

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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              onClick={testSellAPI}
              disabled={loading}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? '実行中...' : '📦 Sell API'}
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
