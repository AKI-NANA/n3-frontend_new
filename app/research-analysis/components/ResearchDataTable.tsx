'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import type { ResearchDataItem } from '@/lib/research-analytics/types';
import { ResearchDetailModal } from './ResearchDetailModal';

interface ResearchDataTableProps {
  data: ResearchDataItem[];
  total: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function ResearchDataTable({
  data,
  total,
  currentPage,
  pageSize,
  onPageChange,
  isLoading,
}: ResearchDataTableProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const totalPages = Math.ceil(total / pageSize);

  const handleViewDetail = (itemId: string) => {
    setSelectedItemId(itemId);
    setIsModalOpen(true);
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'promoted':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="h-96 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">読み込み中...</div>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <div className="h-96 flex items-center justify-center text-gray-400">
          データがありません
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">リサーチデータ一覧</h3>
          <p className="text-sm text-gray-600">
            全 {total.toLocaleString()} 件中 {((currentPage - 1) * pageSize + 1).toLocaleString()}{' '}
            - {Math.min(currentPage * pageSize, total).toLocaleString()} 件を表示
          </p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">順位</TableHead>
                <TableHead>商品タイトル</TableHead>
                <TableHead className="w-[100px]">価格</TableHead>
                <TableHead className="w-[80px]">販売数</TableHead>
                <TableHead className="w-[80px]">スコア</TableHead>
                <TableHead className="w-[120px]">リスク</TableHead>
                <TableHead className="w-[120px]">ステータス</TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={item.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    {(currentPage - 1) * pageSize + index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-md">
                      <p className="truncate font-medium">{item.title}</p>
                      {item.title_jp && (
                        <p className="truncate text-sm text-gray-500">
                          {item.title_jp}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {item.ebay_item_id}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>${item.price.toFixed(2)}</TableCell>
                  <TableCell>{item.sold_count.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className="font-semibold">{item.total_score}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRiskLevelColor(item.risk_level)}>
                      {item.risk_level}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetail(item.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      詳細
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* ページネーション */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="text-sm text-gray-600">
            ページ {currentPage} / {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              前へ
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              次へ
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* 詳細モーダル */}
      <ResearchDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        itemId={selectedItemId}
      />
    </>
  );
}
