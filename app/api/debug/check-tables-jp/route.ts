// app/api/debug/check-tables-jp/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    search_terms: ['gengar', 'ゲンガー', 'VMAX'],
    tables: {}
  }
  
  // 日本語と英語両方で検索
  const searchPatterns = [
    'title.ilike.%gengar%',
    'title_en.ilike.%gengar%', 
    'title.ilike.%ゲンガー%',
    'title.ilike.%VMAX%'
  ].join(',')
  
  // products_master検索
  const { data: pmData, error: pmError } = await supabase
    .from('products_master')
    .select('*')
    .or(searchPatterns)
    .order('updated_at', { ascending: false })
    .limit(20)
  
  results.tables.products_master = {
    count: pmData?.length || 0,
    error: pmError?.message,
    data: pmData?.map(p => ({
      id: p.id,
      title: p.title,
      title_en: p.title_en,
      source_system: p.source_system,
      primary_image_url: p.primary_image_url,
      images: p.images,
      gallery_images: p.gallery_images,
      created_at: p.created_at,
      updated_at: p.updated_at
    })) || []
  }
  
  // yahoo_scraped_products検索
  const yahooSearchPatterns = [
    'title.ilike.%gengar%',
    'english_title.ilike.%gengar%',
    'title.ilike.%ゲンガー%',
    'title.ilike.%VMAX%'
  ].join(',')
  
  const { data: yspData, error: yspError } = await supabase
    .from('yahoo_scraped_products')
    .select('*')
    .or(yahooSearchPatterns)
    .order('created_at', { ascending: false })
    .limit(20)
  
  results.tables.yahoo_scraped_products = {
    count: yspData?.length || 0,
    error: yspError?.message,
    data: yspData?.map(p => ({
      id: p.id,
      title: p.title,
      english_title: p.english_title,
      price_jpy: p.price_jpy,
      image_urls: p.image_urls,
      scraped_data: p.scraped_data,
      created_at: p.created_at
    })) || []
  }
  
  // 統計
  const { count: pmCount } = await supabase
    .from('products_master')
    .select('*', { count: 'exact', head: true })
  
  const { count: yspCount } = await supabase
    .from('yahoo_scraped_products')
    .select('*', { count: 'exact', head: true })
  
  results.table_stats = {
    products_master_total: pmCount || 0,
    yahoo_scraped_products_total: yspCount || 0
  }
  
  results.analysis = {
    pokemon_found_in_products_master: pmData && pmData.length > 0,
    pokemon_found_in_yahoo: yspData && yspData.length > 0,
    needs_sync: (yspData && yspData.length > 0) && (!pmData || pmData.length === 0),
    recommendation: (yspData && yspData.length > 0) && (!pmData || pmData.length === 0)
      ? 'yahoo_scraped_productsにデータがあります。ETL同期スクリプトを実行してください。'
      : pmData && pmData.length > 0
      ? 'products_masterにデータがあります。フロントエンドの表示を確認してください。'
      : 'データが見つかりません。データの再取得が必要です。'
  }
  
  return NextResponse.json(results, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  })
}
