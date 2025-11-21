/**
 * 外注UI用API: AI投入キュー画面
 * GET /api/outsourcing/ai-queue
 *
 * status: '優先度決定済' の商品を priority_score 降順で取得する
 * 外注作業者が優先度の高い商品から順番にAI投入できるようにする
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') || '優先度決定済';

    const supabase = await createClient();

    // priority_score の降順で商品を取得
    const { data: products, error, count } = await supabase
      .from('products_master')
      .select(
        `
        id, sku, title, title_en,
        external_url, asin_sku,
        price_jpy, ranking, sales_count, release_date,
        priority_score, status,
        category_name, condition,
        images, image_urls, primary_image_url,
        created_at, updated_at
      `,
        { count: 'exact' }
      )
      .eq('status', status)
      .not('priority_score', 'is', null)
      .order('priority_score', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ AI Queue API Error:', error);
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
        has_more: (count || 0) > offset + limit,
      },
      message: `優先度順に${products?.length || 0}件の商品を取得しました`,
    });
  } catch (error) {
    console.error('❌ AI Queue API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '処理中にエラーが発生しました',
        products: [],
      },
      { status: 500 }
    );
  }
}

/**
 * 商品のステータスを更新
 * PATCH /api/outsourcing/ai-queue
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { sku, status } = body;

    if (!sku || !status) {
      return NextResponse.json(
        {
          success: false,
          error: 'sku と status が必要です',
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('products_master')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('sku', sku);

    if (error) {
      throw new Error(`ステータス更新エラー: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: `SKU: ${sku} のステータスを ${status} に更新しました`,
    });
  } catch (error) {
    console.error('❌ AI Queue Update Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '更新中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
