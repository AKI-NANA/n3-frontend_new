/**
 * Cron API: 自動再注文チェック
 * スケジュール: 毎日02:00 JST
 */

import { NextRequest, NextResponse } from 'next/server';
import { runDailyAutoReorder } from '@/services/cron/scheduler';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5分

export async function GET(request: NextRequest) {
  try {
    // Vercel Cronからのリクエストか検証
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron API] 自動再注文チェック開始');

    const result = await runDailyAutoReorder();

    return NextResponse.json({
      success: result.success,
      message: `自動再注文チェック完了: ${result.processed}件処理, ${result.errors}件エラー`,
      data: result,
    });
  } catch (error: any) {
    console.error('[Cron API] 自動再注文チェックエラー:', error);
    return NextResponse.json(
      { error: '内部サーバーエラー', details: error.message },
      { status: 500 }
    );
  }
}
