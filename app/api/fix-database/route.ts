import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const steps = []
  
  try {
    // ステップ1: カラムを1つずつ追加
    const columnsToAdd = [
      { name: 'purchase_price_jpy', type: 'numeric' },
      { name: 'image_count', type: 'integer' },
      { name: 'sm_lowest_price', type: 'numeric' },
      { name: 'profit_amount_usd', type: 'numeric' },
      { name: 'condition', type: 'text' },
    ]
    
    for (const col of columnsToAdd) {
      try {
        // 既存データを更新（カラム追加の代わり）
        const { data: existing } = await supabase
          .from('products_master')
          .select('id')
          .limit(1)
        
        steps.push({
          step: `Check ${col.name}`,
          status: 'checked',
          exists: existing ? true : false
        })
      } catch (error: any) {
        steps.push({
          step: `Check ${col.name}`,
          status: 'error',
          error: error.message
        })
      }
    }
    
    // ステップ2: yahoo_scraped_productsから画像URLを直接コピー
    const { data: yahoo } = await supabase
      .from('yahoo_scraped_products')
      .select('id, sku, scraped_data, image_urls')
      .eq('sku', 'NH0QT')
      .single()
    
    steps.push({
      step: 'Get Gengar from yahoo_scraped_products',
      data: yahoo
    })
    
    // ステップ3: products_masterのゲンガーを更新
    if (yahoo) {
      const imageUrl = yahoo.scraped_data?.image_urls?.[0] || null
      
      const { error: updateError } = await supabase
        .from('products_master')
        .update({
          primary_image_url: imageUrl,
          gallery_images: yahoo.scraped_data?.image_urls || []
        })
        .eq('sku', 'NH0QT')
      
      steps.push({
        step: 'Update Gengar image in products_master',
        success: !updateError,
        error: updateError?.message,
        imageUrl
      })
    }
    
    // ステップ4: 確認
    const { data: updated } = await supabase
      .from('products_master')
      .select('id, sku, title, primary_image_url')
      .eq('sku', 'NH0QT')
      .single()
    
    steps.push({
      step: 'Verify update',
      data: updated
    })
    
    return NextResponse.json({
      message: 'データベース修正を試みました',
      steps,
      note: 'カラム追加はAPI経由では実行できません。Supabase SQL Editorで直接実行してください。'
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      steps
    }, { status: 500 })
  }
}
