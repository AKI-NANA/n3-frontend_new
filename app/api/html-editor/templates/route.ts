import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface MultiLangTemplateData {
  name: string
  category: string
  languages: {
    [key: string]: {
      html_content: string
      updated_at: string
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'save_template':
        return await saveMultiLangTemplate(body.template_data)
      
      case 'load_templates':
        return await loadMultiLangTemplates()
      
      case 'load_single_template':
        return await loadSingleTemplate(body.template_id)
      
      case 'delete_template':
        return await deleteTemplate(body.template_id)
      
      default:
        return NextResponse.json({
          success: false,
          message: `未対応のアクション: ${action}`
        })
    }
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({
      success: false,
      message: 'システムエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function saveMultiLangTemplate(templateData: MultiLangTemplateData) {
  try {
    if (!templateData.name || !templateData.languages) {
      return NextResponse.json({
        success: false,
        message: 'テンプレート名と言語データが必要です'
      })
    }

    const template = {
      template_id: crypto.randomUUID(),
      name: templateData.name,
      category: templateData.category || 'general',
      languages: templateData.languages, // JSONB形式で保存
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'html_editor',
      version: '2.0-multilang'
    }

    const { data, error } = await supabase
      .from('html_templates')
      .insert([template])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: {
        template_id: data.template_id,
        file_name: `${data.name}.json`,
        languages_saved: Object.keys(templateData.languages)
      },
      message: '✅ 多言語テンプレートを保存しました'
    })
  } catch (error) {
    console.error('Save template error:', error)
    return NextResponse.json({
      success: false,
      message: '保存エラー: ' + (error instanceof Error ? error.message : 'Unknown error')
    })
  }
}

async function loadMultiLangTemplates() {
  try {
    const { data, error } = await supabase
      .from('html_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    // 言語数を計算
    const templatesWithCount = (data || []).map(template => ({
      ...template,
      language_count: template.languages ? Object.keys(template.languages).length : 0
    }))

    return NextResponse.json({
      success: true,
      data: templatesWithCount,
      message: `✅ ${templatesWithCount.length}件のテンプレートを読み込みました`
    })
  } catch (error) {
    console.error('Load templates error:', error)
    return NextResponse.json({
      success: false,
      message: '読み込みエラー: ' + (error instanceof Error ? error.message : 'Unknown error')
    })
  }
}

async function loadSingleTemplate(templateId: string) {
  try {
    if (!templateId) {
      return NextResponse.json({
        success: false,
        message: 'template_idが指定されていません'
      })
    }

    const { data, error } = await supabase
      .from('html_templates')
      .select('*')
      .eq('template_id', templateId)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json({
        success: false,
        message: 'テンプレートが見つかりませんでした'
      })
    }

    return NextResponse.json({
      success: true,
      data,
      message: '✅ テンプレートを読み込みました'
    })
  } catch (error) {
    console.error('Load single template error:', error)
    return NextResponse.json({
      success: false,
      message: '読み込みエラー: ' + (error instanceof Error ? error.message : 'Unknown error')
    })
  }
}

async function deleteTemplate(templateId: string) {
  try {
    if (!templateId) {
      return NextResponse.json({
        success: false,
        message: 'template_idが指定されていません'
      })
    }

    const { error } = await supabase
      .from('html_templates')
      .delete()
      .eq('template_id', templateId)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: '✅ テンプレートを削除しました'
    })
  } catch (error) {
    console.error('Delete template error:', error)
    return NextResponse.json({
      success: false,
      message: '削除エラー: ' + (error instanceof Error ? error.message : 'Unknown error')
    })
  }
}
