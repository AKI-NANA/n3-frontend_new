/**
 * 出品実行API
 *
 * POST /api/listing/execute
 *
 * 戦略決定済みの商品を各モールのAPIを介して出品する
 * スケジュールツール（Cron）から定期的に呼び出される
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ListingExecutor } from '@/services/ListingExecutor';
import type {
  BatchExecuteRequest,
  BatchExecuteResponse,
  ExecutionStatus,
} from '@/types/listing';

/**
 * POST /api/listing/execute
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body: BatchExecuteRequest = await request.json();

    const {
      filter = {},
      dryRun = false,
    } = body;

    console.log('[ExecuteAPI] Starting batch execution', {
      filter,
      dryRun,
    });

    // 実行サービスを初期化
    const executor = new ListingExecutor(supabase);

    // フィルター条件を適用
    const status: ExecutionStatus = filter.status || 'strategy_determined';
    const minStock = filter.minStock || 1;

    // ドライランモード
    if (dryRun) {
      const candidates = await executor.selectCandidates(status, minStock);

      console.log(`[ExecuteAPI] Dry run: ${candidates.length} candidates found`);

      return NextResponse.json({
        totalProcessed: candidates.length,
        successCount: 0,
        failureCount: 0,
        results: candidates.map((c) => ({
          sku: c.sku,
          platform: c.platform,
          accountId: c.accountId,
          success: true,
          timestamp: new Date(),
        })),
        errors: [],
        message: `Dry run: ${candidates.length} candidates would be processed`,
      } as BatchExecuteResponse);
    }

    // 実際の実行
    const results = await executor.execute(status, minStock);

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    const errors = results
      .filter((r) => !r.success)
      .map((r) => ({
        sku: r.sku,
        error: r.errorMessage || 'Unknown error',
      }));

    console.log('[ExecuteAPI] Batch execution complete', {
      totalProcessed: results.length,
      successCount,
      failureCount,
    });

    // レスポンス構築
    const response: BatchExecuteResponse = {
      totalProcessed: results.length,
      successCount,
      failureCount,
      results,
      errors,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[ExecuteAPI] Unexpected error:', error);
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
 * GET /api/listing/execute
 * 実行状況を確認
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // 現在の実行キューを確認
    const { data: queue, error: queueError } = await supabase
      .from('execution_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (queueError) {
      throw queueError;
    }

    // 最近の実行ログを確認
    const { data: logs, error: logsError } = await supabase
      .from('execution_logs')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(50);

    if (logsError) {
      throw logsError;
    }

    // 統計情報を計算
    const stats = {
      queueLength: queue?.length || 0,
      pendingRetries: queue?.filter((q: any) => q.status === 'retry_pending')
        .length || 0,
      recentSuccesses: logs?.filter((l: any) => l.success).length || 0,
      recentFailures: logs?.filter((l: any) => !l.success).length || 0,
    };

    return NextResponse.json({
      stats,
      queue: queue || [],
      recentLogs: logs || [],
    });
  } catch (error) {
    console.error('[ExecuteAPI] Error getting execution status:', error);
    return NextResponse.json(
      {
        error: 'Failed to get execution status',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
