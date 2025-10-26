'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, Download } from 'lucide-react'

interface ShippingPolicy {
  id: number
  policy_name: string
  policy_type: string
  description: string
  flat_shipping_cost: number
  handling_time_days: number
  rate_table_name: string | null
  created_at: string
}

export function ShippingPolicyTable() {
  const [loading, setLoading] = useState(true)
  const [policies, setPolicies] = useState<ShippingPolicy[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadPolicies = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // ページネーションで全データを取得
      let allPolicies: ShippingPolicy[] = []
      let from = 0
      const limit = 1000
      
      while (true) {
        const { data, error: dbError } = await supabase
          .from('shipping_policies')
          .select('*')
          .order('id', { ascending: true })
          .range(from, from + limit - 1)

        if (dbError) throw dbError
        if (!data || data.length === 0) break
        
        allPolicies = [...allPolicies, ...data]
        
        console.log(`✅ Loaded ${allPolicies.length} policies so far...`)
        
        if (data.length < limit) break  // 最後のページ
        from += limit
      }

      setPolicies(allPolicies)
      console.log(`✅ Total loaded: ${allPolicies.length} policies from database`)
    } catch (err: any) {
      setError('ポリシーの取得に失敗しました: ' + err.message)
      console.error('Failed to load policies:', err)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const csvContent = [
      ['ポリシー名', 'Rate Table', '送料(USD)', 'タイプ', 'ハンドリング時間(日)', '作成日時'],
      ...policies.map(p => [
        p.policy_name,
        p.rate_table_name || '',
        p.flat_shipping_cost.toFixed(2),
        p.policy_type,
        p.handling_time_days,
        new Date(p.created_at).toLocaleString('ja-JP')
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `shipping_policies_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
  }

  useEffect(() => {
    loadPolicies()
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">📋 配送ポリシー一覧</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              データベースに保存された配送ポリシー
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={exportToCSV}
              disabled={loading || policies.length === 0}
              variant="outline"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV出力
            </Button>
            <Button
              onClick={loadPolicies}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="ml-2">更新</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-600">読み込み中...</span>
          </div>
        ) : (
          <>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium text-blue-900">合計ポリシー数:</span>
                  <span className="ml-2 text-2xl font-bold text-blue-600">{policies.length}</span>
                  <span className="ml-1 text-blue-900">個</span>
                </div>
                {policies.length > 0 && (
                  <div className="text-xs text-blue-700">
                    最終更新: {new Date(policies[0].created_at).toLocaleString('ja-JP')}
                  </div>
                )}
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
                <table className="w-full border-collapse">
                  <thead className="bg-gradient-to-r from-blue-500 to-purple-600 text-white sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-blue-400">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-blue-400">
                        ポリシー名
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider border-r border-blue-400">
                        Rate Table
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider border-r border-blue-400">
                        送料 (USD)
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider border-r border-blue-400">
                        タイプ
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider border-r border-blue-400">
                        ハンドリング時間
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                        作成日時
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {policies.map((policy, index) => (
                      <tr 
                        key={policy.id} 
                        className={`
                          hover:bg-blue-50 transition-colors
                          ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        `}
                      >
                        <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 border-r border-gray-200">
                          <div className="text-sm font-mono font-medium text-gray-900">
                            {policy.policy_name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 truncate max-w-md">
                            {policy.description}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center border-r border-gray-200">
                          {policy.rate_table_name ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-blue-100 text-blue-800 border border-blue-300">
                              {policy.rate_table_name}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right border-r border-gray-200">
                          <span className="text-sm font-bold text-green-600">
                            ${policy.flat_shipping_cost.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center border-r border-gray-200">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {policy.policy_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center border-r border-gray-200">
                          <span className="text-sm text-gray-700">
                            {policy.handling_time_days}日
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600">
                            {new Date(policy.created_at).toLocaleString('ja-JP')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {policies.length === 0 && !error && (
              <div className="text-center py-12 text-gray-500">
                配送ポリシーがまだ登録されていません
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
