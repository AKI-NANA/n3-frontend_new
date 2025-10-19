'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle, Loader } from 'lucide-react'

export default function EbayApiTestPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [testType, setTestType] = useState<'inventory' | 'listing'>('inventory')

  const testInventoryApi = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/ebay/inventory', {
        method: 'GET',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(`API Error: ${data.error || 'Unknown error'}`)
      } else {
        setResult({
          status: 'success',
          data: data,
          message: 'インベントリデータを取得しました'
        })
      }
    } catch (err: any) {
      setError(`リクエスト失敗: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testCreateListing = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/ebay/create-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'テスト商品',
          description: 'これはテスト出品です',
          price: 9.99,
          quantity: 1,
          category: 'Electronics'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(`API Error: ${data.error || 'Unknown error'}`)
      } else {
        setResult({
          status: 'success',
          data: data,
          message: '出品リクエストを送信しました'
        })
      }
    } catch (err: any) {
      setError(`リクエスト失敗: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">eBay API テスト</h1>
        <p className="text-gray-600 mb-8">eBay API の動作確認ツール</p>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">テスト実行</h2>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setTestType('inventory')
                  testInventoryApi()
                }}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading && testType === 'inventory' && <Loader className="animate-spin" size={16} />}
                インベントリ取得
              </button>

              <button
                onClick={() => {
                  setTestType('listing')
                  testCreateListing()
                }}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading && testType === 'listing' && <Loader className="animate-spin" size={16} />}
                出品テスト
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <div>
              <h3 className="font-semibold text-red-900">エラーが発生しました</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3 mb-4">
              <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
              <div>
                <h3 className="font-semibold text-green-900">{result.message}</h3>
              </div>
            </div>

            <div className="bg-white rounded p-4 border border-green-100">
              <pre className="text-xs overflow-auto max-h-96 text-gray-800">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">テスト情報</h2>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• <strong>インベントリ取得：</strong> eBay アカウントの在庫情報を取得します</li>
            <li>• <strong>出品テスト：</strong> テスト商品を出品します（実際の出品にはなりません）</li>
            <li>• <strong>認証方式：</strong> OAuth Refresh Token を使用</li>
            <li>• <strong>トークン有効期限：</strong> .env.local から自動取得</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
