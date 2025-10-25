import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Supabase環境変数が設定されていません'
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 接続テスト: 簡単なクエリを実行
    const { data, error } = await supabase
      .from('ebay_ddp_surcharge_matrix')
      .select('*')
      .limit(1)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Supabaseに正常に接続しました',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Supabase connection test failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '接続テストに失敗しました'
    }, { status: 500 })
  }
}
