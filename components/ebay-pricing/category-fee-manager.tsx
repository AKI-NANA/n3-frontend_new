// components/ebay-pricing/category-fee-manager.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Download, Sparkles } from 'lucide-react'

export function CategoryFeeManager() {
  const [loading, setLoading] = useState(false)
  const [loadingTaxonomy, setLoadingTaxonomy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string>('')
  const [success, setSuccess] = useState(0)
  const [failed, setFailed] = useState(0)
  const [error, setError] = useState('')

  // 旧API（GetCategories）
  const handleFetchOldAPI = async () => {
    setLoading(true)
    setProgress(0)
    setStatus('eBay GetCategories APIから取得中...')
    setSuccess(0)
    setFailed(0)
    setError('')

    try {
      const response = await fetch('/api/ebay/get-categories', { method: 'POST' })
      const data = await response.json()

      if (!response.ok || !data.categories) {
        setError(data.error || 'カテゴリ取得失敗')
        setLoading(false)
        return
      }

      setProgress(50)
      setStatus(`${data.count}件のカテゴリを取得しました。保存中...`)

      const saveResponse = await fetch('/api/ebay/save-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: data.categories }),
      })

      const saveResult = await saveResponse.json()
      setSuccess(saveResult.success || 0)
      setFailed(saveResult.failed || 0)
      setProgress(100)
      setStatus('完了！')

    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // 新API（Taxonomy）
  const handleFetchTaxonomyAPI = async () => {
    setLoadingTaxonomy(true)
    setProgress(0)
    setStatus('eBay Taxonomy API（最新）から取得中...')
    setSuccess(0)
    setFailed(0)
    setError('')

    try {
      const response = await fetch('/api/ebay/get-categories-taxonomy', { method: 'POST' })
      const data = await response.json()

      if (!response.ok || !data.categories) {
        setError(data.error || 'カテゴリ取得失敗')
        setLoadingTaxonomy(false)
        return
      }

      setProgress(50)
      setStatus(`${data.count}件のカテゴリを取得しました（Tree Version: ${data.treeVersion}）。保存中...`)

      const saveResponse = await fetch('/api/ebay/save-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: data.categories }),
      })

      const saveResult = await saveResponse.json()
      setSuccess(saveResult.success || 0)
      setFailed(saveResult.failed || 0)
      setProgress(100)
      setStatus('完了！')

    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoadingTaxonomy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>eBayカテゴリ手数料データ取得</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={handleFetchTaxonomyAPI}
            disabled={loadingTaxonomy || loading}
            className="w-full"
            variant="default"
          >
            {loadingTaxonomy ? (
              <>処理中...</>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                最新カテゴリ取得（Taxonomy API）
              </>
            )}
          </Button>

          <Button
            onClick={handleFetchOldAPI}
            disabled={loading || loadingTaxonomy}
            variant="outline"
            className="w-full"
          >
            {loading ? (
              <>処理中...</>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                旧カテゴリ取得（GetCategories）
              </>
            )}
          </Button>
        </div>

        {(loading || loadingTaxonomy) && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">{status}</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <p className="font-semibold">エラー</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {(success > 0 || failed > 0) && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="font-semibold text-blue-900">結果</p>
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
              <div>
                <span className="text-green-600 font-semibold">成功: {success}件</span>
              </div>
              {failed > 0 && (
                <div>
                  <span className="text-red-600 font-semibold">失敗: {failed}件</span>
                </div>
              )}
            </div>
            <p className="text-xs text-blue-700 mt-2">合計: {success + failed}件</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
