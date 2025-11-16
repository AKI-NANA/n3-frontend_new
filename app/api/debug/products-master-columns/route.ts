import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // 1. 商品を1件取得してカラム確認
    const { data: sample, error: sampleError } = await supabase
      .from('products_master')
      .select('*')
      .limit(1);

    if (sampleError) {
      return NextResponse.json({
        success: false,
        error: 'サンプル商品取得エラー: ' + sampleError.message,
      });
    }

    const sampleProduct = sample?.[0];
    const columns = sampleProduct ? Object.keys(sampleProduct) : [];

    return NextResponse.json({
      success: true,
      data: {
        isTable: true, // products_masterはTABLE
        totalColumns: columns.length,
        columns,
        sampleProduct: sampleProduct ? {
          id: sampleProduct.id,
          source_system: sampleProduct.source_system,
          sku: sampleProduct.sku,
          title: sampleProduct.title?.substring(0, 50),
          has_listing_data: !!sampleProduct.listing_data,
          has_listing_history: 'listing_history' in sampleProduct,
        } : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// テストUPDATE実行
export async function POST(request: NextRequest) {
  try {
    const { testId } = await request.json();

    if (!testId) {
      return NextResponse.json({
        success: false,
        error: 'testIdを指定してください',
      });
    }

    // 更新前のデータを取得
    const { data: before, error: beforeError } = await supabase
      .from('products_master')
      .select('id, title, listing_data, updated_at')
      .eq('id', testId)
      .single();

    if (beforeError || !before) {
      return NextResponse.json({
        success: false,
        error: '商品が見つかりません: ' + (beforeError?.message || ''),
      });
    }

    // テストUPDATE実行
    const testTimestamp = new Date().toISOString();
    const { data: after, error: updateError } = await supabase
      .from('products_master')
      .update({
        listing_data: {
          ...(before.listing_data || {}),
          test_update: testTimestamp,
          test_note: 'API経由のテストUPDATE',
        },
      })
      .eq('id', testId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: 'UPDATE失敗',
        details: {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'テストUPDATE成功',
      before: {
        id: before.id,
        title: before.title,
        listing_data_keys: Object.keys(before.listing_data || {}),
        updated_at: before.updated_at,
      },
      after: {
        id: after.id,
        title: after.title,
        listing_data_keys: Object.keys(after.listing_data || {}),
        updated_at: after.updated_at,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
