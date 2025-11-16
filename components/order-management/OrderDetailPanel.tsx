// 📁 格納パス: components/order-management/OrderDetailPanel.tsx
// 依頼内容: 選択された注文の詳細を表示し、仕入れ実行と利益確定の操作パネル（II-2）を提供する。

import React, { useState, useEffect } from "react";
import { useOrderStore } from "@/store/useOrderStore";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart,
  DollarSign,
  Truck,
  MessageSquare,
  ExternalLink,
  X,
} from "lucide-react";
import clsx from "clsx";

/**
 * 受注詳細の右側パネル。仕入れ実行と利益確定のコア機能を担う。
 */
const OrderDetailPanel: React.FC = () => {
  const { selectedOrder, selectOrder, updateOrderDetails, markAsPurchased } =
    useOrderStore();

  // フォームの状態管理 (II-2. 仕入れ実行管理/利益確定管理)
  const [actualPurchaseUrl, setActualPurchaseUrl] = useState(
    selectedOrder?.actualPurchaseUrl || ""
  );
  const [actualPurchaseCostJPY, setActualPurchaseCostJPY] = useState(
    selectedOrder?.actualPurchaseCostJPY?.toString() || ""
  );
  const [finalShippingCostJPY, setFinalShippingCostJPY] = useState(
    selectedOrder?.finalShippingCostJPY?.toString() || ""
  );

  // 選択注文が変更されたらフォームをリセット
  useEffect(() => {
    if (selectedOrder) {
      setActualPurchaseUrl(selectedOrder.actualPurchaseUrl || "");
      setActualPurchaseCostJPY(
        selectedOrder.actualPurchaseCostJPY?.toString() || ""
      );
      setFinalShippingCostJPY(
        selectedOrder.finalShippingCostJPY?.toString() || ""
      );
    }
  }, [selectedOrder]);

  if (!selectedOrder) {
    return (
      <Card className="p-4 shadow-lg sticky top-4 h-[calc(100vh-100px)] flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">
          左側のリストから受注を選択してください。
        </p>
      </Card>
    );
  }

  // III-2. 利益計算をトリガーする関数
  const handleDetailUpdate = (
    field:
      | "actualPurchaseUrl"
      | "actualPurchaseCostJPY"
      | "finalShippingCostJPY",
    value: string
  ) => {
    // 数値型に変換（NaNの場合はnull）
    const numericValue =
      field === "actualPurchaseCostJPY" || field === "finalShippingCostJPY"
        ? value === ""
          ? null
          : Number(value)
        : value;

    const updates = { [field]: numericValue };

    // フォームの状態を更新
    if (field === "actualPurchaseUrl") setActualPurchaseUrl(value);
    if (field === "actualPurchaseCostJPY") setActualPurchaseCostJPY(value);
    if (field === "finalShippingCostJPY") setFinalShippingCostJPY(value);

    // Zustandストアを更新し、利益を再計算
    updateOrderDetails(selectedOrder.id, updates);
  };

  // III-1. [仕入れ済み]ボタンの処理
  const handleMarkAsPurchased = () => {
    const cost = Number(actualPurchaseCostJPY);
    if (actualPurchaseUrl && !isNaN(cost) && cost > 0) {
      markAsPurchased(selectedOrder.id, actualPurchaseUrl, cost);
    } else {
      // エラー処理（例: トースト表示）
      console.error("仕入れ実行にはURLと仕入れ値の入力が必要です。");
    }
  };

  return (
    <Card className="p-4 shadow-lg sticky top-4 h-[calc(100vh-100px)] overflow-y-auto">
      <CardHeader className="p-0 pb-3 border-b flex flex-row justify-between items-center">
        <CardTitle className="text-xl font-bold text-blue-700">
          受注ID: {selectedOrder.id}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={() => selectOrder(null)}>
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>

      <CardContent className="p-0 pt-4 space-y-6">
        {/* 基本情報 */}
        <div className="space-y-1 text-sm">
          <p>
            <strong>モール:</strong> {selectedOrder.marketplace}
          </p>
          <p>
            <strong>受注日:</strong> {selectedOrder.orderDate}
          </p>
          <p>
            <strong>顧客ID:</strong> {selectedOrder.customerID}
          </p>
        </div>

        {/* -------------------- 利益確定管理セクション -------------------- */}
        <section className="border-t pt-4 space-y-3">
          <h4 className="text-lg font-semibold flex items-center gap-2 text-green-700">
            <DollarSign className="w-5 h-5" /> 利益確定管理
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="estimatedProfit">見込純利益</Label>
              <Input
                id="estimatedProfit"
                value={`$${selectedOrder.estimatedProfit.toLocaleString()}`}
                readOnly
                className="font-mono bg-gray-100"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="finalProfit">確定純利益</Label>
              <Input
                id="finalProfit"
                value={
                  selectedOrder.finalProfit !== null
                    ? `$${selectedOrder.finalProfit.toLocaleString()}`
                    : "未確定"
                }
                readOnly
                className={clsx(
                  "font-mono",
                  selectedOrder.finalProfit
                    ? "bg-green-100 font-bold"
                    : "bg-yellow-100"
                )}
              />
            </div>
          </div>

          {/* 確定送料 (II-2. 利益確定管理) */}
          <div className="space-y-1">
            <Label htmlFor="finalShippingCost">確定送料 (JPY)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="finalShippingCost"
                type="number"
                value={finalShippingCostJPY}
                onChange={(e) =>
                  handleDetailUpdate("finalShippingCostJPY", e.target.value)
                }
                placeholder={selectedOrder.estimatedShippingCostJPY.toString()}
              />
              <span className="text-sm text-gray-500 whitespace-nowrap">
                見込み:{" "}
                {selectedOrder.estimatedShippingCostJPY.toLocaleString()} JPY
              </span>
            </div>
          </div>
        </section>

        {/* -------------------- 仕入れ実行管理セクション -------------------- */}
        <section className="border-t pt-4 space-y-3">
          <h4 className="text-lg font-semibold flex items-center gap-2 text-blue-700">
            <ShoppingCart className="w-5 h-5" /> 仕入れ実行管理
          </h4>

          {/* ① 見込み仕入れ先URL */}
          <div className="space-y-1">
            <Label>見込み仕入れ先URL</Label>
            <a
              href={selectedOrder.estimatedPurchaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1 truncate"
            >
              {selectedOrder.estimatedPurchaseUrl}{" "}
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
            </a>
          </div>

          {/* ② 実際の仕入れ先URL (編集可) */}
          <div className="space-y-1">
            <Label htmlFor="actualPurchaseUrl">実際の仕入れ先URL</Label>
            <Input
              id="actualPurchaseUrl"
              value={actualPurchaseUrl}
              onChange={(e) =>
                handleDetailUpdate("actualPurchaseUrl", e.target.value)
              }
              placeholder="仕入れ時に確定したURLを入力"
            />
          </div>

          {/* ③ 実際の仕入れ値 (JPY) (編集可) */}
          <div className="space-y-1">
            <Label htmlFor="actualPurchaseCost">実際の仕入れ値 (JPY)</Label>
            <Input
              id="actualPurchaseCost"
              type="number"
              value={actualPurchaseCostJPY}
              onChange={(e) =>
                handleDetailUpdate("actualPurchaseCostJPY", e.target.value)
              }
              placeholder="仕入れ値を入力し、利益を確定"
            />
          </div>

          {/* ④ [仕入れ済み] ボタン */}
          <Button
            onClick={handleMarkAsPurchased}
            disabled={
              selectedOrder.purchaseStatus !== "未仕入れ" ||
              !actualPurchaseUrl ||
              !actualPurchaseCostJPY
            }
            className={clsx(
              "w-full mt-4",
              selectedOrder.purchaseStatus === "仕入れ済み" && "bg-gray-400"
            )}
          >
            {selectedOrder.purchaseStatus === "仕入れ済み"
              ? "仕入れ済み (済)"
              : "仕入れ実行完了"}
          </Button>
        </section>

        {/* -------------------- ツール間連携セクション -------------------- */}
        <section className="border-t pt-4 space-y-3">
          <h4 className="text-lg font-semibold flex items-center gap-2 text-gray-700">
            ツール連携
          </h4>

          {/* [出荷準備へ] ボタン (II-2. 出荷連携) */}
          <Button variant="secondary" className="w-full">
            <Truck className="w-4 h-4 mr-2" /> 出荷準備へ (受注ID:{" "}
            {selectedOrder.id})
          </Button>

          {/* [問い合わせ履歴を開く] ボタン (II-2. 問合連携) */}
          <Button variant="outline" className="w-full">
            <MessageSquare className="w-4 h-4 mr-2" /> 問い合わせ履歴を開く (
            {selectedOrder.inquiryHistoryCount} 件)
          </Button>
        </section>
      </CardContent>
    </Card>
  );
};

export default OrderDetailPanel;
