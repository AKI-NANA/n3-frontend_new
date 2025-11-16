'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getHTSChapters } from '@/lib/supabase/hts'
import { ArrowLeft } from 'lucide-react'

export default function ChaptersPage() {
  const { data: chapters, isLoading, error } = useQuery({
    queryKey: ['hts-chapters'],
    queryFn: getHTSChapters,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-xl font-bold mb-2">エラーが発生しました</p>
          <p className="text-sm">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link 
            href="/tools/hts-classification" 
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            検索ページに戻る
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            HTS分類 - Chapter（類）一覧
          </h1>
          <p className="text-gray-600">
            全{chapters?.length || 0}類 - 2桁のChapterコードから選択してください
          </p>
        </div>

        {/* 階層説明 */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r">
          <p className="text-blue-900 mb-2">
            <strong>📍 現在の階層：</strong> <span className="font-bold">Chapter（類）</span> - 2桁コード
          </p>
          <p className="text-blue-800 text-sm mb-2">
            <strong>🏛️ HTSの完全な階層構造：</strong>
          </p>
          <div className="text-blue-700 text-sm pl-4">
            1. Section（部）- ローマ数字 (I-XXI)<br />
            2. <strong className="text-blue-600">▶ Chapter（類）- 2桁 (01-99) ← 現在の階層</strong><br />
            3. Heading（項）- 4桁 (0101, 0102...)<br />
            4. Subheading（号）- 6桁 (010121...)<br />
            5. 統計品目 - 10桁 (0101211000)
          </div>
        </div>

        {/* Chapter一覧テーブル */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Chapter<br />
                  <span className="text-gray-400 normal-case">類</span>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description<br />
                  <span className="text-gray-400 normal-case">説明</span>
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  # of Codes<br />
                  <span className="text-gray-400 normal-case">コード数</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {chapters?.map((ch) => (
                <tr key={ch.code} className="hover:bg-blue-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link 
                      href={`/tools/hts-classification/chapter/${ch.code}`} 
                      className="text-blue-600 hover:text-blue-800 font-semibold text-xl font-mono"
                    >
                      {ch.code}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <Link 
                      href={`/tools/hts-classification/chapter/${ch.code}`} 
                      className="text-gray-900 hover:text-blue-600"
                    >
                      <div className="font-medium">{ch.japaneseDescription || ch.description}</div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-gray-500">
                    {ch.count.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* フッター情報 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            全{chapters?.length || 0}類、合計HTSコード数の確認は検索ページから可能です
          </p>
        </div>
      </div>
    </div>
  )
}
