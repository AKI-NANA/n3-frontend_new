// 📁 格納パス: app/dashboard/page.tsx
// 依頼内容: 総合ダッシュボード - 管制塔型の多販路アラート統合版

"use client";

import { useEffect } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";
import AlertWidget from "./AlertWidget";
import KPICard from "@/components/dashboard/KPICard";
import MarketplaceTable from "@/components/dashboard/MarketplaceTable";
import DoughnutChart from "@/components/dashboard/DoughnutChart";
import InventorySummary from "@/components/dashboard/InventorySummary";
import OutsourceSummary from "@/components/dashboard/OutsourceSummary";
import SystemHealthCheck from "@/components/dashboard/SystemHealthCheck";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  Package,
  Percent,
} from "lucide-react";

/**
 * 総合ダッシュボード - 管制塔（コントロールタワー）型
 * 1日の開始時にこの画面を見るだけで、経営状態のサマリー把握と、
 * 本日絶対に実行すべきタスク（ペナルティ回避含む）がクリアできる状態を目指します。
 */
export default function DashboardPage() {
  const {
    alerts,
    kpis,
    marketplacePerformance,
    inventory,
    outsource,
    systemHealth,
    loading,
    error,
    lastUpdate,
    fetchDashboardData,
  } = useDashboardStore();

  // 初回ロード時にデータを取得
  useEffect(() => {
    fetchDashboardData();

    // 30秒ごとに自動更新
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // フォーマットヘルパー
  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;
  const formatPercentage = (value: number) =>
    `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;

  if (error) {
    return (
      <div className="p-6 bg-red-50 min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">エラー: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* ヘッダー */}
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-4xl font-extrabold text-indigo-800">
          📊 総合ダッシュボード - 管制塔
        </h1>
        {lastUpdate && (
          <p className="text-sm text-gray-500">
            最終更新: {new Date(lastUpdate).toLocaleTimeString("ja-JP")}
          </p>
        )}
      </div>

      {/* 1. 🚨 最重要アラート・タスク（ペナルティ/期日管理） */}
      <AlertWidget />

      {/* 2. 📈 今月の実績サマリー（KPIカード） */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="売上合計"
          value={formatCurrency(kpis.totalSales)}
          trend={formatPercentage(kpis.salesChange)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KPICard
          title="純利益"
          value={formatCurrency(kpis.totalProfit)}
          trend={formatPercentage(kpis.profitChange)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KPICard
          title="利益率 (GPM)"
          value={`${kpis.profitMargin.toFixed(1)}%`}
          trend={kpis.profitMargin >= 15 ? "目標達成" : "目標未達"}
          icon={<Percent className="h-5 w-5" />}
        />
        <KPICard
          title="在庫評価額"
          value={formatCurrency(kpis.inventoryValuation)}
          trend=""
          icon={<Package className="h-5 w-5" />}
        />
      </div>

      {/* 3. 🌐 モール別パフォーマンステーブル + 📊 ドーナツチャート */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* モール別テーブル */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl">
              🌐 モール別パフォーマンステーブル
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MarketplaceTable />
          </CardContent>
        </Card>

        {/* ドーナツチャート */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">📊 収益チャンネル別</CardTitle>
          </CardHeader>
          <CardContent>
            <DoughnutChart
              data={marketplacePerformance.map((mp) => ({
                label: mp.marketplace,
                value: mp.profit,
              }))}
              className="h-64"
            />
          </CardContent>
        </Card>
      </div>

      {/* 4. 📦 出品・在庫管理 + 🧑‍💻 外注業務 + ⚙️ システム健全性 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <InventorySummary />
        <OutsourceSummary />
        <SystemHealthCheck />
      </div>

      {/* ローディングオーバーレイ */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-700 font-medium">データを読み込み中...</p>
          </div>
        </div>
      )}
    </div>
  );
}
