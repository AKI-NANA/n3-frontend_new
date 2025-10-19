// components/approval/ApprovalStats.tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, CheckCircle2, XCircle, Clock, Brain, AlertCircle } from 'lucide-react'
import type { ApprovalStats } from '@/types/approval'

interface ApprovalStatsProps {
  stats: ApprovalStats
}

export function ApprovalStatsDisplay({ stats }: ApprovalStatsProps) {
  const statItems = [
    {
      label: '合計商品',
      value: stats.totalProducts,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      label: '承認待ち',
      value: stats.totalPending,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30'
    },
    {
      label: '承認済み',
      value: stats.totalApproved,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30'
    },
    {
      label: '否認済み',
      value: stats.totalRejected,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/30'
    },
    {
      label: 'AI推奨',
      value: stats.aiApproved,
      icon: Brain,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30'
    },
    {
      label: 'AI保留',
      value: stats.aiPending,
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30'
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statItems.map((item, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
                <p className="text-2xl font-bold">{item.value.toLocaleString()}</p>
              </div>
              <div className={`${item.bgColor} p-2 rounded-lg`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
