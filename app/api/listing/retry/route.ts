/**
 * リトライキューAPI
 *
 * POST /api/listing/retry
 *
 * execution_queue の retry_pending アイテムを処理し、
 * next_retry_at が現在時刻を過ぎたものを自動的に再実行する
 * Cronジョブから定期的に呼び出される（例: 10分ごと）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { RetryQueueService } from '@/services/RetryQueueService';

/**
 * POST /api/listing/retry
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    console.log('[RetryQueueAPI] Starting retry queue batch');

    // リトライキューサービスを初期化
    const retryService = new RetryQueueService(supabase, 5); // 最大5回までリトライ

    // 実行
    const result = await retryService.execute();

    console.log('[RetryQueueAPI] Batch complete', result);

    return NextResponse.json({
      success: true,
      ...result,
      message: `リトライキュー処理完了: ${result.successCount}件成功, ${result.failureCount}件失敗`,
    });
  } catch (error) {
    console.error('[RetryQueueAPI] Unexpected error:', error);
    return NextResponse.json(
      {
        error: '予期しないエラーが発生しました',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/listing/retry
 * リトライキューの状況を確認
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // キューの統計情報を取得
    const { data: queue, error } = await supabase
      .from('execution_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    const stats = {
      total: queue?.length || 0,
      retryPending:
        queue?.filter((q: any) => q.status === 'retry_pending').length || 0,
      processing: queue?.filter((q: any) => q.status === 'processing').length || 0,
      completed: queue?.filter((q: any) => q.status === 'completed').length || 0,
      failed: queue?.filter((q: any) => q.status === 'failed').length || 0,
    };

    // 次のリトライ予定を取得
    const now = new Date().toISOString();
    const { data: nextRetry } = await supabase
      .from('execution_queue')
      .select('*')
      .eq('status', 'retry_pending')
      .lte('next_retry_at', now)
      .order('next_retry_at', { ascending: true })
      .limit(1)
      .single();

    return NextResponse.json({
      stats,
      queue: queue || [],
      nextRetryReady: !!nextRetry,
      nextRetryItem: nextRetry || null,
    });
  } catch (error) {
    console.error('[RetryQueueAPI] Error getting retry queue:', error);
    return NextResponse.json(
      {
        error: 'Failed to get retry queue',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
