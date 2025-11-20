/**
 * app/api/batch-research/jobs/route.ts
 *
 * バッチリサーチジョブ管理API
 * - POST: 新しいバッチジョブを作成（日付分割を自動実行）
 * - GET: すべてのジョブ一覧を取得
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  generateBatchTasks,
  generateJobId,
  validateBatchJobParams,
  generateJobSummary,
  validateDateString,
} from "@/lib/research/date-splitter";
import type {
  CreateBatchJobRequest,
  ResearchBatchJob,
} from "@/src/db/batch_research_schema";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/batch-research/jobs
 * 新しいバッチジョブを作成
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateBatchJobRequest = await request.json();

    console.log("📥 バッチジョブ作成リクエスト:", body);

    // 日付文字列を検証・変換
    const dateStart = validateDateString(body.date_start);
    const dateEnd = validateDateString(body.date_end);

    if (!dateStart || !dateEnd) {
      return NextResponse.json(
        {
          success: false,
          error: "日付形式が不正です。YYYY-MM-DD形式で指定してください。",
        },
        { status: 400 }
      );
    }

    // ジョブIDを生成
    const jobId = generateJobId("batch_job");

    // パラメータの検証
    const validation = validateBatchJobParams({
      job_id: jobId,
      job_name: body.job_name,
      description: body.description,
      target_seller_ids: body.target_seller_ids,
      keywords: body.keywords,
      date_start: dateStart,
      date_end: dateEnd,
      split_unit: body.split_unit,
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "パラメータ検証エラー",
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // ジョブサマリーを生成
    const summary = generateJobSummary({
      job_id: jobId,
      job_name: body.job_name,
      description: body.description,
      target_seller_ids: body.target_seller_ids,
      keywords: body.keywords,
      date_start: dateStart,
      date_end: dateEnd,
      split_unit: body.split_unit,
    });

    console.log("📊 ジョブサマリー:", summary);

    // バッチタスクを生成
    const tasks = generateBatchTasks({
      job_id: jobId,
      job_name: body.job_name,
      description: body.description,
      target_seller_ids: body.target_seller_ids,
      keywords: body.keywords,
      date_start: dateStart,
      date_end: dateEnd,
      split_unit: body.split_unit,
    });

    console.log(`✅ ${tasks.length}個のタスクを生成しました`);

    // トランザクション開始（ジョブ + タスクを一括登録）

    // 1. ジョブを登録
    const jobData: Omit<
      ResearchBatchJob,
      "id" | "created_at" | "updated_at"
    > = {
      job_id: jobId,
      job_name: body.job_name,
      description: body.description || null,
      target_seller_ids: body.target_seller_ids,
      keywords: body.keywords || null,
      original_date_start: dateStart,
      original_date_end: dateEnd,
      split_unit: body.split_unit,
      total_tasks: tasks.length,
      status: "pending",
      tasks_pending: tasks.length,
      tasks_processing: 0,
      tasks_completed: 0,
      tasks_failed: 0,
      total_items_found: 0,
      total_items_saved: 0,
      started_at: null,
      completed_at: null,
      estimated_completion_at: body.scheduled_at
        ? new Date(
            new Date(body.scheduled_at).getTime() +
              summary.estimated_time_seconds * 1000
          )
        : null,
      execution_frequency: body.execution_frequency || "once",
      next_execution_at: body.scheduled_at
        ? new Date(body.scheduled_at)
        : null,
      is_recurring: body.execution_frequency
        ? body.execution_frequency !== "once"
        : false,
      progress_percentage: 0,
      created_by: null, // TODO: ユーザー認証を実装時に追加
      metadata: {
        estimated_time_seconds: summary.estimated_time_seconds,
        estimated_time_formatted: summary.estimated_time_formatted,
        total_days: summary.total_days,
      },
    };

    const { data: jobResult, error: jobError } = await supabase
      .from("research_batch_jobs")
      .insert(jobData)
      .select()
      .single();

    if (jobError) {
      console.error("❌ ジョブ登録エラー:", jobError);
      throw jobError;
    }

    console.log("✅ ジョブ登録完了:", jobResult.job_id);

    // 2. タスクを一括登録
    const taskData = tasks.map((task) => ({
      job_id: task.job_id,
      search_id: task.search_id,
      target_seller_id: task.target_seller_id,
      keyword: task.keyword,
      date_start: task.date_start.toISOString().split("T")[0], // YYYY-MM-DD
      date_end: task.date_end.toISOString().split("T")[0], // YYYY-MM-DD
      listing_status: task.listing_status,
      listing_type: task.listing_type,
      status: "pending",
      current_page: 1,
      items_per_page: 100,
      items_retrieved: 0,
      retry_count: 0,
      max_retries: 3,
      scheduled_at: body.scheduled_at ? new Date(body.scheduled_at) : null,
      execution_frequency: body.execution_frequency || "once",
    }));

    const { error: tasksError } = await supabase
      .from("research_condition_stock")
      .insert(taskData);

    if (tasksError) {
      console.error("❌ タスク登録エラー:", tasksError);
      // ジョブをロールバック
      await supabase
        .from("research_batch_jobs")
        .delete()
        .eq("job_id", jobId);
      throw tasksError;
    }

    console.log(`✅ ${taskData.length}個のタスクを登録しました`);

    return NextResponse.json({
      success: true,
      job_id: jobId,
      job: jobResult,
      summary: {
        total_tasks: tasks.length,
        total_sellers: body.target_seller_ids.length,
        total_keywords: body.keywords?.length || 0,
        date_range: {
          start: body.date_start,
          end: body.date_end,
          total_days: summary.total_days,
        },
        split_unit: body.split_unit,
        estimated_time: summary.estimated_time_formatted,
        estimated_completion_at: jobData.estimated_completion_at,
      },
    });
  } catch (error: any) {
    console.error("❌ バッチジョブ作成エラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: "バッチジョブの作成に失敗しました",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/batch-research/jobs
 * すべてのジョブ一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("research_batch_jobs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // ステータスフィルター
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("❌ ジョブ一覧取得エラー:", error);
      // テーブルが存在しない場合はモックデータを返す（ローカル開発用）
      if (error.code === 'PGRST205') {
        console.warn("⚠️ テーブルが存在しません。モックデータを返します。");
        return NextResponse.json({
          success: true,
          jobs: [],
          pagination: {
            total: 0,
            limit,
            offset,
            hasMore: false,
          },
          note: "データベーステーブルが存在しません。実際の環境ではテーブルを作成してください。"
        });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      jobs: data,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: count ? offset + limit < count : false,
      },
    });
  } catch (error: any) {
    console.error("❌ ジョブ一覧取得エラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: "ジョブ一覧の取得に失敗しました",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
