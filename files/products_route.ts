/**
 * 商品データ取得API（スコア管理用）
 * GET /api/products
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = createClient();

    // 商品データを取得
    const { data: products, error, count } = await supabase
      .from('products_master')
      .select(
        `
        id, sku, title, title_en, condition,
        price_jpy, acquired_price_jpy,
        listing_score, score_calculated_at, score_details,
        sm_analyzed_at, sm_profit_margin, sm_competitors, sm_min_price_usd,
        listing_data, created_at, updated_at
      `,
        { count: 'exact' }
      )
      .order('listing_score', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json(
        {
          success: false,
          error: `商品取得エラー: ${error.message}`,
          products: [],
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      products: products || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '商品データ取得中にエラーが発生しました',
        products: [],
      },
      { status: 500 }
    );
  }
}
