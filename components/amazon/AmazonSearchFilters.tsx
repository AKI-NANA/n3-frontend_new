'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'

interface AmazonSearchFiltersProps {
  filters: {
    minPrice?: number
    maxPrice?: number
    category?: string
    primeOnly?: boolean
    minRating?: number
  }
  onChange: (filters: any) => void
}

export function AmazonSearchFilters({ filters, onChange }: AmazonSearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  const amazonCategories = [
    { value: 'All', label: 'すべて' },
    { value: 'Electronics', label: '家電・カメラ' },
    { value: 'Books', label: '本' },
    { value: 'Clothing', label: '服・ファッション' },
    { value: 'Home', label: 'ホーム・キッチン' },
    { value: 'Sports', label: 'スポーツ' },
    { value: 'Toys', label: 'おもちゃ' },
    { value: 'Beauty', label: 'ビューティー' },
    { value: 'HealthPersonalCare', label: 'ヘルスケア' },
    { value: 'Automotive', label: '車・バイク' }
  ]

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium">
        詳細フィルター
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minPrice">最低価格 ($)</Label>
            <Input
              id="minPrice"
              type="number"
              placeholder="0"
              value={filters.minPrice || ''}
              onChange={(e) => onChange({
                ...filters,
                minPrice: e.target.value ? parseFloat(e.target.value) : undefined
              })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxPrice">最高価格 ($)</Label>
            <Input
              id="maxPrice"
              type="number"
              placeholder="1000"
              value={filters.maxPrice || ''}
              onChange={(e) => onChange({
                ...filters,
                maxPrice: e.target.value ? parseFloat(e.target.value) : undefined
              })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">カテゴリ</Label>
            <Select
              value={filters.category || 'All'}
              onValueChange={(value) => onChange({ ...filters, category: value })}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="カテゴリを選択" />
              </SelectTrigger>
              <SelectContent>
                {amazonCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minRating">最低評価</Label>
            <Select
              value={filters.minRating?.toString() || '0'}
              onValueChange={(value) => onChange({
                ...filters,
                minRating: parseFloat(value)
              })}
            >
              <SelectTrigger id="minRating">
                <SelectValue placeholder="評価を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">すべて</SelectItem>
                <SelectItem value="3.0">3.0以上</SelectItem>
                <SelectItem value="3.5">3.5以上</SelectItem>
                <SelectItem value="4.0">4.0以上</SelectItem>
                <SelectItem value="4.5">4.5以上</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="primeOnly"
            checked={filters.primeOnly || false}
            onCheckedChange={(checked) => onChange({ ...filters, primeOnly: checked })}
          />
          <Label htmlFor="primeOnly" className="cursor-pointer">
            Prime対象商品のみ
          </Label>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
