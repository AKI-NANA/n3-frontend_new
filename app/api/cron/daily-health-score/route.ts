/**
 * Cron API: SEOヘルススコア更新
 * スケジュール: 毎日02:00 JST
 */

import { NextRequest, NextResponse } from 'next/server';
import { runDailyHealthScoreUpdate } from '@/services/cron/scheduler';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5分

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron API] SEOヘルススコア更新開始');

    const result = await runDailyHealthScoreUpdate();

    return NextResponse.json({
      success: result.success,
      message: `SEOヘルススコア更新完了: ${result.updated}件更新, ${result.errors}件エラー`,
      data: result,
    });
  } catch (error: any) {
    console.error('[Cron API] SEOヘルススコア更新エラー:', error);
    return NextResponse.json(
      { error: '内部サーバーエラー', details: error.message },
      { status: 500 }
    );
  }
}
