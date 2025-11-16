import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const subheadingCode = searchParams.get('subheading')

    if (!subheadingCode) {
      return NextResponse.json({ error: 'subheading パラメータが必要です' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 完全なHTSコードを取得
    const { data, error } = await supabase
      .from('hts_codes_details')
      .select('hts_number, description, general_rate, special_rate, chapter_code, heading_code, subheading_code')
      .eq('subheading_code', subheadingCode)
      .order('hts_number')

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('❌ HTS Detail取得エラー:', error)
    return NextResponse.json(
      { error: 'HTS Detail取得に失敗しました', details: error.message },
      { status: 500 }
    )
  }
}
