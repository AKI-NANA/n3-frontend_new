import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // products_masterの最新1件を取得して全カラムを確認
    const { data, error } = await supabase
      .from('products_master')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ message: 'データがありません' }, { status: 404 })
    }

    const product = data[0]
    const schema = {
      available_columns: Object.keys(product),
      sample_data: product
    }

    return NextResponse.json(schema)

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
