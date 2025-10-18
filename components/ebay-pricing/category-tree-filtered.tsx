// components/ebay-pricing/category-tree-filtered.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Tag, Filter } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface Category {
  category_key: string
  category_name: string
  category_parent_id: string | null
  category_level: number
  fvf: number
  insertion_fee: number
  children?: Category[]
}

// 主要カテゴリの日本語訳
const translations: Record<string, string> = {
  'Collectibles': 'コレクション品',
  'Antiques': 'アンティーク',
  'Art': '美術品',
  'Books': '書籍',
  'Cameras & Photo': 'カメラ・写真',
  'Clothing, Shoes & Accessories': '衣類・靴・アクセサリー',
  'Computers/Tablets & Networking': 'PC・タブレット',
  'Consumer Electronics': '家電',
  'Crafts': '工芸品',
  'Dolls & Bears': '人形・ぬいぐるみ',
  'DVDs & Movies': 'DVD・映画',
  'eBay Motors': '自動車・バイク',
  'Entertainment Memorabilia': 'エンタメグッズ',
  'Gift Cards & Coupons': 'ギフトカード',
  'Health & Beauty': '健康・美容',
  'Home & Garden': 'ホーム・ガーデン',
  'Jewelry & Watches': 'ジュエリー・時計',
  'Music': '音楽',
  'Musical Instruments & Gear': '楽器',
  'Pet Supplies': 'ペット用品',
  'Pottery & Glass': '陶磁器・ガラス',
  'Sporting Goods': 'スポーツ用品',
  'Sports Mem, Cards & Fan Shop': 'スポーツカード',
  'Stamps': '切手',
  'Tickets & Experiences': 'チケット',
  'Toys & Hobbies': 'おもちゃ・ホビー',
  'Travel': '旅行',
  'Video Games & Consoles': 'ゲーム',
  'Everything Else': 'その他',
}

export function CategoryTreeFiltered() {
  const [categories, setCategories] = useState<Category[]>([])
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([])
  const [treeData, setTreeData] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [feeFilter, setFeeFilter] = useState<string>('all')
  const [parentFilter, setParentFilter] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string>('')

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [categories, feeFilter, parentFilter])

  const fetchCategories = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/ebay/list-categories?limit=20000')
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      
      const data = await response.json()
      if (!data.categories || data.categories.length === 0) {
        setError('カテゴリデータが見つかりません')
        return
      }
      
      // フロントエンド側でアルファベット順にソート
      const sortedCategories = [...data.categories].sort((a, b) => 
        a.category_name.localeCompare(b.category_name)
      )
      
      console.log('Fetched and sorted', sortedCategories.length, 'categories')
      console.log('First 5:', sortedCategories.slice(0, 5).map(c => c.category_name))
      
      setCategories(sortedCategories)
    } catch (error: any) {
      setError(`エラー: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...categories]

    // 手数料フィルタ
    if (feeFilter !== 'all') {
      const feeRate = parseFloat(feeFilter)
      filtered = filtered.filter(cat => Math.abs(cat.fvf - feeRate) < 0.001)
    }

    // 親カテゴリフィルタ
    if (parentFilter !== 'all') {
      const getDescendants = (parentKey: string): string[] => {
        const children = categories.filter(c => c.category_parent_id === parentKey)
        const childKeys = children.map(c => c.category_key)
        const descendants = childKeys.flatMap(key => getDescendants(key))
        return [parentKey, ...childKeys, ...descendants]
      }

      const allowedKeys = new Set(getDescendants(parentFilter))
      filtered = filtered.filter(cat => allowedKeys.has(cat.category_key))
    }

    setFilteredCategories(filtered)
    buildTree(filtered)
  }

  const buildTree = (cats: Category[]) => {
    console.log('buildTree called with', cats.length, 'categories')
    
    const categoryMap = new Map<string, Category>()
    
    // 自己参照を修正してMapに格納
    cats.forEach(cat => {
      const parentId = cat.category_parent_id === cat.category_key ? null : cat.category_parent_id
      categoryMap.set(cat.category_key, { ...cat, category_parent_id: parentId, children: [] })
    })

    const rootCategories: Category[] = []
    
    // 親子関係を構築
    categoryMap.forEach(cat => {
      if (cat.category_parent_id === null) {
        // 厳密にnullのみルートとする
        rootCategories.push(cat)
      } else if (categoryMap.has(cat.category_parent_id)) {
        // 親が存在すれば、親の子として追加
        const parent = categoryMap.get(cat.category_parent_id)!
        if (!parent.children) parent.children = []
        parent.children.push(cat)
      }
      // 親が見つからない場合は無視（ルートに追加しない）
    })

    console.log('Root categories found:', rootCategories.length)

    const sortByName = (a: Category, b: Category) => 
      a.category_name.localeCompare(b.category_name)
    
    // ルートカテゴリをアルファベット順
    rootCategories.sort(sortByName)
    
    // 各階層の子カテゴリもソート
    const sortChildren = (cat: Category) => {
      if (cat.children && cat.children.length > 0) {
        cat.children.sort(sortByName)
        cat.children.forEach(child => sortChildren(child))
      }
    }
    
    rootCategories.forEach(cat => sortChildren(cat))

    console.log('Setting tree data with', rootCategories.length, 'root categories')
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
      const japaneseText = translations[cat.category_name]

      if (search && 
          !cat.category_name.toLowerCase().includes(search.toLowerCase()) && 
          !cat.category_key.includes(search) &&
          !(japaneseText || '').includes(search)) {
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
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {cat.category_name}
                </span>
                {japaneseText && (
                  <span className="text-xs text-muted-foreground">
                    ({japaneseText})
                  </span>
                )}
              </div>
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

  // ユニークな手数料率
  const uniqueFees = Array.from(new Set(categories.map(c => c.fvf)))
    .sort((a, b) => a - b)

  // ルートカテゴリ（親フィルタ用）
  const rootCategories = categories
    .filter(c => !c.category_parent_id || c.category_parent_id === c.category_key)
    .sort((a, b) => a.category_name.localeCompare(b.category_name))

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-red-500">
            {error}
            <Button onClick={fetchCategories} className="mt-4">再試行</Button>
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
          eBayカテゴリツリー ({filteredCategories.length.toLocaleString()} / {categories.length.toLocaleString()}件)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* フィルタ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>検索</Label>
            <Input
              placeholder="カテゴリ名・日本語・ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div>
            <Label>手数料率 (%)</Label>
            <Select value={feeFilter} onValueChange={setFeeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="全て" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て</SelectItem>
                {uniqueFees.map(fee => (
                  <SelectItem key={fee} value={fee.toString()}>
                    {(fee * 100).toFixed(2)}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>親カテゴリ</Label>
            <Select value={parentFilter} onValueChange={setParentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="全て" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て</SelectItem>
                {rootCategories.map(cat => (
                  <SelectItem key={cat.category_key} value={cat.category_key}>
                    {cat.category_name} {translations[cat.category_name] && `(${translations[cat.category_name]})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSearch('')
              setFeeFilter('all')
              setParentFilter('all')
            }}
          >
            <Filter className="w-4 h-4 mr-2" />
            フィルタクリア
          </Button>
          <Button 
            variant="outline"
            size="sm" 
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
              該当するカテゴリがありません
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
