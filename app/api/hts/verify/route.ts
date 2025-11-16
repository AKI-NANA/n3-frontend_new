// app/api/hts/verify/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const { hts_code, origin_country } = await request.json()

    if (!hts_code || !origin_country) {
      return NextResponse.json({
        error: 'hts_codeとorigin_countryが必要です'
      }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // HTSコードと原産国の組み合わせを検証
    const { data, error } = await supabase
      .from('hs_codes_by_country')
      .select('*')
      .eq('hs_code', hts_code)
      .eq('origin_country', origin_country.toUpperCase())
      .single()

    if (error) {
      // データが見つからない場合
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          valid: false,
          message: `HTSコード ${hts_code} と原産国 ${origin_country} の組み合わせが見つかりません`
        })
      }

      console.error('HTS検証エラー:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      valid: true,
      data: {
        hts_code: data.hs_code,
        origin_country: data.origin_country,
        duty_rate: data.duty_rate,
        special_program: data.special_program,
        notes: data.notes
      }
    })

  } catch (error: any) {
    console.error('HTS検証API致命的エラー:', error)
    return NextResponse.json({
      error: '予期しないエラーが発生しました',
      message: error.message
    }, { status: 500 })
  }
}
