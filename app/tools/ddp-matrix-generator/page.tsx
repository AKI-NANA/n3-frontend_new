'use client'

import { useState } from 'react'
import { Database, Zap, Check, AlertCircle } from 'lucide-react'

export default function DdpMatrixGeneratorPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const generateMatrix = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/shipping-policy/generate-ddp-matrix', {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || 'データ生成に失敗しました')
        if (data.sql) {
          setError(`${data.error}\n\nSQL:\n${data.sql}`)
        }
      }
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">USA DDP配送コストマトリックス 生成</h1>
        <p className="text-gray-600">60重量帯 × 20価格帯 = 1200件のデータを生成</p>
      </div>

      {/* 説明カード */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
          <Database className="w-5 h-5" />
          生成されるデータ
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>重量帯:</span>
            <span className="font-semibold">60帯（0-30 lbs, 0.5 lbs刻み）</span>
          </div>
          <div className="flex justify-between">
            <span>価格帯:</span>
            <span className="font-semibold">20帯（$50-$3,500）</span>
          </div>
          <div className="flex justify-between">
            <span>合計レコード数:</span>
            <span className="font-semibold">1,200件</span>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="font-semibold mb-2">送料計算式:</div>
            <code className="text-xs bg-white p-2 rounded block">
              送料 = 基本送料(重量) + マークアップ(価格) + DDP追加料金(8%)
            </code>
          </div>
        </div>
      </div>

      {/* 生成ボタン */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <button
          onClick={generateMatrix}
          disabled={loading}
          className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold text-lg flex items-center justify-center gap-3"
        >
          {loading ? (
            <>
              <Zap className="w-6 h-6 animate-spin" />
              データ生成中...
            </>
          ) : (
            <>
              <Zap className="w-6 h-6" />
              1,200件のマトリックスデータを生成
            </>
          )}
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-red-700 mb-2">エラー</h3>
              <pre className="text-sm text-red-600 whitespace-pre-wrap">{error}</pre>
            </div>
          </div>
        </div>
      )}

      {/* 成功表示 */}
      {result && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-4">
            <Check className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-green-700 text-lg">{result.message}</h3>
            </div>
          </div>
          
          {result.details && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>重量帯数:</span>
                <span className="font-semibold">{result.details.weightBands}</span>
              </div>
              <div className="flex justify-between">
                <span>価格帯数:</span>
                <span className="font-semibold">{result.details.priceBands}</span>
              </div>
              <div className="flex justify-between">
                <span>生成レコード数:</span>
                <span className="font-semibold">{result.details.totalRecords}</span>
              </div>
              <div className="flex justify-between">
                <span>挿入レコード数:</span>
                <span className="font-semibold text-green-700">{result.details.insertedRecords}</span>
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t">
            <a
              href="/tools/supabase-connection"
              className="text-blue-600 hover:underline text-sm"
            >
              → Supabase接続UIで確認する
            </a>
          </div>
        </div>
      )}

      {/* 手順説明 */}
      <div className="mt-8 bg-gray-50 border rounded-lg p-6">
        <h2 className="font-bold text-lg mb-3">実行手順</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Supabase Dashboardでテーブルを作成（初回のみ）</li>
          <li>上の「生成」ボタンをクリック</li>
          <li>1,200件のデータがSupabaseに挿入されます</li>
          <li>Supabase接続UIで確認</li>
          <li>配送ポリシー管理ページでeBayにアップロード</li>
        </ol>
      </div>
    </div>
  )
}
