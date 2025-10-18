// components/ebay-pricing/category-list.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Tag, DollarSign } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Category {
  category_key: string
  category_name: string
  category_path: string
  fvf: number
  insertion_fee: number
  active: boolean
}

export function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const limit = 50

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search,
        limit: limit.toString(),
        offset: (page * limit).toString(),
      })

      const response = await fetch(`/api/ebay/list-categories?${params}`)
      const data = await response.json()

      setCategories(data.categories || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [page])

  const handleSearch = () => {
    setPage(0)
    fetchCategories()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5" />
          eBayカテゴリ一覧 ({total.toLocaleString()}件)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 検索 */}
        <div className="flex gap-2">
          <Input
            placeholder="カテゴリ名またはカテゴリ番号で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading}>
            <Search className="w-4 h-4 mr-2" />
            検索
          </Button>
        </div>

        {/* カテゴリ一覧 */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {categories.map((cat) => (
            <div
              key={cat.category_key}
              className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{cat.category_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {cat.category_key}
                    </Badge>
                  </div>
                  {cat.category_path && cat.category_path !== cat.category_name && (
                    <div className="text-xs text-muted-foreground">
                      {cat.category_path}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-sm font-semibold">
                      {(cat.fvf * 100).toFixed(2)}%
                    </div>
                    <div className="text-xs text-muted-foreground">FVF</div>
                  </div>
                  <div>
                    <div className="text-sm">
                      ${cat.insertion_fee.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">挿入料</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ページネーション */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {page * limit + 1} - {Math.min((page + 1) * limit, total)} / {total.toLocaleString()}件
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
            >
              前へ
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * limit >= total || loading}
            >
              次へ
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
