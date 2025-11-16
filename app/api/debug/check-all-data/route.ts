import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // テーブルレコード数
    const { count: productsCount } = await supabase
      .from('products_master')
      .select('*', { count: 'exact', head: true })
    
    const { count: yahooCount } = await supabase
      .from('yahoo_scraped_products')
      .select('*', { count: 'exact', head: true })
    
    const { count: masterCount } = await supabase
      .from('products_master')
      .select('*', { count: 'exact', head: true })
    
    // ゲンガーを探す
    const { data: gengarProducts } = await supabase
      .from('products_master')
      .select('id, sku, title, price_usd, images')
      .ilike('title', '%ゲンガー%')
    
    const { data: gengarYahoo } = await supabase
      .from('yahoo_scraped_products')
      .select('id, sku, title, price_usd, image_count, scraped_data, image_urls')
      .ilike('title', '%ゲンガー%')
    
    const { data: gengarMaster } = await supabase
      .from('products_master')
      .select('*')
      .ilike('title', '%ゲンガー%')
    
    // products_master 全データ
    const { data: allMaster } = await supabase
      .from('products_master')
      .select('id, source_system, source_id, sku, title, primary_image_url, purchase_price_jpy, profit_amount_usd')
      .order('id')
    
    return NextResponse.json({
      counts: {
        products: productsCount,
        yahoo_scraped_products: yahooCount,
        products_master: masterCount
      },
      gengar: {
        products: gengarProducts,
        yahoo: gengarYahoo,
        master: gengarMaster
      },
      all_master: allMaster
    }, { status: 200 })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
