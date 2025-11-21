/**
 * 出品承認API
 * POST /api/approval/products - 商品の承認・却下
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sku, action } = body; // action: 'approve' | 'reject'

    if (!sku || !action) {
      return NextResponse.json(
        { success: false, error: 'SKUとactionが必要です' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // アクションに応じてステータスを更新
    const newStatus = action === 'approve' ? '出品スケジュール待ち' : '戦略キャンセル';

    const { data, error } = await supabase
      .from('products_master')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('sku', sku)
      .select()
      .single();

    if (error) {
      throw new Error(`ステータス更新エラー: ${error.message}`);
    }

    console.log(`✅ 承認処理完了: ${sku} → ${newStatus}`);

    return NextResponse.json({
      success: true,
      sku,
      new_status: newStatus,
      data,
    });
  } catch (error) {
    console.error('❌ 承認処理エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '処理中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}

/**
 * バッチ承認API
 * PUT /api/approval/products - 複数商品の一括承認
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { skus, action } = body; // skus: string[], action: 'approve' | 'reject'

    if (!skus || !Array.isArray(skus) || skus.length === 0) {
      return NextResponse.json(
        { success: false, error: 'SKUリストが必要です' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const newStatus = action === 'approve' ? '出品スケジュール待ち' : '戦略キャンセル';

    const { data, error } = await supabase
      .from('products_master')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .in('sku', skus)
      .select();

    if (error) {
      throw new Error(`バッチ更新エラー: ${error.message}`);
    }

    console.log(`✅ バッチ承認完了: ${skus.length}件 → ${newStatus}`);

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      new_status: newStatus,
    });
  } catch (error) {
    console.error('❌ バッチ承認エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '処理中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}

/**
 * 承認対象商品の取得
 * GET /api/approval/products - status='編集完了'の商品を取得
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await createClient();

    const { data: products, error, count } = await supabase
      .from('products_master')
      .select('*', { count: 'exact' })
      .eq('status', '編集完了')
      .order('updated_at', { ascending: false })
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
    console.error('❌ 商品取得エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '処理中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
