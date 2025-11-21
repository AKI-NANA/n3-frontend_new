// components/dashboard/MarketplaceDetailModal.tsx
// モール別詳細分析モーダル

"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface MarketplaceDetailModalProps {
  marketplace: string;
  isOpen: boolean;
  onClose: () => void;
}

const MarketplaceDetailModal: React.FC<MarketplaceDetailModalProps> = ({
  marketplace,
  isOpen,
  onClose,
}) => {
  // 💡 実際のデータはAPIから取得
  const mockDetailData = {
    marketplace,
    totalRevenue: 25000,
    totalOrders: 450,
    avgOrderValue: 55.56,
    profitMargin: 62.0,
    topProducts: [
      { name: "Vintage Camera", sales: 45, revenue: 3600 },
      { name: "Leather Wallet", sales: 38, revenue: 2850 },
      { name: "Wireless Headphones", sales: 32, revenue: 2560 },
    ],
    recentIssues: [
      { type: "未対応問い合わせ", count: 3, severity: "warning" },
      { type: "未出荷注文", count: 5, severity: "error" },
      { type: "在庫切れ", count: 2, severity: "info" },
    ],
    performanceTrend: {
      lastMonth: 18500,
      thisMonth: 25000,
      growth: 35.1,
    },
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <Package className="w-6 h-6" />
            {marketplace} 詳細分析
          </DialogTitle>
          <DialogDescription>
            モール別のパフォーマンス指標と課題を確認できます
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* KPIカード */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">総売上</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${mockDetailData.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">受注数</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {mockDetailData.totalOrders}
                    </p>
                  </div>
                  <Package className="w-8 h-8 text-blue-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">平均注文額</p>
                    <p className="text-2xl font-bold text-purple-600">
                      ${mockDetailData.avgOrderValue.toFixed(2)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">利益率</p>
                    <p className="text-2xl font-bold text-green-600">
                      {mockDetailData.profitMargin.toFixed(1)}%
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* パフォーマンストレンド */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">📈 パフォーマンストレンド</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">先月</p>
                  <p className="text-xl font-semibold">
                    ${mockDetailData.performanceTrend.lastMonth.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">今月</p>
                  <p className="text-xl font-semibold text-green-600">
                    ${mockDetailData.performanceTrend.thisMonth.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">成長率</p>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <p className="text-xl font-semibold text-green-600">
                      +{mockDetailData.performanceTrend.growth}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* トップ商品 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">🏆 トップ商品</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockDetailData.topProducts.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <span className="font-medium">{product.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-600">
                        {product.sales} 販売
                      </span>
                      <span className="font-semibold text-green-600">
                        ${product.revenue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 課題・アラート */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                要対応事項
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockDetailData.recentIssues.map((issue, index) => {
                  const severityStyles = {
                    error: "bg-red-100 border-red-300 text-red-700",
                    warning: "bg-yellow-100 border-yellow-300 text-yellow-700",
                    info: "bg-blue-100 border-blue-300 text-blue-700",
                  };

                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-2 ${
                        severityStyles[issue.severity as keyof typeof severityStyles]
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{issue.type}</span>
                        <Badge
                          variant="outline"
                          className={`${
                            severityStyles[issue.severity as keyof typeof severityStyles]
                          }`}
                        >
                          {issue.count} 件
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* フッター情報 */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t">
            <span>💡 実データはSupabaseから取得されます</span>
            <span>最終更新: {new Date().toLocaleString("ja-JP")}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MarketplaceDetailModal;
