// app/api/sm-analysis/route.ts
/**
 * SellerMirror分析結果をsellermirror_analysisテーブルに保存
 * トリガー sync_sm_data_to_products() が自動実行され、
 * productsテーブルのsm_competitors, sm_min_price_usd等を更新
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('📥 SM Analysis API - Request:', {
      product_id: body.product_id,
      competitor_count: body.competitor_count,
      avg_price_usd: body.avg_price_usd
    })

    // 必須フィールドのチェック
    const requiredFields = ['product_id', 'competitor_count', 'avg_price_usd']
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { success: false, error: `必須フィールド '${field}' が指定されていません` },
          { status: 400 }
        )
      }
    }

    const {
      product_id,
      competitor_count,
      avg_price_usd,
      min_price_usd,
      max_price_usd,
      common_aspects,
      analyzed_at
    } = body

    // sellermirror_analysisテーブルに保存（UPSERT）
    const { data, error } = await supabase
      .from('sellermirror_analysis')
      .upsert({
        product_id: product_id,
        competitor_count: parseInt(competitor_count),
        avg_price_usd: parseFloat(avg_price_usd),
        min_price_usd: min_price_usd ? parseFloat(min_price_usd) : null,
        max_price_usd: max_price_usd ? parseFloat(max_price_usd) : null,
        common_aspects: common_aspects || {},
        analyzed_at: analyzed_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'product_id'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Supabase Error:', error)
      return NextResponse.json(
        { success: false, error: `データベースエラー: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('✅ sellermirror_analysisに保存完了:', data)

    // トリガー sync_sm_data_to_products() が自動実行される
    // productsテーブルを確認
    const { data: updatedProduct, error: selectError } = await supabase
      .from('products')
      .select('id, item_id, sm_competitors, sm_min_price_usd, sm_profit_margin, material, origin_country')
      .eq('id', product_id)
      .single()

    if (selectError) {
      console.warn('⚠️ productsテーブル確認エラー:', selectError)
    } else {
      console.log('✅ productsテーブル更新確認:', updatedProduct)
    }

    return NextResponse.json({
      success: true,
      message: 'SM分析データを保存しました。トリガーによりproductsテーブルも更新されました。',
      data: {
        product_id: product_id,
        competitor_count: competitor_count,
        sm_analysis: data,
        updated_product: updatedProduct
      }
    })

  } catch (error: any) {
    console.error('❌ SM Analysis API Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'SM分析の保存に失敗しました' },
      { status: 500 }
    )
  }
}
