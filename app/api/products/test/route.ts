/**
 * テスト用簡易API - 商品1件取得
 * GET /api/products/test?sku=XXX
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Test API called ===');
    
    const searchParams = request.nextUrl.searchParams;
    const sku = searchParams.get('sku');
    
    console.log('Requested SKU:', sku);

    const supabase = await createClient();
    console.log('Supabase client created');

    // シンプルなクエリ
    const { data: products, error } = await supabase
      .from('products_master')
      .select('*')
      .eq('sku', sku)
      .limit(1);

    console.log('Query result:', { products, error });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!products || products.length === 0) {
      return NextResponse.json(
        { success: false, error: '商品が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product: products[0],
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
