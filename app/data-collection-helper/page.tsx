'use client'

import { useState } from 'react'

export default function DataCollectionHelperPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const syncToMaster = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/sync-latest-scraped')
      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">データ収集ヘルパー</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">📦 スクレイピング後の処理</h2>
          
          <div className="mb-4 p-4 bg-blue-50 rounded">
            <h3 className="font-bold mb-2">手順:</h3>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <a 
                  href="http://localhost:3000/data-collection" 
                  target="_blank"
                  className="text-blue-600 underline"
                >
                  データ収集ページ
                </a>
                でスクレイピングを実行
              </li>
              <li>このページに戻る</li>
              <li>下の「データ編集に移行」ボタンをクリック</li>
            </ol>
          </div>

          <button
            onClick={syncToMaster}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg disabled:bg-gray-400 transition-colors"
          >
            {loading ? '処理中...' : '✅ データ編集に移行（products_masterに同期）'}
          </button>

          {result && (
            <div className="mt-4">
              {result.success ? (
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <p className="font-bold text-green-800 mb-2">✓ {result.message}</p>
                  <div className="space-y-2 text-sm">
                    {result.results?.map((r: any, i: number) => (
                      <div key={i} className="border-l-2 border-green-300 pl-2">
                        <div className="font-medium">{r.step}</div>
                        {r.count && <div className="text-gray-600">件数: {r.count}</div>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-x-4">
                    <a 
                      href="http://localhost:3000/master-view"
                      className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      📋 データ確認
                    </a>
                    <a 
                      href="http://localhost:3000/approval"
                      className="inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                    >
                      ✓ 承認画面へ
                    </a>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded p-4">
                  <p className="font-bold text-red-800">エラー:</p>
                  <pre className="text-sm mt-2">{JSON.stringify(result, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">📊 クイックアクセス</h2>
          <div className="grid grid-cols-2 gap-4">
            <a 
              href="http://localhost:3000/data-collection"
              className="block p-4 bg-blue-50 hover:bg-blue-100 rounded text-center"
            >
              <div className="font-bold">データ収集</div>
              <div className="text-sm text-gray-600">スクレイピング実行</div>
            </a>
            <a 
              href="http://localhost:3000/master-view"
              className="block p-4 bg-green-50 hover:bg-green-100 rounded text-center"
            >
              <div className="font-bold">データ確認</div>
              <div className="text-sm text-gray-600">取得済みデータ表示</div>
            </a>
            <a 
              href="http://localhost:3000/approval"
              className="block p-4 bg-purple-50 hover:bg-purple-100 rounded text-center"
            >
              <div className="font-bold">承認画面</div>
              <div className="text-sm text-gray-600">出品前確認</div>
            </a>
            <a 
              href="http://localhost:3000/tools/editing"
              className="block p-4 bg-orange-50 hover:bg-orange-100 rounded text-center"
            >
              <div className="font-bold">データ編集</div>
              <div className="text-sm text-gray-600">商品情報編集</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
