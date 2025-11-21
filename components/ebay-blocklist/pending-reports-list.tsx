'use client'

/**
 * ペンディング中の報告リスト（管理者用）
 */

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { BlockedBuyerReport } from '@/types/ebay-blocklist'

interface PendingReportsListProps {
  reviewerId: string
}

export function PendingReportsList({ reviewerId }: PendingReportsListProps) {
  const [reports, setReports] = useState<BlockedBuyerReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ebay/blocklist/report')
      const data = await response.json()
      setReports(data.reports || [])
    } catch (error) {
      console.error('Failed to load reports:', error)
      toast.error('報告の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (reportId: string) => {
    try {
      const response = await fetch('/api/ebay/blocklist/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          reviewedBy: reviewerId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve report')
      }

      toast.success('報告を承認しました')
      loadReports() // リロード
    } catch (error) {
      console.error('Approve error:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to approve report'
      )
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600'
      case 'high':
        return 'bg-orange-600'
      case 'medium':
        return 'bg-yellow-600'
      case 'low':
        return 'bg-blue-600'
      default:
        return 'bg-gray-600'
    }
  }

  if (loading) {
    return <div className="text-center py-4">読み込み中...</div>
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        ペンディング中の報告はありません
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <Card key={report.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {report.buyer_username}
              </CardTitle>
              <Badge className={getSeverityColor(report.severity)}>
                {report.severity.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-semibold">理由:</p>
                <p className="text-sm text-gray-700">{report.reason}</p>
              </div>

              {report.evidence && (
                <div>
                  <p className="text-sm font-semibold">証拠:</p>
                  <p className="text-sm text-gray-700">{report.evidence}</p>
                </div>
              )}

              <div className="text-xs text-gray-500">
                報告日時: {new Date(report.created_at).toLocaleString('ja-JP')}
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => handleApprove(report.id)}
                  variant="default"
                  size="sm"
                >
                  承認
                </Button>
                <Button variant="outline" size="sm">
                  拒否
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
