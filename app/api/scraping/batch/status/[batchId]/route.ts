// app/api/scraping/batch/status/[batchId]/route.ts
/**
 * バッチステータス取得API
 *
 * バッチの進捗状況と詳細情報を取得します
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    const batchId = params.batchId;

    // 1. バッチ情報を取得
    const { data: batch, error: batchError } = await supabase
      .from('scraping_batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (batchError || !batch) {
      return NextResponse.json(
        {
          success: false,
          error: 'バッチが見つかりません',
        },
        { status: 404 }
      );
    }

    // 2. キュー統計を取得
    const { data: queueStats, error: statsError } = await supabase
      .rpc('get_queue_stats_for_batch', { p_batch_id: batchId });

    // RPCが未定義の場合は、手動で集計
    let stats = queueStats;
    if (statsError && statsError.code === '42883') {
      const [pending, processing, completed, failed, permanentlyFailed] = await Promise.all([
        supabase.from('scraping_queue').select('id', { count: 'exact', head: true }).eq('batch_id', batchId).eq('status', 'pending'),
        supabase.from('scraping_queue').select('id', { count: 'exact', head: true }).eq('batch_id', batchId).eq('status', 'processing'),
        supabase.from('scraping_queue').select('id', { count: 'exact', head: true }).eq('batch_id', batchId).eq('status', 'completed'),
        supabase.from('scraping_queue').select('id', { count: 'exact', head: true }).eq('batch_id', batchId).eq('status', 'failed'),
        supabase.from('scraping_queue').select('id', { count: 'exact', head: true }).eq('batch_id', batchId).eq('status', 'permanently_failed'),
      ]);

      stats = {
        pending: pending.count || 0,
        processing: processing.count || 0,
        completed: completed.count || 0,
        failed: failed.count || 0,
        permanently_failed: permanentlyFailed.count || 0,
      };
    }

    // 3. 進捗率を計算
    const totalCount = batch.total_count;
    const processedCount = batch.processed_count;
    const progressPercent = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        batch_id: batch.id,
        batch_name: batch.batch_name,
        status: batch.status,
        total_count: totalCount,
        processed_count: processedCount,
        success_count: batch.success_count,
        failed_count: batch.failed_count,
        progress_percent: progressPercent,
        queue_stats: stats,
        created_at: batch.created_at,
        started_at: batch.started_at,
        completed_at: batch.completed_at,
        updated_at: batch.updated_at,
      },
    });
  } catch (error) {
    console.error('[BatchStatus] エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
