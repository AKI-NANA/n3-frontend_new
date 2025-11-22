// app/shipping-management/page.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Truck,
  Package,
  Printer,
  Scan,
  FileUp,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

// -- データ型定義 --
interface ShippingOrder {
  id: string;
  itemName: string;
  customerName: string;
  shippingStatus: "PENDING" | "READY" | "COMPLETED";
  finalShippingCost: number | null;
  trackingNumber: string | null;
  invoiceGroupId: string | null; // Shipping_Invoice_GroupへのFK
}

// -- モックデータ --
const MOCK_SHIPPING_ORDERS: ShippingOrder[] = [
  {
    id: "ORD-1001",
    itemName: "腕時計 XYZ",
    customerName: "佐藤 太郎",
    shippingStatus: "READY",
    finalShippingCost: null,
    trackingNumber: null,
    invoiceGroupId: null,
  },
  {
    id: "ORD-1002",
    itemName: "カメラレンズ L-50",
    customerName: "田中 花子",
    shippingStatus: "PENDING",
    finalShippingCost: null,
    trackingNumber: null,
    invoiceGroupId: null,
  },
  {
    id: "ORD-1003",
    itemName: "スマホケース D-Model (x5)",
    customerName: "山田 次郎",
    shippingStatus: "COMPLETED",
    finalShippingCost: 850,
    trackingNumber: "TK-123456",
    invoiceGroupId: "INV-202511-001",
  },
];

const ShippingManagementPage: React.FC = () => {
  const [orders, setOrders] = useState(MOCK_SHIPPING_ORDERS);
  const [scannedId, setScannedId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<ShippingOrder | null>(
    null
  );

  // バーコードスキャンシミュレーション
  const handleScan = () => {
    const foundOrder = orders.find((o) => o.id === scannedId);
    if (foundOrder) {
      setSelectedOrder(foundOrder);
      console.log(`[SCAN] 受注 ${scannedId} を選択しました。`);
    } else {
      setSelectedOrder(null);
      alert("該当する受注IDが見つかりません。");
    }
  };

  // 伝票印刷 (バーコードスキャン必須化)
  const handlePrint = () => {
    if (!selectedOrder) {
      alert("印刷にはまず受注IDをスキャンまたは入力してください。");
      return;
    }
    console.log(
      `[ACTION] 受注 ${selectedOrder.id} の伝票を印刷キューに投入しました。`
    );
    // 実際にはRPAやプリンタ連携APIを呼び出す
  };

  // 個別請求証明書アップロードと出荷完了
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);

  const handleCompleteShipping = async () => {
    if (!selectedOrder) {
      alert("出荷完了には受注IDの選択が必要です。");
      return;
    }

    const tracking = prompt("追跡番号を入力してください (必須):");
    const cost = prompt("確定送料を入力してください (必須):");

    if (!tracking || !cost) {
      alert("追跡番号と確定送料は必須です。処理を中止します。");
      return;
    }

    // 個別請求の場合は証明書アップロードが必須
    const isIndividualBilling = true; // 実際には配送業者から判定
    if (isIndividualBilling && !invoiceFile) {
      alert("個別請求の場合、送料証明書のアップロードが必須です。");
      return;
    }

    setIsUploadingInvoice(true);

    try {
      if (invoiceFile) {
        // 個別請求証明書をアップロード
        const response = await fetch("/api/shipping/upload-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Order_ID: selectedOrder.id,
            Carrier: "JAPAN_POST",
            Final_Shipping_Cost_JPY: parseFloat(cost),
            Tracking_Number: tracking,
            Invoice_File: invoiceFile.name, // 実際にはbase64またはFile
            Uploaded_By: "staff",
          }),
        });

        const data = await response.json();
        if (!data.success) {
          alert(`アップロードエラー: ${data.message}`);
          setIsUploadingInvoice(false);
          return;
        }

        console.log(`[SUCCESS] 証明書アップロード完了。Group ID: ${data.groupId}`);
      }

      // DB更新
      const newOrders = orders.map((o) =>
        o.id === selectedOrder.id
          ? {
              ...o,
              shippingStatus: "COMPLETED" as const,
              finalShippingCost: parseFloat(cost),
              trackingNumber: tracking,
              invoiceGroupId: invoiceFile ? `INV-${Date.now()}` : null,
            }
          : o
      );
      setOrders(newOrders);

      alert(
        `受注 ${selectedOrder.id} の出荷が完了し、送料証明書が紐付けられました。`
      );
      setSelectedOrder(null);
      setScannedId("");
      setInvoiceFile(null);
    } catch (error) {
      console.error("[ShippingManagement] 出荷完了エラー:", error);
      alert("出荷完了処理に失敗しました。");
    } finally {
      setIsUploadingInvoice(false);
    }
  };

  // 税務対策: 経費証明書不備アラートのシミュレーション
  const outstandingInvoiceCount = orders.filter(
    (o) => o.shippingStatus === "COMPLETED" && !o.invoiceGroupId
  ).length;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <Card className="border-t-4 border-t-blue-600">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold flex items-center gap-2 text-blue-700">
            <Package className="h-6 w-6" /> 出荷・梱包管理ツール
          </CardTitle>
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" /> データ更新
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. スキャンとアクション */}
            <Card className="lg:col-span-1 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Scan className="h-5 w-5" /> 受注スキャンとアクション
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="受注IDまたは配送ラベルをスキャン/入力"
                    value={scannedId}
                    onChange={(e) => setScannedId(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleScan()}
                    className="flex-grow"
                  />
                  <Button onClick={handleScan}>
                    <Scan className="h-5 w-5" />
                  </Button>
                </div>

                {selectedOrder && (
                  <div className="border-t pt-4 space-y-3">
                    <p className="font-bold text-lg text-indigo-700">
                      {selectedOrder.id}: {selectedOrder.itemName}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={handlePrint}
                        className="flex-grow bg-gray-500 hover:bg-gray-600 text-white"
                        disabled={selectedOrder.shippingStatus === "COMPLETED"}
                      >
                        <Printer className="h-4 w-4 mr-2" /> 伝票印刷
                        (バーコード必須化)
                      </Button>
                      <Button
                        onClick={handleCompleteShipping}
                        className="flex-grow bg-green-600 hover:bg-green-700 text-white"
                        disabled={selectedOrder.shippingStatus === "COMPLETED"}
                      >
                        <Truck className="h-4 w-4 mr-2" /> 出荷完了と連携
                      </Button>
                    </div>

                    {/* 個別請求証明書アップロードUI (指示書 IV.A) */}
                    {selectedOrder.shippingStatus === "READY" && (
                      <div className="mt-4 p-3 border border-dashed border-red-400 bg-red-50 text-sm">
                        <FileUp className="h-4 w-4 inline mr-2 text-red-600" />
                        <strong>個別請求:</strong> 出荷完了前に送料証明書PDF/画像をアップロードしてください。
                        <Input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                          className="mt-2"
                        />
                        {invoiceFile && (
                          <p className="text-xs text-green-700 mt-1">
                            ✓ {invoiceFile.name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 税務対策アラート (指示書 IV.A) */}
                {outstandingInvoiceCount > 0 && (
                  <div className="mt-4 p-3 border border-red-500 bg-red-100 text-sm text-red-800 rounded-lg">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    **税務アラート:** 経費証明書不備が **
                    {outstandingInvoiceCount} 件**あります。
                    管理者画面で「まとめ請求」のアップロードが必要です。
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. 出荷リスト (当日・未完了) */}
            <Card className="lg:col-span-2 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">今日の出荷予定リスト</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>受注ID</TableHead>
                        <TableHead>商品名</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead>最終送料</TableHead>
                        <TableHead>追跡番号</TableHead>
                        <TableHead>請求G ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow
                          key={order.id}
                          className={
                            order.id === selectedOrder?.id ? "bg-blue-100" : ""
                          }
                        >
                          <TableCell className="font-medium text-blue-600">
                            {order.id}
                          </TableCell>
                          <TableCell>{order.itemName}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                order.shippingStatus === "COMPLETED"
                                  ? "bg-green-100 text-green-700"
                                  : order.shippingStatus === "READY"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {order.shippingStatus}
                            </span>
                          </TableCell>
                          <TableCell>
                            {order.finalShippingCost
                              ? `¥${order.finalShippingCost.toLocaleString()}`
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {order.trackingNumber || "未確定"}
                          </TableCell>
                          <TableCell>{order.invoiceGroupId || "N/A"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShippingManagementPage;
