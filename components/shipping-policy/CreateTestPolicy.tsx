'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export function CreateTestPolicy() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const createPolicy = async () => {
    setLoading(true)
    setResult(null)

    try {
      console.log('📤 リクエスト送信中...')
      
      const response = await fetch('/api/ebay/policy/create-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account: 'green',
          productPrice: 50,
          ddpFee: 7,
          weightBand: 1
        })
      })

      console.log('📥 レスポンス受信:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      })

      const data = await response.json()
      console.log('📦 データ:', data)
      
      setResult({
        status: response.status,
        ok: response.ok,
        ...data
      })

      if (data.success) {
        console.log('✅ ポリシー作成成功:', data)
      } else {
        console.error('❌ ポリシー作成失敗:', {
          status: response.status,
          data
        })
      }
    } catch (error) {
      console.error('❌ エラー:', error)
      setResult({ 
        error: String(error),
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🧪 Rate Table付きポリシー作成</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-bold mb-2">作成設定:</h3>
          <div className="text-sm space-y-1">
            <div>📦 <strong>重量:</strong> 0-0.5kg</div>
            <div>💰 <strong>商品価格:</strong> $50</div>
            <div>🚚 <strong>DDP手数料:</strong> $7</div>
            <div>🗺️ <strong>Rate Table:</strong> RT_Express_1</div>
            <div>🌍 <strong>配送:</strong> INTERNATIONAL</div>
            <div>❌ <strong>除外:</strong> 77カ国</div>
          </div>
        </div>

        <Button
          onClick={createPolicy}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              作成中...
            </>
          ) : (
            '🚀 GREENアカウントにポリシー作成'
          )}
        </Button>

        {result && (
          <div className={`border rounded-lg p-4 ${
            result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="font-bold mb-2">
              {result.success ? '✅ 成功' : '❌ 失敗'}
            </div>
            {result.status && (
              <div className="mb-2 text-sm">
                HTTP Status: <strong>{result.status}</strong>
              </div>
            )}
            {result.policyId && (
              <div className="mb-2">
                Policy ID: <strong>{result.policyId}</strong>
              </div>
            )}
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-semibold">詳細を表示</summary>
              <pre className="text-xs overflow-auto max-h-96 mt-2 bg-white p-2 rounded border">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
