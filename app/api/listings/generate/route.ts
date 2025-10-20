import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

/**
 * 出品時にHTMLを動的生成するエンドポイント
 * POST /api/listings/generate
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const {
      product_id,
      template_id,
      mall_type,
      country_code,
      product_data  // { title, price, condition, brand, description, shipping_info }
    } = body

    if (!product_id || !template_id || !mall_type || !product_data) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // テンプレート取得
    const { data: template, error: templateError } = await supabase
      .from('html_templates')
      .select('*')
      .eq('id', template_id)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { success: false, message: 'Template not found' },
        { status: 404 }
      )
    }

    // HTMLを動的生成（商品データ埋め込み）
    let generatedHtml = template.html_content
    
    // プレースホルダーを置換
    generatedHtml = generatedHtml.replace(/\{\{TITLE\}\}/g, product_data.title || '')
    generatedHtml = generatedHtml.replace(/\{\{PRICE\}\}/g, product_data.price || '')
    generatedHtml = generatedHtml.replace(/\{\{CONDITION\}\}/g, product_data.condition || '')
    generatedHtml = generatedHtml.replace(/\{\{BRAND\}\}/g, product_data.brand || '')
    generatedHtml = generatedHtml.replace(/\{\{DESCRIPTION\}\}/g, product_data.description || '')
    generatedHtml = generatedHtml.replace(/\{\{SHIPPING_INFO\}\}/g, product_data.shipping_info || '')

    // listing_id 生成
    const listing_id = `LST-${Date.now()}-${template_id}`

    // listings テーブルに保存
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert([
        {
          listing_id,
          product_id,
          template_id,
          mall_type,
          country_code,
          generated_html: generatedHtml,
          data_used: product_data,
          status: 'ready',
          created_at: new Date().toISOString(),
        }
      ])
      .select()

    if (listingError) {
      console.error('Listing insert error:', listingError)
      return NextResponse.json(
        { success: false, message: 'Failed to save listing' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      listing_id: listing_id,
      generated_html: generatedHtml,
      mall_type,
      country_code,
      message: `${mall_type.toUpperCase()}(${country_code}) 用HTMLを生成しました`
    })

  } catch (error) {
    console.error('Generate HTML error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
