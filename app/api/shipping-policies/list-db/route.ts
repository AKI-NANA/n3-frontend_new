import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // データベースから全ポリシーを取得
    const { data: policies, error } = await supabase
      .from('ebay_shipping_policies_v2')
      .select('*')
      .eq('is_active', true)
      .order('weight_min_kg', { ascending: true })
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      policies: policies || []
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
