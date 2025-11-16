// 📁 格納パス: app/order-management/page.tsx
// 依頼内容: 受注・仕入管理ツールのメインページを作成。左右2カラムレイアウト。

"use client";

import React, { useEffect } from "react";
import { useOrderStore } from "@/store/useOrderStore";
import {
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  Truck,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import OrderListTable from "@/components/order-management/OrderListTable"; // 後で作成
import OrderDetailPanel from "@/components/order-management/OrderDetailPanel"; // 後で作成

/**
 * 受注・仕入管理ツールのメインページコンポーネント。
 */
const OrderManagementPage: React.FC = () => {
  const { fetchOrders, loading, selectedOrder } = useOrderStore();

  // データフェッチ
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-6 flex items-center gap-3">
        <Truck className="w-8 h-8 text-blue-600" /> 受注・仕入管理ツール
      </h1>

      {/* 検索・フィルター・アクションバー */}
      <Card className="p-4 mb-6 flex flex-wrap gap-3 items-center justify-between shadow-sm">
        <div className="flex gap-3 flex-wrap">
          <Input
            placeholder="受注ID, SKU, 顧客IDで検索..."
            className="w-[250px]"
            prefix={<Search className="w-4 h-4 text-gray-500" />}
          />
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" /> フィルター
          </Button>
          <Button
            variant="outline"
            onClick={() => fetchOrders()}
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />{" "}
            データ更新
          </Button>
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            <AlertTriangle className="w-4 h-4 mr-2" /> 🚨 未仕入れアラート
          </Button>
          <Button variant="destructive" disabled>
            <DollarSign className="w-4 h-4 mr-2" /> 利益確定バッチ (Disabled)
          </Button>
        </div>
      </Card>

      {/* メインレイアウト: リスト（左）と詳細パネル（右） */}
      <div className="grid grid-cols-12 gap-6">
        {/* 左側: 受注リストテーブル */}
        <div
          className={`col-span-12 ${
            selectedOrder ? "lg:col-span-8" : "lg:col-span-12"
          }`}
        >
          <Card className="shadow-lg h-full">
            <OrderListTable /> {/* 👈 次に作成 */}
          </Card>
        </div>

        {/* 右側: 受注詳細パネル */}
        {selectedOrder && (
          <div className="col-span-12 lg:col-span-4 transition-all duration-300">
            <OrderDetailPanel /> {/* 👈 次に作成 */}
          </div>
        )}
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50">
          <div className="flex items-center text-lg font-semibold text-gray-800 p-4 bg-white rounded-lg shadow-2xl">
            <RefreshCw className="w-6 h-6 mr-3 animate-spin text-blue-600" />{" "}
            データをロード中...
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagementPage;
