// app/api/hts/search/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get('keyword') || ''
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!keyword) {
      return NextResponse.json({ error: 'キーワードが必要です' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // HTSコードを検索（notesでの部分一致）
    const { data, error } = await supabase
      .from('hs_codes_by_country')
      .select('hs_code, origin_country, duty_rate, special_program, notes')
      .ilike('notes', `%${keyword}%`)
      .limit(limit)

    if (error) {
      console.error('HTS検索エラー:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // HTSコードでグループ化（同じHTSコードで複数の原産国がある）
    const grouped = data.reduce((acc, item) => {
      if (!acc[item.hs_code]) {
        acc[item.hs_code] = {
          hts_code: item.hs_code,
          notes: item.notes,
          countries: []
        }
      }
      acc[item.hs_code].countries.push({
        origin_country: item.origin_country,
        duty_rate: item.duty_rate,
        special_program: item.special_program
      })
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({
      success: true,
      results: Object.values(grouped)
    })

  } catch (error: any) {
    console.error('HTS検索API致命的エラー:', error)
    return NextResponse.json({
      error: '予期しないエラーが発生しました',
      message: error.message
    }, { status: 500 })
  }
}
