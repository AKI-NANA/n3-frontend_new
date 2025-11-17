'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  DollarSign,
  Package,
  ShoppingCart,
  FileText,
  TrendingUp,
} from 'lucide-react';
import type { ResearchDataDetail } from '@/lib/research-analytics/types';
import { getResearchDetail } from '@/lib/research-analytics/api';
import { toast } from 'sonner';

interface ResearchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string | null;
}

export function ResearchDetailModal({
  isOpen,
  onClose,
  itemId,
}: ResearchDetailModalProps) {
  const [detail, setDetail] = useState<ResearchDataDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && itemId) {
      loadDetail();
    }
  }, [isOpen, itemId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDetail = async () => {
    if (!itemId) return;

    setIsLoading(true);
    try {
      const data = await getResearchDetail(itemId);
      setDetail(data);
    } catch (error) {
      console.error('Failed to load research detail:', error);
      toast.error('詳細情報の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-gray-400">読み込み中...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!detail) {
    return null;
  }

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">リサーチデータ詳細</DialogTitle>
          <DialogDescription>
            eBay Item ID: {detail.ebay_item_id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* ステータスバッジ */}
          <div className="flex items-center gap-2">
            <Badge className={getRiskLevelColor(detail.risk_level)}>
              リスク: {detail.risk_level}
            </Badge>
            <Badge className={getStatusColor(detail.status)}>
              ステータス: {detail.status}
            </Badge>
            <Badge variant="outline">スコア: {detail.total_score}</Badge>
          </div>

          {/* 基本情報 */}
          <Card className="p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Package className="h-4 w-4" />
              基本情報
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">商品タイトル（英語）:</span>
                <p className="text-gray-700">{detail.title}</p>
              </div>
              {detail.title_jp && (
                <div>
                  <span className="font-medium">商品タイトル（日本語）:</span>
                  <p className="text-gray-700">{detail.title_jp}</p>
                </div>
              )}
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">価格:</span> ${detail.price.toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">販売実績:</span>{' '}
                  {detail.sold_count.toLocaleString()}件
                </div>
                <div>
                  <span className="font-medium">競合数:</span>{' '}
                  {detail.competitor_count.toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">カテゴリ:</span>{' '}
                  {detail.category || '不明'}
                </div>
              </div>
            </div>
          </Card>

          {/* タブ表示 */}
          <Tabs defaultValue="profit" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profit">利益計算</TabsTrigger>
              <TabsTrigger value="supplier">仕入先候補</TabsTrigger>
              <TabsTrigger value="risk">リスク評価</TabsTrigger>
              <TabsTrigger value="technical">技術情報</TabsTrigger>
            </TabsList>

            {/* 利益計算タブ */}
            <TabsContent value="profit" className="space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  利益計算結果
                </h3>
                {detail.profit_calculation ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">目標販売価格:</span>{' '}
                      ${detail.profit_calculation.targetPrice?.toFixed(2) || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">商品価格:</span>{' '}
                      ${detail.profit_calculation.productPrice?.toFixed(2) || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">送料:</span>{' '}
                      ${detail.profit_calculation.shippingCost?.toFixed(2) || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">利益率:</span>{' '}
                      {detail.profit_calculation.profitMargin?.toFixed(1) || 'N/A'}%
                    </div>
                    <div>
                      <span className="font-medium">利益額（USD）:</span>{' '}
                      ${detail.profit_calculation.profitAmount?.toFixed(2) || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">利益額（JPY）:</span>{' '}
                      ¥{detail.profit_calculation.profitAmountJPY?.toLocaleString() || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">損益分岐点:</span>{' '}
                      ¥{detail.profit_calculation.breakEvenCostJPY?.toLocaleString() || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">推奨最大仕入れ価格:</span>{' '}
                      ¥{detail.profit_calculation.recommendedMaxCostJPY?.toLocaleString() || 'N/A'}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">利益計算データがありません</p>
                )}
              </Card>

              {/* スコアブレークダウン */}
              {detail.score_breakdown && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    スコアブレークダウン
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(detail.score_breakdown).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm">{key}:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${value}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* 仕入先候補タブ */}
            <TabsContent value="supplier" className="space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  仕入先候補（Gemini/AI分析）
                </h3>
                {detail.supplier_matches && detail.supplier_matches.length > 0 ? (
                  <div className="space-y-3">
                    {detail.supplier_matches.map((match, index) => (
                      <div
                        key={index}
                        className="p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{match.source}</span>
                          <Badge variant="outline">
                            信頼度: {(match.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <div className="text-sm space-y-1">
                          <div>
                            <span className="font-medium">価格:</span> $
                            {match.price.toFixed(2)}
                          </div>
                          {match.url && (
                            <div>
                              <a
                                href={match.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                商品ページを開く →
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">仕入先候補データがありません</p>
                )}
                {detail.best_supplier_source && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm">
                      <span className="font-medium">ベスト仕入先:</span>{' '}
                      {detail.best_supplier_source} (¥
                      {detail.best_supplier_price?.toFixed(2)})
                    </p>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* リスク評価タブ */}
            <TabsContent value="risk" className="space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  リスク要因分析
                </h3>
                {detail.risk_factors ? (
                  <div className="space-y-2">
                    {Object.entries(detail.risk_factors).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                      >
                        <span className="text-sm">{key}:</span>
                        <Badge
                          className={
                            value
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }
                        >
                          {value ? 'リスクあり' : '問題なし'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">リスク評価データがありません</p>
                )}
              </Card>
            </TabsContent>

            {/* 技術情報タブ */}
            <TabsContent value="technical" className="space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  技術情報・HTSコード
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">HTSコード:</span>{' '}
                      {detail.hs_code || '不明'}
                    </div>
                    <div>
                      <span className="font-medium">原産国:</span>{' '}
                      {detail.origin_country || '不明'}
                    </div>
                    <div>
                      <span className="font-medium">重量:</span>{' '}
                      {detail.weight_kg ? `${detail.weight_kg} kg` : '不明'}
                    </div>
                    <div>
                      <span className="font-medium">コンディション:</span>{' '}
                      {detail.condition || '不明'}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <span className="font-medium">ランク:</span> {detail.rank || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">計算日時:</span>{' '}
                    {detail.calculated_at
                      ? new Date(detail.calculated_at).toLocaleString('ja-JP')
                      : 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">作成日時:</span>{' '}
                    {new Date(detail.created_at).toLocaleString('ja-JP')}
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
