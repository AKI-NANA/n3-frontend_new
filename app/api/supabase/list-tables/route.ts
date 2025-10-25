import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Supabase環境変数が設定されていません'
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 既知のテーブルのリストをチェック
    const knownTables = [
      'ebay_ddp_surcharge_matrix',
      'usa_ddp_shipping_costs',
      'ebay_fulfillment_policies',
      'rate_tables',
      'shipping_cost_matrix',
      'ebay_rate_tables',
      'ddp_surcharge_matrix',
    ]

    const tableInfoPromises = knownTables.map(async (tableName) => {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })

        if (error) {
          return null
        }

        return {
          name: tableName,
          columns: 0, // カラム数は別途取得が必要
          rows: count || 0,
          isCandidate: count && count >= 1000 && count <= 1400
        }
      } catch (err) {
        return null
      }
    })

    const tableInfo = (await Promise.all(tableInfoPromises))
      .filter(t => t !== null)
      .sort((a, b) => {
        // USA DDP候補を上に表示
        if (a!.isCandidate && !b!.isCandidate) return -1
        if (!a!.isCandidate && b!.isCandidate) return 1
        // レコード数の多い順
        return b!.rows - a!.rows
      })

    return NextResponse.json({
      success: true,
      tables: tableInfo,
      count: tableInfo.length
    })

  } catch (error: any) {
    console.error('Failed to fetch tables:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'テーブル一覧の取得に失敗しました'
    }, { status: 500 })
  }
}
