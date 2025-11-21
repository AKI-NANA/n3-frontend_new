/**
 * 実行ログAPI
 *
 * GET /api/listing/logs?sku=XXX&success=true&platform=ebay&limit=100
 *
 * execution_logs テーブルからログを取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/listing/logs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sku = searchParams.get('sku');
    const success = searchParams.get('success');
    const platform = searchParams.get('platform');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const supabase = createClient();

    // クエリビルダーを構築
    let query = supabase
      .from('execution_logs')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(limit);

    // フィルター適用
    if (sku) {
      query = query.eq('sku', sku);
    }

    if (success !== null && success !== undefined) {
      query = query.eq('success', success === 'true');
    }

    if (platform && platform !== 'all') {
      query = query.eq('platform', platform);
    }

    const { data: logs, error } = await query;

    if (error) {
      throw error;
    }

    // 統計情報を計算
    const stats = {
      total: logs?.length || 0,
      success: logs?.filter((log: any) => log.success).length || 0,
      failure: logs?.filter((log: any) => !log.success).length || 0,
      temporaryErrors:
        logs?.filter(
          (log: any) => !log.success && log.error_type === 'temporary'
        ).length || 0,
      fatalErrors:
        logs?.filter((log: any) => !log.success && log.error_type === 'fatal')
          .length || 0,
    };

    // SKU別の集計（SKU指定がない場合）
    let skuSummary = null;
    if (!sku && logs && logs.length > 0) {
      const skuMap = new Map<
        string,
        { total: number; success: number; failure: number }
      >();

      logs.forEach((log: any) => {
        if (!skuMap.has(log.sku)) {
          skuMap.set(log.sku, { total: 0, success: 0, failure: 0 });
        }
        const summary = skuMap.get(log.sku)!;
        summary.total++;
        if (log.success) {
          summary.success++;
        } else {
          summary.failure++;
        }
      });

      skuSummary = Array.from(skuMap.entries())
        .map(([sku, summary]) => ({ sku, ...summary }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 20); // 上位20件
    }

    return NextResponse.json({
      logs: logs || [],
      stats,
      skuSummary,
    });
  } catch (error) {
    console.error('[ListingLogsAPI] Error getting logs:', error);
    return NextResponse.json(
      {
        error: 'Failed to get execution logs',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
