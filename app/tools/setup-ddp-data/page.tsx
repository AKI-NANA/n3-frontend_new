'use client'

import { useState } from 'react'

export default function SetupDDPDataPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [status, setStatus] = useState<any>(null)

  const checkStatus = async () => {
    setChecking(true)
    setError(null)
    
    try {
      const response = await fetch('/api/setup-ddp-matrix')
      const data = await response.json()
      
      if (data.success) {
        setStatus(data)
      } else {
        setError(data.error)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  const setupData = async () => {
    if (!confirm('USA DDP配送コストマトリックス（1,200レコード）を投入します。\n既存データは削除されます。よろしいですか？')) {
      return
    }
    
    setLoading(true)
    setError(null)
    setResult(null)
    
    try {
      const response = await fetch('/api/setup-ddp-matrix', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        setResult(data)
        // 完了後に状態を再確認
        await checkStatus()
      } else {
        setError(data.error)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">USA DDP配送コストマトリックス セットアップ</h1>
        <p className="text-gray-600">
          60重量帯 × 20価格帯 = 1,200レコードをSupabaseに投入します
        </p>
      </div>

      {/* 現在の状態確認 */}
      <div className="mb-6">
        <button
          onClick={checkStatus}
          disabled={checking}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 font-semibold"
        >
          {checking ? '確認中...' : '現在の状態を確認'}
        </button>
      </div>

      {status && (
        <div className={`p-6 border rounded-lg mb-6 ${
          status.isComplete ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'
        }`}>
          <h2 className="text-xl font-bold mb-4">
            {status.isComplete ? '✅ セットアップ済み' : '⚠️ セットアップ未完了'}
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">現在のレコード数:</span>
              <span className="ml-2 font-bold text-lg">{status.currentRecords}</span>
            </div>
            <div>
              <span className="text-gray-600">期待レコード数:</span>
              <span className="ml-2 font-bold text-lg">{status.expectedRecords}</span>
            </div>
          </div>
          
          {status.samples && status.samples.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">サンプルデータ (最初の3件)</h3>
              <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                {JSON.stringify(status.samples.slice(0, 3), null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* データ投入ボタン */}
      <div className="mb-6">
        <button
          onClick={setupData}
          disabled={loading}
          className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-bold text-lg"
        >
          {loading ? '投入中... (最大1分かかります)' : '🚀 データを投入する'}
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-lg mb-6">
          <h3 className="font-bold text-red-700 mb-2">エラー</h3>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* 成功結果表示 */}
      {result && (
        <div className="p-6 bg-green-50 border border-green-300 rounded-lg">
          <h2 className="text-2xl font-bold text-green-900 mb-4">✅ セットアップ完了!</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded border">
              <p className="text-sm text-gray-600">総レコード数</p>
              <p className="text-3xl font-bold text-green-600">{result.stats.totalRecords}</p>
            </div>
            <div className="p-4 bg-white rounded border">
              <p className="text-sm text-gray-600">重量帯数</p>
              <p className="text-3xl font-bold text-blue-600">{result.stats.weightBands}</p>
            </div>
            <div className="p-4 bg-white rounded border">
              <p className="text-sm text-gray-600">価格帯数</p>
              <p className="text-3xl font-bold text-purple-600">{result.stats.pricePoints}</p>
            </div>
            <div className="p-4 bg-white rounded border">
              <p className="text-sm text-gray-600">期待レコード数</p>
              <p className="text-3xl font-bold text-gray-600">{result.stats.expectedRecords}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-green-800">{result.message}</p>
        </div>
      )}

      {/* 説明 */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-bold text-lg mb-3">📋 データ構造</h3>
        <ul className="space-y-2 text-sm">
          <li>
            <strong>重量帯:</strong> 60段階 (0.0-0.25kg から 80.0kg以上まで)
          </li>
          <li>
            <strong>価格帯:</strong> 20段階 ($50, $100, $150, ..., $3,500)
          </li>
          <li>
            <strong>計算式:</strong> DDP手数料 = (商品価格 + 実送料) × 14.5%
          </li>
          <li>
            <strong>合計送料:</strong> 実送料 + DDP手数料
          </li>
        </ul>
      </div>
    </div>
  )
}
