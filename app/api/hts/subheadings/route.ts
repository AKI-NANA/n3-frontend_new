import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const headingCode = searchParams.get('heading')

    if (!headingCode) {
      return NextResponse.json({ error: 'heading パラメータが必要です' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // hts_codes_detailsから重複なしでsubheadingを取得
    const { data, error } = await supabase
      .from('hts_codes_details')
      .select('subheading_code, description')
      .eq('heading_code', headingCode)
      .not('subheading_code', 'is', null)
      .order('subheading_code')

    if (error) throw error

    // 重複を削除（subheading_code単位で）
    const uniqueSubheadings = Array.from(
      new Map(data?.map(item => [item.subheading_code, item]) || []).values()
    )

    return NextResponse.json(uniqueSubheadings)
  } catch (error: any) {
    console.error('❌ Subheading取得エラー:', error)
    return NextResponse.json(
      { error: 'Subheading取得に失敗しました', details: error.message },
      { status: 500 }
    )
  }
}
