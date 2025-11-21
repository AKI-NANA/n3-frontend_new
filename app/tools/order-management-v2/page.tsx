'use client';

/**
 * Phase 1: 受注管理システム V2.0
 * パス: /tools/order-management-v2
 *
 * 【主要機能】
 * 1. 多販路の受注を集約表示
 * 2. 予想利益の正確な計算
 * 3. 多機能フィルタリング（利益率、AIスコア、モール名、仕入れ状況）
 * 4. 赤字リスク警告
 * 5. Phase 2 (出荷管理) / Phase 5 (一括仕入れ承認) への連携
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  RefreshCw,
  Search,
  AlertTriangle,
  Package,
  Truck,
  ShoppingCart,
  DollarSign,
  Filter,
  X,
  CheckCircle,
  Clock,
  TrendingUp,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// UIコンポーネント
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// 型定義
import type { Order, OrdersQuery } from '@/types/order';

// ユーティリティ
import { formatCurrency, formatPercentage, getProfitMarginColor } from '@/lib/services/ProfitCalculator';
import { cn } from '@/lib/utils';

// メインコンポーネント
export default function OrderManagerV2() {
  const router = useRouter();

  // === 状態管理 ===
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // フィルター状態
  const [filters, setFilters] = useState<OrdersQuery>({
    isSourced: 'all',
    marketplace: undefined,
    status: undefined,
    hasRisk: false,
    minProfit: undefined,
    minAiScore: undefined,
    sortBy: 'order_date',
    sortOrder: 'desc',
    search: '',
  });

  // === データ取得 ===
  const fetchOrders = async () => {
    setLoading(true);
    try {
      // クエリパラメータを構築
      const params = new URLSearchParams();

      if (filters.isSourced) params.append('isSourced', filters.isSourced);
      if (filters.marketplace) params.append('marketplace', filters.marketplace);
      if (filters.status) params.append('status', filters.status);
      if (filters.hasRisk) params.append('hasRisk', 'true');
      if (filters.minProfit !== undefined) params.append('minProfit', filters.minProfit.toString());
      if (filters.minAiScore !== undefined) params.append('minAiScore', filters.minAiScore.toString());
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/orders/v2/fetch-all-orders?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setOrders(data.data);
      } else {
        console.error('Failed to fetch orders:', data.error);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  // === フィルターリセット ===
  const resetFilters = () => {
    setFilters({
      isSourced: 'all',
      marketplace: undefined,
      status: undefined,
      hasRisk: false,
      minProfit: undefined,
      minAiScore: undefined,
      sortBy: 'order_date',
      sortOrder: 'desc',
      search: '',
    });
  };

  // === 選択管理 ===
  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const selectAll = () => {
    setSelectedOrderIds(orders.map((o) => o.id));
  };

  const clearSelection = () => {
    setSelectedOrderIds([]);
  };

  // === Phase 2/5連携 ===
  const handleAddToShippingQueue = async () => {
    if (selectedOrderIds.length === 0) {
      alert('注文を選択してください');
      return;
    }

    try {
      const response = await fetch('/api/shipping/add-to-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: selectedOrderIds }),
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        fetchOrders(); // データを再取得
        clearSelection();
      } else {
        alert(`エラー: ${data.error}`);
      }
    } catch (error) {
      console.error('Error adding to shipping queue:', error);
      alert('出荷キューへの追加に失敗しました');
    }
  };

  const handleGoToSourcingApproval = () => {
    if (selectedOrderIds.length === 0) {
      alert('注文を選択してください');
      return;
    }

    // Phase 5の一括仕入れ承認画面へ遷移（選択した注文IDをクエリパラメータで渡す）
    router.push(`/tools/sourcing-approval?orderIds=${selectedOrderIds.join(',')}`);
  };

  // === 統計情報 ===
  const stats = useMemo(() => {
    const total = orders.length;
    const unsourced = orders.filter((o) => !o.is_sourced).length;
    const riskyOrders = orders.filter((o) => o.is_negative_profit_risk).length;
    const totalProfit = orders.reduce((sum, o) => sum + (o.estimated_profit || 0), 0);

    return { total, unsourced, riskyOrders, totalProfit };
  }, [orders]);

  // === レンダリング ===
  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center">
          <Package className="w-8 h-8 mr-3 text-indigo-700" />
          受注管理システム V2.0
          <span className="text-xl ml-3 text-gray-500">（Phase 1: 利益計算 & 仕入れ管理）</span>
        </h1>
        <p className="text-gray-600 mt-2">
          多販路の受注を一元管理し、予想利益を正確に計算。赤字リスクを早期検出します。
        </p>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">総受注数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}件</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">未仕入れ</p>
                <p className="text-2xl font-bold text-orange-600">{stats.unsourced}件</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">赤字リスク</p>
                <p className="text-2xl font-bold text-red-600">{stats.riskyOrders}件</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">予想利益合計</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalProfit)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* フィルターパネル */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              フィルター & 検索
            </CardTitle>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <X className="w-4 h-4 mr-1" />
              リセット
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 検索 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">検索</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="注文ID、顧客名"
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>

            {/* 仕入れ状況 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">仕入れ状況</label>
              <Select
                value={filters.isSourced || 'all'}
                onValueChange={(value) =>
                  setFilters({ ...filters, isSourced: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="pending">未仕入れ</SelectItem>
                  <SelectItem value="completed">仕入れ済み</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* モール */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">モール</label>
              <Select
                value={filters.marketplace || 'all'}
                onValueChange={(value) =>
                  setFilters({ ...filters, marketplace: value === 'all' ? undefined : value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="ebay">eBay</SelectItem>
                  <SelectItem value="amazon">Amazon</SelectItem>
                  <SelectItem value="shopee">Shopee</SelectItem>
                  <SelectItem value="qoo10">Qoo10</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ステータス */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">ステータス</label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) =>
                  setFilters({ ...filters, status: value === 'all' ? undefined : value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="未処理">未処理</SelectItem>
                  <SelectItem value="処理中">処理中</SelectItem>
                  <SelectItem value="出荷済">出荷済</SelectItem>
                  <SelectItem value="キャンセル">キャンセル</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 最小利益 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">最小利益</label>
              <Input
                type="number"
                placeholder="例: 5000"
                value={filters.minProfit || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    minProfit: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
              />
            </div>

            {/* 最小AIスコア */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">最小AIスコア</label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="1"
                placeholder="例: 0.7"
                value={filters.minAiScore || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    minAiScore: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
              />
            </div>

            {/* 赤字リスク */}
            <div className="flex items-end">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.hasRisk || false}
                  onChange={(e) => setFilters({ ...filters, hasRisk: e.target.checked })}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">赤字リスクのみ</span>
              </label>
            </div>

            {/* 更新ボタン */}
            <div className="flex items-end">
              <Button onClick={fetchOrders} disabled={loading} className="w-full">
                <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
                {loading ? '読み込み中...' : '更新'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* アクションパネル */}
      {selectedOrderIds.length > 0 && (
        <Card className="mb-6 bg-indigo-50 border-indigo-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <p className="text-sm font-medium text-gray-700">
                  {selectedOrderIds.length}件を選択中
                </p>
                <Button variant="outline" size="sm" onClick={selectAll}>
                  すべて選択
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  選択解除
                </Button>
              </div>
              <div className="flex space-x-3">
                <Button
                  onClick={handleAddToShippingQueue}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Truck className="w-4 h-4 mr-2" />
                  Phase 2: 出荷キューへ
                </Button>
                <Button
                  onClick={handleGoToSourcingApproval}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Phase 5: 一括仕入れ承認へ
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 注文テーブル */}
      <Card>
        <CardHeader>
          <CardTitle>受注一覧 ({orders.length}件)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mr-3" />
              <p className="text-gray-500">データを読み込み中...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">該当する受注データがありません</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.length === orders.length}
                        onChange={() =>
                          selectedOrderIds.length === orders.length
                            ? clearSelection()
                            : selectAll()
                        }
                        className="w-4 h-4"
                      />
                    </TableHead>
                    <TableHead>注文ID</TableHead>
                    <TableHead>モール</TableHead>
                    <TableHead>顧客</TableHead>
                    <TableHead>注文日</TableHead>
                    <TableHead>出荷期限</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>仕入れ</TableHead>
                    <TableHead className="text-right">販売価格</TableHead>
                    <TableHead className="text-right">予想利益</TableHead>
                    <TableHead className="text-right">利益率</TableHead>
                    <TableHead>AIスコア</TableHead>
                    <TableHead className="text-center">リスク</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow
                      key={order.id}
                      className={cn(
                        'cursor-pointer hover:bg-gray-50',
                        selectedOrderIds.includes(order.id) && 'bg-indigo-50'
                      )}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={() => toggleSelectOrder(order.id)}
                          className="w-4 h-4"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{order.order_id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.marketplace.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>{order.customer_name || '-'}</TableCell>
                      <TableCell>
                        {new Date(order.order_date).toLocaleDateString('ja-JP')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1 text-gray-400" />
                          {new Date(order.shipping_deadline).toLocaleDateString('ja-JP')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            order.status === '未処理' && 'bg-red-100 text-red-700',
                            order.status === '処理中' && 'bg-yellow-100 text-yellow-700',
                            order.status === '出荷済' && 'bg-green-100 text-green-700',
                            order.status === 'キャンセル' && 'bg-gray-100 text-gray-700'
                          )}
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={order.is_sourced ? 'default' : 'destructive'}
                          className={cn(
                            order.is_sourced && 'bg-green-600 hover:bg-green-700'
                          )}
                        >
                          {order.sourcing_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(order.sale_price)}
                      </TableCell>
                      <TableCell className={cn('text-right font-bold', getProfitMarginColor(order.profit_margin))}>
                        {formatCurrency(order.estimated_profit)}
                      </TableCell>
                      <TableCell className={cn('text-right font-semibold', getProfitMarginColor(order.profit_margin))}>
                        {formatPercentage(order.profit_margin)}
                      </TableCell>
                      <TableCell>
                        {order.ai_score !== undefined && (
                          <div className="flex items-center">
                            <TrendingUp className="w-4 h-4 mr-1 text-blue-600" />
                            <span className="text-sm font-medium">
                              {order.ai_score.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {order.is_negative_profit_risk && (
                          <AlertTriangle className="w-5 h-5 text-red-600 mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 注文詳細モーダル（簡易版） */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                注文詳細: {selectedOrder.order_id}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* 基本情報 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">顧客名</p>
                  <p className="font-medium">{selectedOrder.customer_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">モール</p>
                  <p className="font-medium">{selectedOrder.marketplace.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">注文日</p>
                  <p className="font-medium">
                    {new Date(selectedOrder.order_date).toLocaleString('ja-JP')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">出荷期限</p>
                  <p className="font-medium">
                    {new Date(selectedOrder.shipping_deadline).toLocaleString('ja-JP')}
                  </p>
                </div>
              </div>

              {/* 仕入れ情報 */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">仕入れ情報</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">仕入れ状況</p>
                    <Badge variant={selectedOrder.is_sourced ? 'default' : 'destructive'}>
                      {selectedOrder.sourcing_status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">仕入れ価格</p>
                    <p className="font-medium">
                      {selectedOrder.cost_price
                        ? formatCurrency(selectedOrder.cost_price)
                        : selectedOrder.estimated_cost_price
                        ? `${formatCurrency(selectedOrder.estimated_cost_price)} (予想)`
                        : '-'}
                    </p>
                  </div>
                  {selectedOrder.sourcing_url && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">仕入れ元URL</p>
                      <a
                        href={selectedOrder.actual_sourcing_url || selectedOrder.sourcing_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center"
                      >
                        {selectedOrder.actual_sourcing_url || selectedOrder.sourcing_url}
                        <ExternalLink className="w-4 h-4 ml-1" />
                      </a>
                    </div>
                  )}
                  {selectedOrder.credit_card_id && (
                    <div>
                      <p className="text-sm text-gray-500">使用クレカ</p>
                      <p className="font-medium">{selectedOrder.credit_card_id}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 財務情報 */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">財務情報</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span>販売価格:</span>
                    <span className="font-medium">{formatCurrency(selectedOrder.sale_price)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>プラットフォーム手数料:</span>
                    <span className="font-medium">
                      -{formatCurrency(selectedOrder.platform_fee)}
                    </span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>仕入れ価格:</span>
                    <span className="font-medium">
                      -
                      {formatCurrency(
                        selectedOrder.cost_price || selectedOrder.estimated_cost_price || 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>送料:</span>
                    <span className="font-medium">
                      -
                      {formatCurrency(
                        selectedOrder.final_shipping_cost ||
                          selectedOrder.estimated_shipping_cost ||
                          0
                      )}
                    </span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between text-lg font-bold">
                    <span>予想利益:</span>
                    <span className={getProfitMarginColor(selectedOrder.profit_margin)}>
                      {formatCurrency(selectedOrder.estimated_profit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>利益率:</span>
                    <span className={cn('font-semibold', getProfitMarginColor(selectedOrder.profit_margin))}>
                      {formatPercentage(selectedOrder.profit_margin)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 赤字リスク警告 */}
              {selectedOrder.is_negative_profit_risk && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="w-6 h-6 text-red-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-900">赤字リスク警告</h4>
                      <p className="text-sm text-red-700 mt-1">
                        {selectedOrder.risk_reason ||
                          'この注文は赤字または低利益のリスクがあります'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 商品情報 */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">商品情報</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 rounded p-3"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(item.sale_price)}</p>
                        <p className="text-sm text-gray-500">数量: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
