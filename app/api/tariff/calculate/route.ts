// app/api/tariff/calculate/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const { origin_country, hts_code } = await request.json()

    if (!origin_country) {
      return NextResponse.json({
        error: 'origin_countryが必要です'
      }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 原産国情報を取得
    const { data: countryData, error: countryError } = await supabase
      .from('origin_countries')
      .select('*')
      .eq('code', origin_country.toUpperCase())
      .single()

    if (countryError) {
      console.error('原産国取得エラー:', countryError)
      return NextResponse.json({
        error: `原産国 ${origin_country} が見つかりません`
      }, { status: 404 })
    }

    // HTSコード別の関税率を取得（存在する場合）
    let htsSpecificRate = null
    if (hts_code) {
      const { data: htsData } = await supabase
        .from('hs_codes_by_country')
        .select('duty_rate, special_program')
        .eq('hs_code', hts_code)
        .eq('origin_country', origin_country.toUpperCase())
        .single()

      if (htsData) {
        htsSpecificRate = htsData.duty_rate
      }
    }

    // 総関税率を計算
    const totalTariffRate = htsSpecificRate !== null
      ? htsSpecificRate
      : (
          (countryData.base_tariff_rate || 0) +
          (countryData.section301_rate || 0) +
          (countryData.section232_rate || 0) +
          (countryData.antidumping_rate || 0)
        )

    return NextResponse.json({
      success: true,
      data: {
        origin_country: countryData.code,
        country_name: countryData.name,
        country_name_ja: countryData.name_ja,
        base_tariff_rate: countryData.base_tariff_rate || 0,
        section301_rate: countryData.section301_rate || 0,
        section232_rate: countryData.section232_rate || 0,
        antidumping_rate: countryData.antidumping_rate || 0,
        total_tariff_rate: totalTariffRate,
        hts_specific: htsSpecificRate !== null,
        hts_code: hts_code || null
      }
    })

  } catch (error: any) {
    console.error('関税計算API致命的エラー:', error)
    return NextResponse.json({
      error: '予期しないエラーが発生しました',
      message: error.message
    }, { status: 500 })
  }
}
