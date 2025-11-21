'use client'

import React, { useState, useEffect } from 'react'
import { IntegratedListingTable } from '@/components/listing/IntegratedListingTable'
import { ListingFilters } from '@/components/listing/ListingFilters'
import { ListingEditModal } from '@/components/listing/ListingEditModal'
import { ListingDetailPanel } from '@/components/listing/ListingDetailPanel'
import {
  ListingItem,
  ListingFilter,
  ListingSort,
  ListingEditData,
  ListingMode
} from '@/lib/types/listing'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { RefreshCw, Download, Upload, Database } from 'lucide-react'

export default function ListingDataManagementPage() {
  const [listings, setListings] = useState<ListingItem[]>([])
  const [filteredListings, setFilteredListings] = useState<ListingItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSku, setSelectedSku] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false)
  const [currentFilter, setCurrentFilter] = useState<ListingFilter>({})
  const [currentSort, setCurrentSort] = useState<ListingSort>({
    field: 'updated_at',
    order: 'desc'
  })

  useEffect(() => {
    fetchListings()
  }, [])

  useEffect(() => {
    // フィルターが変更されたときにデータを再取得
    fetchListings()
  }, [currentFilter, currentSort])

  const fetchListings = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()

      // フィルターパラメータを追加
      if (currentFilter.mall) params.append('mall', currentFilter.mall)
      if (currentFilter.status) params.append('status', currentFilter.status)
      if (currentFilter.performance_grade) params.append('performance_grade', currentFilter.performance_grade)
      if (currentFilter.search_query) params.append('search', currentFilter.search_query)
      if (currentFilter.price_min !== undefined) params.append('price_min', String(currentFilter.price_min))
      if (currentFilter.price_max !== undefined) params.append('price_max', String(currentFilter.price_max))
      if (currentFilter.stock_min !== undefined) params.append('stock_min', String(currentFilter.stock_min))
      if (currentFilter.stock_max !== undefined) params.append('stock_max', String(currentFilter.stock_max))

      // ソートパラメータを追加
      params.append('sort_field', currentSort.field)
      params.append('sort_order', currentSort.order)

      const response = await fetch(`/api/listing/integrated?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setListings(result.data)
        setFilteredListings(result.data)
      } else {
        toast.error('データの取得に失敗しました')
      }
    } catch (error) {
      console.error('データ取得エラー:', error)
      toast.error('データの取得中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (sku: string) => {
    setSelectedSku(sku)
    setIsEditModalOpen(true)
  }

  const handleViewDetails = (sku: string) => {
    setSelectedSku(sku)
    setIsDetailPanelOpen(true)
  }

  const handleStop = async (sku: string) => {
    if (!confirm(`SKU: ${sku} の出品を停止しますか?`)) {
      return
    }

    try {
      // TODO: 出品停止APIを呼び出す
      toast.success(`SKU: ${sku} の出品を停止しました`)
      fetchListings()
    } catch (error) {
      console.error('出品停止エラー:', error)
      toast.error('出品停止中にエラーが発生しました')
    }
  }

  const handleModeSwitch = async (sku: string, mode: ListingMode) => {
    try {
      const response = await fetch('/api/listing/mode-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, mode })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`SKU: ${sku} のモードを「${mode}」に変更しました`)
        fetchListings()
      } else {
        toast.error('モード切替に失敗しました')
      }
    } catch (error) {
      console.error('モード切替エラー:', error)
      toast.error('モード切替中にエラーが発生しました')
    }
  }

  const handleSaveEdit = async (data: ListingEditData) => {
    try {
      const response = await fetch('/api/listing/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        toast.success('出品データを更新しました')
        fetchListings()
      } else {
        toast.error('更新に失敗しました')
      }
    } catch (error) {
      console.error('更新エラー:', error)
      throw error
    }
  }

  const handleFilterChange = (filter: ListingFilter) => {
    setCurrentFilter(filter)
  }

  const handleSortChange = (field: string) => {
    setCurrentSort({
      field: field as any,
      order: currentSort.field === field && currentSort.order === 'asc' ? 'desc' : 'asc'
    })
  }

  const selectedListing = listings.find(l => l.sku === selectedSku) || null

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              統合出品データ管理
            </h1>
            <p className="text-gray-600 mt-1">
              全モールの出品データを統合管理
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchListings} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              更新
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              エクスポート
            </Button>
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              インポート
            </Button>
            <Button>
              <Database className="w-4 h-4 mr-2" />
              新規出品
            </Button>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-600">総出品数</div>
            <div className="text-3xl font-bold mt-1">{listings.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">アクティブ出品</div>
            <div className="text-3xl font-bold mt-1 text-green-600">
              {listings.filter(l => l.mall_statuses.some(s => s.status === 'Active')).length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">在庫切れ</div>
            <div className="text-3xl font-bold mt-1 text-red-600">
              {listings.filter(l => l.total_stock_count === 0).length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">同期エラー</div>
            <div className="text-3xl font-bold mt-1 text-orange-600">
              {listings.filter(l => l.mall_statuses.some(s => s.status === 'SyncError')).length}
            </div>
          </Card>
        </div>

        {/* フィルター */}
        <ListingFilters
          onFilterChange={handleFilterChange}
          selectedMall={currentFilter.mall}
        />

        {/* ソート設定 */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">ソート:</span>
            <Select
              value={currentSort.field}
              onValueChange={handleSortChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated_at">更新日時</SelectItem>
                <SelectItem value="sku">SKU</SelectItem>
                <SelectItem value="title">タイトル</SelectItem>
                <SelectItem value="current_price">価格</SelectItem>
                <SelectItem value="total_stock_count">在庫数</SelectItem>
                <SelectItem value="performance_score">スコア</SelectItem>
                <SelectItem value="sales_30d">売れ筋</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline">
              {currentSort.order === 'asc' ? '昇順' : '降順'}
            </Badge>
            <span className="text-sm text-gray-600 ml-auto">
              {filteredListings.length} 件表示中
            </span>
          </div>
        </Card>

        {/* テーブル */}
        {isLoading ? (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center">
              <RefreshCw className="w-12 h-12 animate-spin text-gray-400 mb-4" />
              <p className="text-gray-600">データを読み込んでいます...</p>
            </div>
          </Card>
        ) : (
          <IntegratedListingTable
            listings={filteredListings}
            onEdit={handleEdit}
            onViewDetails={handleViewDetails}
            onStop={handleStop}
            onModeSwitch={handleModeSwitch}
          />
        )}
      </div>

      {/* 編集モーダル */}
      {selectedSku && (
        <ListingEditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setSelectedSku(null)
          }}
          sku={selectedSku}
          onSave={handleSaveEdit}
        />
      )}

      {/* 詳細パネル */}
      <ListingDetailPanel
        sku={selectedSku || ''}
        listing={selectedListing}
        isOpen={isDetailPanelOpen}
        onClose={() => {
          setIsDetailPanelOpen(false)
          setSelectedSku(null)
        }}
      />
    </div>
  )
}
