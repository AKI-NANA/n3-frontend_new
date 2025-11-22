// 📁 格納パス: app/api/dashboard/alerts/route.ts
// 依頼内容: ダッシュボードのアラート情報を提供するAPIエンドポイント

import { NextRequest, NextResponse } from "next/server";
import {
  getInquiryClassifier,
  InquiryMessage,
} from "@/services/inquiry/InquiryClassifier";

/**
 * ダッシュボードアラート情報を取得するGETエンドポイント
 *
 * レスポンス形式:
 * {
 *   urgent: number,        // モール緊急通知件数（AI分類で「緊急対応」と判定されたメッセージ）
 *   paymentDue: number,    // 本日支払期限のタスク件数
 *   unhandledTasks: number // 未対応タスク（問い合わせ + 未出荷受注）
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // 1. InquiryClassifierのインスタンスを取得
    const classifier = getInquiryClassifier();

    // 2. メッセージデータを取得
    // 実際にはSupabaseの inquiry_messages テーブルから未対応メッセージを取得
    const messages = await fetchUnhandledMessages();

    // 3. メッセージを分類し、緊急対応カテゴリの件数を集計
    const classifiedMessages = classifier.classifyBatch(messages);
    const urgentCount = classifiedMessages.filter(
      (msg) => msg.category === "urgent"
    ).length;

    // 4. 本日支払期限のタスク件数を取得
    // 実際にはGoogleカレンダーAPIまたは会計管理DBから取得
    const paymentDueCount = await fetchPaymentDueCount();

    // 5. 未対応タスク件数を集計
    // 未対応問い合わせ + 未出荷受注
    const unhandledInquiryCount = classifiedMessages.filter(
      (msg) => msg.category === "standard" || msg.category === "urgent"
    ).length;
    const unshippedOrdersCount = await fetchUnshippedOrdersCount();
    const unhandledTasksCount = unhandledInquiryCount + unshippedOrdersCount;

    // 6. レスポンスを返す
    return NextResponse.json({
      urgent: urgentCount,
      paymentDue: paymentDueCount,
      unhandledTasks: unhandledTasksCount,
    });
  } catch (error) {
    console.error("[Dashboard Alerts API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch dashboard alerts",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * 未対応のメッセージを取得する（モック実装）
 * 実際にはSupabaseから取得
 */
async function fetchUnhandledMessages(): Promise<InquiryMessage[]> {
  // モックデータ（実際にはSupabaseクエリ）
  // const { data, error } = await supabase
  //   .from('inquiry_messages')
  //   .select('*')
  //   .eq('status', 'unhandled')
  //   .order('received_at', { ascending: false });

  const mockMessages: InquiryMessage[] = [
    {
      id: "msg_001",
      title: "Your account is limited - Action required",
      senderEmail: "security@ebay.com",
      body: "Your eBay account has been limited due to seller performance issues. Please respond within 24 hours.",
      marketplace: "eBay",
      receivedAt: new Date().toISOString(),
    },
    {
      id: "msg_002",
      title: "Case opened - Buyer requested refund",
      senderEmail: "cases@ebay.com",
      body: "A buyer has opened a case for item #123456. Please provide a response.",
      marketplace: "eBay",
      receivedAt: new Date().toISOString(),
    },
    {
      id: "msg_003",
      title: "Shipping label created",
      senderEmail: "noreply@ebay.com",
      body: "A shipping label has been created for order #789012.",
      marketplace: "eBay",
      receivedAt: new Date().toISOString(),
    },
    {
      id: "msg_004",
      title: "商品について質問があります",
      senderEmail: "buyer123@example.com",
      body: "この商品のサイズについて教えてください。",
      marketplace: "Shopee",
      receivedAt: new Date().toISOString(),
    },
    {
      id: "msg_005",
      title: "Monthly sales report",
      senderEmail: "marketing@amazon.com",
      body: "Your monthly sales report is now available.",
      marketplace: "Amazon",
      receivedAt: new Date().toISOString(),
    },
  ];

  return mockMessages;
}

/**
 * 本日支払期限のタスク件数を取得する（モック実装）
 * 実際にはGoogleカレンダーAPIまたは会計管理DBから取得
 */
async function fetchPaymentDueCount(): Promise<number> {
  // モック実装
  // 実際には:
  // 1. Googleカレンダーから今日期限のイベントを取得
  // 2. または会計管理DBの payment_tasks テーブルを検索
  // const today = new Date().toISOString().split('T')[0];
  // const { count } = await supabase
  //   .from('payment_tasks')
  //   .select('*', { count: 'exact' })
  //   .eq('due_date', today)
  //   .eq('status', 'pending');

  return 3; // モック値
}

/**
 * 未出荷の受注件数を取得する（モック実装）
 * 実際には受注管理DBから取得
 */
async function fetchUnshippedOrdersCount(): Promise<number> {
  // モック実装
  // 実際には:
  // const { count } = await supabase
  //   .from('orders')
  //   .select('*', { count: 'exact' })
  //   .eq('shipping_status', 'unshipped');

  return 5; // モック値
}
