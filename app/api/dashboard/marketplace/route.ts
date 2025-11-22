// 📁 格納パス: app/api/dashboard/marketplace/route.ts
// 依頼内容: モール別パフォーマンスデータを提供するAPIエンドポイント（実データ統合版）

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * モール別パフォーマンスデータを取得するGETエンドポイント
 *
 * レスポンス形式:
 * [
 *   {
 *     marketplace: string,    // モール名
 *     salesCount: number,     // 販売個数
 *     profit: number,         // 純利益
 *     unhandledInquiry: number, // 未対応問い合わせ件数
 *     unshippedOrders: number   // 未出荷件数
 *   }
 * ]
 */
export async function GET(request: NextRequest) {
  try {
    const marketplaceData = await fetchMarketplacePerformance();
    return NextResponse.json(marketplaceData);
  } catch (error) {
    console.error("[Dashboard Marketplace API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch marketplace performance",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * モール別パフォーマンスをデータベースから取得する
 */
async function fetchMarketplacePerformance() {
  const supabase = await createClient();

  // 今月の開始日を計算
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthStartStr = currentMonthStart.toISOString().split("T")[0];

  // 対象モール
  const marketplaces = ["eBay", "Shopee", "Amazon", "Qoo10"];

  // モール別データを集計
  const marketplaceData = await Promise.all(
    marketplaces.map(async (marketplace) => {
      // 1. 販売個数と純利益（products_masterまたはaccounting_final_ledgerから）
      // products_masterのlisting_historyやtarget_marketplacesを確認
      const { data: products } = await supabase
        .from("products_master")
        .select("profit_amount_usd, quantity, target_marketplaces, updated_at")
        .contains("target_marketplaces", [marketplace])
        .gte("updated_at", currentMonthStartStr);

      const salesCount = (products || []).reduce(
        (sum, p) => sum + (p.quantity || 1),
        0
      );
      const profit = (products || []).reduce((sum, p) => {
        const profitUsd = p.profit_amount_usd || 0;
        return sum + profitUsd * 150; // USD to JPY (概算)
      }, 0);

      // 2. 未対応問い合わせ件数（inquiry_messagesテーブルから、存在しない場合は0）
      let unhandledInquiry = 0;
      const { data: inquiries, error: inquiryError } = await supabase
        .from("inquiry_messages")
        .select("id")
        .eq("marketplace", marketplace)
        .eq("status", "unhandled");

      if (!inquiryError && inquiries) {
        unhandledInquiry = inquiries.length;
      }

      // 3. 未出荷件数（ordersテーブルから、存在しない場合は0）
      let unshippedOrders = 0;
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id")
        .eq("marketplace", marketplace)
        .eq("shipping_status", "unshipped");

      if (!ordersError && orders) {
        unshippedOrders = orders.length;
      }

      return {
        marketplace,
        salesCount,
        profit: Math.round(profit),
        unhandledInquiry,
        unshippedOrders,
      };
    })
  );

  return marketplaceData;
}
