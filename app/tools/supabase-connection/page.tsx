'use client'

import { useState } from 'react'

interface TableData {
  name: string
  rows: number
  isCandidate: boolean
}

interface TableDetail {
  name: string
  columns: Array<{ name: string; type: string }>
  sampleData: any[]
  rowCount: number
}

export default function SupabaseConnectionPage() {
  const [loading, setLoading] = useState(false)
  const [tables, setTables] = useState<TableData[]>([])
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [tableDetail, setTableDetail] = useState<TableDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tableCount, setTableCount] = useState<number>(0)

  const fetchTables = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/supabase/list-tables')
      const data = await response.json()
      
      if (data.success) {
        setTables(data.tables)
        setTableCount(data.count)
      } else {
        setError(data.error || 'テーブル取得に失敗しました')
      }
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const fetchTableDetail = async (tableName: string) => {
    setLoading(true)
    setSelectedTable(tableName)
    setError(null)
    
    try {
      const response = await fetch(`/api/supabase/table-detail?table=${tableName}`)
      const data = await response.json()
      
      if (data.success) {
        setTableDetail(data.detail)
      } else {
        setError(data.error || 'テーブル詳細取得に失敗しました')
      }
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const categorizeTable = (tableName: string): string => {
    if (tableName.includes('ebay')) return 'eBay関連'
    if (tableName.includes('shipping') || tableName.includes('ddp') || tableName.includes('rate') || tableName.includes('weight') || tableName.includes('zone')) return '配送・料金'
    if (tableName.includes('product') || tableName.includes('item') || tableName.includes('inventory') || tableName.includes('stock') || tableName.includes('shohin') || tableName.includes('zaiko')) return '商品・在庫'
    if (tableName.includes('order') || tableName.includes('juchu') || tableName.includes('shukka') || tableName.includes('shipment')) return '注文関連'
    if (tableName.includes('user') || tableName.includes('auth') || tableName.includes('account') || tableName.includes('profile')) return 'ユーザー・認証'
    if (tableName.includes('log') || tableName.includes('audit') || tableName.includes('history')) return 'ログ・履歴'
    if (tableName.includes('category') || tableName.includes('setting') || tableName.includes('config') || tableName.includes('policy')) return 'カテゴリ・設定'
    if (tableName.includes('amazon') || tableName.includes('mercari') || tableName.includes('yahoo') || tableName.includes('rakuten')) return 'マーケットプレイス'
    return 'その他'
  }

  const groupedTables = tables.reduce((acc, table) => {
    const category = categorizeTable(table.name)
    if (!acc[category]) acc[category] = []
    acc[category].push(table)
    return acc
  }, {} as Record<string, TableData[]>)

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Supabase データベース管理</h1>
        <p className="text-gray-600">全テーブルのデータ構造とサンプルデータを表示</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側: テーブル一覧 */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-4 bg-white border rounded-lg shadow">
            <h2 className="font-bold text-lg mb-3">テーブル一覧</h2>
            <button
              onClick={fetchTables}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? '読み込み中...' : 'テーブル取得'}
            </button>
            {tableCount > 0 && (
              <div className="mt-3 text-sm text-center text-gray-600">
                検出: {tableCount}個のテーブル
              </div>
            )}
          </div>

          {/* カテゴリ別テーブルリスト */}
          {Object.keys(groupedTables).length > 0 && (
            <div className="p-4 bg-white border rounded-lg shadow max-h-[700px] overflow-y-auto">
              {Object.entries(groupedTables).map(([category, categoryTables]) => (
                <div key={category} className="mb-4">
                  <h3 className="font-bold text-sm text-gray-700 mb-2 pb-1 border-b">
                    {category} ({categoryTables.length})
                  </h3>
                  <div className="space-y-2">
                    {categoryTables.map((table, index) => (
                      <button
                        key={index}
                        onClick={() => fetchTableDetail(table.name)}
                        className={`w-full text-left p-2 border rounded transition-colors text-sm ${
                          selectedTable === table.name
                            ? 'bg-blue-100 border-blue-500'
                            : table.isCandidate
                            ? 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="font-semibold text-xs truncate">{table.name}</div>
                        <div className="text-xs text-gray-600">
                          {table.rows?.toLocaleString() || 0} レコード
                        </div>
                        {table.isCandidate && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded">
                            USA DDP候補
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右側: テーブル詳細 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 接続状態 */}
          <div className="p-4 bg-green-50 border border-green-300 rounded-lg shadow">
            <h2 className="font-bold text-lg mb-2">✅ 接続状態</h2>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>SUPABASE_URL:</span>
                <span className="text-xs font-mono truncate max-w-xs">
                  {process.env.NEXT_PUBLIC_SUPABASE_URL}
                </span>
              </div>
              <div className="flex justify-between">
                <span>SUPABASE_KEY:</span>
                <span>✅ 設定済み</span>
              </div>
            </div>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-300 rounded-lg shadow">
              <h3 className="font-bold text-red-700">エラー</h3>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* テーブル詳細 */}
          {tableDetail && (
            <div className="space-y-4">
              {/* テーブル情報 */}
              <div className="p-4 bg-white border rounded-lg shadow">
                <h2 className="font-bold text-xl mb-3">{tableDetail.name}</h2>
                <div className="flex gap-4 text-sm text-gray-600">
                  <div>総レコード数: <span className="font-semibold">{tableDetail.rowCount.toLocaleString()}</span></div>
                  <div>カラム数: <span className="font-semibold">{tableDetail.columns.length}</span></div>
                </div>
              </div>

              {/* カラム構造 */}
              <div className="p-4 bg-white border rounded-lg shadow">
                <h3 className="font-bold text-lg mb-3">カラム構造</h3>
                <div className="grid grid-cols-2 gap-2">
                  {tableDetail.columns.map((col, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <span className="font-mono font-semibold text-xs truncate flex-1">{col.name}</span>
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                        {col.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* サンプルデータ */}
              {tableDetail.sampleData.length > 0 && (
                <div className="p-4 bg-white border rounded-lg shadow">
                  <h3 className="font-bold text-lg mb-3">サンプルデータ（最初の3件）</h3>
                  <div className="overflow-x-auto">
                    <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded max-h-96 overflow-y-auto">
                      {JSON.stringify(tableDetail.sampleData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 使い方ガイド */}
          {!tableDetail && !error && (
            <div className="p-4 bg-gray-50 border rounded-lg shadow">
              <h2 className="font-bold text-lg mb-3">使い方</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>左側の「テーブル取得」ボタンをクリック</li>
                <li>Supabase内のテーブルが自動検出されます</li>
                <li>カテゴリ別に整理されて表示されます</li>
                <li>テーブル名をクリックすると詳細が表示されます</li>
                <li>カラム構造とサンプルデータを確認できます</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
