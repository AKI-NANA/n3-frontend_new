'use client'

import React, { useState } from 'react'
import { ListingFilter, SourceMall, ListingStatus, PerformanceGrade } from '@/lib/types/listing'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { X, Filter } from 'lucide-react'

interface ListingFiltersProps {
  onFilterChange: (filter: ListingFilter) => void
  selectedMall?: SourceMall
}

export function ListingFilters({ onFilterChange, selectedMall }: ListingFiltersProps) {
  const [filter, setFilter] = useState<ListingFilter>({})
  const [isExpanded, setIsExpanded] = useState(false)

  const malls: SourceMall[] = ['ebay', 'amazon', 'shopee', 'shopify', 'yahoo', 'mercari', 'rakuten']
  const statuses: ListingStatus[] = ['Active', 'Inactive', 'SoldOut', 'PolicyViolation', 'SyncError']
  const grades: PerformanceGrade[] = ['A+', 'A', 'B', 'C', 'D']

  const handleFilterChange = (key: keyof ListingFilter, value: any) => {
    const newFilter = { ...filter, [key]: value || undefined }
    setFilter(newFilter)
    onFilterChange(newFilter)
  }

  const handleClearFilters = () => {
    setFilter({})
    onFilterChange({})
  }

  const activeFilterCount = Object.values(filter).filter(v => v !== undefined && v !== '').length

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          <h3 className="text-lg font-semibold">フィルター</h3>
          {activeFilterCount > 0 && (
            <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-red-600"
            >
              <X className="w-4 h-4 mr-1" />
              クリア
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '折りたたむ' : '展開'}
          </Button>
        </div>
      </div>

      {/* 基本フィルター（常に表示） */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>検索</Label>
          <Input
            placeholder="SKU, タイトルで検索"
            value={filter.search_query || ''}
            onChange={(e) => handleFilterChange('search_query', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>モール</Label>
          <Select
            value={filter.mall || ''}
            onValueChange={(value) => handleFilterChange('mall', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="すべてのモール" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">すべてのモール</SelectItem>
              {malls.map((mall) => (
                <SelectItem key={mall} value={mall}>
                  {mall.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>ステータス</Label>
          <Select
            value={filter.status || ''}
            onValueChange={(value) => handleFilterChange('status', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="すべてのステータス" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">すべてのステータス</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 追加フィルター（展開時のみ表示） */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <div className="space-y-2">
            <Label>パフォーマンスグレード</Label>
            <Select
              value={filter.performance_grade || ''}
              onValueChange={(value) => handleFilterChange('performance_grade', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="すべてのグレード" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">すべてのグレード</SelectItem>
                {grades.map((grade) => (
                  <SelectItem key={grade} value={grade}>
                    {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>価格範囲</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="最小"
                value={filter.price_min || ''}
                onChange={(e) => handleFilterChange('price_min', parseFloat(e.target.value))}
              />
              <span className="self-center">~</span>
              <Input
                type="number"
                placeholder="最大"
                value={filter.price_max || ''}
                onChange={(e) => handleFilterChange('price_max', parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>在庫数範囲</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="最小"
                value={filter.stock_min || ''}
                onChange={(e) => handleFilterChange('stock_min', parseInt(e.target.value))}
              />
              <span className="self-center">~</span>
              <Input
                type="number"
                placeholder="最大"
                value={filter.stock_max || ''}
                onChange={(e) => handleFilterChange('stock_max', parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>
      )}

      {/* モール別の動的フィルター */}
      {filter.mall && isExpanded && (
        <div className="pt-4 border-t">
          <h4 className="text-sm font-semibold mb-3 text-blue-600">
            {filter.mall.toUpperCase()} 専用フィルター
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filter.mall === 'ebay' && (
              <>
                <div className="space-y-2">
                  <Label>バリエーション数</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="すべて" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">すべて</SelectItem>
                      <SelectItem value="1">1個</SelectItem>
                      <SelectItem value="2-5">2-5個</SelectItem>
                      <SelectItem value="6+">6個以上</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>オークション形式</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="すべて" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">すべて</SelectItem>
                      <SelectItem value="fixed">固定価格</SelectItem>
                      <SelectItem value="auction">オークション</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {filter.mall === 'amazon' && (
              <div className="space-y-2">
                <Label>フルフィルメント</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="すべて" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">すべて</SelectItem>
                    <SelectItem value="fba">FBA</SelectItem>
                    <SelectItem value="fbm">FBM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
