import Link from 'next/link'
import { getHTSCodeDetail, getCountryTariffs } from '@/lib/supabase/hts'
import { formatBilingualDescription } from '@/lib/supabase/hts-translations'
import { ArrowLeft, Globe, DollarSign, Package } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ code: string }>
}

export default async function HTSCodeDetailPage({ params }: Props) {
  const { code: codeParam } = await params
  const code = await getHTSCodeDetail(codeParam)
  const countryTariffs = await getCountryTariffs(codeParam)
  
  if (!code) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            HTSコードが見つかりません
          </h1>
          <p className="text-gray-600 mb-6">
            指定されたHTSコード「{codeParam}」は存在しません。
          </p>
          <Link 
            href="/tools/hts-classification" 
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            検索ページに戻る
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* パンくずリスト */}
        <div className="mb-6 flex items-center gap-2 text-sm">
          <Link href="/tools/hts-classification" className="text-blue-600 hover:text-blue-800">
            検索
          </Link>
          <span className="text-gray-400">→</span>
          <Link href="/tools/hts-classification/chapters" className="text-blue-600 hover:text-blue-800">
            Chapters
          </Link>
          <span className="text-gray-400">→</span>
          <Link 
            href={`/tools/hts-classification/chapter/${code.chapter}`}
            className="text-blue-600 hover:text-blue-800"
          >
            Chapter {code.chapter}
          </Link>
          <span className="text-gray-400">→</span>
          <span className="text-gray-700 font-medium">{code.code}</span>
        </div>

        {/* ヘッダー */}
        <div className="mb-8">
          <Link 
            href={`/tools/hts-classification/chapter/${code.chapter}`}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Chapter {code.chapter}に戻る
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">
            {code.code}
          </h1>
          <div className="text-lg text-gray-700">
            {formatBilingualDescription(code.description, code.description_ja)}
          </div>
        </div>

        {/* 詳細情報 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* 基本情報 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              基本情報
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">HTSコード</dt>
                <dd className="text-base text-gray-900 font-mono">{code.code}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Chapter</dt>
                <dd className="text-base text-gray-900">{code.chapter}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Heading</dt>
                <dd className="text-base text-gray-900">{code.heading || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Subheading</dt>
                <dd className="text-base text-gray-900">{code.subheading || '-'}</dd>
              </div>
            </dl>
          </div>

          {/* 一般税率 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              一般税率（米国）
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">基本税率</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {code.general_rate || '情報なし'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">特別税率</dt>
                <dd className="text-base text-gray-900">{code.special_rate || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">その他</dt>
                <dd className="text-base text-gray-900">{code.column_2_rate || '-'}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* 国別関税率 */}
        {countryTariffs && countryTariffs.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-600" />
              国別関税率
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      国
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      関税率
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {countryTariffs.map((tariff) => (
                    <tr key={tariff.country_code}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {tariff.country_name || tariff.country_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {tariff.tariff_rate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 説明 */}
        {code.notes && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">注記</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{code.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
