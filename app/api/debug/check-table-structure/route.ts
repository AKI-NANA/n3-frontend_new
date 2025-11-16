// app/api/debug/check-table-structure/route.ts
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
  
  // products テーブルの構造を取得
  const { data: productsData } = await supabase
    .from('products_master')
    .select('*')
    .limit(1)
  
  if (productsData && productsData.length > 0) {
    results.tables.products = {
      sample_record: productsData[0],
      fields: Object.keys(productsData[0]).sort(),
      field_types: Object.keys(productsData[0]).reduce((acc, key) => {
        const value = productsData[0][key]
        acc[key] = value === null ? 'null' : typeof value
        return acc
      }, {} as Record<string, string>)
    }
  }
  
  // yahoo_scraped_products テーブルの構造を取得
  const { data: yahooData } = await supabase
    .from('yahoo_scraped_products')
    .select('*')
    .limit(1)
  
  if (yahooData && yahooData.length > 0) {
    results.tables.yahoo_scraped_products = {
      sample_record: yahooData[0],
      fields: Object.keys(yahooData[0]).sort(),
      field_types: Object.keys(yahooData[0]).reduce((acc, key) => {
        const value = yahooData[0][key]
        acc[key] = value === null ? 'null' : typeof value
        return acc
      }, {} as Record<string, string>)
    }
  }
  
  // products_master テーブルの構造を取得
  const { data: masterData } = await supabase
    .from('products_master')
    .select('*')
    .limit(1)
  
  if (masterData && masterData.length > 0) {
    results.tables.products_master = {
      sample_record: masterData[0],
      fields: Object.keys(masterData[0]).sort(),
      field_types: Object.keys(masterData[0]).reduce((acc, key) => {
        const value = masterData[0][key]
        acc[key] = value === null ? 'null' : typeof value
        return acc
      }, {} as Record<string, string>)
    }
  }
  
  return NextResponse.json(results, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  })
}
