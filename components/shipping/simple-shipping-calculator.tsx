// 簡易版テスト用コンポーネント
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function SimpleShippingCalculator() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testFunction = () => {
    setLoading(true)
    setError(null)
    
    try {
      // 基本的なテスト
      console.log('送料計算システムテスト開始')
      setLoading(false)
    } catch (err) {
      setError('エラーが発生しました: ' + err)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>送料計算システム（テスト版）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div className="text-center">
            <Button onClick={testFunction} disabled={loading}>
              {loading ? 'テスト中...' : 'システムテスト実行'}
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded">
              <h3 className="font-semibold">基本機能</h3>
              <p className="text-sm text-gray-600">重量・サイズ計算</p>
            </div>
            <div className="p-4 bg-green-50 rounded">
              <h3 className="font-semibold">データベース</h3>
              <p className="text-sm text-gray-600">Supabase接続テスト</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
