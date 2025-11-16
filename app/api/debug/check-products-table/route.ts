// app/api/debug/check-products-table/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    search_terms: ['gengar', 'ゲンガー', 'VMAX', 'pokemon', 'ポケモン'],
    tables: {}
  }
  
  // ============================================
  // 1. products テーブルを調査（元のメインテーブル）
  // ============================================
  try {
    const { data: productsData, count: productsCount, error: productsError } = await supabase
      .from('products_master')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .limit(10)
    
    results.tables.products = {
      exists: !productsError,
      total_count: productsCount,
      sample_data: productsData,
      error: productsError?.message
    }
    
    // Gengar検索
    if (!productsError) {
      const { data: gengarData } = await supabase
        .from('products_master')
        .select('*')
        .or('title.ilike.%gengar%,title_en.ilike.%gengar%,title.ilike.%ゲンガー%,title.ilike.%VMAX%')
        .limit(20)
      
      results.tables.products.gengar_search = {
        count: gengarData?.length || 0,
        data: gengarData
      }
    }
  } catch (err: any) {
    results.tables.products = {
      exists: false,
      error: err.message,
      note: 'productsテーブルが存在しない可能性があります'
    }
  }
  
  // ============================================
  // 2. products_master テーブルを調査
  // ============================================
  const { data: masterData, count: masterCount } = await supabase
    .from('products_master')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .limit(10)
  
  results.tables.products_master = {
    total_count: masterCount,
    sample_data: masterData
  }
  
  // Gengar検索
  const { data: masterGengar } = await supabase
    .from('products_master')
    .select('*')
    .or('title.ilike.%gengar%,title_en.ilike.%gengar%,title.ilike.%ゲンガー%,title.ilike.%VMAX%')
    .limit(20)
  
  results.tables.products_master.gengar_search = {
    count: masterGengar?.length || 0,
    data: masterGengar
  }
  
  // ============================================
  // 3. yahoo_scraped_products テーブルを調査
  // ============================================
  const { data: yahooData, count: yahooCount } = await supabase
    .from('yahoo_scraped_products')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(10)
  
  results.tables.yahoo_scraped_products = {
    total_count: yahooCount,
    sample_data: yahooData
  }
  
  // Gengar検索
  const { data: yahooGengar } = await supabase
    .from('yahoo_scraped_products')
    .select('*')
    .or('title.ilike.%gengar%,english_title.ilike.%gengar%,title.ilike.%ゲンガー%,title.ilike.%VMAX%')
    .limit(20)
  
  results.tables.yahoo_scraped_products.gengar_search = {
    count: yahooGengar?.length || 0,
    data: yahooGengar
  }
  
  // ============================================
  // 4. 分析と推奨アクション
  // ============================================
  const hasProductsTable = results.tables.products?.exists !== false
  const productsHasGengar = results.tables.products?.gengar_search?.count > 0
  const masterHasGengar = results.tables.products_master?.gengar_search?.count > 0
  const yahooHasGengar = results.tables.yahoo_scraped_products?.gengar_search?.count > 0
  
  results.analysis = {
    tables_status: {
      products_exists: hasProductsTable,
      products_has_data: results.tables.products?.total_count > 0,
      products_master_has_data: masterCount > 0,
      yahoo_has_data: yahooCount > 0
    },
    gengar_status: {
      in_products: productsHasGengar,
      in_products_master: masterHasGengar,
      in_yahoo: yahooHasGengar
    },
    data_flow: {
      description: 'データフロー: products → (トリガー) → products_master',
      current_flow: hasProductsTable 
        ? 'productsテーブル → products_masterテーブル (トリガー自動同期)'
        : 'productsテーブルが存在しない。直接products_masterを使用している可能性'
    },
    recommendations: []
  }
  
  // 推奨アクション
  if (productsHasGengar && !masterHasGengar) {
    results.analysis.recommendations.push({
      priority: 'HIGH',
      issue: 'productsテーブルにゲンガーがあるが、products_masterに同期されていない',
      action: '同期トリガーが動作していない可能性。setup_products_master_sync.sqlを再実行してください。'
    })
  } else if (yahooHasGengar && !masterHasGengar && !productsHasGengar) {
    results.analysis.recommendations.push({
      priority: 'HIGH',
      issue: 'yahoo_scraped_productsにゲンガーがあるが、products系テーブルにない',
      action: 'yahoo_scraped_productsからproducts_masterへのETL同期が必要。resync_products_master.sqlを実行してください。'
    })
  } else if (masterHasGengar) {
    results.analysis.recommendations.push({
      priority: 'LOW',
      issue: 'products_masterにゲンガーが存在します',
      action: 'フロントエンド（/tools/editing, /approval）で表示されない場合は、表示ロジックやフィルタリングを確認してください。'
    })
  } else {
    results.analysis.recommendations.push({
      priority: 'HIGH',
      issue: 'どのテーブルにもゲンガーが見つかりません',
      action: 'データが削除された可能性があります。データの再取得が必要です。'
    })
  }
  
  return NextResponse.json(results, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  })
}
