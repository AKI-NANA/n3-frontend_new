/**
 * Cron API: メッセージポーリング・AI緊急度検知
 * スケジュール: 5分毎
 */

import { NextRequest, NextResponse } from 'next/server';
import { runMessagePollingAndUrgency } from '@/services/cron/scheduler';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5分

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron API] メッセージポーリング開始');

    const result = await runMessagePollingAndUrgency();

    return NextResponse.json({
      success: result.success,
      message: `メッセージポーリング完了: ${result.polled}件処理, ${result.urgent}件緊急, ${result.errors}件エラー`,
      data: result,
    });
  } catch (error: any) {
    console.error('[Cron API] メッセージポーリングエラー:', error);
    return NextResponse.json(
      { error: '内部サーバーエラー', details: error.message },
      { status: 500 }
    );
  }
}
