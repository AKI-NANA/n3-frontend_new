"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface DashboardFiltersProps {
  activeFilter: string | null
  onFilterChange: (filter: string | null) => void
}

export function DashboardFilters({ activeFilter, onFilterChange }: DashboardFiltersProps) {
  const filters = [
    { value: null, label: "全て" },
    { value: "NeedsApproval", label: "承認待ち" },
    { value: "Approved", label: "承認済み" },
    { value: "Rejected", label: "却下" },
  ]

  return (
    <Card className="p-4">
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Button
            key={filter.value || "all"}
            variant={activeFilter === filter.value ? "default" : "outline"}
            onClick={() => onFilterChange(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>
    </Card>
  )
}
