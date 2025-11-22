// app/api/fulfillment/list/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/fulfillment/list
 * 出荷管理用の商品リストを取得
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');

    console.log('📦 出荷管理商品リスト取得:', { status, limit });

    const supabase = await createClient();

    // 🔥 products_masterテーブルから商品を取得
    let query = supabase
      .from('products_master')
      .select('id, sku, title, primary_image_url, fulfillment_status, listing_data, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    // ステータスでフィルタリング
    if (status) {
      query = query.eq('fulfillment_status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ 商品リスト取得エラー:', error);
      return NextResponse.json(
        { success: false, error: '商品リスト取得に失敗しました: ' + error.message },
        { status: 500 }
      );
    }

    // 🔥 レスポンスを整形
    const products = data.map((product: any) => ({
      id: product.id,
      sku: product.sku,
      title: product.title,
      imageUrl: product.primary_image_url,
      status: product.fulfillment_status || 'pending',
      weight: product.listing_data?.weight_g,
      length: product.listing_data?.length_cm,
      width: product.listing_data?.width_cm,
      height: product.listing_data?.height_cm,
      shippingDeadline: product.listing_data?.shipping_deadline,
      trackingNumber: product.listing_data?.tracking_number,
      carrier: product.listing_data?.carrier,
      warnings: [],
    }));

    console.log('✅ 商品リスト取得成功:', products.length, '件');

    return NextResponse.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error: any) {
    console.error('❌ 商品リスト取得APIエラー:', error);
    return NextResponse.json(
      { success: false, error: error.message || '不明なエラーが発生しました' },
      { status: 500 }
    );
  }
}
