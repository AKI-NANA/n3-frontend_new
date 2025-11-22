// 📁 格納パス: components/dashboard/MarketplaceTable.tsx
// 依頼内容: multi_marketplace_dashboard.htmlを参考に、モール別KPIテーブルを独立させる。

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDashboardData } from "@/store/useDashboardStore";

/**
 * モール別（多販路）の主要KPIを一覧表示するテーブルウィジェット。
 * クリックで詳細モーダルへのドリルダウンを想定。
 */
const MarketplaceTable: React.FC = () => {
  const { marketplacePerformance } = useDashboardData();
  const data = marketplacePerformance;

  return (
    <div className="overflow-x-auto">
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-[150px]">モール</TableHead>
            <TableHead className="text-right flex items-center justify-end gap-1">
              <TrendingUp className="w-4 h-4" /> 販売個数
            </TableHead>
            <TableHead className="text-right flex items-center justify-end gap-1">
              <DollarSign className="w-4 h-4" /> 純利益
            </TableHead>
            <TableHead className="text-right">未対応問合せ</TableHead>
            <TableHead className="text-right">未出荷件数</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row.marketplace}
              className="hover:bg-blue-50/50 transition-colors cursor-pointer"
            >
              <TableCell className="font-medium">{row.marketplace}</TableCell>
              <TableCell className="text-right">
                {row.salesCount.toLocaleString()}
              </TableCell>
              <TableCell className="text-right text-green-700 font-semibold">
                ${row.profit.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {row.unhandledInquiry > 0 ? (
                  <Badge variant="destructive">{row.unhandledInquiry}</Badge>
                ) : (
                  row.unhandledInquiry
                )}
              </TableCell>
              <TableCell className="text-right">
                {row.unshippedOrders > 0 ? (
                  <Badge
                    variant="default"
                    className="bg-yellow-500 hover:bg-yellow-600"
                  >
                    {row.unshippedOrders}
                  </Badge>
                ) : (
                  row.unshippedOrders
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default MarketplaceTable;
