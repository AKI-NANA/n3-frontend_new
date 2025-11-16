// 📁 格納パス: components/dashboard/InventorySummary.tsx
// 依頼内容: 出品・在庫管理サマリー（II-5）のウィジェットを独立させる。

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Box, FileText, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDashboardData } from "@/store/useDashboardStore";

/**
 * 出品・在庫管理に関する重要情報を表示するウィジェット。
 */
const InventorySummary: React.FC = () => {
  const { inventory } = useDashboardData();

  const criticalStockAlert = inventory.criticalStock > 5;
  const unfulfilledAlert = inventory.unfulfilledOrders > 0;

  return (
    <Card className="col-span-12 sm:col-span-6 lg:col-span-4 p-4 shadow-md">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Box className="w-5 h-5 text-gray-600" /> 📦 出品・在庫管理サマリー
      </h3>

      <div className="space-y-3">
        {/* 1. 本日出品予定数 */}
        <div className="flex justify-between items-center text-sm">
          <span className="flex items-center gap-2 text-gray-600">
            <FileText className="w-4 h-4" /> 本日出品予定数
          </span>
          <span className="text-xl font-bold text-blue-600">
            {inventory.todayListing} SKU
          </span>
        </div>

        {/* 2. 危険在庫アラート */}
        <div className="flex justify-between items-center text-sm">
          <span className="flex items-center gap-2 text-gray-600">
            <AlertTriangle className="w-4 h-4" /> 危険在庫アラート
          </span>
          <Badge
            variant={criticalStockAlert ? "destructive" : "default"}
            className="text-lg font-bold"
          >
            {inventory.criticalStock} 件
          </Badge>
        </div>

        {/* 3. 未仕入れ受注 */}
        <div className="flex justify-between items-center text-sm">
          <span className="flex items-center gap-2 text-gray-600">
            未仕入れ受注
          </span>
          <Badge
            variant={unfulfilledAlert ? "destructive" : "outline"}
            className="text-lg font-bold"
          >
            {inventory.unfulfilledOrders} 件
          </Badge>
        </div>

        <p className="text-xs text-gray-500 pt-2">
          全在庫評価額: **${inventory.valuation.toLocaleString()}**
        </p>
      </div>
    </Card>
  );
};

export default InventorySummary;
