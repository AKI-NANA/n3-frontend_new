'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'

export default function HTSVerificationPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)

  const runVerification = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/hts/verify-data')
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Error:', error)
      setResults({ success: false, error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">🔍 HTSデータベース検証ツール</h1>
          <p className="text-gray-600 mb-4">
            Chapter 95（玩具）のデータが正しく入っているか確認します
          </p>
          <button
            onClick={runVerification}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center space-x-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>検証中...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>検証開始</span>
              </>
            )}
          </button>
        </div>

        {results && (
          <div className="space-y-4">
            {/* 全体統計 */}
            {results.results?.checks?.totals && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">📊 全体統計</h2>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {results.results.checks.totals.chapters}
                    </div>
                    <div className="text-sm text-gray-600">Chapters</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {results.results.checks.totals.headings}
                    </div>
                    <div className="text-sm text-gray-600">Headings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600">
                      {results.results.checks.totals.subheadings}
                    </div>
                    <div className="text-sm text-gray-600">Subheadings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {results.results.checks.totals.details}
                    </div>
                    <div className="text-sm text-gray-600">Full Codes</div>
                  </div>
                </div>
              </div>
            )}

            {/* Chapter 95確認 */}
            {results.results?.checks?.chapter95 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                  {results.results.checks.chapter95.exists ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500" />
                  )}
                  <span>Chapter 95 データ確認</span>
                </h2>
                {results.results.checks.chapter95.data && (
                  <div className="bg-gray-50 p-4 rounded font-mono text-sm overflow-x-auto">
                    <pre>{JSON.stringify(results.results.checks.chapter95.data, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}

            {/* Full Code確認 */}
            {results.results?.checks?.fullCode_9503_00_00_11 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                  {results.results.checks.fullCode_9503_00_00_11.exists ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500" />
                  )}
                  <span>Full Code 9503.00.00.11 確認</span>
                </h2>
                {results.results.checks.fullCode_9503_00_00_11.data ? (
                  <div className="bg-gray-50 p-4 rounded">
                    <div className="space-y-2">
                      <div>
                        <span className="font-bold">HTS番号:</span>{' '}
                        {results.results.checks.fullCode_9503_00_00_11.data.hts_number}
                      </div>
                      <div>
                        <span className="font-bold">説明:</span>{' '}
                        {results.results.checks.fullCode_9503_00_00_11.data.description}
                      </div>
                      <div>
                        <span className="font-bold">関税率:</span>{' '}
                        {results.results.checks.fullCode_9503_00_00_11.data.general_rate || 'NULL'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-red-600">❌ データが存在しません</div>
                )}
              </div>
            )}

            {/* 9503の全コード */}
            {results.results?.checks?.allCodes9503 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">
                  📋 9503で始まるFull Code（サンプル10件）
                </h2>
                <div className="text-sm text-gray-600 mb-2">
                  合計: {results.results.checks.allCodes9503.count}件
                </div>
                <div className="space-y-2">
                  {results.results.checks.allCodes9503.sample.map((code: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded">
                      <div className="font-mono font-bold">{code.hts_number}</div>
                      <div className="text-sm text-gray-700">{code.description}</div>
                      <div className="text-xs text-gray-500">関税: {code.general_rate || 'NULL'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* テーブル関連確認 */}
            {results.results?.checks?.relationCheck && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">🔗 テーブル間の関連確認</h2>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {results.results.checks.relationCheck.hasChapterId ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span>chapter_id: {results.results.checks.relationCheck.hasChapterId ? '✅ 存在' : '❌ 不在'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {results.results.checks.relationCheck.hasChapterCode ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                    )}
                    <span>chapter_code: {results.results.checks.relationCheck.hasChapterCode ? '✅ 存在' : '⚠️ 不在'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 生データ */}
            <details className="bg-white rounded-lg shadow p-6">
              <summary className="font-bold cursor-pointer">🔍 生データ（JSON）</summary>
              <div className="mt-4 bg-gray-900 text-gray-100 p-4 rounded font-mono text-xs overflow-x-auto">
                <pre>{JSON.stringify(results, null, 2)}</pre>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}
