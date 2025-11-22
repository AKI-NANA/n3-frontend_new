// app/api/offers/calculate/route.ts
/**
 * オファー価格計算API
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateOptimalOffer } from '@/lib/services/offers/AutoOfferService';

export async function POST(request: NextRequest) {
  try {
    const { product_id, requested_offer_price_usd } = await request.json();

    if (!product_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'product_id は必須です',
        },
        { status: 400 }
      );
    }

    console.log(`[API] オファー計算: 商品ID ${product_id}`);

    const result = await calculateOptimalOffer(product_id, requested_offer_price_usd);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.rejection_reason || 'オファー計算に失敗しました',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[API] オファー計算エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
