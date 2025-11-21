// 📁 格納パス: components/dashboard/MarketplaceTable.tsx
// 依頼内容: multi_marketplace_dashboard.htmlを参考に、モール別KPIテーブルを独立させる。

"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, MessageSquare, Truck, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import MarketplaceDetailModal from "./MarketplaceDetailModal";

// 仮のデータ構造
interface MarketplaceData {
  marketplace: string;
  salesCount: number;
  profit: number;
  unhandledInquiry: number;
  unshippedOrders: number;
}

interface MarketplaceTableProps {
  data?: MarketplaceData[];
}

const mockData: MarketplaceData[] = [
  {
    marketplace: "eBay",
    salesCount: 450,
    profit: 15500,
    unhandledInquiry: 3,
    unshippedOrders: 5,
  },
  {
    marketplace: "Shopee",
    salesCount: 120,
    profit: 3200,
    unhandledInquiry: 1,
    unshippedOrders: 0,
  },
  {
    marketplace: "Amazon",
    salesCount: 88,
    profit: 2800,
    unhandledInquiry: 0,
    unshippedOrders: 2,
  },
  {
    marketplace: "Qoo10",
    salesCount: 30,
    profit: 850,
    unhandledInquiry: 0,
    unshippedOrders: 0,
  },
];

/**
 * モール別（多販路）の主要KPIを一覧表示するテーブルウィジェット。
 * クリックで詳細モーダルへのドリルダウンを想定。
 */
const MarketplaceTable: React.FC<MarketplaceTableProps> = ({ data }) => {
  const [selectedMarketplace, setSelectedMarketplace] = useState<string | null>(null);

  // 実際はuseDashboardDataからデータを取得しますが、ここではモックを使用
  const tableData = data || mockData;

  const handleRowClick = (marketplace: string) => {
    setSelectedMarketplace(marketplace);
  };

  return (
    <>
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
            {tableData.map((row) => (
              <TableRow
                key={row.marketplace}
                onClick={() => handleRowClick(row.marketplace)}
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

      {/* ドリルダウンモーダル */}
      {selectedMarketplace && (
        <MarketplaceDetailModal
          marketplace={selectedMarketplace}
          isOpen={!!selectedMarketplace}
          onClose={() => setSelectedMarketplace(null)}
        />
      )}
    </>
  );
};

export default MarketplaceTable;
