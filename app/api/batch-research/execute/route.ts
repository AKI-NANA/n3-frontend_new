/**
 * app/api/batch-research/execute/route.ts
 *
 * バッチ実行エンドポイント
 * VPSのCron Jobから定期的に呼び出され、Pendingタスクを実行
 *
 * 使用方法:
 * curl -X POST http://localhost:3000/api/batch-research/execute \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer YOUR_API_KEY" \
 *   -d '{"max_tasks": 10}'
 */

import { NextRequest, NextResponse } from "next/server";
import { executeBatchTasks } from "@/lib/research/batch-executor";

/**
 * 簡易的なAPI認証
 * 本番環境では適切な認証メカニズムを実装してください
 */
function authenticate(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const apiKey = process.env.BATCH_API_KEY || "default_api_key_change_this";

  if (!authHeader) {
    return false;
  }

  const token = authHeader.replace("Bearer ", "");
  return token === apiKey;
}

/**
 * POST /api/batch-research/execute
 * バッチタスクを実行
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    if (!authenticate(request)) {
      return NextResponse.json(
        {
          success: false,
          error: "認証に失敗しました",
        },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const maxTasks = body.max_tasks || 10;

    console.log(`\n${"=".repeat(80)}`);
    console.log(`🚀 バッチ実行API呼び出し`);
    console.log(`📊 最大実行タスク数: ${maxTasks}`);
    console.log(`🕐 実行時刻: ${new Date().toISOString()}`);
    console.log(`${"=".repeat(80)}\n`);

    // バッチタスクを実行
    const result = await executeBatchTasks(maxTasks);

    console.log(`\n${"=".repeat(80)}`);
    console.log(`✅ バッチ実行完了`);
    console.log(`📊 実行タスク数: ${result.executed}`);
    console.log(`✔️  成功: ${result.succeeded}`);
    console.log(`❌ 失敗: ${result.failed}`);
    console.log(`${"=".repeat(80)}\n`);

    return NextResponse.json({
      success: true,
      executed: result.executed,
      succeeded: result.succeeded,
      failed: result.failed,
      results: result.results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ バッチ実行エラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: "バッチ実行に失敗しました",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/batch-research/execute
 * 実行可能なタスク数を取得（Dry Run）
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    if (!authenticate(request)) {
      return NextResponse.json(
        {
          success: false,
          error: "認証に失敗しました",
        },
        { status: 401 }
      );
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Pendingタスクの数を取得
    const { count: pendingCount, error: pendingError } = await supabase
      .from("research_condition_stock")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString());

    if (pendingError) {
      throw pendingError;
    }

    // Processingタスクの数を取得
    const { count: processingCount, error: processingError } = await supabase
      .from("research_condition_stock")
      .select("*", { count: "exact", head: true })
      .eq("status", "processing");

    if (processingError) {
      throw processingError;
    }

    // アクティブなジョブの数を取得
    const { count: activeJobsCount, error: jobsError } = await supabase
      .from("research_batch_jobs")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "running"]);

    if (jobsError) {
      throw jobsError;
    }

    return NextResponse.json({
      success: true,
      pending_tasks: pendingCount || 0,
      processing_tasks: processingCount || 0,
      active_jobs: activeJobsCount || 0,
      can_execute: (pendingCount || 0) > 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ タスク状況取得エラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: "タスク状況の取得に失敗しました",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
