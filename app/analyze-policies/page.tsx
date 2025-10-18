'use client'

import { useEffect, useState } from 'react'

export default function AnalyzePoliciesPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ebay/analyze-current-policies')
      .then(res => res.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('エラー:', err)
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="p-8">読み込み中...</div>
  if (!data?.success) return <div className="p-8">エラー: データを取得できませんでした</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8">配送ポリシー分析</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">サマリー</h2>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="p-4 bg-blue-50 rounded">
            <div className="text-sm">総数</div>
            <div className="text-2xl font-bold">{data.summary?.total || 0}</div>
          </div>
          <div className="p-4 bg-green-50 rounded">
            <div className="text-sm">DDP</div>
            <div className="text-2xl font-bold">{data.summary?.ddp_count || 0}</div>
          </div>
          <div className="p-4 bg-yellow-50 rounded">
            <div className="text-sm">DDU</div>
            <div className="text-2xl font-bold">{data.summary?.ddu_count || 0}</div>
          </div>
          <div className="p-4 bg-purple-50 rounded">
            <div className="text-sm">価格帯</div>
            <div className="text-2xl font-bold">{data.summary?.price_bands?.length || 0}</div>
          </div>
        </div>
        {data.summary && (
          <div>
            <div className="font-semibold mb-2">
              価格帯: {data.summary.price_bands?.map((p: number) => `$${p}`).join(', ') || 'なし'}
            </div>
            <div className="font-semibold">
              重量帯: {data.summary.weight_bands?.join(', ') || 'なし'}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">DDP (USA) - {data.ddp_policies?.length || 0}件</h2>
        {data.ddp_policies && data.ddp_policies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">名前</th>
                  <th className="px-4 py-2 text-left">重量</th>
                  <th className="px-4 py-2 text-left">価格帯</th>
                  <th className="px-4 py-2 text-left">想定価格</th>
                  <th className="px-4 py-2 text-left">1個目</th>
                  <th className="px-4 py-2 text-left">2個目追加</th>
                  <th className="px-4 py-2 text-left">Handling</th>
                </tr>
              </thead>
              <tbody>
                {data.ddp_policies.map((p: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">{p.name || 'N/A'}</td>
                    <td className="px-4 py-2">{p.weight || 'N/A'}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        p.price_band === 'BAND_200' ? 'bg-blue-100 text-blue-800' :
                        p.price_band === 'BAND_350' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {p.price_band || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-2">${p.assumed_price || 'N/A'}</td>
                    <td className="px-4 py-2">${p.us_zone?.first_item_shipping_usd?.toFixed(2) || p.us_zone?.display_shipping_usd?.toFixed(2) || 'N/A'}</td>
                    <td className="px-4 py-2 font-bold text-green-600">
                      +${p.us_zone?.additional_item_shipping_usd?.toFixed(2) || 'N/A'}
                    </td>
                    <td className="px-4 py-2">${p.us_zone?.handling_fee_usd?.toFixed(2) || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8">DDPポリシーがありません</div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">DDU (その他) - {data.ddu_policies?.length || 0}件</h2>
        {data.ddu_policies && data.ddu_policies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">名前</th>
                  <th className="px-4 py-2 text-left">重量</th>
                  <th className="px-4 py-2 text-left">1個目</th>
                  <th className="px-4 py-2 text-left">2個目追加</th>
                  <th className="px-4 py-2 text-left">Handling</th>
                </tr>
              </thead>
              <tbody>
                {data.ddu_policies.map((p: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">{p.name || 'N/A'}</td>
                    <td className="px-4 py-2">{p.weight || 'N/A'}</td>
                    <td className="px-4 py-2">
                      ${p.other_zone?.first_item_shipping_usd?.toFixed(2) || p.other_zone?.display_shipping_usd?.toFixed(2) || 'N/A'}
                    </td>
                    <td className="px-4 py-2 font-bold text-green-600">
                      +${p.other_zone?.additional_item_shipping_usd?.toFixed(2) || 'N/A'}
                    </td>
                    <td className="px-4 py-2">${p.other_zone?.handling_fee_usd?.toFixed(2) || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8">DDUポリシーがありません</div>
        )}
      </div>

      <details className="mt-8 bg-gray-800 text-white p-4 rounded">
        <summary className="cursor-pointer font-semibold">Raw JSON（デバッグ用）</summary>
        <pre className="mt-4 text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>
      </details>
    </div>
  )
}
