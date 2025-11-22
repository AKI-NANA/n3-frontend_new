// app/api/finance/forecast/route.ts
// Phase 4: 資金繰り予測APIエンドポイント (T-60)

import { NextResponse } from 'next/server';
import { runCashflowForecast, getLatestForecasts } from '@/services/finance/cashflowPredictor';
import type { ForecastParams } from '@/types/finance';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      months = 3,
      period_type = 'Monthly',
      beginning_balance = 5000000,
      include_sourcing = true,
      custom_overheads,
    } = body as Partial<ForecastParams>;

    console.log('[Forecast API] Received forecast request:', body);

    const params: ForecastParams = {
      months,
      period_type,
      beginning_balance,
      include_sourcing,
      custom_overheads,
    };

    // 予測実行
    const result = await runCashflowForecast(params);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Forecast API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate cashflow forecast',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '12', 10);

    console.log('[Forecast API] Fetching latest forecasts:', { months });

    const forecasts = await getLatestForecasts(months);

    return NextResponse.json({
      success: true,
      forecasts,
      count: forecasts.length,
    });
  } catch (error) {
    console.error('[Forecast API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch forecasts',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
