import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // yahoo_scraped_productsのゲンガーを全フィールド取得
    const { data: gengar } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
      .eq('sku', 'NH0QT')
      .single()
    
    // すべてのyahoo_scraped_products
    const { data: allYahoo } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
      .order('id')
    
    // フィールド一覧
    const fields = gengar ? Object.keys(gengar) : []
    
    return NextResponse.json({
      gengar_full_data: gengar,
      all_yahoo_count: allYahoo?.length || 0,
      available_fields: fields,
      note: 'yahoo_scraped_productsの生データです。ここに全データがあるはずです。'
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
