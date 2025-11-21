/**
 * VERO対策API - ブランド名取得
 *
 * GET /api/vero/brand-name?sku=XXX
 *
 * vero_brands テーブルから正式ブランド名を取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/vero/brand-name
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sku = searchParams.get('sku');

    if (!sku) {
      return NextResponse.json(
        { error: 'SKU parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // SKUからブランド情報を取得
    const { data: product, error: productError } = await supabase
      .from('products_master')
      .select('brand, category')
      .eq('sku', sku)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const brandName = product.brand || '';

    // vero_brandsテーブルから正式名称を取得
    const { data: veroBrand, error: veroError } = await supabase
      .from('vero_brands')
      .select('official_name, is_vero_protected, recommended_description')
      .eq('brand_name', brandName)
      .single();

    if (veroError || !veroBrand) {
      // VERO対象でない場合は元のブランド名を返す
      return NextResponse.json({
        sku,
        brandName,
        officialBrandName: brandName,
        isVeroProtected: false,
      });
    }

    return NextResponse.json({
      sku,
      brandName,
      officialBrandName: veroBrand.official_name,
      isVeroProtected: veroBrand.is_vero_protected,
      recommendedDescription: veroBrand.recommended_description,
    });
  } catch (error) {
    console.error('[VERO API] Unexpected error:', error);
    return NextResponse.json(
      {
        error: '予期しないエラーが発生しました',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
