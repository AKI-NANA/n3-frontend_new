// 📁 格納パス: app/api/dashboard/inventory/route.ts
// 依頼内容: 在庫サマリーデータを提供するAPIエンドポイント（実データ統合版）

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 在庫サマリーデータを取得するGETエンドポイント
 *
 * レスポンス形式:
 * {
 *   todayListing: number,     // 本日出品予定数
 *   criticalStock: number,    // 危険在庫アラート件数（在庫1個以下）
 *   unfulfilledOrders: number,// 未仕入れ受注件数
 *   valuation: number         // 在庫評価額
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const inventoryData = await fetchInventorySummary();
    return NextResponse.json(inventoryData);
  } catch (error) {
    console.error("[Dashboard Inventory API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch inventory summary",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * 在庫サマリーをデータベースから取得する
 */
async function fetchInventorySummary() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  // 1. 本日出品予定のSKU数（listing_scheduleテーブルから、存在しない場合は0）
  let todayListing = 0;
  const { count: listingCount, error: listingError } = await supabase
    .from("listing_schedule")
    .select("*", { count: "exact", head: true })
    .eq("scheduled_date", today)
    .eq("status", "pending");

  if (!listingError) {
    todayListing = listingCount || 0;
  } else {
    console.warn("listing_schedule table not found or error:", listingError.message);
  }

  // 2. 危険在庫アラート件数（在庫が1個以下の出品中SKU）
  let criticalStock = 0;
  const { count: criticalCount, error: criticalError } = await supabase
    .from("products_master")
    .select("*", { count: "exact", head: true })
    .lte("quantity", 1)
    .eq("listing_status", "active"); // 出品中のみ

  if (!criticalError) {
    criticalStock = criticalCount || 0;
  } else {
    console.warn("Critical stock query error:", criticalError.message);
  }

  // 3. 未仕入れ受注件数（受注済みだが仕入れ未完了）
  let unfulfilledOrders = 0;
  const { count: unfulfilledCount, error: unfulfilledError } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("purchase_status", "未仕入れ");

  if (!unfulfilledError) {
    unfulfilledOrders = unfulfilledCount || 0;
  } else {
    console.warn("Unfulfilled orders query error:", unfulfilledError.message);
  }

  // 4. 在庫評価額（全在庫の仕入れ原価総額）
  const { data: products, error: productsError } = await supabase
    .from("products_master")
    .select("acquired_price_jpy, quantity");

  let valuation = 0;
  if (!productsError && products) {
    valuation = products.reduce((sum, product) => {
      const price = product.acquired_price_jpy || 0;
      const quantity = product.quantity || 1;
      return sum + price * quantity;
    }, 0);
  } else if (productsError) {
    console.warn("Products valuation query error:", productsError.message);
  }

  return {
    todayListing,
    criticalStock,
    unfulfilledOrders,
    valuation: Math.round(valuation),
  };
}
