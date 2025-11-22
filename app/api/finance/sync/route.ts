// app/api/finance/sync/route.ts
// Phase 4: マネークラウド同期APIエンドポイント (T-58)

import { NextResponse } from 'next/server';
import { syncActualsFromMoneyCloud } from '@/services/finance/moneyCloudConnector';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'API Key is required',
        },
        { status: 400 }
      );
    }

    console.log('[Sync API] Starting Money Cloud sync...');

    const result = await syncActualsFromMoneyCloud(apiKey);

    return NextResponse.json({
      success: result.status === 'Success',
      ...result,
    });
  } catch (error) {
    console.error('[Sync API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        status: 'Error',
        count: 0,
        message: error instanceof Error ? error.message : '不明なエラー',
        synced_at: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
