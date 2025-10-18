'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ExternalLink, RefreshCw, Filter } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ShippingPolicy {
  policyId: string
  name: string
  description: string
  usaShipping: number
  rateTableId: string | null
  domesticServiceCode: string
  intlServiceCode: string
  handlingTime: number
  excludedCount: number
}

export function EbayPolicyList() {
  const [loading, setLoading] = useState(false)
  const [policies, setPolicies] = useState<ShippingPolicy[]>([])
  const [filteredPolicies, setFilteredPolicies] = useState<ShippingPolicy[]>([])
  const [error, setError] = useState<string | null>(null)
  const [rateTableFilter, setRateTableFilter] = useState<string>('all')
  const [availableRateTables, setAvailableRateTables] = useState<string[]>([])

  const loadPolicies = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ebay/policy/list')
      const data = await response.json()

      if (data.success) {
        setPolicies(data.policies)
        setFilteredPolicies(data.policies)
        
        // Rate Table IDを抽出（重複なし）
        const rateTables = Array.from(
          new Set(
            data.policies
              .map((p: ShippingPolicy) => p.rateTableId)
              .filter((id: string | null) => id !== null)
          )
        ).sort() as string[]
        
        setAvailableRateTables(rateTables)
      } else {
        setError('ポリシーの取得に失敗しました')
      }
    } catch (err) {
      setError('エラーが発生しました')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPolicies()
  }, [])

  useEffect(() => {
    if (rateTableFilter === 'all') {
      setFilteredPolicies(policies)
    } else if (rateTableFilter === 'none') {
      setFilteredPolicies(policies.filter(p => p.rateTableId === null))
    } else {
      setFilteredPolicies(policies.filter(p => p.rateTableId === rateTableFilter))
    }
  }, [rateTableFilter, policies])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>📦 eBay配送ポリシー一覧</CardTitle>
          <div className="flex items-center gap-3">
            {/* Rate Tableフィルター */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={rateTableFilter} onValueChange={setRateTableFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Rate Tableでフィルター" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて表示</SelectItem>
                  <SelectItem value="none">Rate Tableなし</SelectItem>
                  {availableRateTables.map((tableId) => (
                    <SelectItem key={tableId} value={tableId}>
                      {tableId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
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

        {loading && policies.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-600">読み込み中...</span>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              表示中: <strong>{filteredPolicies.length}</strong>個 / 合計: <strong>{policies.length}</strong>個
              {rateTableFilter !== 'all' && (
                <span className="ml-2 text-blue-600">
                  (フィルター: {rateTableFilter === 'none' ? 'Rate Tableなし' : rateTableFilter})
                </span>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ポリシー名
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        USA送料
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate Table
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        配送サービス
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        除外国
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPolicies.map((policy) => (
                      <tr key={policy.policyId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {policy.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-md">
                            {policy.description}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-green-600">
                            ${policy.usaShipping.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {policy.rateTableId ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {policy.rateTableId}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">なし</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs space-y-1">
                            <div>
                              <span className="font-medium">Domestic:</span>{' '}
                              <span className="text-gray-600">
                                {policy.domesticServiceCode || 'なし'}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Intl:</span>{' '}
                              <span className="text-gray-600">
                                {policy.intlServiceCode || 'なし'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm text-gray-700">
                            {policy.excludedCount}カ国
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <a
                            href={`https://www.ebay.com/sh/policies/shipping/${policy.policyId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
