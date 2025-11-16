import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // 1件取得してカラム名を確認
    const { data: sample } = await supabase
      .from('products_master')
      .select('*')
      .limit(1)
    
    const actualColumns = sample && sample.length > 0 ? Object.keys(sample[0]) : []
    
    // 必要なカラムリスト
    const requiredColumns = [
      'sku',
      'purchase_price_jpy',
      'purchase_price_usd',
      'profit_amount_usd',
      'profit_margin_percent',
      'sm_lowest_price',
      'sm_average_price',
      'sm_competitor_count',
      'image_count',
      'recommended_price_usd',
      'lowest_price_usd',
      'lowest_price_profit_usd',
      'lowest_price_profit_margin',
      'length_cm',
      'width_cm',
      'height_cm',
      'weight_g',
      'condition',
      'ebay_category_id',
      'category_path',
      'vero_brand',
      'vero_risk_level',
      'japanese_seller_count',
      'selected_marketplace'
    ]
    
    const missingColumns = requiredColumns.filter(col => !actualColumns.includes(col))
    
    return NextResponse.json({
      actualColumns,
      requiredColumns,
      missingColumns,
      hasMissingColumns: missingColumns.length > 0,
      totalColumns: actualColumns.length,
      sample: sample?.[0] || null
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
