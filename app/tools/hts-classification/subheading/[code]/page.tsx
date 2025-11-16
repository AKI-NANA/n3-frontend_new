import Link from 'next/link'
import { getHTSCodesBySubheading } from '@/lib/supabase/hts'
import { formatBilingualDescription } from '@/lib/supabase/hts-translations'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  params: { code: string }
}

export default async function SubheadingDetailPage({ params }: Props) {
  const codes = await getHTSCodesBySubheading(params.code)
  const chapterCode = params.code.substring(0, 2)
  const headingCode = params.code.substring(0, 4)

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
          <Link href={`/tools/hts-classification/heading/${headingCode}`} className="text-blue-600 hover:text-blue-800">
            Heading {headingCode}
          </Link>
          <span className="text-gray-400">→</span>
          <span className="text-gray-700 font-medium">Subheading {params.code}</span>
        </div>

        {/* ヘッダー */}
        <div className="mb-8">
          <Link 
            href={`/tools/hts-classification/heading/${headingCode}`}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Heading {headingCode}に戻る
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Subheading {params.code} - 完全なHTSコード
          </h1>
          <p className="text-gray-600">
            10桁の完全なHTSコード一覧（全{codes?.length || 0}項目）
          </p>
        </div>

        {/* 階層説明 */}
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r">
          <p className="text-green-900 mb-2">
            <strong>✅ 最終階層：</strong> Chapter {chapterCode} → Heading {headingCode} → Subheading {params.code} → <strong>完全なHTSコード（10桁）</strong>
          </p>
          <p className="text-green-800 text-sm">
            以下のコードをクリックすると、<strong>基本税率と原産国別の追加関税</strong>が確認できます
          </p>
        </div>

        {/* HTSコード一覧テーブル */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-56">
                  HTS Code<br />
                  <span className="text-gray-400 normal-case">完全なHTSコード</span>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description<br />
                  <span className="text-gray-400 normal-case">説明</span>
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  General Rate<br />
                  <span className="text-gray-400 normal-case">基本税率</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {codes?.map((c) => (
                <tr key={c.hts_number} className="hover:bg-green-50 transition">
                  <td className="px-6 py-4">
                    <Link 
                      href={`/tools/hts-classification/code/${c.hts_number}`} 
                      className="text-blue-600 hover:text-blue-800 font-mono font-semibold text-lg"
                    >
                      {c.hts_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <Link 
                      href={`/tools/hts-classification/code/${c.hts_number}`} 
                      className="text-gray-900 hover:text-blue-600"
                    >
                      {formatBilingualDescription(c.description, c.chapter_code)}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">
                      {c.general_rate || 'Free'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {codes && codes.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800">
              このSubheadingには登録されているHTSコードがありません。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
