"use client"

import { useState } from "react"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { DashboardFilters } from "@/components/dashboard/dashboard-filters"
import { ProductList } from "@/components/dashboard/product-list"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">ダッシュボード</h1>
            <p className="mt-2 text-muted-foreground">在庫管理と出品状況の一覧</p>
          </div>
          <Link href="/tools/inventory/register">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新規商品登録
            </Button>
          </Link>
        </div>

        <DashboardStats />

        <DashboardFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />

        <ProductList filterStatus={activeFilter || undefined} />
      </div>
    </main>
  )
}
