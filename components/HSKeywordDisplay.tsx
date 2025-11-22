// components/HSKeywordDisplay.tsx
'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Tag, AlertCircle } from 'lucide-react'

interface HSKeywordDisplayProps {
  htsCode: string | undefined | null
  className?: string
}

interface KeywordData {
  keywords_ja: string[]
  keywords_en: string[]
  total: number
}

export function HSKeywordDisplay({ htsCode, className = '' }: HSKeywordDisplayProps) {
  const [loading, setLoading] = useState(false)
  const [keywords, setKeywords] = useState<KeywordData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // HTSコードがない、または無効な場合はクリア
    if (!htsCode || htsCode.trim() === '') {
      setKeywords(null)
      setError(null)
      return
    }

    // HTSコードが変更されたらキーワードを取得
    const fetchKeywords = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/hts/keywords/${htsCode}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'キーワード取得に失敗しました')
        }

        const data = await response.json()
        setKeywords(data)

      } catch (err: any) {
        console.error('キーワード取得エラー:', err)
        setError(err.message)
        setKeywords(null)
      } finally {
        setLoading(false)
      }
    }

    fetchKeywords()
  }, [htsCode])

  // HTSコードがない場合は何も表示しない
  if (!htsCode || htsCode.trim() === '') {
    return null
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Tag className="w-4 h-4" />
          関連キーワード
          {keywords && keywords.total > 0 && (
            <Badge variant="outline" className="ml-auto">
              {keywords.total}件
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* ローディング状態 */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">キーワード読み込み中...</span>
          </div>
        )}

        {/* エラー状態 */}
        {error && !loading && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-700">
              <p className="font-semibold">キーワードが見つかりません</p>
              <p className="mt-1">このHTSコードのキーワードはまだ生成されていません。</p>
            </div>
          </div>
        )}

        {/* キーワード表示 */}
        {keywords && !loading && !error && (
          <>
            {/* 日本語キーワード */}
            {keywords.keywords_ja.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">🇯🇵 日本語キーワード</p>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.keywords_ja.map((keyword, index) => (
                    <Badge key={`ja-${index}`} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 英語キーワード */}
            {keywords.keywords_en.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">🇬🇧 英語キーワード</p>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.keywords_en.map((keyword, index) => (
                    <Badge key={`en-${index}`} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* キーワードがない場合 */}
        {keywords && keywords.total === 0 && !loading && !error && (
          <div className="text-center py-3 text-xs text-gray-500">
            このHTSコードにはまだキーワードが生成されていません
          </div>
        )}
      </CardContent>
    </Card>
  )
}
