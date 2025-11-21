/**
 * AI投入キュー - 優先度順テーブル
 * B-2の結果に基づき、未処理の商品を高スコア順で表示
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
import { PriorityScoreBadge } from './PriorityScoreBadge';
import { AIProcessButton } from './AIProcessButton';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  title: string;
  title_en: string;
  external_url: string;
  asin_sku: string;
  price_jpy: number;
  ranking: number | null;
  sales_count: number | null;
  release_date: string | null;
  priority_score: number;
  status: string;
  category_name: string;
  condition: string;
  primary_image_url: string | null;
  created_at: string;
}

interface AIPriorityTableProps {
  statusFilter?: string;
}

export function AIPriorityTable({ statusFilter = '優先度決定済' }: AIPriorityTableProps) {
  const [page, setPage] = useState(0);
  const limit = 50;
  const offset = page * limit;

  // データ取得
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ai-queue', statusFilter, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: statusFilter,
        limit: limit.toString(),
        offset: offset.toString(),
      });

      const response = await fetch(`/api/outsourcing/ai-queue?${params}`);
      if (!response.ok) {
        throw new Error('データの取得に失敗しました');
      }
      return response.json();
    },
  });

  // ローディング表示
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">エラーが発生しました: {error.message}</p>
        <Button onClick={() => refetch()} className="mt-2">
          再試行
        </Button>
      </div>
    );
  }

  const products = data?.products || [];
  const pagination = data?.pagination || { total: 0, limit, offset, has_more: false };

  // スコア算出根拠のツールチップテキスト生成
  const getScoreBreakdown = (product: Product) => {
    const breakdown: string[] = [];

    if (product.sales_count && product.sales_count > 0) {
      breakdown.push(`Sold数: ${product.sales_count}個 (最大+400点)`);
    }

    if (product.release_date) {
      const releaseDate = new Date(product.release_date);
      const daysDiff = Math.floor((Date.now() - releaseDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff >= 0 && daysDiff <= 30) {
        breakdown.push('新製品加点: +200点');
      }
    }

    if (product.ranking) {
      if (product.ranking <= 100) {
        breakdown.push('ランキング加点: +150点');
      } else if (product.ranking <= 1000) {
        breakdown.push('ランキング加点: +100点');
      } else if (product.ranking <= 10000) {
        breakdown.push('ランキング加点: +50点');
      }
    }

    breakdown.push('競合優位性: 0〜+100点');

    return breakdown.join('\n');
  };

  return (
    <div className="space-y-4">
      {/* ヘッダー情報 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          全 {pagination.total} 件中 {offset + 1} 〜 {Math.min(offset + limit, pagination.total)} 件を表示
        </div>
      </div>

      {/* テーブル */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">優先度</TableHead>
              <TableHead className="w-[150px]">SKU</TableHead>
              <TableHead>商品名</TableHead>
              <TableHead className="w-[120px]">仕入元</TableHead>
              <TableHead className="w-[100px]">価格(円)</TableHead>
              <TableHead className="w-[100px]">発売日</TableHead>
              <TableHead className="w-[120px]">ステータス</TableHead>
              <TableHead className="w-[200px]">アクション</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  該当する商品がありません
                </TableCell>
              </TableRow>
            ) : (
              products.map((product: Product) => (
                <TableRow key={product.id}>
                  {/* 優先度スコア */}
                  <TableCell>
                    <div title={getScoreBreakdown(product)}>
                      <PriorityScoreBadge score={product.priority_score} />
                    </div>
                  </TableCell>

                  {/* SKU */}
                  <TableCell className="font-mono text-sm">{product.sku}</TableCell>

                  {/* 商品名 */}
                  <TableCell>
                    <div className="flex items-start gap-2">
                      {product.primary_image_url && (
                        <img
                          src={product.primary_image_url}
                          alt={product.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{product.title || product.title_en}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.category_name} | {product.condition}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* 仕入元URL */}
                  <TableCell>
                    {product.external_url ? (
                      <a
                        href={product.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline text-xs"
                      >
                        <ExternalLink className="h-3 w-3" />
                        外部サイト
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>

                  {/* 価格 */}
                  <TableCell className="text-right">¥{product.price_jpy?.toLocaleString() || '-'}</TableCell>

                  {/* 発売日 */}
                  <TableCell className="text-sm">
                    {product.release_date
                      ? new Date(product.release_date).toLocaleDateString('ja-JP')
                      : '-'}
                  </TableCell>

                  {/* ステータス */}
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        product.status === '優先度決定済'
                          ? 'bg-blue-100 text-blue-800'
                          : product.status === 'AI処理中'
                          ? 'bg-yellow-100 text-yellow-800'
                          : product.status === '外注処理完了'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {product.status}
                    </span>
                  </TableCell>

                  {/* アクション */}
                  <TableCell>
                    <AIProcessButton
                      sku={product.sku}
                      status={product.status}
                      onProcessComplete={() => refetch()}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ページネーション */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          前へ
        </Button>

        <span className="text-sm text-muted-foreground">
          ページ {page + 1} / {Math.ceil(pagination.total / limit) || 1}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={!pagination.has_more}
        >
          次へ
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
