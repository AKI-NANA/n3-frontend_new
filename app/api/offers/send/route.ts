// app/api/offers/send/route.ts
/**
 * オファー送信API
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendOfferToBuyer } from '@/lib/services/offers/AutoOfferService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product_id, ebay_listing_id, buyer_username, offer_price_usd, message } = body;

    // バリデーション
    if (!product_id || !ebay_listing_id || !buyer_username || !offer_price_usd) {
      return NextResponse.json(
        {
          success: false,
          error: 'product_id, ebay_listing_id, buyer_username, offer_price_usd は必須です',
        },
        { status: 400 }
      );
    }

    console.log(`[API] オファー送信: 商品ID ${product_id}, バイヤー ${buyer_username}`);

    const result = await sendOfferToBuyer({
      product_id,
      ebay_listing_id,
      buyer_username,
      offer_price_usd,
      message,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'オファー送信に失敗しました',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'オファーを送信しました',
    });
  } catch (error) {
    console.error('[API] オファー送信エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
