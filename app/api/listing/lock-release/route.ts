/**
 * ロック解除API
 *
 * POST /api/listing/lock-release
 *
 * execution_status='listing_failed' の商品を評価し、
 * 条件を満たした場合に自動的に strategy_determined に戻す
 * Cronジョブから定期的に呼び出される（例: 1時間ごと）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { LockReleaseService } from '@/services/LockReleaseService';

/**
 * POST /api/listing/lock-release
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      cooldownHours = 24,
      requireStockIncrease = false,
      requirePriceChange = false,
    } = body;

    const supabase = createClient();

    console.log('[LockReleaseAPI] Starting lock release batch', {
      cooldownHours,
      requireStockIncrease,
      requirePriceChange,
    });

    // ロック解除サービスを初期化
    const lockReleaseService = new LockReleaseService(supabase, {
      cooldownHours,
      requireStockIncrease,
      requirePriceChange,
    });

    // 実行
    const result = await lockReleaseService.execute();

    console.log('[LockReleaseAPI] Batch complete', result);

    return NextResponse.json({
      success: true,
      ...result,
      message: `ロック解除完了: ${result.releasedCount}件解除, ${result.skippedCount}件スキップ`,
    });
  } catch (error) {
    console.error('[LockReleaseAPI] Unexpected error:', error);
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
 * GET /api/listing/lock-release
 * ロック状態の商品一覧を確認
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // listing_failed 状態の商品を取得
    const { data: failedListings, error } = await supabase
      .from('products_master')
      .select('sku, title, stock_quantity, price_jpy, updated_at, execution_status')
      .eq('execution_status', 'listing_failed')
      .order('updated_at', { ascending: true })
      .limit(100);

    if (error) {
      throw error;
    }

    // 各商品の最後のエラー情報を取得
    const listingsWithErrors = await Promise.all(
      (failedListings || []).map(async (listing: any) => {
        const { data: lastError } = await supabase
          .from('execution_logs')
          .select('error_code, error_message, executed_at, platform')
          .eq('sku', listing.sku)
          .eq('success', false)
          .order('executed_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...listing,
          lastError,
        };
      })
    );

    const stats = {
      total: listingsWithErrors.length,
      oldestFailure:
        listingsWithErrors.length > 0
          ? listingsWithErrors[0].updated_at
          : null,
      newestFailure:
        listingsWithErrors.length > 0
          ? listingsWithErrors[listingsWithErrors.length - 1].updated_at
          : null,
    };

    return NextResponse.json({
      stats,
      failedListings: listingsWithErrors,
    });
  } catch (error) {
    console.error('[LockReleaseAPI] Error getting failed listings:', error);
    return NextResponse.json(
      {
        error: 'Failed to get failed listings',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
