// app/api/fulfillment/update-status/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/fulfillment/update-status
 * 商品の出荷ステータスを更新
 */
export async function POST(request: Request) {
  try {
    const { productId, status } = await request.json();

    if (!productId || !status) {
      return NextResponse.json(
        { success: false, error: '商品IDとステータスが必要です' },
        { status: 400 }
      );
    }

    // ステータスの検証
    const validStatuses = ['pending', 'packing', 'ready', 'shipped'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: '無効なステータスです' },
        { status: 400 }
      );
    }

    console.log('📦 出荷ステータス更新:', { productId, status });

    const supabase = await createClient();

    // 🔥 products_masterテーブルを更新
    const { data, error } = await supabase
      .from('products_master')
      .update({
        fulfillment_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      console.error('❌ ステータス更新エラー:', error);
      return NextResponse.json(
        { success: false, error: 'ステータス更新に失敗しました: ' + error.message },
        { status: 500 }
      );
    }

    console.log('✅ ステータス更新成功:', data);

    return NextResponse.json({
      success: true,
      message: 'ステータスを更新しました',
      data: {
        productId,
        status,
      },
    });
  } catch (error: any) {
    console.error('❌ ステータス更新APIエラー:', error);
    return NextResponse.json(
      { success: false, error: error.message || '不明なエラーが発生しました' },
      { status: 500 }
    );
  }
}
