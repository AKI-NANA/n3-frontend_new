// app/api/listing/rotation/identify/route.ts
/**
 * 低スコア商品識別API
 */

import { NextRequest, NextResponse } from 'next/server';
import { identifyLowScoreItems } from '@/lib/services/listing/ListingRotationService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    console.log('[API] 低スコア商品の識別を開始...');

    const result = await identifyLowScoreItems(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || '低スコア商品の識別に失敗しました',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        items: result.items,
        summary: result.summary,
      },
      message: `${result.items?.length || 0}件の低スコア商品を識別しました`,
    });
  } catch (error) {
    console.error('[API] 低スコア商品識別エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // GETリクエストでもデフォルト基準で識別
  return POST(request);
}
