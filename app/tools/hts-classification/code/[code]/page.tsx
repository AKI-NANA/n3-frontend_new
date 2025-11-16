import Link from 'next/link'
import { getHTSCodeDetail, getCountryTariffs } from '@/lib/supabase/hts'
import { formatBilingualDescription } from '@/lib/supabase/hts-translations'
import { ArrowLeft, Globe, DollarSign, Package } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  params: { code: string }
}

export default async function HTSCodeDetailPage({ params }: Props) {
  const code = await getHTSCodeDetail(params.code)
  const countryTariffs = await getCountryTariffs(params.code)
  
  if (!code) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            HTSコードが見つかりません
          </h1>
          <p className="text-gray-600 mb-6">
            指定されたHTSコード「{params.code}」は存在しません。
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

  const chapterCode = code.chapter_code
  const headingCode = code.heading_code
  const subheadingCode = code.subheading_code

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
          <Link href={`/tools/hts-classification/subheading/${subheadingCode}`} className="text-blue-600 hover:text-blue-800">
            Subheading {subheadingCode}
          </Link>
          <span className="text-gray-400">→</span>
          <span className="text-gray-700 font-medium">{code.hts_number}</span>
        </div>

        {/* ヘッダー */}
        <div className="mb-8">
          <Link 
            href={`/tools/hts-classification/subheading/${subheadingCode}`}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Subheading {subheadingCode}に戻る
          </Link>
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6 mb-4">
            <div className="font-mono text-3xl font-bold mb-2">
              HTS Code: {code.hts_number}
            </div>
            <p className="text-blue-100 text-lg">
              {formatBilingualDescription(code.description, code.chapter_code)}
            </p>
          </div>
        </div>

        {/* 基本情報セクション */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* 階層情報 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              階層情報
            </h2>
            <dl className="space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <dt className="font-medium text-gray-600">HTSコード:</dt>
                <dd className="font-mono font-semibold text-gray-900 text-lg">{code.hts_number}</dd>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <dt className="font-medium text-gray-600">Chapter（章）:</dt>
                <dd className="font-semibold text-gray-900">
                  <Link href={`/tools/hts-classification/chapter/${chapterCode}`} className="text-blue-600 hover:text-blue-800">
                    {chapterCode}
                  </Link>
                </dd>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <dt className="font-medium text-gray-600">Heading（項）:</dt>
                <dd className="font-semibold text-gray-900">
                  <Link href={`/tools/hts-classification/heading/${headingCode}`} className="text-blue-600 hover:text-blue-800">
                    {headingCode}
                  </Link>
                </dd>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <dt className="font-medium text-gray-600">Subheading（号）:</dt>
                <dd className="font-semibold text-gray-900">
                  <Link href={`/tools/hts-classification/subheading/${subheadingCode}`} className="text-blue-600 hover:text-blue-800">
                    {subheadingCode}
                  </Link>
                </dd>
              </div>
            </dl>
          </div>

          {/* 基本税率 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              基本税率（Base Tariff）
            </h2>
            <dl className="space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <dt className="font-medium text-gray-600">General Rate:</dt>
                <dd className="font-semibold text-green-700 text-xl">
                  {code.general_rate || 'Free'}
                </dd>
              </div>
              {code.special_rate && (
                <div className="flex justify-between items-center border-b pb-2">
                  <dt className="font-medium text-gray-600">Special Rate:</dt>
                  <dd className="font-semibold text-green-700 text-xl">
                    {code.special_rate}
                  </dd>
                </div>
              )}
              {code.column2_rate && (
                <div className="flex justify-between items-center border-b pb-2">
                  <dt className="font-medium text-gray-600">Column 2 Rate:</dt>
                  <dd className="font-semibold text-gray-900">
                    {code.column2_rate}
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-4 p-3 bg-green-50 rounded text-sm text-green-800">
              💡 <strong>General Rate</strong>は最恵国待遇（MFN）税率です。多くの国からの輸入に適用されます。
            </div>
          </div>
        </div>

        {/* 原産国別追加関税 */}
        {countryTariffs.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="w-6 h-6 text-purple-600" />
              原産国別追加関税（Country-Specific Additional Tariffs）
            </h2>
            <div className="mb-4 p-4 bg-purple-50 border-l-4 border-purple-500 rounded-r">
              <p className="text-purple-900 text-sm">
                以下の国から輸入する場合、基本税率に加えて追加関税が適用されます。
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Country<br />
                      <span className="text-gray-400 normal-case">原産国</span>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Additional Rate<br />
                      <span className="text-gray-400 normal-case">追加税率</span>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Rate<br />
                      <span className="text-gray-400 normal-case">合計税率</span>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes<br />
                      <span className="text-gray-400 normal-case">備考</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {countryTariffs.map((tariff: any) => (
                    <tr key={tariff.country_code} className="hover:bg-purple-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-gray-900">{tariff.country_code}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-orange-600 font-medium">
                          {tariff.additional_tariff_rate || '0%'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-purple-700 text-lg">
                          {tariff.total_tariff_rate || code.general_rate}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {tariff.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {countryTariffs.length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <p className="text-green-800 font-medium">
              ✅ このHTSコードには原産国別の追加関税はありません。
            </p>
            <p className="text-green-700 text-sm mt-2">
              基本税率（General Rate: {code.general_rate || 'Free'}）が全ての原産国に適用されます。
            </p>
          </div>
        )}

        {/* 関連リンク */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">📚 関連リンク</h3>
          <div className="space-y-2 text-sm">
            <Link 
              href={`/tools/hts-classification/subheading/${subheadingCode}`}
              className="text-blue-700 hover:text-blue-900 block"
            >
              → 同じSubheading ({subheadingCode}) の他のコードを見る
            </Link>
            <Link 
              href={`/tools/hts-classification/heading/${headingCode}`}
              className="text-blue-700 hover:text-blue-900 block"
            >
              → 同じHeading ({headingCode}) の他のコードを見る
            </Link>
            <Link 
              href="/tools/hts-classification"
              className="text-blue-700 hover:text-blue-900 block"
            >
              → 検索ページに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
