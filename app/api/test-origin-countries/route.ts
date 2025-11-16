// app/api/test-origin-countries/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // USのデータを確認
    const { data: usData, error: usError } = await supabase
      .from('origin_countries')
      .select('*')
      .eq('code', 'US')
    
    // 全データも確認
    const { data: allData, error: allError } = await supabase
      .from('origin_countries')
      .select('*')
      .eq('active', true)
      .limit(10)
    
    return NextResponse.json({
      usData,
      usError,
      allData,
      allError,
      message: 'Origin countries data check'
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}
