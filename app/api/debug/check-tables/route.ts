// app/api/debug/check-tables/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    tables: {}
  }
  
  // 1. products_master
  const { data: pm, count: pmCount } = await supabase
    .from('products_master')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .limit(5)
  
  results.tables.products_master = {
    total_count: pmCount,
    sample_data: pm,
    has_gengar: pm?.some(p => 
      p.title?.toLowerCase().includes('gengar') || 
      p.title_en?.toLowerCase().includes('gengar')
    )
  }
  
  // 2. yahoo_scraped_products
  const { data: ysp, count: yspCount } = await supabase
    .from('yahoo_scraped_products')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(5)
  
  results.tables.yahoo_scraped_products = {
    total_count: yspCount,
    sample_data: ysp,
    has_gengar: ysp?.some(p => 
      p.title?.toLowerCase().includes('gengar') || 
      p.title_en?.toLowerCase().includes('gengar')
    )
  }
  
  // 3. mystical_japan_treasures_inventory
  const { data: mystical, count: mysticalCount } = await supabase
    .from('mystical_japan_treasures_inventory')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(5)
  
  results.tables.mystical_japan_treasures_inventory = {
    total_count: mysticalCount,
    sample_data: mystical,
    has_gengar: mystical?.some(p => 
      p.title?.toLowerCase().includes('gengar') || 
      p.title_en?.toLowerCase().includes('gengar')
    )
  }
  
  // 4. inventory_products
  const { data: inv, count: invCount } = await supabase
    .from('inventory_products')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(5)
  
  results.tables.inventory_products = {
    total_count: invCount,
    sample_data: inv,
    has_gengar: inv?.some(p => 
      p.product_name?.toLowerCase().includes('gengar') || 
      p.name?.toLowerCase().includes('gengar')
    )
  }
  
  // Gengarを直接検索
  const gengarSearchResults: any = {}
  
  // products_masterでGengar検索
  const { data: pmGengar } = await supabase
    .from('products_master')
    .select('*')
    .or('title.ilike.%gengar%,title_en.ilike.%gengar%')
    .limit(10)
  gengarSearchResults.products_master = pmGengar || []
  
  // yahoo_scraped_productsでGengar検索
  const { data: yspGengar } = await supabase
    .from('yahoo_scraped_products')
    .select('*')
    .or('title.ilike.%gengar%,title_en.ilike.%gengar%')
    .limit(10)
  gengarSearchResults.yahoo_scraped_products = yspGengar || []
  
  // mystical_japan_treasures_inventoryでGengar検索
  const { data: mysticalGengar } = await supabase
    .from('mystical_japan_treasures_inventory')
    .select('*')
    .or('title.ilike.%gengar%,title_en.ilike.%gengar%')
    .limit(10)
  gengarSearchResults.mystical_japan_treasures_inventory = mysticalGengar || []
  
  // inventory_productsでGengar検索
  const { data: invGengar } = await supabase
    .from('inventory_products')
    .select('*')
    .or('product_name.ilike.%gengar%,name.ilike.%gengar%')
    .limit(10)
  gengarSearchResults.inventory_products = invGengar || []
  
  results.gengar_search = gengarSearchResults
  
  results.sync_info = {
    note: 'ETLスクリプト(01_create_products_master.sql)が実行されているか確認が必要',
    recommendation: 'もしゲンガーが他のテーブルにあってproducts_masterに無い場合は、ETLの再実行が必要'
  }
  
  return NextResponse.json(results, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  })
}
