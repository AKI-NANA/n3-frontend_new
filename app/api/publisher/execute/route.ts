/**
 * Publisher Hub API
 *
 * POST /api/publisher/execute
 *
 * Phase 1-3: 多モール出品実行API
 * 戦略決定済みのSKUを取得し、データ変換して出品実行
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { PublisherHub } from '@/services/PublisherHub';

/**
 * POST /api/publisher/execute
 *
 * 戦略決定済みまたは承認済みのSKUを出品実行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { skus, status = 'strategy_determined' } = body;

    const supabase = createClient();
    const publisherHub = new PublisherHub(supabase);

    console.log('[PublisherAPI] Starting publish execution');

    let results;

    if (skus && Array.isArray(skus) && skus.length > 0) {
      // 個別SKUの出品
      console.log(`[PublisherAPI] Publishing ${skus.length} specific SKUs`);
      results = await Promise.all(
        skus.map((sku: string) => publisherHub.publishSku(sku))
      );
    } else {
      // バッチ出品（ステータスベース）
      console.log(`[PublisherAPI] Batch publish for status: ${status}`);
      results = await publisherHub.publishBatch(status);
    }

    // 統計情報
    const stats = {
      total: results.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      warnings: results.filter((r) => r.warnings.length > 0).length,
    };

    console.log('[PublisherAPI] Publish execution complete', stats);

    return NextResponse.json({
      success: true,
      results,
      stats,
      message: `${stats.success}件の商品を出品実行しました`,
    });
  } catch (error) {
    console.error('[PublisherAPI] Unexpected error:', error);
    return NextResponse.json(
      {
        error: '出品実行でエラーが発生しました',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/publisher/execute
 *
 * 出品可能なSKUの統計情報を取得
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // execution_status 別の商品数を取得
    const { data: products } = await supabase
      .from('products_master')
      .select('execution_status, sku');

    const stats: Record<string, number> = {};
    products?.forEach((p: any) => {
      stats[p.execution_status] = (stats[p.execution_status] || 0) + 1;
    });

    return NextResponse.json({
      stats,
      ready_to_publish: {
        strategy_determined: stats['strategy_determined'] || 0,
        approved: stats['approved'] || 0,
      },
    });
  } catch (error) {
    console.error('[PublisherAPI] Error getting stats:', error);
    return NextResponse.json(
      {
        error: 'Failed to get publisher stats',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
