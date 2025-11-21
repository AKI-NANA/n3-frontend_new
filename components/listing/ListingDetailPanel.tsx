'use client'

import React, { useState, useEffect } from 'react'
import {
  ListingItem,
  PriceChangeLog,
  StockChangeLog,
  OrderHistoryItem,
  StockDetail
} from '@/lib/types/listing'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { X, TrendingUp, TrendingDown, Package, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'

interface ListingDetailPanelProps {
  sku: string
  listing: ListingItem | null
  isOpen: boolean
  onClose: () => void
}

export function ListingDetailPanel({ sku, listing, isOpen, onClose }: ListingDetailPanelProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [priceLogs, setPriceLogs] = useState<PriceChangeLog[]>([])
  const [stockLogs, setStockLogs] = useState<StockChangeLog[]>([])
  const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([])

  useEffect(() => {
    if (isOpen && sku) {
      fetchLogs()
    }
  }, [isOpen, sku])

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/listing/logs/${sku}?type=all&limit=50`)
      const result = await response.json()

      if (result.success) {
        setPriceLogs(result.data.price_logs || [])
        setStockLogs(result.data.stock_logs || [])
        setOrderHistory(result.data.order_history || [])
      } else {
        toast.error('履歴データの取得に失敗しました')
      }
    } catch (error) {
      console.error('履歴データ取得エラー:', error)
      toast.error('履歴データの取得中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (price: number) => {
    return `¥${price.toLocaleString()}`
  }

  return (
    <div className={`fixed right-0 top-0 h-screen w-[600px] bg-white shadow-2xl border-l z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex flex-col h-full">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-bold">出品詳細</h2>
            <p className="text-sm text-gray-600 font-mono">{sku}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* コンテンツ */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* 在庫詳細セクション */}
            {listing && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  在庫詳細
                </h3>
                <div className="space-y-2">
                  {listing.stock_details.map((detail, idx) => (
                    <div
                      key={idx}
                      className={`flex justify-between items-center p-3 rounded-lg ${
                        detail.is_active_pricing ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                      }`}
                    >
                      <div>
                        <div className="font-medium">{detail.source}</div>
                        <div className="text-xs text-gray-600">
                          優先度: {detail.priority}
                          {detail.is_active_pricing && (
                            <Badge className="ml-2 bg-green-600 text-white text-xs">
                              価格計算中
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-lg font-bold">
                        {detail.count}個
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200 font-bold">
                    <span>合計在庫数</span>
                    <span className="text-xl">{listing.total_stock_count}個</span>
                  </div>
                </div>
              </Card>
            )}

            {/* タブセクション */}
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-gray-500">読み込み中...</div>
              </div>
            ) : (
              <Tabs defaultValue="price" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="price">
                    価格履歴 ({priceLogs.length})
                  </TabsTrigger>
                  <TabsTrigger value="stock">
                    在庫変動 ({stockLogs.length})
                  </TabsTrigger>
                  <TabsTrigger value="orders">
                    受注履歴 ({orderHistory.length})
                  </TabsTrigger>
                </TabsList>

                {/* 価格変動履歴 */}
                <TabsContent value="price" className="space-y-3">
                  {priceLogs.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      価格変動履歴がありません
                    </div>
                  ) : (
                    priceLogs.map((log) => (
                      <Card key={log.id} className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {log.change_percentage > 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-600" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-600" />
                              )}
                              <Badge variant={log.triggered_by === '自動' ? 'default' : 'secondary'}>
                                {log.triggered_by}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {formatDate(log.created_at)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mb-2">
                              {log.change_reason}
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="line-through text-gray-500">
                                {formatPrice(log.old_price)}
                              </span>
                              <span>→</span>
                              <span className="font-bold">
                                {formatPrice(log.new_price)}
                              </span>
                              <Badge
                                variant={log.change_percentage > 0 ? 'default' : 'destructive'}
                                className="ml-2"
                              >
                                {log.change_percentage > 0 ? '+' : ''}
                                {log.change_percentage.toFixed(1)}%
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </TabsContent>

                {/* 在庫変動ログ */}
                <TabsContent value="stock" className="space-y-3">
                  {stockLogs.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      在庫変動ログがありません
                    </div>
                  ) : (
                    stockLogs.map((log) => (
                      <Card key={log.id} className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge>{log.source}</Badge>
                              <Badge
                                variant={
                                  log.change_type === 'increase'
                                    ? 'default'
                                    : log.change_type === 'decrease'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                              >
                                {log.change_type}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {formatDate(log.created_at)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span>{log.old_count}個</span>
                              <span>→</span>
                              <span className="font-bold">{log.new_count}個</span>
                            </div>
                            {log.notes && (
                              <div className="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                                ⚠️ {log.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </TabsContent>

                {/* 受注履歴 */}
                <TabsContent value="orders">
                  {orderHistory.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      受注履歴がありません
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>日時</TableHead>
                            <TableHead>モール</TableHead>
                            <TableHead>注文ID</TableHead>
                            <TableHead>数量</TableHead>
                            <TableHead>金額</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderHistory.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="text-xs">
                                {formatDate(order.order_date)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {order.mall.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {order.order_id}
                              </TableCell>
                              <TableCell>{order.quantity}</TableCell>
                              <TableCell className="font-semibold">
                                {formatPrice(order.price)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
