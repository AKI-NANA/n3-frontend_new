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
    const useDefaultPricing = searchParams.get('use_default_pricing');
    const countOnly = searchParams.get('count') === 'true';
    const sku = searchParams.get('sku'); // 🆕 SKU検索

    const supabase = await createClient();

    // クエリの構築
    let query = supabase
      .from('products_master')
      .select(
        countOnly ? '*' : `
        id, sku, title, title_en, english_title, condition,
        price_jpy, purchase_price_jpy, ddp_price_usd,
        profit_amount_usd, profit_margin, profit_margin_percent,
        listing_score, score_calculated_at, score_details,
        sm_analyzed_at, sm_profit_margin, sm_competitor_count,
        sm_lowest_price, sm_average_price, sm_profit_amount_usd,
        sm_competitors, sm_jp_sellers, sm_sales_count,
        research_sold_count,
        release_date, msrp_jpy, discontinued_at,
        listing_data, scraped_data, images, image_urls, primary_image_url,
        category_name, category_id,
        created_at, updated_at
      `,
        { count: 'exact' }
      );

    // use_default_pricing フィルター
    if (useDefaultPricing === 'true') {
      query = query.eq('use_default_pricing', true);
    } else if (useDefaultPricing === 'false') {
      query = query.eq('use_default_pricing', false);
    }
    
    // 🆕 SKUフィルター
    if (sku) {
      query = query.eq('sku', sku);
    }

    // カウントのみの場合はソート・ページネーション不要
    if (!countOnly) {
      query = query
        .order('listing_score', { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1);
    }

    // 商品データを取得
    const { data: products, error, count } = await query;

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

    // カウントのみのレスポンス
    if (countOnly) {
      return NextResponse.json({
        success: true,
        count: count || 0,
      });
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
