// 📁 格納パス: app/api/dashboard/kpis/route.ts
// 依頼内容: ダッシュボードのKPI情報を提供するAPIエンドポイント（実データ統合版）

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const kpis = await fetchKPIsFromDatabase();
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
 * KPIをデータベースから取得する
 */
async function fetchKPIsFromDatabase() {
  const supabase = await createClient();

  // 今月の開始日と終了日を計算
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const currentMonthStartStr = currentMonthStart.toISOString().split("T")[0];
  const currentMonthEndStr = currentMonthEnd.toISOString().split("T")[0];
  const lastMonthStartStr = lastMonthStart.toISOString().split("T")[0];
  const lastMonthEndStr = lastMonthEnd.toISOString().split("T")[0];

  // 1. 在庫評価額を計算（products_masterから）
  const { data: products, error: productsError } = await supabase
    .from("products_master")
    .select("acquired_price_jpy, quantity");

  if (productsError) {
    console.error("Products fetch error:", productsError);
  }

  const inventoryValuation = (products || []).reduce((sum, product) => {
    const price = product.acquired_price_jpy || 0;
    const quantity = product.quantity || 1;
    return sum + price * quantity;
  }, 0);

  // 2. 売上と利益を計算（accounting_final_ledgerから、存在しない場合はフォールバック）
  let totalSales = 0;
  let totalProfit = 0;
  let lastMonthSales = 0;
  let lastMonthProfit = 0;

  // accounting_final_ledgerテーブルの存在を確認
  const { data: accountingData, error: accountingError } = await supabase
    .from("accounting_final_ledger")
    .select("date, account_title, amount")
    .gte("date", currentMonthStartStr)
    .lte("date", currentMonthEndStr);

  if (!accountingError && accountingData) {
    // accounting_final_ledgerが存在する場合
    totalSales = accountingData
      .filter((entry) => entry.account_title === "売上高")
      .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

    totalProfit = accountingData
      .filter(
        (entry) => entry.account_title === "純利益" || entry.account_title === "当期純利益"
      )
      .reduce((sum, entry) => sum + entry.amount, 0);

    // 前月データを取得
    const { data: lastMonthAccounting } = await supabase
      .from("accounting_final_ledger")
      .select("date, account_title, amount")
      .gte("date", lastMonthStartStr)
      .lte("date", lastMonthEndStr);

    if (lastMonthAccounting) {
      lastMonthSales = lastMonthAccounting
        .filter((entry) => entry.account_title === "売上高")
        .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

      lastMonthProfit = lastMonthAccounting
        .filter(
          (entry) =>
            entry.account_title === "純利益" || entry.account_title === "当期純利益"
        )
        .reduce((sum, entry) => sum + entry.amount, 0);
    }
  } else {
    // accounting_final_ledgerが存在しない場合は、products_masterから概算
    console.warn(
      "accounting_final_ledger table not found. Using estimated values from products_master."
    );

    const { data: currentMonthProducts } = await supabase
      .from("products_master")
      .select("acquired_price_jpy, profit_amount_usd, listing_data, updated_at")
      .gte("updated_at", currentMonthStartStr)
      .lte("updated_at", currentMonthEndStr);

    if (currentMonthProducts) {
      totalSales = currentMonthProducts.reduce((sum, product) => {
        const ddpPrice = product.listing_data?.ddp_price_usd || 0;
        return sum + ddpPrice * 150; // USD to JPY (概算)
      }, 0);

      totalProfit = currentMonthProducts.reduce((sum, product) => {
        const profitUsd = product.profit_amount_usd || 0;
        return sum + profitUsd * 150; // USD to JPY (概算)
      }, 0);
    }

    // 前月データ
    const { data: lastMonthProducts } = await supabase
      .from("products_master")
      .select("acquired_price_jpy, profit_amount_usd, listing_data, updated_at")
      .gte("updated_at", lastMonthStartStr)
      .lte("updated_at", lastMonthEndStr);

    if (lastMonthProducts) {
      lastMonthSales = lastMonthProducts.reduce((sum, product) => {
        const ddpPrice = product.listing_data?.ddp_price_usd || 0;
        return sum + ddpPrice * 150;
      }, 0);

      lastMonthProfit = lastMonthProducts.reduce((sum, product) => {
        const profitUsd = product.profit_amount_usd || 0;
        return sum + profitUsd * 150;
      }, 0);
    }
  }

  // 3. 利益率と増減率を計算
  const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
  const salesChange =
    lastMonthSales > 0 ? ((totalSales - lastMonthSales) / lastMonthSales) * 100 : 0;
  const profitChange =
    lastMonthProfit > 0
      ? ((totalProfit - lastMonthProfit) / lastMonthProfit) * 100
      : 0;

  return {
    totalSales: Math.round(totalSales),
    totalProfit: Math.round(totalProfit),
    profitMargin: parseFloat(profitMargin.toFixed(2)),
    inventoryValuation: Math.round(inventoryValuation),
    salesChange: parseFloat(salesChange.toFixed(1)),
    profitChange: parseFloat(profitChange.toFixed(1)),
  };
}
