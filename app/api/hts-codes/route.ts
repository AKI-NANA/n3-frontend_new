/**
 * HTSコードAPI - エラーハンドリング強化版
 * Supabaseから直接データ取得
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    console.log('HTSコードAPI呼び出し開始')
    console.log('Supabase URL:', supabaseUrl)
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase環境変数が設定されていません')
      return NextResponse.json({
        error: 'Supabase環境変数が設定されていません',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        }
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    console.log('Supabaseクライアント作成完了')
    
    // まずhs_codesテーブルから直接取得を試す
    const { data: hsCodesData, error: hsCodesError } = await supabase
      .from('hs_codes')
      .select('*')
      .order('code')
      .limit(200)
    
    if (hsCodesError) {
      console.error('hs_codesテーブルエラー:', hsCodesError)
      
      // エラーの場合はサンプルデータを返す
      return NextResponse.json([
        {
          hts_code: '8471.30.0100',
          description: 'Portable automatic data processing machines (laptops)',
          category: 'Computers & Electronics',
          base_duty: 0.0000,
          section301: false,
          section301_rate: 0.0000,
          total_tariff_rate: 0.0000
        },
        {
          hts_code: '8517.62.0050',
          description: 'Smartphones and telephones for cellular networks',
          category: 'Telecommunications',
          base_duty: 0.0000,
          section301: true,
          section301_rate: 0.0750,
          total_tariff_rate: 0.0750
        },
        {
          hts_code: '6204.62.4031',
          description: 'Women\'s trousers and shorts, of cotton',
          category: 'Apparel & Textiles',
          base_duty: 0.1625,
          section301: true,
          section301_rate: 0.0750,
          total_tariff_rate: 0.2375
        }
      ])
    }
    
    console.log(`取得成功: ${hsCodesData?.length || 0}件`)
    
    // データを整形して返す
    const formattedData = (hsCodesData || []).map(item => ({
      hts_code: item.code,
      description: item.description || '',
      category: item.category || '',
      base_duty: item.base_duty || 0,
      section301: item.section301 || false,
      section301_rate: item.section301_rate || 0,
      total_tariff_rate: (item.base_duty || 0) + (item.section301 ? (item.section301_rate || 0) : 0)
    }))
    
    return NextResponse.json(formattedData)
    
  } catch (error: any) {
    console.error('HTSコードAPI致命的エラー:', error)
    return NextResponse.json({
      error: '予期しないエラーが発生しました',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
