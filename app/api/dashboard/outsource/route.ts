// 📁 格納パス: app/api/dashboard/outsource/route.ts
// 依頼内容: 外注業務実績データを提供するAPIエンドポイント

import { NextRequest, NextResponse } from "next/server";

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
    // 実際には作業ログDBから取得
    // const outsourceData = await fetchOutsourceSummary();

    // モックデータ
    const outsourceData = {
      yesterdayShipping: 150, // 昨日の出荷処理完了件数
      yesterdayInquiry: 25, // 昨日の問い合わせ対応完了件数
    };

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
 * 外注業務実績をデータベースから取得する（実装予定）
 */
async function fetchOutsourceSummary() {
  // 実際の実装:
  // 1. 出荷・梱包管理ツール（ツール3）の作業ログから昨日の完了件数を集計
  // 2. 問い合わせ・通知管理ツール（ツール4）の作業ログから昨日の完了件数を集計
  // const yesterday = new Date();
  // yesterday.setDate(yesterday.getDate() - 1);
  // const dateStr = yesterday.toISOString().split('T')[0];
}
