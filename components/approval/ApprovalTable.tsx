/**
 * 出品承認テーブル
 * 編集完了の商品を承認・却下
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { PlatformBadge } from '@/components/listing/PlatformBadge';
import { Product } from '@/types/product';
import { Platform } from '@/types/strategy';
import { CheckCircle, XCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

export function ApprovalTable() {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());
  const itemsPerPage = 50;

  const queryClient = useQueryClient();

  // データ取得
  const { data, isLoading, error } = useQuery({
    queryKey: ['approval-products', currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: (currentPage * itemsPerPage).toString(),
      });

      const response = await fetch(`/api/approval/products?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  // 単一承認・却下
  const approveMutation = useMutation({
    mutationFn: async ({ sku, action }: { sku: string; action: 'approve' | 'reject' }) => {
      const response = await fetch('/api/approval/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, action }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-products'] });
    },
  });

  // バッチ承認・却下
  const batchApproveMutation = useMutation({
    mutationFn: async ({ skus, action }: { skus: string[]; action: 'approve' | 'reject' }) => {
      const response = await fetch('/api/approval/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skus, action }),
      });
      if (!response.ok) throw new Error('Failed to batch update');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-products'] });
      setSelectedSkus(new Set());
    },
  });

  const products: Product[] = data?.products || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // 選択制御
  const toggleSelect = (sku: string) => {
    const newSet = new Set(selectedSkus);
    if (newSet.has(sku)) {
      newSet.delete(sku);
    } else {
      newSet.add(sku);
    }
    setSelectedSkus(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedSkus.size === products.length) {
      setSelectedSkus(new Set());
    } else {
      setSelectedSkus(new Set(products.map((p) => p.sku)));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">承認対象商品を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">エラーが発生しました</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* バッチ操作 */}
      {selectedSkus.size > 0 && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="font-medium">{selectedSkus.size}件選択中</span>
          <Button
            onClick={() =>
              batchApproveMutation.mutate({
                skus: Array.from(selectedSkus),
                action: 'approve',
              })
            }
            disabled={batchApproveMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            一括承認
          </Button>
          <Button
            onClick={() =>
              batchApproveMutation.mutate({
                skus: Array.from(selectedSkus),
                action: 'reject',
              })
            }
            disabled={batchApproveMutation.isPending}
            variant="destructive"
          >
            <XCircle className="mr-2 h-4 w-4" />
            一括却下
          </Button>
        </div>
      )}

      {/* テーブル */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedSkus.size === products.length && products.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[50px]">画像</TableHead>
              <TableHead>商品情報</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>推奨出品先</TableHead>
              <TableHead>価格</TableHead>
              <TableHead>在庫</TableHead>
              <TableHead className="text-right">アクション</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  承認対象の商品はありません
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  {/* 選択 */}
                  <TableCell>
                    <Checkbox
                      checked={selectedSkus.has(product.sku)}
                      onCheckedChange={() => toggleSelect(product.sku)}
                    />
                  </TableCell>

                  {/* 画像 */}
                  <TableCell>
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0].url}
                        alt={product.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded" />
                    )}
                  </TableCell>

                  {/* 商品情報 */}
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="font-medium line-clamp-2 text-sm">{product.title}</p>
                      {product.category_name && (
                        <p className="text-xs text-muted-foreground mt-1">{product.category_name}</p>
                      )}
                    </div>
                  </TableCell>

                  {/* SKU */}
                  <TableCell>
                    <span className="font-mono text-sm">{product.sku}</span>
                  </TableCell>

                  {/* 推奨出品先 */}
                  <TableCell>
                    {product.recommended_platform ? (
                      <PlatformBadge
                        platform={product.recommended_platform as Platform}
                        isRecommended={true}
                        score={product.strategy_score}
                        accountId={product.recommended_account_id}
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">未決定</span>
                    )}
                  </TableCell>

                  {/* 価格 */}
                  <TableCell>
                    <span className="font-medium">¥{product.price.toLocaleString()}</span>
                  </TableCell>

                  {/* 在庫 */}
                  <TableCell>
                    <span className="text-sm">
                      {product.current_stock_count !== null
                        ? `${product.current_stock_count}個`
                        : '-'}
                    </span>
                  </TableCell>

                  {/* アクション */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        onClick={() =>
                          approveMutation.mutate({ sku: product.sku, action: 'approve' })
                        }
                        disabled={approveMutation.isPending}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() =>
                          approveMutation.mutate({ sku: product.sku, action: 'reject' })
                        }
                        disabled={approveMutation.isPending}
                        size="sm"
                        variant="destructive"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {totalCount}件中 {currentPage * itemsPerPage + 1}〜
            {Math.min((currentPage + 1) * itemsPerPage, totalCount)}件を表示
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
