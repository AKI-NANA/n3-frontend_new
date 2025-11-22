// app/api/listing/rotation/end/route.ts
/**
 * 出品終了API
 */

import { NextRequest, NextResponse } from 'next/server';
import { endListing } from '@/lib/services/listing/ListingRotationService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product_id, ebay_listing_id, reason, archive } = body;

    // バリデーション
    if (!product_id || !ebay_listing_id || !reason) {
      return NextResponse.json(
        {
          success: false,
          error: 'product_id, ebay_listing_id, reason は必須です',
        },
        { status: 400 }
      );
    }

    console.log(`[API] 出品終了: 商品ID ${product_id}, リスティングID ${ebay_listing_id}`);

    const result = await endListing({
      product_id,
      ebay_listing_id,
      reason,
      archive,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || '出品終了に失敗しました',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: '出品を終了しました',
    });
  } catch (error) {
    console.error('[API] 出品終了エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
