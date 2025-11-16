import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const tables = [
      'products',
      'yahoo_scraped_products',
      'products_master',
      'inventory_products',
      'mystical_japan_treasures_inventory',
      'ebay_inventory',
      'research_products_master'
    ]
    
    const results: any = {}
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        results[table] = {
          exists: !error,
          count: count || 0,
          error: error?.message || null
        }
      } catch (err: any) {
        results[table] = {
          exists: false,
          count: 0,
          error: err.message
        }
      }
    }
    
    // products_masterの内訳
    const { data: masterBreakdown } = await supabase
      .from('products_master')
      .select('source_system')
    
    const breakdown: any = {}
    masterBreakdown?.forEach((row: any) => {
      breakdown[row.source_system] = (breakdown[row.source_system] || 0) + 1
    })
    
    // 期待値との差分
    const expected = {
      products: results.products?.count || 0,
      yahoo_scraped_products: results.yahoo_scraped_products?.count || 0,
      inventory_products: results.inventory_products?.count || 0,
      mystical_japan_treasures_inventory: results.mystical_japan_treasures_inventory?.count || 0,
      ebay_inventory: results.ebay_inventory?.count || 0,
      research_products_master: results.research_products_master?.count || 0
    }
    
    const expectedTotal = Object.values(expected).reduce((a: number, b: number) => a + b, 0)
    const actualTotal = results.products_master?.count || 0
    const missing = expectedTotal - actualTotal
    
    return NextResponse.json({
      all_tables: results,
      products_master_breakdown: breakdown,
      summary: {
        expected_total: expectedTotal,
        actual_in_master: actualTotal,
        missing_records: missing,
        sync_percentage: Math.round((actualTotal / expectedTotal) * 100) + '%'
      },
      detail: expected,
      note: 'missing_records > 0 なら、同期されていないテーブルがあります'
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
