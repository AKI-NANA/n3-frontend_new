import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

// GET - テンプレート一覧取得
export async function GET() {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('html_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      templates: data || [],
    })
  } catch (error) {
    console.error('Failed to load templates:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load templates' },
      { status: 500 }
    )
  }
}

// POST - テンプレート保存
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const { 
      name, 
      html_content,
      mall_type,           // 新規: ebay, yahoo, mercari, amazon
      country_code,        // 新規: US, JP, UK等
      is_default_preview   // 新規: プレビュー用デフォルト
    } = body

    if (!name || !html_content) {
      return NextResponse.json(
        { success: false, message: 'Name and HTML content are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('html_templates')
      .insert([
        {
          name,
          html_content,
          mall_type: mall_type || 'ebay',
          country_code: country_code || 'US',
          is_default_preview: is_default_preview || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()

    if (error) throw error

    return NextResponse.json({
      success: true,
      template: data?.[0],
    })
  } catch (error) {
    console.error('Failed to save template:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to save template' },
      { status: 500 }
    )
  }
}
