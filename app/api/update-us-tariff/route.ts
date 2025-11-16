// app/api/update-us-tariff/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    // 🔥 section232_rateを更新すると、total_additional_tariffが自動計算される
    const { data, error } = await supabase
      .from('origin_countries')
      .update({
        section232_rate: 0.25,  // 25%
        updated_at: new Date().toISOString()
      })
      .eq('code', 'US')
      .select()

    if (error) {
      console.error('❌ 更新エラー:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    console.log('✅ US更新成功:', data)

    return NextResponse.json({
      success: true,
      updated: data,
      message: 'USの追加関税率を25%に更新しました'
    })

  } catch (error: any) {
    console.error('❌ エラー:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
