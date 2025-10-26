import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Supabase環境変数が設定されていません'
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 全データを取得（1200件）
    const { data, error } = await supabase
      .from('ebay_ddp_surcharge_matrix')
      .select('*')
      .order('weight_band_number', { ascending: true })
      .order('price_band_number', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    })

  } catch (error: any) {
    console.error('Failed to fetch matrix data:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'データ取得に失敗しました'
    }, { status: 500 })
  }
}
