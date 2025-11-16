// app/kobutsu-ledger/page.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Filter, FileText, Download, Link, AlertTriangle } from "lucide-react";
import { KobutsuLedgerRecord } from "@/services/KobutsuLedgerService";

// -- モックデータ定義 (実際はSupabaseから取得) --
const MOCK_LEDGER_DATA: KobutsuLedgerRecord[] = [
  {
    Ledger_ID: "LGR-001",
    Order_ID: "ORD-1001",
    Acquisition_Date: new Date("2025-10-01"),
    Item_Name: "腕時計 XYZ",
    Item_Features: "型番: K-001, 中古美品",
    Quantity: 1,
    Acquisition_Cost: 50000,
    Supplier_Name: "Auction Seller A",
    Supplier_Type: "AUCTION",
    Source_Image_Path: "/storage/kobutsu/img/001.jpg",
    Sales_Date: null,
  },
  {
    Ledger_ID: "LGR-002",
    Order_ID: "ORD-1002",
    Acquisition_Date: new Date("2025-10-02"),
    Item_Name: "カメラレンズ L-50",
    Item_Features: "状態: ジャンク, 部品取り",
    Quantity: 1,
    Acquisition_Cost: 5000,
    Supplier_Name: "Amazon Shop B",
    Supplier_Type: "B2C_COMPANY",
    Source_Image_Path: "/storage/kobutsu/img/002.jpg",
    Sales_Date: new Date("2025-10-15"),
  },
  {
    Ledger_ID: "LGR-003",
    Order_ID: "ORD-1003",
    Acquisition_Date: new Date("2025-10-03"),
    Item_Name: "スマホケース D-Model",
    Item_Features: "色: ブルー, 新品",
    Quantity: 5,
    Acquisition_Cost: 1000,
    Supplier_Name: "Individual C",
    Supplier_Type: "INDIVIDUAL_SELLER",
    Source_Image_Path: "/storage/kobutsu/img/003.jpg",
    Sales_Date: new Date("2025-10-20"),
  },
];

const KobutsuLedgerReport: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [supplierTypeFilter, setSupplierTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // フィルタリングロジック
  const filteredData = useMemo(() => {
    return MOCK_LEDGER_DATA.filter((record) => {
      // 品目・仕入先名での検索
      const matchesSearch =
        record.Item_Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.Supplier_Name.toLowerCase().includes(searchTerm.toLowerCase());

      // 仕入先タイプでのフィルタリング
      const matchesType =
        supplierTypeFilter === "all" ||
        record.Supplier_Type === supplierTypeFilter;

      // 日付範囲でのフィルタリング (Acquisition_Dateを使用)
      const acquisitionDate =
        record.Acquisition_Date.toISOString().split("T")[0];
      const matchesDateFrom = !dateFrom || acquisitionDate >= dateFrom;
      const matchesDateTo = !dateTo || acquisitionDate <= dateTo;

      return matchesSearch && matchesType && matchesDateFrom && matchesDateTo;
    });
  }, [searchTerm, supplierTypeFilter, dateFrom, dateTo]);

  // レポート出力シミュレーション
  const handleExport = (format: "PDF" | "CSV") => {
    console.log(
      `[EXPORT] ${format}形式で古物台帳データを期間(${dateFrom}〜${dateTo})で出力します。`
    );
    // 実際にはサーバーサイドでPDF/CSV生成ロジックを呼び出す
    alert(
      `古物台帳レポート（${format}）の生成を開始しました。ダウンロードが完了するまでしばらくお待ちください。`
    );
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;
  const formatDate = (date: Date) => date.toLocaleDateString("ja-JP");

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold flex items-center gap-2 text-indigo-700">
            <FileText className="h-6 w-6" /> 古物台帳レポート
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            古物営業法に基づく仕入れ記録の一覧です。税務調査対策のため、正確性を確保してください。
          </p>

          {/* フィルタリングエリア */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 p-4 border rounded-lg bg-white shadow-sm">
            <div className="lg:col-span-2 flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="品目名、仕入先名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-xs text-gray-500">仕入タイプ</label>
              <Select onValueChange={setSupplierTypeFilter} defaultValue="all">
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="全て" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全て</SelectItem>
                  <SelectItem value="AUCTION">
                    AUCTION (オークション)
                  </SelectItem>
                  <SelectItem value="INDIVIDUAL_SELLER">
                    INDIVIDUAL_SELLER (個人)
                  </SelectItem>
                  <SelectItem value="B2C_COMPANY">
                    B2C_COMPANY (企業)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-xs text-gray-500">仕入日 (From)</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-xs text-gray-500">仕入日 (To)</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* レポート出力機能 (税務対策) */}
          <div className="flex justify-end gap-2 mb-4">
            <Button
              variant="outline"
              onClick={() => handleExport("PDF")}
              className="bg-white hover:bg-red-50 text-red-600 border-red-300"
            >
              <Download className="h-4 w-4 mr-2" /> PDF 出力 (税務調査用)
            </Button>
            <Button
              onClick={() => handleExport("CSV")}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="h-4 w-4 mr-2" /> CSV 出力
            </Button>
          </div>

          {/* 古物台帳テーブル */}
          <div className="overflow-x-auto border rounded-lg shadow-md bg-white">
            <Table>
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead className="w-[100px]">台帳ID</TableHead>
                  <TableHead>仕入日</TableHead>
                  <TableHead>品目名 / 特徴</TableHead>
                  <TableHead>仕入対価</TableHead>
                  <TableHead>仕入先名 / 種別</TableHead>
                  <TableHead>画像</TableHead>
                  <TableHead>販売日</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((record) => (
                  <TableRow
                    key={record.Ledger_ID}
                    className={record.Sales_Date ? "bg-green-50/50" : ""}
                  >
                    <TableCell className="font-medium text-xs">
                      {record.Ledger_ID}
                    </TableCell>
                    <TableCell>{formatDate(record.Acquisition_Date)}</TableCell>
                    <TableCell>
                      <div className="font-semibold text-gray-800">
                        {record.Item_Name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {record.Item_Features} (x{record.Quantity})
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-red-600">
                      {formatCurrency(record.Acquisition_Cost)}
                    </TableCell>
                    <TableCell>
                      <div>{record.Supplier_Name}</div>
                      <div className="text-xs text-indigo-500">
                        {record.Supplier_Type}
                      </div>
                    </TableCell>
                    <TableCell>
                      <a
                        href={record.Source_Image_Path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline flex items-center text-sm"
                      >
                        <Link className="h-4 w-4 mr-1" /> 画像リンク
                      </a>
                    </TableCell>
                    <TableCell>
                      {record.Sales_Date ? (
                        formatDate(record.Sales_Date)
                      ) : (
                        <span className="text-amber-500">在庫中</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredData.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
                該当する古物台帳記録が見つかりません。
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KobutsuLedgerReport;
