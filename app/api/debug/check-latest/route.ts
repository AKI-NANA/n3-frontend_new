import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // スクレイピングしたポケモンカードを確認
    const { data: pokemon1 } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
      .ilike('title', '%ポケモンカード%オーガポンかまど%')
      .order('created_at', { ascending: false })
      .limit(1)
    
    const { data: pokemon2 } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
      .ilike('title', '%トートバッグ%ポケモン%ピカチュウ%')
      .order('created_at', { ascending: false })
      .limit(1)
    
    // products_masterに存在するか
    let inMaster1 = null
    let inMaster2 = null
    
    if (pokemon1?.[0]) {
      const { data } = await supabase
        .from('products_master')
        .select('*')
        .eq('source_system', 'yahoo_scraped_products')
        .eq('source_id', String(pokemon1[0].id))
      inMaster1 = data
    }
    
    if (pokemon2?.[0]) {
      const { data } = await supabase
        .from('products_master')
        .select('*')
        .eq('source_system', 'yahoo_scraped_products')
        .eq('source_id', String(pokemon2[0].id))
      inMaster2 = data
    }
    
    // 今日のデータ全体
    const today = new Date().toISOString().split('T')[0]
    const { data: todayYahoo } = await supabase
      .from('yahoo_scraped_products')
      .select('id, sku, title, created_at')
      .gte('created_at', today)
    
    const { data: todayMaster } = await supabase
      .from('products_master')
      .select('id, sku, title, created_at')
      .gte('created_at', today)
    
    return NextResponse.json({
      scraped_pokemon_cards: {
        card1: pokemon1?.[0] || null,
        card2: pokemon2?.[0] || null
      },
      in_products_master: {
        card1: inMaster1,
        card2: inMaster2
      },
      today_summary: {
        yahoo_scraped_count: todayYahoo?.length || 0,
        products_master_count: todayMaster?.length || 0,
        yahoo_data: todayYahoo,
        master_data: todayMaster
      },
      conclusion: {
        cards_scraped: !!pokemon1?.[0] || !!pokemon2?.[0],
        cards_in_master: !!inMaster1?.[0] || !!inMaster2?.[0],
        needs_sync: (todayYahoo?.length || 0) > (todayMaster?.length || 0)
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
