// app/api/test-tariff/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // USのデータを確認
    const { data: usData, error: usError } = await supabase
      .from('country_additional_tariffs')
      .select('*')
      .eq('country_code', 'US')
    
    // 全データも確認
    const { data: allData, error: allError } = await supabase
      .from('country_additional_tariffs')
      .select('*')
      .eq('is_active', true)
      .limit(10)
    
    return NextResponse.json({
      usData,
      usError,
      allData,
      allError,
      message: 'Tariff data check'
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}
