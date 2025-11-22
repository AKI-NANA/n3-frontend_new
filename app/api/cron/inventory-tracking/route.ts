/**
 * Cron API: 在庫追跡システム
 * スケジュール: 30分毎 または 毎日
 */

import { NextRequest, NextResponse } from 'next/server';
import { runInventoryTracking } from '@/services/cron/scheduler';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5分

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = (searchParams.get('mode') as 'frequent' | 'daily') || 'frequent';

    console.log(`[Cron API] 在庫追跡システム開始 (${mode})`);

    const result = await runInventoryTracking(mode);

    return NextResponse.json({
      success: result.success,
      message: `在庫追跡完了: ${result.synced}件同期, ${result.errors}件エラー`,
      data: result,
    });
  } catch (error: any) {
    console.error('[Cron API] 在庫追跡システムエラー:', error);
    return NextResponse.json(
      { error: '内部サーバーエラー', details: error.message },
      { status: 500 }
    );
  }
}
