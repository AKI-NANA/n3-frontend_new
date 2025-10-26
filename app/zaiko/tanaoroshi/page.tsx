'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  RefreshCw,
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Search,
  Filter,
  Plus,
  Download
} from 'lucide-react'
import { MarketplaceSelector } from './components/MarketplaceSelector'
import { ProductCard } from './components/ProductCard'
import { StatsHeader } from './components/StatsHeader'
import type { InventoryProduct, InventoryStats } from '@/types/inventory'

export default function TanaoroshiPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [filteredProducts, setFilteredProducts] = useState<InventoryProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [selectedMarketplace, setSelectedMarketplace] = useState('ebay')
  const [selectedAccount, setSelectedAccount] = useState('green')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  const [stats, setStats] = useState<InventoryStats>({
    total: 0,
    in_stock: 0,
    out_of_stock: 0,
    stock_count: 0,
    dropship_count: 0,
    set_count: 0,
    total_value: 0
  })

  useEffect(() => {
    loadProducts()
  }, [selectedMarketplace, selectedAccount])

  useEffect(() => {
    applyFilters()
  }, [products, searchQuery, activeTab])

  const loadProducts = async () => {
    if (selectedMarketplace === 'all') {
      // 全モールのデータを取得（今はeBayのみ）
      await loadEbayProducts('all')
    } else if (selectedMarketplace === 'ebay') {
      await loadEbayProducts(selectedAccount)
    }
    // 他のモールは後で追加
  }

  const loadEbayProducts = async (account: string) => {
    setLoading(true)
    try {
      if (account === 'all') {
        // green と mjt の両方を取得
        const [greenRes, mjtRes] = await Promise.all([
          fetch('/api/ebay/inventory/list?account=green'),
          fetch('/api/ebay/inventory/list?account=mjt')
        ])

        const [greenData, mjtData] = await Promise.all([
          greenRes.json(),
          mjtRes.json()
        ])

        const allProducts = [
          ...(greenData.products || []),
          ...(mjtData.products || [])
        ]
        setProducts(allProducts)
        calculateStats(allProducts)
      } else {
        const response = await fetch(`/api/ebay/inventory/list?account=${account}`)
        const data = await response.json()

        if (data.success) {
          setProducts(data.products || [])
          calculateStats(data.products || [])
        } else {
          console.error('Failed to load eBay products:', data.error)
          setProducts([])
        }
      }
    } catch (error) {
      console.error('Error loading eBay products:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data: InventoryProduct[]) => {
    const newStats: InventoryStats = {
      total: data.length,
      in_stock: data.filter(p => p.physical_quantity > 0).length,
      out_of_stock: data.filter(p => p.physical_quantity === 0).length,
      stock_count: data.filter(p => p.product_type === 'stock').length,
      dropship_count: data.filter(p => p.product_type === 'dropship').length,
      set_count: data.filter(p => p.product_type === 'set').length,
      total_value: data.reduce((sum, p) =>
        sum + (p.selling_price || 0) * (p.physical_quantity || 0), 0
      )
    }
    setStats(newStats)
  }

  const applyFilters = () => {
    let filtered = [...products]

    // 検索フィルター
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.product_name?.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query)
      )
    }

    // タブフィルター
    if (activeTab !== 'all') {
      if (activeTab === 'in_stock') {
        filtered = filtered.filter(p => p.physical_quantity > 0)
      } else if (activeTab === 'out_of_stock') {
        filtered = filtered.filter(p => p.physical_quantity === 0)
      } else if (activeTab === 'low_stock') {
        filtered = filtered.filter(p => p.physical_quantity > 0 && p.physical_quantity < 5)
      }
    }

    setFilteredProducts(filtered)
  }

  const handleSync = async () => {
    setSyncing(true)
    await loadProducts()
    setSyncing(false)
  }

  return (
    <div className="space-y-6 p-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">棚卸し・在庫管理</h1>
          <p className="text-muted-foreground mt-2">
            マルチモール統合在庫管理システム
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={syncing || loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? '同期中...' : '同期'}
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            CSVエクスポート
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            商品登録
          </Button>
        </div>
      </div>

      {/* モール・アカウント選択 */}
      <Card>
        <CardHeader>
          <CardTitle>データソース選択</CardTitle>
          <CardDescription>
            表示するモールとアカウントを選択してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MarketplaceSelector
            selectedMarketplace={selectedMarketplace}
            selectedAccount={selectedAccount}
            onMarketplaceChange={setSelectedMarketplace}
            onAccountChange={setSelectedAccount}
          />
        </CardContent>
      </Card>

      {/* 統計情報 */}
      <StatsHeader stats={stats} />

      {/* タブとフィルター */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>在庫一覧</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="商品名・SKU検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[300px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">
                全て ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="in_stock">
                在庫あり ({stats.in_stock})
              </TabsTrigger>
              <TabsTrigger value="out_of_stock">
                在庫なし ({stats.out_of_stock})
              </TabsTrigger>
              <TabsTrigger value="low_stock">
                <span className="flex items-center gap-1">
                  <TrendingDown className="w-4 h-4" />
                  少量在庫
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                  <span className="ml-3 text-muted-foreground">読み込み中...</span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">
                    {searchQuery ? '検索結果が見つかりません' : '商品がありません'}
                  </p>
                  {selectedMarketplace === 'ebay' && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      eBay {selectedAccount}アカウントにInventory Itemが登録されていません
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onEdit={() => {}}
                      onDelete={() => {}}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
