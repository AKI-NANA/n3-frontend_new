import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

// POST - デフォルトテンプレート設定
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const { template_id, country_code } = body

    if (!template_id || !country_code) {
      return NextResponse.json(
        { success: false, message: 'Template ID and country code are required' },
        { status: 400 }
      )
    }

    // デフォルト設定を更新（軽量）
    const { error } = await supabase
      .from('html_template_defaults')
      .upsert({
        country_code: country_code,
        template_id: template_id,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'country_code'
      })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to set default template:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to set default template' },
      { status: 500 }
    )
  }
}
