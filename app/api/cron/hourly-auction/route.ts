/**
 * Cron API: オークションサイクル管理
 * スケジュール: 毎時
 */

import { NextRequest, NextResponse } from 'next/server';
import { runHourlyAuctionCycle } from '@/services/cron/scheduler';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5分

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron API] オークションサイクル管理開始');

    const result = await runHourlyAuctionCycle();

    return NextResponse.json({
      success: result.success,
      message: `オークションサイクル管理完了: ${result.processed}件処理, ${result.errors}件エラー`,
      data: result,
    });
  } catch (error: any) {
    console.error('[Cron API] オークションサイクル管理エラー:', error);
    return NextResponse.json(
      { error: '内部サーバーエラー', details: error.message },
      { status: 500 }
    );
  }
}
