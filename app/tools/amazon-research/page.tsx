'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, TrendingUp, DollarSign, Package, Star } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AmazonProduct } from '@/types/amazon'
import { AmazonProductCard } from '@/components/amazon/AmazonProductCard'
import { AmazonSearchFilters } from '@/components/amazon/AmazonSearchFilters'
import { AmazonProfitChart } from '@/components/amazon/AmazonProfitChart'

export default function AmazonResearchPage() {
  const [products, setProducts] = useState<AmazonProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeywords, setSearchKeywords] = useState('')
  const [filters, setFilters] = useState({
    minPrice: undefined,
    maxPrice: undefined,
    category: undefined,
    primeOnly: false,
    minRating: undefined
  })

  const [stats, setStats] = useState({
    totalProducts: 0,
    avgProfitScore: 0,
    highProfitCount: 0,
    inStockCount: 0
  })

  useEffect(() => {
    loadProducts()
    loadStats()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/amazon/products')
      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Load products error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/amazon/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Load stats error:', error)
    }
  }

  const handleSearch = async () => {
    if (!searchKeywords.trim()) return

    try {
      setLoading(true)
      const response = await fetch('/api/amazon/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: searchKeywords,
          ...filters
        })
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      await loadProducts()
      await loadStats()
    } catch (error) {
      console.error('Search error:', error)
      alert('検索に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products
    .filter(p => {
      if (filters.minRating && p.star_rating && p.star_rating < filters.minRating) {
        return false
      }
      if (filters.primeOnly && !p.is_prime_eligible) {
        return false
      }
      return true
    })
    .sort((a, b) => (b.profit_score || 0) - (a.profit_score || 0))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Amazon リサーチツール</h1>
        <p className="text-muted-foreground mt-2">
          Amazon商品を検索・分析して利益計算を実行
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">登録商品数</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均スコア</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgProfitScore.toFixed(0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">高利益商品</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.highProfitCount}</div>
            <p className="text-xs text-muted-foreground">スコア80以上</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">在庫あり</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inStockCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* 検索バー */}
      <Card>
        <CardHeader>
          <CardTitle>商品検索</CardTitle>
          <CardDescription>
            AmazonキーワードまたはASINで検索
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="キーワードまたはASINを入力..."
                value={searchKeywords}
                onChange={(e) => setSearchKeywords(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              検索
            </Button>
          </div>

          <AmazonSearchFilters
            filters={filters}
            onChange={setFilters}
          />
        </CardContent>
      </Card>

      {/* タブ */}
      <Tabs defaultValue="grid" className="w-full">
        <TabsList>
          <TabsTrigger value="grid">グリッド表示</TabsTrigger>
          <TabsTrigger value="list">リスト表示</TabsTrigger>
          <TabsTrigger value="chart">分析チャート</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">読み込み中...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">商品が見つかりません</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <AmazonProductCard
                  key={product.id}
                  product={product}
                  onUpdate={loadProducts}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>商品リスト</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{product.title}</h4>
                      <p className="text-xs text-muted-foreground">{product.asin}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          ${product.current_price?.toFixed(2)}
                        </p>
                        {product.profit_amount != null && (
                          <p className="text-xs text-muted-foreground">
                            利益: ${product.profit_amount.toFixed(2)}
                          </p>
                        )}
                      </div>
                      {product.profit_score !== undefined && (
                        <Badge variant={product.profit_score >= 80 ? 'default' : 'secondary'}>
                          {product.profit_score}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chart">
          <AmazonProfitChart products={filteredProducts} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
