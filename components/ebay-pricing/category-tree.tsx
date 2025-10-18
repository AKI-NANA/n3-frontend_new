// components/ebay-pricing/category-tree.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChevronRight, ChevronDown, Folder, FolderOpen, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Category {
  category_key: string
  category_name: string
  category_parent_id: string | null
  category_level: number
  fvf: number
  insertion_fee: number
  children?: Category[]
  isExpanded?: boolean
}

export function CategoryTree() {
  const [categories, setCategories] = useState<Category[]>([])
  const [treeData, setTreeData] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setLoading(true)
    try {
      // 全カテゴリ取得（階層構造構築のため）
      const response = await fetch('/api/ebay/list-categories?limit=20000')
      const data = await response.json()
      
      setCategories(data.categories || [])
      buildTree(data.categories || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const buildTree = (cats: Category[]) => {
    // カテゴリIDでマップ作成
    const categoryMap = new Map<string, Category>()
    cats.forEach(cat => {
      categoryMap.set(cat.category_key, { ...cat, children: [] })
    })

    // 階層構造構築
    const rootCategories: Category[] = []
    
    categoryMap.forEach(cat => {
      if (cat.category_parent_id && categoryMap.has(cat.category_parent_id)) {
        const parent = categoryMap.get(cat.category_parent_id)!
        if (!parent.children) parent.children = []
        parent.children.push(cat)
      } else {
        // 親がいない = ルートカテゴリ
        rootCategories.push(cat)
      }
    })

    // カテゴリID順にソート
    const sortByKey = (a: Category, b: Category) => 
      parseInt(a.category_key) - parseInt(b.category_key)
    
    rootCategories.sort(sortByKey)
    rootCategories.forEach(cat => {
      if (cat.children) cat.children.sort(sortByKey)
    })

    setTreeData(rootCategories)
  }

  const toggleExpand = (categoryKey: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(categoryKey)) {
      newExpanded.delete(categoryKey)
    } else {
      newExpanded.add(categoryKey)
    }
    setExpandedIds(newExpanded)
  }

  const renderTree = (cats: Category[], level: number = 0): JSX.Element[] => {
    return cats.map(cat => {
      const hasChildren = cat.children && cat.children.length > 0
      const isExpanded = expandedIds.has(cat.category_key)

      // 検索フィルタ
      if (search && !cat.category_name.toLowerCase().includes(search.toLowerCase()) 
          && !cat.category_key.includes(search)) {
        return null as any
      }

      return (
        <div key={cat.category_key}>
          <div
            className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer"
            style={{ paddingLeft: `${level * 24 + 8}px` }}
            onClick={() => hasChildren && toggleExpand(cat.category_key)}
          >
            {hasChildren ? (
              <button className="p-0.5">
                {isExpanded ? 
                  <ChevronDown className="w-4 h-4" /> : 
                  <ChevronRight className="w-4 h-4" />
                }
              </button>
            ) : (
              <div className="w-5" />
            )}
            
            {isExpanded ? 
              <FolderOpen className="w-4 h-4 text-blue-500" /> : 
              <Folder className="w-4 h-4 text-blue-500" />
            }
            
            <span className="flex-1 text-sm font-medium">
              {cat.category_name}
            </span>
            
            <Badge variant="outline" className="text-xs">
              {cat.category_key}
            </Badge>
            
            <div className="text-right">
              <div className="text-xs font-semibold">
                {(cat.fvf * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          {isExpanded && hasChildren && (
            <div>
              {renderTree(cat.children!, level + 1)}
            </div>
          )}
        </div>
      )
    }).filter(Boolean)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5" />
          eBayカテゴリツリー ({categories.length.toLocaleString()}件)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="カテゴリ名またはID検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button 
            variant="outline" 
            onClick={() => setExpandedIds(new Set())}
          >
            全て閉じる
          </Button>
        </div>

        <div className="border rounded-lg max-h-[700px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              読み込み中...
            </div>
          ) : (
            <div className="p-2">
              {renderTree(treeData)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
