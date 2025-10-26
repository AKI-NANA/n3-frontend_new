'use client'

import { useState } from 'react'

export default function FindDDPTablePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const findDDPTable = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    
    try {
      const response = await fetch('/api/check-ddp-tables')
      const data = await response.json()
      
      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || 'テーブル検索に失敗しました')
      }
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">USA DDP配送コストマトリックス テーブル検索</h1>
        <p className="text-gray-600">
          60重量帯 × 20価格帯 = 約1200レコードのテーブルを検索します
        </p>
      </div>
      
      <div className="mb-6">
        <button
          onClick={findDDPTable}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
        >
          {loading ? '検索中...' : 'DDPテーブルを検索'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-lg mb-6">
          <h3 className="font-bold text-red-700 mb-2">エラー</h3>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* 分析結果サマリー */}
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-blue-900">📊 分析結果</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">検出テーブル数:</span>
                <span className="ml-2 font-bold text-lg">{result.analysis.totalTablesFound}</span>
              </div>
              <div>
                <span className="text-gray-600">DDP候補数:</span>
                <span className="ml-2 font-bold text-lg text-green-600">{result.analysis.ddpCandidates}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">期待レコード数:</span>
                <span className="ml-2 font-semibold">{result.analysis.expectedRecords}</span>
              </div>
              <div className="col-span-2 p-3 bg-white rounded border-l-4 border-blue-500">
                <p className="text-sm font-bold text-blue-900">{result.analysis.recommendations}</p>
              </div>
            </div>
          </div>

          {/* DDP候補テーブル */}
          {result.likelyDDPTables && result.likelyDDPTables.length > 0 && (
            <div className="p-6 bg-white border rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-4">✅ DDP候補テーブル ({result.likelyDDPTables.length}個)</h2>
              <div className="space-y-4">
                {result.likelyDDPTables.map((table: any, index: number) => (
                  <div key={index} className="p-4 border-2 border-green-300 rounded-lg bg-green-50">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-green-900">{table.table}</h3>
                        <p className="text-sm text-gray-600">
                          {table.count.toLocaleString()} レコード
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {table.hasWeightColumn && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-semibold">
                            重量カラムあり
                          </span>
                        )}
                        {table.hasPriceColumn && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded font-semibold">
                            価格カラムあり
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <h4 className="font-semibold text-sm mb-2">重量関連カラム:</h4>
                        <div className="flex flex-wrap gap-1">
                          {table.weightColumns.map((col: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-blue-200 text-blue-900 text-xs rounded font-mono">
                              {col}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-2">価格関連カラム:</h4>
                        <div className="flex flex-wrap gap-1">
                          {table.priceColumns.map((col: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-purple-200 text-purple-900 text-xs rounded font-mono">
                              {col}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-sm mb-2">全カラム ({table.columns.length}個):</h4>
                      <div className="flex flex-wrap gap-1">
                        {table.columns.map((col: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded font-mono">
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <h4 className="font-semibold text-sm mb-2">サンプルデータ (最初の3件):</h4>
                      <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto max-h-60 overflow-y-auto">
                        {JSON.stringify(table.sample, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 全テーブル一覧 */}
          <div className="p-6 bg-white border rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4">📋 全検出テーブル ({result.allTables.length}個)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">テーブル名</th>
                    <th className="px-4 py-2 text-center">レコード数</th>
                    <th className="px-4 py-2 text-center">重量カラム</th>
                    <th className="px-4 py-2 text-center">価格カラム</th>
                    <th className="px-4 py-2 text-center">DDP候補</th>
                  </tr>
                </thead>
                <tbody>
                  {result.allTables.map((table: any, index: number) => (
                    <tr key={index} className={`border-b ${table.isDDPCandidate ? 'bg-green-50' : ''}`}>
                      <td className="px-4 py-2 font-mono text-xs">{table.table}</td>
                      <td className="px-4 py-2 text-center font-semibold">
                        {table.count.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {table.hasWeightColumn ? (
                          <span className="text-green-600 font-bold">✓</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {table.hasPriceColumn ? (
                          <span className="text-green-600 font-bold">✓</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {table.isDDPCandidate ? (
                          <span className="px-2 py-1 bg-green-500 text-white text-xs rounded font-bold">
                            候補
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
