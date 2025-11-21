/**
 * Listing Management API
 * GET /api/listing/products - 戦略決定済み商品の取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Platform } from '@/types/strategy';

/**
 * 戦略決定済み商品の取得
 * クエリパラメータ:
 * - platform: フィルタ対象のプラットフォーム
 * - limit: 取得件数（デフォルト: 50）
 * - offset: オフセット（デフォルト: 0）
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const platform = searchParams.get('platform') as Platform | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await createClient();

    // ベースクエリ: status = '戦略決定済'
    let query = supabase
      .from('products_master')
      .select('*', { count: 'exact' })
      .eq('status', '戦略決定済');

    // プラットフォームフィルタ
    if (platform) {
      query = query.eq('recommended_platform', platform);
    }

    // ソートと範囲
    const { data: products, error, count } = await query
      .order('strategy_score', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`商品取得エラー: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      products: products || [],
      count: count || 0,
      pagination: {
        limit,
        offset,
        total: count || 0,
      },
    });
  } catch (error) {
    console.error('❌ Listing Products GET Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '処理中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
