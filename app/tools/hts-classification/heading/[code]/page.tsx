'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getHTSSubheadingsByHeading } from '@/lib/supabase/hts'
import { formatBilingualDescription } from '@/lib/supabase/hts-translations'
import { ArrowLeft } from 'lucide-react'

interface Props {
  params: { code: string }
}

export default function HeadingDetailPage({ params }: Props) {
  const chapterCode = params.code.substring(0, 2)
  
  const { data: subheadings, isLoading } = useQuery({
    queryKey: ['hts-subheadings', params.code],
    queryFn: () => getHTSSubheadingsByHeading(params.code),
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* パンくずリスト */}
        <div className="mb-6 flex items-center gap-2 text-sm flex-wrap">
          <Link href="/tools/hts-classification" className="text-blue-600 hover:text-blue-800">
            検索
          </Link>
          <span className="text-gray-400">→</span>
          <Link href="/tools/hts-classification/chapters" className="text-blue-600 hover:text-blue-800">
            Chapters
          </Link>
          <span className="text-gray-400">→</span>
          <Link href={`/tools/hts-classification/chapter/${chapterCode}`} className="text-blue-600 hover:text-blue-800">
            Chapter {chapterCode}
          </Link>
          <span className="text-gray-400">→</span>
          <span className="text-gray-700 font-medium">Heading {params.code}</span>
        </div>

        {/* ヘッダー */}
        <div className="mb-8">
          <Link 
            href={`/tools/hts-classification/chapter/${chapterCode}`}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Chapter {chapterCode}に戻る
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Heading {params.code} - Subheading（号）
          </h1>
          <p className="text-gray-600">
            6桁のSubheadingコード一覧（全{subheadings?.length || 0}号）
          </p>
        </div>

        {/* 階層説明 */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r">
          <p className="text-blue-900 mb-2">
            <strong>📍 現在の階層：</strong> Chapter（類） → Heading（項） → <strong>Subheading（号・6桁）</strong>
          </p>
          <p className="text-blue-800 text-sm mb-2">
            <strong>🏛️ 完全な階層構造：</strong>
          </p>
          <div className="text-blue-700 text-sm pl-4">
            1. Section（部）<br />
            2. Chapter（類）- 2桁<br />
            3. Heading（項）- 4桁<br />
            4. <strong className="text-blue-600">▶ Subheading（号）- 6桁 ← 現在の階層</strong><br />
            5. 統計品目 - 10桁
          </div>
        </div>

        {/* Subheading一覧テーブル */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Subheading<br />
                  <span className="text-gray-400 normal-case">号</span>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description<br />
                  <span className="text-gray-400 normal-case">説明</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subheadings?.map((s) => (
                <tr key={s.code} className="hover:bg-blue-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link 
                      href={`/tools/hts-classification/subheading/${s.code}`} 
                      className="text-blue-600 hover:text-blue-800 font-semibold text-lg font-mono"
                    >
                      {s.code}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <Link 
                      href={`/tools/hts-classification/subheading/${s.code}`} 
                      className="text-gray-900 hover:text-blue-600"
                    >
                      <div className="font-medium">
                        {formatBilingualDescription(s.description, params.code.substring(0, 2))}
                      </div>
                      {s.fullPath && (
                        <div className="text-sm text-gray-500 mt-1">
                          {s.fullPath}
                        </div>
                      )}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
