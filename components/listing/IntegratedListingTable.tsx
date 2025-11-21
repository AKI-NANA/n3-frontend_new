'use client'

import React, { useState } from 'react'
import {
  ListingItem,
  PerformanceGrade,
  SourceMall,
  ListingStatus
} from '@/lib/types/listing'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Edit, StopCircle, TrendingUp } from 'lucide-react'

interface IntegratedListingTableProps {
  listings: ListingItem[]
  onEdit: (sku: string) => void
  onViewDetails: (sku: string) => void
  onStop: (sku: string) => void
  onModeSwitch: (sku: string, mode: '中古優先' | '新品優先') => void
}

export function IntegratedListingTable({
  listings,
  onEdit,
  onViewDetails,
  onStop,
  onModeSwitch
}: IntegratedListingTableProps) {
  const [selectedSku, setSelectedSku] = useState<string | null>(null)

  const getPerformanceColor = (grade: PerformanceGrade) => {
    const colors: Record<PerformanceGrade, string> = {
      'A+': 'bg-green-500',
      'A': 'bg-blue-500',
      'B': 'bg-yellow-500',
      'C': 'bg-orange-500',
      'D': 'bg-red-500'
    }
    return colors[grade]
  }

  const getStatusColor = (status: ListingStatus) => {
    const colors: Record<ListingStatus, string> = {
      'Active': 'bg-green-500 text-white',
      'Inactive': 'bg-gray-500 text-white',
      'SoldOut': 'bg-red-500 text-white',
      'PolicyViolation': 'bg-purple-500 text-white',
      'SyncError': 'bg-yellow-500 text-black'
    }
    return colors[status]
  }

  const getMallIcon = (mall: SourceMall) => {
    const icons: Record<SourceMall, string> = {
      'ebay': '🛒',
      'amazon': '📦',
      'shopee': '🛍️',
      'shopify': '🏪',
      'yahoo': '🔴',
      'mercari': '🟠',
      'rakuten': '🔵'
    }
    return icons[mall]
  }

  const handleRowClick = (sku: string) => {
    setSelectedSku(sku === selectedSku ? null : sku)
    onViewDetails(sku)
  }

  const getStockColor = (count: number) => {
    if (count === 0) return 'text-red-600 font-bold'
    if (count <= 5) return 'text-orange-600 font-semibold'
    return 'text-green-600'
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">SKU</TableHead>
            <TableHead>商品名/タイトル</TableHead>
            <TableHead className="w-[100px]">出品モード</TableHead>
            <TableHead className="w-[150px]">出品中のモール</TableHead>
            <TableHead className="w-[100px]">価格</TableHead>
            <TableHead className="w-[100px]">総在庫数</TableHead>
            <TableHead className="w-[120px]">スコア</TableHead>
            <TableHead className="w-[100px]">売れ筋</TableHead>
            <TableHead className="w-[80px]">アクション</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-gray-500">
                データがありません
              </TableCell>
            </TableRow>
          ) : (
            listings.map((listing) => (
              <TableRow
                key={listing.id}
                className={`cursor-pointer hover:bg-gray-50 ${
                  selectedSku === listing.sku ? 'bg-blue-50' : ''
                }`}
              >
                <TableCell
                  className="font-mono font-medium text-blue-600 hover:underline"
                  onClick={() => handleRowClick(listing.sku)}
                >
                  {listing.sku}
                </TableCell>
                <TableCell className="max-w-[300px] truncate">
                  {listing.title}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={listing.listing_mode === '中古優先' ? 'secondary' : 'default'}
                  >
                    {listing.listing_mode}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {listing.mall_statuses.map((status, idx) => (
                      <div
                        key={idx}
                        className="relative group"
                        title={`${status.mall.toUpperCase()}: ${status.status}`}
                      >
                        <span className="text-xl">{getMallIcon(status.mall)}</span>
                        <div
                          className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full ${
                            status.status === 'Active'
                              ? 'bg-green-500'
                              : status.status === 'SyncError'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="font-semibold">
                  ¥{listing.current_price.toLocaleString()}
                  <TrendingUp className="inline ml-1 w-3 h-3 text-green-500" />
                </TableCell>
                <TableCell className={getStockColor(listing.total_stock_count)}>
                  {listing.total_stock_count}
                </TableCell>
                <TableCell>
                  <Badge
                    className={`${getPerformanceColor(listing.performance_score)} text-white`}
                  >
                    {listing.performance_score}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">{listing.sales_30d}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">メニューを開く</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(listing.sku)}>
                        <Edit className="mr-2 h-4 w-4" />
                        データ編集
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onStop(listing.sku)}>
                        <StopCircle className="mr-2 h-4 w-4" />
                        出品停止
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          onModeSwitch(
                            listing.sku,
                            listing.listing_mode === '中古優先' ? '新品優先' : '中古優先'
                          )
                        }
                      >
                        <TrendingUp className="mr-2 h-4 w-4" />
                        モード切替
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
