/**
 * app/api/batch-research/jobs/[jobId]/route.ts
 *
 * 特定のバッチジョブの詳細取得・管理API
 * - GET: ジョブの詳細と進捗状況を取得
 * - DELETE: ジョブを削除（Pendingタスクのみ）
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type {
  ResearchBatchJob,
  BatchJobProgress,
} from "@/src/db/batch_research_schema";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/batch-research/jobs/[jobId]
 * ジョブの詳細と進捗を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    console.log(`📊 ジョブ詳細取得: ${jobId}`);

    // ジョブ情報を取得
    const { data: job, error: jobError } = await supabase
      .from("research_batch_jobs")
      .select("*")
      .eq("job_id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        {
          success: false,
          error: "ジョブが見つかりません",
        },
        { status: 404 }
      );
    }

    // タスク一覧を取得
    const { data: tasks, error: tasksError } = await supabase
      .from("research_condition_stock")
      .select("*")
      .eq("job_id", jobId)
      .order("date_start", { ascending: true });

    if (tasksError) {
      console.error("❌ タスク取得エラー:", tasksError);
      throw tasksError;
    }

    // 結果サマリーを取得
    const { data: resultsCount, error: resultsError } = await supabase
      .from("research_batch_results")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId);

    const totalItemsSaved = resultsError ? 0 : (resultsCount as any);

    // 進捗情報を構築
    const progress: BatchJobProgress = {
      job_id: job.job_id,
      job_name: job.job_name,
      status: job.status,
      progress_percentage: job.progress_percentage,
      total_tasks: job.total_tasks,
      tasks_completed: job.tasks_completed,
      tasks_pending: job.tasks_pending,
      tasks_processing: job.tasks_processing,
      tasks_failed: job.tasks_failed,
      total_items_saved: totalItemsSaved || job.total_items_saved,
      started_at: job.started_at,
      estimated_completion_at: job.estimated_completion_at,
    };

    return NextResponse.json({
      success: true,
      job,
      progress,
      tasks: tasks || [],
      stats: {
        total_tasks: job.total_tasks,
        pending: job.tasks_pending,
        processing: job.tasks_processing,
        completed: job.tasks_completed,
        failed: job.tasks_failed,
        total_items_saved: totalItemsSaved || job.total_items_saved,
      },
    });
  } catch (error: any) {
    console.error("❌ ジョブ詳細取得エラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: "ジョブ詳細の取得に失敗しました",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/batch-research/jobs/[jobId]
 * ジョブを削除（Pendingタスクのみ）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    console.log(`🗑️ ジョブ削除リクエスト: ${jobId}`);

    // ジョブ情報を取得
    const { data: job, error: jobError } = await supabase
      .from("research_batch_jobs")
      .select("*")
      .eq("job_id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        {
          success: false,
          error: "ジョブが見つかりません",
        },
        { status: 404 }
      );
    }

    // Runningステータスのジョブは削除不可
    if (job.status === "running") {
      return NextResponse.json(
        {
          success: false,
          error: "実行中のジョブは削除できません。先に停止してください。",
        },
        { status: 400 }
      );
    }

    // タスクを削除
    const { error: tasksDeleteError } = await supabase
      .from("research_condition_stock")
      .delete()
      .eq("job_id", jobId);

    if (tasksDeleteError) {
      console.error("❌ タスク削除エラー:", tasksDeleteError);
      throw tasksDeleteError;
    }

    // ジョブを削除
    const { error: jobDeleteError } = await supabase
      .from("research_batch_jobs")
      .delete()
      .eq("job_id", jobId);

    if (jobDeleteError) {
      console.error("❌ ジョブ削除エラー:", jobDeleteError);
      throw jobDeleteError;
    }

    console.log(`✅ ジョブ削除完了: ${jobId}`);

    return NextResponse.json({
      success: true,
      message: "ジョブを削除しました",
      job_id: jobId,
    });
  } catch (error: any) {
    console.error("❌ ジョブ削除エラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: "ジョブの削除に失敗しました",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/batch-research/jobs/[jobId]
 * ジョブのステータスを更新（pause/resume）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const body = await request.json();
    const { action } = body; // 'pause' or 'resume'

    console.log(`🔄 ジョブ更新リクエスト: ${jobId} - ${action}`);

    if (!["pause", "resume"].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: "無効なアクションです。'pause' または 'resume' を指定してください。",
        },
        { status: 400 }
      );
    }

    // ジョブ情報を取得
    const { data: job, error: jobError } = await supabase
      .from("research_batch_jobs")
      .select("*")
      .eq("job_id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        {
          success: false,
          error: "ジョブが見つかりません",
        },
        { status: 404 }
      );
    }

    if (action === "pause") {
      // ジョブを一時停止
      await supabase
        .from("research_batch_jobs")
        .update({ status: "paused" })
        .eq("job_id", jobId);

      // Pendingタスクを全てPausedに変更
      await supabase
        .from("research_condition_stock")
        .update({ status: "paused" })
        .eq("job_id", jobId)
        .eq("status", "pending");

      return NextResponse.json({
        success: true,
        message: "ジョブを一時停止しました",
        job_id: jobId,
      });
    } else if (action === "resume") {
      // ジョブを再開
      await supabase
        .from("research_batch_jobs")
        .update({ status: "pending" })
        .eq("job_id", jobId);

      // Pausedタスクを全てPendingに変更
      await supabase
        .from("research_condition_stock")
        .update({ status: "pending" })
        .eq("job_id", jobId)
        .eq("status", "paused");

      return NextResponse.json({
        success: true,
        message: "ジョブを再開しました",
        job_id: jobId,
      });
    }
  } catch (error: any) {
    console.error("❌ ジョブ更新エラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: "ジョブの更新に失敗しました",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
