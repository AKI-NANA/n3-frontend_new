// 📁 格納パス: app/api/dashboard/alerts/route.ts
// 依頼内容: ダッシュボードのアラート情報を提供するAPIエンドポイント（実データ統合版）

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
    const messages = await fetchUnhandledMessages();

    // 3. メッセージを分類し、緊急対応カテゴリの件数を集計
    const classifiedMessages = classifier.classifyBatch(messages);
    const urgentCount = classifiedMessages.filter(
      (msg) => msg.category === "urgent"
    ).length;

    // 4. 本日支払期限のタスク件数を取得
    const paymentDueCount = await fetchPaymentDueCount();

    // 5. 未対応タスク件数を集計
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
 * 未対応のメッセージをSupabaseから取得する
 */
async function fetchUnhandledMessages(): Promise<InquiryMessage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inquiry_messages")
    .select("id, title, sender_email, body, marketplace, received_at")
    .eq("status", "unhandled")
    .order("received_at", { ascending: false })
    .limit(100);

  if (error) {
    console.warn("inquiry_messages table not found or error:", error.message);
    // テーブルが存在しない場合は空配列を返す
    return [];
  }

  // データを InquiryMessage 形式に変換
  return (data || []).map((msg) => ({
    id: msg.id,
    title: msg.title || "",
    senderEmail: msg.sender_email || "",
    body: msg.body || "",
    marketplace: msg.marketplace || "",
    receivedAt: msg.received_at || new Date().toISOString(),
  }));
}

/**
 * 本日支払期限のタスク件数を取得する
 */
async function fetchPaymentDueCount(): Promise<number> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  // payment_tasksテーブルから今日期限のタスクを検索
  const { count, error } = await supabase
    .from("payment_tasks")
    .select("*", { count: "exact", head: true })
    .eq("due_date", today)
    .eq("status", "pending");

  if (error) {
    console.warn("payment_tasks table not found or error:", error.message);
    // テーブルが存在しない場合は0を返す
    return 0;
  }

  return count || 0;
}

/**
 * 未出荷の受注件数を取得する
 */
async function fetchUnshippedOrdersCount(): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("shipping_status", "unshipped");

  if (error) {
    console.warn("orders table not found or error:", error.message);
    // テーブルが存在しない場合は0を返す
    return 0;
  }

  return count || 0;
}
