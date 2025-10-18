import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

// GET - デフォルト設定一覧取得
export async function GET() {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('html_template_defaults')
      .select('country_code, template_id')

    if (error) throw error

    // { US: 1, DE: 2, FR: null, ... } の形式に変換
    const defaults: { [key: string]: number | null } = {}
    data?.forEach(item => {
      defaults[item.country_code] = item.template_id
    })

    return NextResponse.json({
      success: true,
      defaults,
    })
  } catch (error) {
    console.error('Failed to load defaults:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load defaults' },
      { status: 500 }
    )
  }
}
