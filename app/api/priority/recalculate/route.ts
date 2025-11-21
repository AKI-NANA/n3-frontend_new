/**
 * B-2: AI処理優先度決定ロジック API
 * POST /api/priority/recalculate
 *
 * status: '取得完了' の商品に対して優先度スコアを再計算する
 */

import { NextRequest, NextResponse } from 'next/server';
import { PriorityScoreService } from '@/services/PriorityScoreService';

export async function POST(request: NextRequest) {
  try {
    const result = await PriorityScoreService.recalculateAllScores();

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Priority Recalculation API Error:', error);
    return NextResponse.json(
      {
        success: false,
        processed: 0,
        message: error instanceof Error ? error.message : '処理中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}

/**
 * 単一商品のスコア再計算
 * GET /api/priority/recalculate?product_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          error: 'product_id パラメータが必要です',
        },
        { status: 400 }
      );
    }

    const result = await PriorityScoreService.updateProductScore(productId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Priority Recalculation API Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '処理中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
