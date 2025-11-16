import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// メモ保存
export async function POST(request: Request) {
  try {
    const { id, memo, when_to_modify } = await request.json()
    
    const { data, error } = await supabase
      .from('code_map')
      .update({
        memo,
        when_to_modify,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      data: data[0],
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
