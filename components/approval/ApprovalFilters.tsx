// components/approval/ApprovalFilters.tsx
'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import type { FilterState, ApprovalStats } from '@/types/approval'

interface ApprovalFiltersProps {
  filters: FilterState
  onFilterChange: (filters: Partial<FilterState>) => void
  stats?: ApprovalStats
}

export function ApprovalFilters({ filters, onFilterChange, stats }: ApprovalFiltersProps) {
  const hasActiveFilters = 
    filters.status !== 'pending' ||
    filters.aiFilter !== 'all' ||
    filters.minPrice > 0 ||
    filters.maxPrice > 0 ||
    filters.search !== ''

  const clearFilters = () => {
    onFilterChange({
      status: 'pending',
      aiFilter: 'all',
      minPrice: 0,
      maxPrice: 0,
      search: ''
    })
  }

  return (
    <div className="space-y-4">
      {/* 検索バー */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="商品タイトルで検索..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="pl-10"
          />
        </div>
        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters}>
            <X className="w-4 h-4 mr-2" />
            フィルタークリア
          </Button>
        )}
      </div>

      {/* ステータスフィルター */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-semibold text-muted-foreground self-center">ステータス:</span>
        <Button
          variant={filters.status === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange({ status: 'pending' })}
        >
          承認待ち
          {stats && <Badge variant="secondary" className="ml-2">{stats.totalPending}</Badge>}
        </Button>
        <Button
          variant={filters.status === 'approved' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange({ status: 'approved' })}
        >
          承認済み
          {stats && <Badge variant="secondary" className="ml-2">{stats.totalApproved}</Badge>}
        </Button>
        <Button
          variant={filters.status === 'rejected' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange({ status: 'rejected' })}
        >
          否認済み
          {stats && <Badge variant="secondary" className="ml-2">{stats.totalRejected}</Badge>}
        </Button>
        <Button
          variant={filters.status === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange({ status: 'all' })}
        >
          すべて
        </Button>
      </div>

      {/* AI判定フィルター */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-semibold text-muted-foreground self-center">AI判定:</span>
        <Button
          variant={filters.aiFilter === 'ai-approved' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange({ aiFilter: 'ai-approved' })}
          className={filters.aiFilter === 'ai-approved' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
        >
          AI推奨
          {stats && <Badge variant="secondary" className="ml-2">{stats.aiApproved}</Badge>}
        </Button>
        <Button
          variant={filters.aiFilter === 'ai-pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange({ aiFilter: 'ai-pending' })}
          className={filters.aiFilter === 'ai-pending' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : ''}
        >
          AI保留
          {stats && <Badge variant="secondary" className="ml-2">{stats.aiPending}</Badge>}
        </Button>
        <Button
          variant={filters.aiFilter === 'ai-rejected' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange({ aiFilter: 'ai-rejected' })}
          className={filters.aiFilter === 'ai-rejected' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
        >
          AI非推奨
          {stats && <Badge variant="secondary" className="ml-2">{stats.aiRejected}</Badge>}
        </Button>
        <Button
          variant={filters.aiFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange({ aiFilter: 'all' })}
        >
          すべて
        </Button>
      </div>

      {/* 価格フィルター */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm font-semibold text-muted-foreground">価格帯:</span>
        <Input
          type="number"
          placeholder="最低価格"
          value={filters.minPrice || ''}
          onChange={(e) => onFilterChange({ minPrice: Number(e.target.value) || 0 })}
          className="w-32"
        />
        <span className="text-muted-foreground">〜</span>
        <Input
          type="number"
          placeholder="最高価格"
          value={filters.maxPrice || ''}
          onChange={(e) => onFilterChange({ maxPrice: Number(e.target.value) || 0 })}
          className="w-32"
        />
      </div>
    </div>
  )
}
