// 📁 格納パス: components/order-management/OrderListTable.tsx
// 依頼内容: 受注リストをテーブル表示し、II-1の要件（期限、利益、ステータス）を満たす。

import React from "react";
import { useOrderStore, Order } from "@/store/useOrderStore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Clock } from "lucide-react";
import clsx from "clsx";
import moment from "moment"; // 日付/時刻操作ライブラリの使用を想定

/**
 * 注文リストの各行コンポーネント。
 */
const OrderRow: React.FC<{ order: Order }> = ({ order }) => {
  const { selectOrder, selectedOrderId } = useOrderStore();
  const isSelected = selectedOrderId === order.id;

  // 期限までの残り時間を計算
  const now = moment();
  const deadline = moment(order.shippingDeadline);
  const diffHours = deadline.diff(now, "hours");
  const diffDays = deadline.diff(now, "days");

  const getDeadlineStatus = () => {
    if (diffHours < 0) return { text: "期限切れ", color: "bg-red-700" };
    if (diffHours <= 24)
      return {
        text: `残り ${diffHours} 時間`,
        color: "bg-red-500 animate-pulse",
      };
    if (diffDays <= 3)
      return { text: `残り ${diffDays} 日`, color: "bg-yellow-500" };
    return { text: deadline.format("MM/DD HH:mm"), color: "bg-green-500" };
  };

  const deadlineStatus = getDeadlineStatus();

  const isProfitConfirmed = order.isProfitConfirmed;

  const getPurchaseBadge = () => {
    switch (order.purchaseStatus) {
      case "未仕入れ":
        return <Badge variant="destructive">未仕入れ</Badge>;
      case "仕入れ済み":
        return (
          <Badge className="bg-green-600 hover:bg-green-700">仕入れ済み</Badge>
        );
      case "キャンセル":
        return <Badge variant="outline">キャンセル</Badge>;
      default:
        return <Badge variant="outline">不明</Badge>;
    }
  };

  return (
    <TableRow
      onClick={() => selectOrder(order.id)}
      className={clsx(
        "cursor-pointer transition-colors hover:bg-blue-50/50",
        isSelected && "bg-blue-100/70 hover:bg-blue-100"
      )}
    >
      <TableCell className="font-semibold">{order.id}</TableCell>

      {/* 🚨 最終出荷期限 (II-1.1) */}
      <TableCell>
        <div
          className={clsx(
            "p-1 rounded-sm text-white text-xs font-semibold w-fit",
            deadlineStatus.color
          )}
        >
          <Clock className="w-3 h-3 inline mr-1" />
          {deadlineStatus.text}
        </div>
      </TableCell>

      {/* 仕入ステータス (II-1.2) */}
      <TableCell>{getPurchaseBadge()}</TableCell>

      {/* 見込純利益 (II-1.3) */}
      <TableCell className="text-right text-gray-700">
        ${order.estimatedProfit.toLocaleString()}
      </TableCell>

      {/* 確定純利益 (II-1.4) */}
      <TableCell
        className={clsx(
          "text-right font-bold",
          isProfitConfirmed ? "text-green-700" : "text-yellow-700"
        )}
      >
        {order.finalProfit !== null
          ? `$${order.finalProfit.toLocaleString()}`
          : `$${order.estimatedProfit.toLocaleString()} (仮)`}
      </TableCell>

      {/* 問合履歴 (II-1.5) */}
      <TableCell className="text-center">
        {order.inquiryHistoryCount > 0 ? (
          <Button variant="ghost" size="sm" className="h-8 p-1 text-blue-600">
            <MessageSquare className="w-4 h-4 mr-1" />
            {order.inquiryHistoryCount}
          </Button>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </TableCell>
    </TableRow>
  );
};

/**
 * 受注データ全体を表示するテーブルコンポーネント。
 */
const OrderListTable: React.FC = () => {
  const { orders, loading } = useOrderStore();

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">データをロード中...</div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        表示すべき受注データがありません。
      </div>
    );
  }

  return (
    <div className="overflow-x-auto h-[calc(100vh-250px)]">
      <Table className="min-w-full">
        <TableHeader className="sticky top-0 bg-gray-50 shadow-sm z-10">
          <TableRow>
            <TableHead className="w-[180px]">受注ID</TableHead>
            <TableHead className="w-[180px]">最終出荷期限</TableHead>
            <TableHead className="w-[120px]">仕入ステータス</TableHead>
            <TableHead className="text-right">見込純利益</TableHead>
            <TableHead className="text-right w-[150px]">確定純利益</TableHead>
            <TableHead className="text-center w-[100px]">問合履歴</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default OrderListTable;
