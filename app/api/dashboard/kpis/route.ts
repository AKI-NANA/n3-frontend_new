// 📁 格納パス: app/api/dashboard/kpis/route.ts
// 依頼内容: ダッシュボードのKPI情報を提供するAPIエンドポイント

import { NextRequest, NextResponse } from "next/server";

/**
 * ダッシュボードKPI情報を取得するGETエンドポイント
 *
 * レスポンス形式:
 * {
 *   totalSales: number,      // 今月の売上合計
 *   totalProfit: number,     // 今月の純利益合計
 *   profitMargin: number,    // 利益率 (%)
 *   inventoryValuation: number, // 在庫評価額
 *   salesChange: number,     // 前月比増減率 (%)
 *   profitChange: number     // 前月比純利益増減率 (%)
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // 実際にはSupabaseやAccounting_Final_Ledgerから取得
    // const kpis = await fetchKPIsFromDatabase();

    // モックデータ
    const kpis = {
      totalSales: 2850000, // 今月の売上合計（円）
      totalProfit: 520000, // 今月の純利益合計（円）
      profitMargin: 18.2, // 利益率
      inventoryValuation: 15600000, // 在庫評価額（円）
      salesChange: 12.5, // 前月比 +12.5%
      profitChange: 8.3, // 前月比純利益 +8.3%
    };

    return NextResponse.json(kpis);
  } catch (error) {
    console.error("[Dashboard KPIs API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch KPIs",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * KPIをデータベースから取得する（実装予定）
 */
async function fetchKPIsFromDatabase() {
  // 実際の実装:
  // 1. Accounting_Final_Ledgerから今月の確定利益を集計
  // 2. Sales_Ordersから今月の売上を集計
  // 3. SKUマスターから在庫評価額を計算
  // 4. 前月データと比較して増減率を算出
}
