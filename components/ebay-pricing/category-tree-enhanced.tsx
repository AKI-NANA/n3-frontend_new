// components/ebay-pricing/category-tree-enhanced.tsx
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
  isExpanded?: boolean
  japanese_name?: string
  description?: string
}

// カテゴリの日本語訳と用途
const categoryTranslations: Record<string, { ja: string; desc: string }> = {
  'Antiques': { ja: 'アンティーク', desc: '100年以上前の骨董品・古美術品' },
  'Art': { ja: '美術品', desc: '絵画・彫刻・版画などの芸術作品' },
  'Books': { ja: '書籍', desc: '本・雑誌・漫画' },
  'Cameras & Photo': { ja: 'カメラ・写真機材', desc: 'デジタルカメラ・フィルムカメラ・レンズ' },
  'Clothing, Shoes & Accessories': { ja: '衣類・靴・アクセサリー', desc: '洋服・靴・バッグ・アクセサリー' },
  'Collectibles': { ja: 'コレクション品', desc: 'トレカ・フィギュア・記念品' },
  'Computers/Tablets & Networking': { ja: 'PC・タブレット', desc: 'パソコン・タブレット・ネットワーク機器' },
  'Consumer Electronics': { ja: '家電', desc: 'テレビ・オーディオ・ゲーム機' },
  'Dolls & Bears': { ja: '人形・ぬいぐるみ', desc: 'ドール・テディベア' },
  'DVDs & Movies': { ja: 'DVD・映画', desc: '映画・ドラマのDVD・Blu-ray' },
  'eBay Motors': { ja: '自動車・バイク', desc: '車両・パーツ・アクセサリー' },
  'Entertainment Memorabilia': { ja: 'エンタメグッズ', desc: '映画・音楽・スポーツの記念品' },
  'Gift Cards & Coupons': { ja: 'ギフトカード', desc: 'プリペイドカード・クーポン' },
  'Health & Beauty': { ja: '健康・美容', desc: '化粧品・サプリメント・美容機器' },
  'Home & Garden': { ja: 'ホーム・ガーデン', desc: '家具・インテリア・園芸用品' },
  'Jewelry & Watches': { ja: 'ジュエリー・時計', desc: 'アクセサリー・腕時計' },
  'Music': { ja: '音楽', desc: 'CD・レコード・楽器' },
  'Musical Instruments & Gear': { ja: '楽器', desc: 'ギター・ピアノ・DJ機器' },
  'Pet Supplies': { ja: 'ペット用品', desc: 'ペットフード・おもちゃ・ケージ' },
  'Pottery & Glass': { ja: '陶磁器・ガラス', desc: '食器・花瓶・ガラス工芸品' },
  'Sporting Goods': { ja: 'スポーツ用品', desc: '運動器具・アウトドア用品' },
  'Sports Mem, Cards & Fan Shop': { ja: 'スポーツグッズ', desc: 'スポーツカード・ユニフォーム' },
  'Stamps': { ja: '切手', desc: '郵便切手・記念切手' },
  'Tickets & Experiences': { ja: 'チケット', desc: 'イベント・コンサートチケット' },
  'Toys & Hobbies': { ja: 'おもちゃ・ホビー', desc: 'フィギュア・模型・ラジコン' },
  'Travel': { ja: '旅行', desc: '旅行用品・スーツケース' },
  'Video Games & Consoles': { ja: 'ゲーム', desc: 'ゲームソフト・ゲーム機' },
  'Everything Else': { ja: 'その他', desc: '上記以外のカテゴリ' },
}

export function CategoryTreeEnhanced() {
  const [categories, setCategories] = useState<Category[]>([])
  const [treeData, setTreeData] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [feeFilter, setFeeFilter] = useState<string>('all')
  const [parentFilter, setParentFilter] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [rootCategories, setRootCategories] = useState<string[]>([])

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [categories, feeFilter, parentFilter, search])

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ebay/list-categories?limit=20000')
      const data = await response.json()
      
      const categoriesWithTranslations = (data.categories || []).map((cat: Category) => ({
        ...cat,
        japanese_name: categoryTranslations[cat.category_name]?.ja,
        description: categoryTranslations[cat.category_name]?.desc,
      }))
      
      setCategories(categoriesWithTranslations)
      
      // ルートカテゴリ抽出
      const roots = categoriesWithTranslations
        .filter((c: Category) => !c.category_parent_id)
        .map((c: Category) => c.category_name)
        .sort()
      setRootCategories(roots)
      
    } catch (error) {
      console.error('Error fetching categories:', error)
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

      const parent = categories.find(c => c.category_name === parentFilter)
      if (parent) {
        const allowedKeys = new Set(getDescendants(parent.category_key))
        filtered = filtered.filter(cat => allowedKeys.has(cat.category_key))
      }
    }

    buildTree(filtered)
  }

  const buildTree = (cats: Category[]) => {
    const categoryMap = new Map<string, Category>()
    cats.forEach(cat => {
      categoryMap.set(cat.category_key, { ...cat, children: [] })
    })

    const rootCategories: Category[] = []
    
    categoryMap.forEach(cat => {
      if (cat.category_parent_id && categoryMap.has(cat.category_parent_id)) {
        const parent = categoryMap.get(cat.category_parent_id)!
        if (!parent.children) parent.children = []
        parent.children.push(cat)
      } else if (!cat.category_parent_id) {
        rootCategories.push(cat)
      }
    })

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
      const isLeaf = !hasChildren

      if (search && 
          !cat.category_name.toLowerCase().includes(search.toLowerCase()) && 
          !cat.category_key.includes(search) &&
          !(cat.japanese_name || '').includes(search)) {
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
                {cat.japanese_name && (
                  <span className="text-xs text-muted-foreground">
                    ({cat.japanese_name})
                  </span>
                )}
              </div>
              {cat.description && (
                <div className="text-xs text-muted-foreground truncate">
                  {cat.description}
                </div>
              )}
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

  // 手数料率の一覧を取得
  const uniqueFees = Array.from(new Set(categories.map(c => c.fvf)))
    .sort((a, b) => a - b)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5" />
          eBayカテゴリツリー ({categories.length.toLocaleString()}件)
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
            <Label>手数料率</Label>
            <Select value={feeFilter} onValueChange={setFeeFilter}>
              <SelectTrigger>
                <SelectValue />
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
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て</SelectItem>
                {rootCategories.map(name => (
                  <SelectItem key={name} value={name}>
                    {name}
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
