import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // ebay_inventoryのサンプルデータを取得
    const { data: sample } = await supabase
      .from('ebay_inventory')
      .select('*')
      .limit(3)
    
    // フィールド一覧
    const fields = sample && sample.length > 0 ? Object.keys(sample[0]) : []
    
    return NextResponse.json({
      total_count: 100,
      sample_data: sample,
      available_fields: fields,
      note: 'ebay_inventoryの構造です。これをproducts_masterに統合します。'
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
