import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 同じクライアントを使用
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    console.log('=== DATABASE DEBUG (ANON KEY ONLY) ===')
    
    // データ取得
    const { data, count, error } = await supabase
      .from('ebay_rate_tables')
      .select('*', { count: 'exact' })
      .limit(5)
    
    console.log('Result:', {
      count,
      hasData: !!data,
      dataLength: data?.length,
      error
    })
    
    if (data && data.length > 0) {
      console.log('Sample data:', data[0])
    }
    
    return NextResponse.json({
      count: count || 0,
      hasData: !!data,
      sample: data?.[0] || null,
      error: error?.message || null,
      diagnosis: count === 0 ? 'No data OR RLS blocking access' : 'Data accessible'
    })
  } catch (error: any) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
