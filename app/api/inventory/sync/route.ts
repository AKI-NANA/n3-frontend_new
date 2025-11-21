/**
 * 在庫同期API
 *
 * POST /api/inventory/sync
 *
 * inventory_sync_queue を定期的に処理し、他のモールの在庫を自動調整する
 * Cronジョブから定期的に呼び出される
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { InventorySyncService } from '@/services/InventorySyncService';

/**
 * POST /api/inventory/sync
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    console.log('[InventorySyncAPI] Starting inventory sync batch');

    // 在庫同期サービスを初期化
    const syncService = new InventorySyncService(supabase);

    // 実行
    const result = await syncService.execute();

    console.log('[InventorySyncAPI] Batch complete', result);

    return NextResponse.json({
      success: true,
      ...result,
      message: `在庫同期完了: ${result.successCount}件成功, ${result.failureCount}件失敗`,
    });
  } catch (error) {
    console.error('[InventorySyncAPI] Unexpected error:', error);
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
 * GET /api/inventory/sync
 * 在庫同期キューの状況を確認
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // キューの統計情報を取得
    const { data: queue, error } = await supabase
      .from('inventory_sync_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    const stats = {
      total: queue?.length || 0,
      pending: queue?.filter((q: any) => q.status === 'pending').length || 0,
      processing: queue?.filter((q: any) => q.status === 'processing').length || 0,
      completed: queue?.filter((q: any) => q.status === 'completed').length || 0,
      failed: queue?.filter((q: any) => q.status === 'failed').length || 0,
    };

    return NextResponse.json({
      stats,
      queue: queue || [],
    });
  } catch (error) {
    console.error('[InventorySyncAPI] Error getting sync queue:', error);
    return NextResponse.json(
      {
        error: 'Failed to get sync queue',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
