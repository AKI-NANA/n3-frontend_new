import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const chapterCode = searchParams.get('chapter')

    if (!chapterCode) {
      return NextResponse.json({ error: 'chapter パラメータが必要です' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // hts_codes_detailsから重複なしでheadingを取得
    const { data, error } = await supabase
      .from('hts_codes_details')
      .select('heading_code, description')
      .eq('chapter_code', chapterCode)
      .not('heading_code', 'is', null)
      .order('heading_code')

    if (error) throw error

    // 重複を削除（heading_code単位で）
    const uniqueHeadings = Array.from(
      new Map(data?.map(item => [item.heading_code, item]) || []).values()
    )

    return NextResponse.json(uniqueHeadings)
  } catch (error: any) {
    console.error('❌ Heading取得エラー:', error)
    return NextResponse.json(
      { error: 'Heading取得に失敗しました', details: error.message },
      { status: 500 }
    )
  }
}
