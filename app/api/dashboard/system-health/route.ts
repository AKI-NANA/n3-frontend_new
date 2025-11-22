// 📁 格納パス: app/api/dashboard/system-health/route.ts
// 依頼内容: システム健全性チェックデータを提供するAPIエンドポイント

import { NextRequest, NextResponse } from "next/server";

/**
 * システム健全性チェックデータを取得するGETエンドポイント
 *
 * レスポンス形式:
 * [
 *   {
 *     name: string,        // サービス名
 *     status: "ok" | "error" | "warning",
 *     lastSync: string     // 最終同期時刻
 *   }
 * ]
 */
export async function GET(request: NextRequest) {
  try {
    // 実際には各APIの接続状態をチェック
    const systemHealth = await checkSystemHealth();

    return NextResponse.json(systemHealth);
  } catch (error) {
    console.error("[Dashboard System Health API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch system health",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * 各APIとデータベースの接続状態をチェックする
 */
async function checkSystemHealth() {
  const healthChecks = [];

  // eBay API
  healthChecks.push({
    name: "eBay API",
    status: await checkEbayAPI(),
    lastSync: await getLastSyncTime("ebay"),
  });

  // Shopee API
  healthChecks.push({
    name: "Shopee API",
    status: await checkShopeeAPI(),
    lastSync: await getLastSyncTime("shopee"),
  });

  // Amazon API
  healthChecks.push({
    name: "Amazon API",
    status: await checkAmazonAPI(),
    lastSync: await getLastSyncTime("amazon"),
  });

  // Qoo10 API
  healthChecks.push({
    name: "Qoo10 API",
    status: await checkQoo10API(),
    lastSync: await getLastSyncTime("qoo10"),
  });

  // Supabase DB
  healthChecks.push({
    name: "Supabase DB",
    status: await checkSupabaseDB(),
    lastSync: "10秒前",
  });

  return healthChecks;
}

/**
 * eBay APIの接続状態をチェック
 */
async function checkEbayAPI(): Promise<"ok" | "error" | "warning"> {
  try {
    // 実際にはeBay APIにリクエストを送信してチェック
    // const response = await fetch('https://api.ebay.com/...');
    // if (!response.ok) return 'error';
    return "ok";
  } catch (error) {
    return "error";
  }
}

/**
 * Shopee APIの接続状態をチェック
 */
async function checkShopeeAPI(): Promise<"ok" | "error" | "warning"> {
  try {
    // 実装予定
    return "ok";
  } catch (error) {
    return "error";
  }
}

/**
 * Amazon APIの接続状態をチェック
 */
async function checkAmazonAPI(): Promise<"ok" | "error" | "warning"> {
  try {
    // 実装予定
    return "ok";
  } catch (error) {
    return "error";
  }
}

/**
 * Qoo10 APIの接続状態をチェック
 */
async function checkQoo10API(): Promise<"ok" | "error" | "warning"> {
  try {
    // 実装予定
    // 15分以上同期がない場合は警告
    return "warning";
  } catch (error) {
    return "error";
  }
}

/**
 * Supabase DBの接続状態をチェック
 */
async function checkSupabaseDB(): Promise<"ok" | "error" | "warning"> {
  try {
    // 実際にはSupabaseに簡単なクエリを送信してチェック
    // const { error } = await supabase.from('health_check').select('count');
    // if (error) return 'error';
    return "ok";
  } catch (error) {
    return "error";
  }
}

/**
 * 最終同期時刻を取得
 */
async function getLastSyncTime(service: string): Promise<string> {
  // 実際にはsync_logsテーブルから最終同期時刻を取得
  // const { data } = await supabase
  //   .from('sync_logs')
  //   .select('synced_at')
  //   .eq('service', service)
  //   .order('synced_at', { ascending: false })
  //   .limit(1);

  // モック実装
  const mockTimes: Record<string, string> = {
    ebay: "30秒前",
    shopee: "1分前",
    amazon: "2分前",
    qoo10: "15分前",
  };

  return mockTimes[service] || "不明";
}
