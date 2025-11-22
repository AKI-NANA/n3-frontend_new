// app/kobutsu/report/page.tsx
// 古物台帳レポート画面
// 古物営業法に基づく台帳データの閲覧・フィルタリング・PDF/CSV出力

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Download, ExternalLink, Search, Filter } from 'lucide-react';

/**
 * 古物台帳レコードの型定義
 */
interface KobutsuLedgerRecord {
  ledger_id: string;
  order_id: string;
  acquisition_date: string;
  item_name: string;
  item_features: string;
  quantity: number;
  acquisition_cost: number;
  supplier_name: string;
  supplier_type: string;
  supplier_url: string;
  source_image_path: string;
  proof_pdf_path: string;
  sales_date: string;
  ai_extraction_status: string;
  rpa_pdf_status: string;
}

/**
 * 古物台帳レポート画面
 */
export default function KobutsuReportPage() {
  const [records, setRecords] = useState<KobutsuLedgerRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<KobutsuLedgerRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フィルター状態
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [supplierNameFilter, setSupplierNameFilter] = useState('');
  const [supplierTypeFilter, setSupplierTypeFilter] = useState('all');

  /**
   * 古物台帳データを取得
   */
  const fetchLedgerRecords = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/kobutsu/ledger');
      const result = await response.json();

      if (result.success) {
        setRecords(result.data);
        setFilteredRecords(result.data);
      } else {
        setError(result.error || 'データ取得に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || 'データ取得中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  /**
   * フィルター適用
   */
  const applyFilters = () => {
    let filtered = [...records];

    // 日付フィルター
    if (dateFrom) {
      filtered = filtered.filter(
        (r) => new Date(r.acquisition_date) >= new Date(dateFrom)
      );
    }
    if (dateTo) {
      filtered = filtered.filter(
        (r) => new Date(r.acquisition_date) <= new Date(dateTo)
      );
    }

    // 仕入先名フィルター
    if (supplierNameFilter) {
      filtered = filtered.filter((r) =>
        r.supplier_name.toLowerCase().includes(supplierNameFilter.toLowerCase())
      );
    }

    // 仕入先種別フィルター
    if (supplierTypeFilter !== 'all') {
      filtered = filtered.filter((r) => r.supplier_type === supplierTypeFilter);
    }

    setFilteredRecords(filtered);
  };

  /**
   * PDF出力
   */
  const exportToPDF = async () => {
    try {
      const response = await fetch('/api/kobutsu/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'pdf',
          records: filteredRecords,
          dateFrom,
          dateTo,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kobutsu_ledger_${Date.now()}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('PDF出力に失敗しました');
      }
    } catch (err) {
      console.error('PDF出力エラー:', err);
      alert('PDF出力中にエラーが発生しました');
    }
  };

  /**
   * CSV出力
   */
  const exportToCSV = () => {
    const csvHeaders = [
      '台帳ID',
      '受注ID',
      '仕入日時',
      '品目名',
      '特徴',
      '数量',
      '仕入価格',
      '仕入先名',
      '仕入先種別',
      '販売日',
    ];

    const csvRows = filteredRecords.map((r) => [
      r.ledger_id,
      r.order_id,
      new Date(r.acquisition_date).toLocaleString('ja-JP'),
      r.item_name,
      r.item_features || '',
      r.quantity,
      r.acquisition_cost,
      r.supplier_name,
      r.supplier_type,
      r.sales_date ? new Date(r.sales_date).toLocaleString('ja-JP') : '未販売',
    ]);

    const csvContent =
      [csvHeaders.join(','), ...csvRows.map((row) => row.join(','))].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kobutsu_ledger_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchLedgerRecords();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [dateFrom, dateTo, supplierNameFilter, supplierTypeFilter, records]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            古物台帳レポート
          </CardTitle>
          <p className="text-sm text-gray-600">
            古物営業法に基づく法定記録の閲覧・出力
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* フィルターセクション */}
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="w-5 h-5" />
                フィルター
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label htmlFor="dateFrom">仕入日（開始）</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="dateTo">仕入日（終了）</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="supplierName">仕入先名</Label>
                <Input
                  id="supplierName"
                  type="text"
                  placeholder="仕入先名で検索"
                  value={supplierNameFilter}
                  onChange={(e) => setSupplierNameFilter(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="supplierType">仕入先種別</Label>
                <Select value={supplierTypeFilter} onValueChange={setSupplierTypeFilter}>
                  <SelectTrigger id="supplierType">
                    <SelectValue placeholder="すべて" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="B2C_COMPANY">企業（B2C）</SelectItem>
                    <SelectItem value="INDIVIDUAL_SELLER">個人出品者</SelectItem>
                    <SelectItem value="AUCTION">オークション</SelectItem>
                    <SelectItem value="OTHER">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* エクスポートボタン */}
          <div className="flex gap-3">
            <Button onClick={exportToPDF} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              PDF出力
            </Button>
            <Button onClick={exportToCSV} variant="secondary" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              CSV出力
            </Button>
            <Button onClick={fetchLedgerRecords} variant="outline" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              再取得
            </Button>
          </div>

          {/* レコード件数表示 */}
          <div className="text-sm text-gray-600">
            表示件数: {filteredRecords.length} / 全{records.length}件
          </div>

          {/* データテーブル */}
          {loading ? (
            <div className="text-center py-8">データを読み込み中...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">エラー: {error}</div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>受注ID</TableHead>
                    <TableHead>仕入日時</TableHead>
                    <TableHead>品目名</TableHead>
                    <TableHead>特徴</TableHead>
                    <TableHead>数量</TableHead>
                    <TableHead>仕入価格</TableHead>
                    <TableHead>仕入先名</TableHead>
                    <TableHead>仕入先種別</TableHead>
                    <TableHead>証明書</TableHead>
                    <TableHead>画像</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.ledger_id}>
                      <TableCell className="font-mono text-sm">{record.order_id}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(record.acquisition_date).toLocaleString('ja-JP')}
                      </TableCell>
                      <TableCell className="font-medium">{record.item_name}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {record.item_features || '-'}
                      </TableCell>
                      <TableCell className="text-center">{record.quantity}</TableCell>
                      <TableCell className="font-mono">
                        ¥{record.acquisition_cost.toLocaleString()}
                      </TableCell>
                      <TableCell>{record.supplier_name}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            record.supplier_type === 'B2C_COMPANY'
                              ? 'bg-blue-100 text-blue-700'
                              : record.supplier_type === 'INDIVIDUAL_SELLER'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {record.supplier_type}
                        </span>
                      </TableCell>
                      <TableCell>
                        {record.proof_pdf_path ? (
                          <a
                            href={record.proof_pdf_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <FileText className="w-4 h-4" />
                            PDF
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">未取得</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.source_image_path ? (
                          <a
                            href={record.source_image_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <ExternalLink className="w-4 h-4" />
                            画像
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">なし</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredRecords.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                        データがありません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
