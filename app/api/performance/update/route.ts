/**
 * パフォーマンス更新API
 *
 * POST /api/performance/update
 *
 * 販売実績データの収集とパフォーマンススコアの自動計算を実行
 * Cronジョブから定期的に呼び出される（例: 毎日深夜）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { PerformanceUpdateService } from '@/services/PerformanceUpdateService';

/**
 * POST /api/performance/update
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    console.log('[PerformanceUpdateAPI] Starting performance update batch');

    // パフォーマンス更新サービスを初期化
    const service = new PerformanceUpdateService(supabase);

    // 実行
    const result = await service.execute();

    console.log('[PerformanceUpdateAPI] Batch complete', result);

    return NextResponse.json({
      success: true,
      ...result,
      message: `パフォーマンス更新完了: 販売データ${result.salesDataCollected.inserted}件追加, スコア${result.scoresUpdated.updated}件更新`,
    });
  } catch (error) {
    console.error('[PerformanceUpdateAPI] Unexpected error:', error);
    return NextResponse.json(
      {
        error: '予期しないエラーが発生しました',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
