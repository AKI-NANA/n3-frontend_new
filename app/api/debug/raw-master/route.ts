import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // products_master から**全フィールド**を取得
    const { data, error } = await supabase
      .from('products_master')
      .select('*')
      .order('id')
    
    if (error) throw error
    
    // ゲンガーだけ抽出
    const gengar = data?.filter(p => p.title?.includes('ゲンガー')) || []
    
    return NextResponse.json({
      total: data?.length || 0,
      gengar_count: gengar.length,
      all_data: data,
      gengar_data: gengar,
      note: 'これがproducts_masterの生データです'
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
