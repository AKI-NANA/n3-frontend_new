// 📁 格納パス: app/api/dashboard/outsource/route.ts
// 依頼内容: 外注業務実績データを提供するAPIエンドポイント（実データ統合版）

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 外注業務実績データを取得するGETエンドポイント
 *
 * レスポンス形式:
 * {
 *   yesterdayShipping: number,  // 昨日の出荷処理件数
 *   yesterdayInquiry: number    // 昨日の問い合わせ完了件数
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const outsourceData = await fetchOutsourceSummary();
    return NextResponse.json(outsourceData);
  } catch (error) {
    console.error("[Dashboard Outsource API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch outsource summary",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * 外注業務実績をデータベースから取得する
 */
async function fetchOutsourceSummary() {
  const supabase = await createClient();

  // 昨日の日付を計算
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // 1. 昨日の出荷処理完了件数（shipping_logsテーブルから）
  let yesterdayShipping = 0;
  const { count: shippingCount, error: shippingError } = await supabase
    .from("shipping_logs")
    .select("*", { count: "exact", head: true })
    .eq("completed_date", yesterdayStr)
    .eq("status", "completed");

  if (!shippingError) {
    yesterdayShipping = shippingCount || 0;
  } else {
    console.warn("shipping_logs table not found or error:", shippingError.message);
  }

  // 2. 昨日の問い合わせ対応完了件数（inquiry_logsテーブルから）
  let yesterdayInquiry = 0;
  const { count: inquiryCount, error: inquiryError } = await supabase
    .from("inquiry_logs")
    .select("*", { count: "exact", head: true })
    .eq("completed_date", yesterdayStr)
    .eq("status", "completed");

  if (!inquiryError) {
    yesterdayInquiry = inquiryCount || 0;
  } else {
    console.warn("inquiry_logs table not found or error:", inquiryError.message);
  }

  return {
    yesterdayShipping,
    yesterdayInquiry,
  };
}
