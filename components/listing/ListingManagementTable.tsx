/**
 * 統合出品管理テーブル
 * 戦略決定済み商品の一覧表示と管理
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlatformBadge } from './PlatformBadge';
import { ExclusionReasonTooltip } from './ExclusionReasonTooltip';
import { Platform } from '@/types/strategy';
import { Product } from '@/types/product';
import { ChevronLeft, ChevronRight, Search, Filter, ExternalLink } from 'lucide-react';

interface ListingManagementTableProps {
  selectedPlatform?: Platform | null;
  onPlatformChange?: (platform: Platform | null) => void;
}

export function ListingManagementTable({
  selectedPlatform,
  onPlatformChange,
}: ListingManagementTableProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 50;

  // データ取得
  const { data, isLoading, error } = useQuery({
    queryKey: ['listing-products', selectedPlatform, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: (currentPage * itemsPerPage).toString(),
      });
      if (selectedPlatform) {
        params.append('platform', selectedPlatform);
      }

      const response = await fetch(`/api/listing/products?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  const products: Product[] = data?.products || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // 検索フィルタ
  const filteredProducts = products.filter((product) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.title?.toLowerCase().includes(query) ||
      product.sku?.toLowerCase().includes(query) ||
      product.asin?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">商品を読み込み中...</p>
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
      {/* 検索とフィルタ */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="SKU、ASIN、商品名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {selectedPlatform ? `${selectedPlatform}のみ表示` : '全プラットフォーム'}
          </span>
          <span className="text-sm font-medium">
            ({filteredProducts.length}件)
          </span>
        </div>
      </div>

      {/* テーブル */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">画像</TableHead>
              <TableHead>商品情報</TableHead>
              <TableHead>SKU / ASIN</TableHead>
              <TableHead>推奨出品先</TableHead>
              <TableHead>在庫</TableHead>
              <TableHead>除外状況</TableHead>
              <TableHead className="text-right">アクション</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  商品が見つかりません
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                return (
                  <TableRow key={product.id}>
                    {/* 画像 */}
                    <TableCell>
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0].url}
                          alt={product.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                          No Image
                        </div>
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

                    {/* SKU / ASIN */}
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <p className="font-mono">{product.sku}</p>
                        {product.asin && (
                          <p className="text-muted-foreground font-mono">{product.asin}</p>
                        )}
                      </div>
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

                    {/* 在庫 */}
                    <TableCell>
                      <div className="text-sm">
                        {product.current_stock_count !== null && product.current_stock_count !== undefined ? (
                          <div>
                            <p className="font-medium">{product.current_stock_count}個</p>
                            {product.stock && (
                              <p className="text-xs text-muted-foreground">
                                利用可: {product.stock.available}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>

                    {/* 除外状況 */}
                    <TableCell>
                      <ExclusionReasonTooltip strategyDecisionData={product.strategy_decision_data} />
                    </TableCell>

                    {/* アクション */}
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
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
