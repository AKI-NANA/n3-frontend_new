// ========================================
// 会計管理ツール: 請求書グループ登録画面
// 作成日: 2025-11-22
// パス: /accounting/invoice-management
// 目的: FedEx C-PASSなどのまとめ請求PDFをアップロードし、
//       未証明の出荷済み受注に一括紐づける
// ========================================

"use client";

import React, { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileUp,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Calculator,
} from "lucide-react";
import type {
  InvoiceGroupType,
  UnlinkedShippingOrder,
  CreateInvoiceGroupRequest,
} from "@/types/billing";

const InvoiceManagementPage: React.FC = () => {
  const [groupType, setGroupType] = useState<InvoiceGroupType>("C_PASS_FEDEX");
  const [totalCost, setTotalCost] = useState<string>("");
  const [uploadedBy, setUploadedBy] = useState<string>("admin");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [unlinkedOrders, setUnlinkedOrders] = useState<UnlinkedShippingOrder[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);

  // 未紐付け受注リストを取得
  const fetchUnlinkedOrders = async () => {
    try {
      const response = await fetch("/api/accounting/link-invoices");
      const data = await response.json();
      if (data.success) {
        setUnlinkedOrders(data.orders || []);
      }
    } catch (error) {
      console.error("[InvoiceManagement] データ取得エラー:", error);
    }
  };

  useEffect(() => {
    fetchUnlinkedOrders();
  }, []);

  // ファイル選択ハンドラー
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // 請求書グループ作成とアップロード
  const handleUploadInvoice = async () => {
    if (!selectedFile || !totalCost) {
      alert("請求書ファイルと総額を入力してください。");
      return;
    }

    setLoading(true);
    try {
      // 1. ファイルアップロード処理（モック）
      const filePath = `/invoices/bulk/${Date.now()}_${selectedFile.name}`;

      // 2. Invoice_Group 作成
      const groupId = `INV-${Date.now()}`;
      const requestBody: CreateInvoiceGroupRequest = {
        Group_Type: groupType,
        Invoice_File_Path: filePath,
        Invoice_Total_Cost_JPY: parseFloat(totalCost),
        Uploaded_By: uploadedBy,
      };

      // 実際のAPI呼び出し（モック）
      console.log("[InvoiceManagement] グループ作成:", requestBody);

      // モック成功レスポンス
      setCurrentGroupId(groupId);
      setUploadSuccess(true);
      alert(`請求書グループ ${groupId} が作成されました。`);
    } catch (error) {
      console.error("[InvoiceManagement] アップロードエラー:", error);
      alert("アップロードに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  // 受注選択トグル
  const toggleOrderSelection = (orderId: string) => {
    const newSet = new Set(selectedOrderIds);
    if (newSet.has(orderId)) {
      newSet.delete(orderId);
    } else {
      newSet.add(orderId);
    }
    setSelectedOrderIds(newSet);
  };

  // 一括紐付け実行
  const handleLinkOrders = async () => {
    if (!currentGroupId || selectedOrderIds.size === 0) {
      alert("請求書グループを作成し、受注を選択してください。");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/accounting/link-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Group_ID: currentGroupId,
          Order_IDs: Array.from(selectedOrderIds),
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`${data.updatedCount}件の受注を紐付けました。`);
        setSelectedOrderIds(new Set());
        setUploadSuccess(false);
        setCurrentGroupId(null);
        fetchUnlinkedOrders(); // リストを更新
      } else {
        alert(`エラー: ${data.message}`);
      }
    } catch (error) {
      console.error("[InvoiceManagement] 紐付けエラー:", error);
      alert("紐付けに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  // 按分計算プレビュー
  const calculateAverageCost = () => {
    if (!totalCost || selectedOrderIds.size === 0) return 0;
    return Math.round((parseFloat(totalCost) / selectedOrderIds.size) * 100) / 100;
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <Card className="border-t-4 border-t-purple-600">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold flex items-center gap-2 text-purple-700">
            <FileUp className="h-6 w-6" /> 請求書グループ登録画面
          </CardTitle>
          <Button variant="outline" onClick={fetchUnlinkedOrders}>
            <RefreshCw className="h-4 w-4 mr-2" /> データ更新
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左側: 請求書アップロード */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">1. 請求書PDFアップロード</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">請求タイプ</label>
                  <Select
                    value={groupType}
                    onValueChange={(value) => setGroupType(value as InvoiceGroupType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="C_PASS_FEDEX">FedEx C-PASS（まとめ請求）</SelectItem>
                      <SelectItem value="JAPAN_POST_INDIVIDUAL">日本郵便（個別請求）</SelectItem>
                      <SelectItem value="OTHER_BULK">その他まとめ請求</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">請求書総額（JPY）</label>
                  <Input
                    type="number"
                    placeholder="例: 125000"
                    value={totalCost}
                    onChange={(e) => setTotalCost(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">アップロード担当者</label>
                  <Input
                    type="text"
                    placeholder="例: admin@example.com"
                    value={uploadedBy}
                    onChange={(e) => setUploadedBy(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">請求書ファイル</label>
                  <Input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                  />
                  {selectedFile && (
                    <p className="text-xs text-green-600 mt-1">
                      <CheckCircle className="h-3 w-3 inline mr-1" />
                      {selectedFile.name}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleUploadInvoice}
                  disabled={loading || !selectedFile || !totalCost}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <FileUp className="h-4 w-4 mr-2" />
                  {loading ? "アップロード中..." : "請求書グループを作成"}
                </Button>

                {uploadSuccess && currentGroupId && (
                  <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
                    <CheckCircle className="h-4 w-4 inline mr-2 text-green-600" />
                    <span className="font-semibold">グループID: {currentGroupId}</span>
                    <p className="text-xs text-green-700 mt-1">
                      次に、右側のリストから受注を選択して紐付けてください。
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 右側: 未紐付け受注リストと一括紐付け */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">
                  2. 未証明の出荷済み受注（{unlinkedOrders.length}件）
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-[400px] overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader className="bg-gray-100 sticky top-0">
                      <TableRow>
                        <TableHead className="w-12">選択</TableHead>
                        <TableHead>受注ID</TableHead>
                        <TableHead>商品名</TableHead>
                        <TableHead>追跡番号</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unlinkedOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-gray-500">
                            未証明の受注はありません。
                          </TableCell>
                        </TableRow>
                      ) : (
                        unlinkedOrders.map((order) => (
                          <TableRow
                            key={order.id}
                            className={
                              selectedOrderIds.has(order.id) ? "bg-blue-50" : ""
                            }
                          >
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedOrderIds.has(order.id)}
                                onChange={() => toggleOrderSelection(order.id)}
                                className="h-4 w-4"
                              />
                            </TableCell>
                            <TableCell className="font-medium text-blue-600">
                              {order.id}
                            </TableCell>
                            <TableCell className="text-sm">{order.itemName}</TableCell>
                            <TableCell className="text-xs text-gray-600">
                              {order.trackingNumber}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* 按分計算プレビュー */}
                {selectedOrderIds.size > 0 && totalCost && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Calculator className="h-4 w-4 inline mr-2 text-blue-600" />
                    <span className="font-semibold">按分計算:</span>
                    <p className="text-sm text-blue-700 mt-1">
                      総額 ¥{parseFloat(totalCost).toLocaleString()} ÷{" "}
                      {selectedOrderIds.size}件 = 1件あたり ¥
                      {calculateAverageCost().toLocaleString()}
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleLinkOrders}
                  disabled={loading || !currentGroupId || selectedOrderIds.size === 0}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  {loading
                    ? "紐付け中..."
                    : `選択した${selectedOrderIds.size}件を紐付ける`}
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceManagementPage;
