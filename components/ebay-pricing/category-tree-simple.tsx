// components/ebay-pricing/category-tree-simple.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Category {
  category_key: string
  category_name: string
  category_parent_id: string | null
  category_level: number
  fvf: number
  insertion_fee: number
  children?: Category[]
}

export function CategoryTreeSimple() {
  const [categories, setCategories] = useState<Category[]>([])
  const [treeData, setTreeData] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string>('')

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setLoading(true)
    setError('')
    try {
      console.log('Fetching categories...')
      const response = await fetch('/api/ebay/list-categories?limit=20000')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Received data:', data)
      
      if (!data.categories || data.categories.length === 0) {
        setError('カテゴリデータが見つかりません')
        return
      }
      
      setCategories(data.categories)
      buildTree(data.categories)
    } catch (error: any) {
      console.error('Error fetching categories:', error)
      setError(`エラー: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const buildTree = (cats: Category[]) => {
    const categoryMap = new Map<string, Category>()
    cats.forEach(cat => {
      // 自己参照を修正（parent_idが自分自身のIDと同じ場合はnullに）
      const parentId = cat.category_parent_id === cat.category_key ? null : cat.category_parent_id
      categoryMap.set(cat.category_key, { ...cat, category_parent_id: parentId, children: [] })
    })

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

    const sortByKey = (a: Category, b: Category) => 
      parseInt(a.category_key) - parseInt(b.category_key)
    
    rootCategories.sort(sortByKey)
    rootCategories.forEach(cat => {
      if (cat.children) cat.children.sort(sortByKey)
    })

    console.log('Tree built with', rootCategories.length, 'root categories')
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
      const isLeaf = !hasChildren

      if (search && 
          !cat.category_name.toLowerCase().includes(search.toLowerCase()) && 
          !cat.category_key.includes(search)) {
        return null as any
      }

      return (
        <div key={cat.category_key}>
          <div
            className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer border-b"
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
            
            {isLeaf ? (
              <FileText className="w-4 h-4 text-green-600" />
            ) : isExpanded ? (
              <FolderOpen className="w-4 h-4 text-blue-500" />
            ) : (
              <Folder className="w-4 h-4 text-blue-500" />
            )}
            
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium truncate">
                {cat.category_name}
              </span>
            </div>
            
            <Badge variant="outline" className="text-xs shrink-0">
              {cat.category_key}
            </Badge>
            
            <div className="text-right shrink-0 w-16">
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

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-red-500">
            {error}
            <Button onClick={fetchCategories} className="mt-4">
              再試行
            </Button>
          </div>
        </CardContent>
      </Card>
    )
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
            placeholder="カテゴリ名・ID検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
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
          ) : treeData.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              データがありません
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
