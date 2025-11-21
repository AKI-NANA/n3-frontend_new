'use client'

/**
 * ブロックリスト統計ダッシュボード
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BlocklistStats } from '@/types/ebay-blocklist'

interface BlocklistStatsProps {
  userId?: string
}

export function BlocklistStats({ userId }: BlocklistStatsProps) {
  const [stats, setStats] = useState<BlocklistStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [userId])

  const loadStats = async () => {
    setLoading(true)
    try {
      const url = userId
        ? `/api/ebay/blocklist/stats?userId=${userId}`
        : '/api/ebay/blocklist/stats'

      const response = await fetch(url)
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-4">読み込み中...</div>
  }

  if (!stats) {
    return <div className="text-center py-4">統計情報を読み込めませんでした</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">総ブロックバイヤー数</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalBlockedBuyers}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">承認済み</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {stats.approvedBuyers}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">ペンディング中</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">
            {stats.pendingReports}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">拒否済み</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {stats.rejectedBuyers}
          </div>
        </CardContent>
      </Card>

      {userId && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">総同期回数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSyncs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">最終同期日時</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {stats.lastSyncAt
                  ? new Date(stats.lastSyncAt).toLocaleString('ja-JP')
                  : '未同期'}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
