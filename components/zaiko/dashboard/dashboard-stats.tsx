"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Package, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react"

interface Stats {
  total: number
  needsApproval: number
  approved: number
  rejected: number
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    needsApproval: 0,
    approved: 0,
    rejected: 0,
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/products/get-all")
        const result = await response.json()

        if (result.data) {
          const products = result.data

          setStats({
            total: products.length,
            needsApproval: products.filter((p: any) => p.status === "NeedsApproval").length,
            approved: products.filter((p: any) => p.status === "Approved").length,
            rejected: products.filter((p: any) => p.status === "Rejected").length,
          })
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    {
      icon: Package,
      label: "全商品",
      value: stats.total,
      color: "text-blue-600",
    },
    {
      icon: AlertCircle,
      label: "承認待ち",
      value: stats.needsApproval,
      color: "text-yellow-600",
    },
    {
      icon: CheckCircle2,
      label: "承認済み",
      value: stats.approved,
      color: "text-green-600",
    },
    {
      icon: TrendingUp,
      label: "却下",
      value: stats.rejected,
      color: "text-red-600",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-2">{stat.value}</p>
              </div>
              <Icon className={`h-8 w-8 ${stat.color} opacity-75`} />
            </div>
          </Card>
        )
      })}
    </div>
  )
}
