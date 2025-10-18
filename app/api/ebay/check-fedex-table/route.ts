// app/api/ebay/check-fedex-table/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET() {
  try {
    const supabase = createClient()

    // テーブル一覧を取得（FedEx関連）
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .like('table_name', '%fedex%')

    // 全テーブルから検索
    const possibleTables = [
      'fedex_rates',
      'fedex_shipping',
      'fedex_zones',
      'shipping_rates',
      'fedex_pricing',
      'fedex_international'
    ]

    const results: any = {}

    for (const tableName of possibleTables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(5)

      if (!error && data) {
        results[tableName] = {
          found: true,
          sampleData: data,
          columns: data.length > 0 ? Object.keys(data[0]) : []
        }
      }
    }

    return NextResponse.json({
      possibleTables: results,
      searchedTables: possibleTables
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
