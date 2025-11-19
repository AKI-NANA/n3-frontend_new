import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    const queries = [
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS purchase_price_jpy NUMERIC(10,2)`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS purchase_price_usd NUMERIC(10,2)`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS profit_amount_usd NUMERIC(10,2)`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS profit_margin_percent NUMERIC(5,2)`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS sm_lowest_price NUMERIC(10,2)`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS sm_average_price NUMERIC(10,2)`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS sm_competitor_count INTEGER`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS sm_data JSONB`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS image_count INTEGER DEFAULT 0`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS recommended_price_usd NUMERIC(10,2)`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS lowest_price_usd NUMERIC(10,2)`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS lowest_price_profit_usd NUMERIC(10,2)`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS lowest_price_profit_margin NUMERIC(5,2)`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS length_cm NUMERIC(8,2)`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS width_cm NUMERIC(8,2)`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS height_cm NUMERIC(8,2)`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS weight_g NUMERIC(10,2)`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS condition TEXT`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS ebay_category_id TEXT`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS category_path TEXT`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS vero_brand TEXT`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS vero_risk_level TEXT`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS japanese_seller_count INTEGER`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS competitors_data JSONB`,
      `ALTER TABLE products_master ADD COLUMN IF NOT EXISTS selected_marketplace TEXT`,
    ]

    const results = []
    
    for (const query of queries) {
      let error = null
      
      try {
        // rpcを実行し、結果を直接 await で受け取る
        const result = await supabase.rpc('exec_sql', { sql: query })
        error = result.error // result オブジェクトから error プロパティを取得
      } catch (e) {
        // ネットワークエラーなど、Postgrestが処理できないエラーをキャッチ
        console.error(`Error executing RPC for query: ${query}`, e)
        error = e instanceof Error ? e : new Error('Unknown error')
      }
      
      results.push({
        query: query.substring(0, 100) + '...',
        success: !error,
        error: error ? (error instanceof Error ? error.message : String(error)) : null
      })
    }

    const successCount = results.filter(r => r.success).length
    
    return NextResponse.json({
      message: `${successCount}/${queries.length} カラム追加完了`,
      results,
      note: 'RPCが使えない場合は、Supabase SQL Editorで直接実行してください'
    })
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      note: 'このエンドポイントではカラム追加できません。Supabase SQL Editorで直接実行してください。'
    }, { status: 500 })
  }
}
