import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // サンプルデータ取得でカラム名を確認
    const { data, error } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
      .limit(1)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      table: 'yahoo_scraped_products',
      columnNames: data && data.length > 0 ? Object.keys(data[0]) : [],
      sample: data?.[0] || null
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
