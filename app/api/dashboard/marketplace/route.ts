// 📁 格納パス: app/api/dashboard/marketplace/route.ts
// 依頼内容: モール別パフォーマンスデータを提供するAPIエンドポイント

import { NextRequest, NextResponse } from "next/server";

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
    // 実際にはSupabaseのSales_OrdersとIntegratedPricingServiceから取得
    // const marketplaceData = await fetchMarketplacePerformance();

    // モックデータ
    const marketplaceData = [
      {
        marketplace: "eBay",
        salesCount: 450,
        profit: 155000,
        unhandledInquiry: 3,
        unshippedOrders: 5,
      },
      {
        marketplace: "Shopee",
        salesCount: 120,
        profit: 32000,
        unhandledInquiry: 1,
        unshippedOrders: 0,
      },
      {
        marketplace: "Amazon",
        salesCount: 88,
        profit: 28000,
        unhandledInquiry: 0,
        unshippedOrders: 2,
      },
      {
        marketplace: "Qoo10",
        salesCount: 30,
        profit: 8500,
        unhandledInquiry: 0,
        unshippedOrders: 0,
      },
    ];

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
 * モール別パフォーマンスをデータベースから取得する（実装予定）
 */
async function fetchMarketplacePerformance() {
  // 実際の実装:
  // 1. Sales_Ordersからモール別の販売個数と純利益を集計
  // 2. inquiry_messagesから未対応問い合わせを集計
  // 3. ordersから未出荷受注を集計
}
