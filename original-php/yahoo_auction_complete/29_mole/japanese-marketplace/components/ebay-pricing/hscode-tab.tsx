import { RefreshCw } from 'lucide-react'

interface HsCodeTabProps {
  hsCodes: any[]
}

export function HsCodeTab({ hsCodes }: HsCodeTabProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">HSコード管理</h2>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Supabase連携済み
        </h3>
        <div className="space-y-3 text-sm">
          <div>
            <strong>データベース連携:</strong> リアルタイムでHSコードを取得
          </div>
          <div>
            <strong>登録済み:</strong> {hsCodes.length}件のHSコード
          </div>
          <div>
            <strong>今後の拡張:</strong> eBayカテゴリCSVからの一括インポート機能を追加予定
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {hsCodes.map((hs) => (
          <div
            key={hs.code}
            className="border-2 rounded-lg p-4 hover:border-indigo-300 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono font-bold">{hs.code}</div>
              {hs.section301 && (
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                  Section 301
                </span>
              )}
            </div>
            <div className="text-sm text-gray-700 mb-2">{hs.description}</div>
            <div className="text-xs">
              基本関税: <strong>{(hs.base_duty * 100).toFixed(2)}%</strong>
              {hs.section301 && (
                <span className="ml-3 text-red-600">
                  + Section 301: {(hs.section301_rate * 100).toFixed(0)}%
                </span>
              )}
            </div>
            {hs.category && (
              <div className="text-xs text-gray-500 mt-1">
                カテゴリ: {hs.category}
              </div>
            )}
          </div>
        ))}
      </div>

      {hsCodes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          HSコードが登録されていません。Supabaseにデータを追加してください。
        </div>
      )}
    </div>
  )
}
