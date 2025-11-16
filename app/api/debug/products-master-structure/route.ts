import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // 1. products_masterの構造を確認
    const { data: sampleData, error: sampleError } = await supabase
      .from('products_master')
      .select('*')
      .limit(1);

    if (sampleError) {
      return NextResponse.json({
        success: false,
        error: 'products_master取得エラー: ' + sampleError.message,
      });
    }

    const sample = sampleData?.[0] || null;
    
    // 2. source_tableカラムの存在確認
    const hasSourceTable = sample ? 'source_table' in sample : false;
    
    // 3. 各ソーステーブルのカウント
    const sourceCounts: { [key: string]: number } = {};
    
    if (hasSourceTable) {
      const { data: counts, error: countError } = await supabase
        .rpc('get_products_master_source_counts');
      
      if (!countError && counts) {
        counts.forEach((row: any) => {
          sourceCounts[row.source_table] = row.count;
        });
      }
    }
    
    // 4. UPDATE/DELETEトリガーの存在確認
    const { data: triggers, error: triggerError } = await supabase
      .rpc('check_products_master_triggers');
    
    return NextResponse.json({
      success: true,
      data: {
        sampleProduct: sample,
        hasSourceTable,
        availableColumns: sample ? Object.keys(sample) : [],
        sourceCounts,
        triggers: triggers || [],
        canUpdate: hasSourceTable && triggers && triggers.length > 0,
      },
    });
  } catch (error: any) {
    console.error('❌ デバッグAPI実行エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

// テストUPDATE実行用エンドポイント
export async function POST(request: NextRequest) {
  try {
    const { testUpdate } = await request.json();
    
    if (testUpdate) {
      // テスト用の商品を1件取得
      const { data: products, error: fetchError } = await supabase
        .from('products_master')
        .select('id, source_table, title, listing_data')
        .limit(1);
      
      if (fetchError || !products || products.length === 0) {
        return NextResponse.json({
          success: false,
          error: '商品が見つかりません',
        });
      }
      
      const testProduct = products[0];
      
      // テストUPDATE実行
      const { data: updated, error: updateError } = await supabase
        .from('products_master')
        .update({
          listing_data: {
            ...(testProduct.listing_data || {}),
            test_update_timestamp: new Date().toISOString(),
            test_field: 'test_value_from_api',
          },
        })
        .eq('id', testProduct.id)
        .select();
      
      if (updateError) {
        return NextResponse.json({
          success: false,
          error: 'UPDATE失敗: ' + updateError.message,
          details: updateError,
        });
      }
      
      return NextResponse.json({
        success: true,
        message: 'テストUPDATE成功',
        testProduct,
        updated,
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'testUpdate=trueを指定してください',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
