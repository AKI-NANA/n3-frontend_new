import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const results = []
  
  try {
    // ステップ1: yahoo_scraped_productsから完全データを再同期
    // 既存のyahoo_scraped_productsデータを削除
    const { error: deleteError } = await supabase
      .from('products_master')
      .delete()
      .eq('source_system', 'yahoo_scraped_products')
    
    results.push({
      step: '既存yahoo_scraped_productsデータ削除',
      success: !deleteError,
      error: deleteError?.message
    })
    
    // yahoo_scraped_productsから全データ取得
    const { data: yahooData, error: fetchError } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
    
    results.push({
      step: 'yahoo_scraped_products データ取得',
      success: !fetchError,
      count: yahooData?.length || 0
    })
    
    if (!yahooData || fetchError) {
      throw new Error('yahoo_scraped_products データ取得失敗')
    }
    
    // 1件ずつinsert
    for (const y of yahooData) {
      // 画像URL抽出
      let primaryImageUrl = null
      let galleryImages = []
      
      if (y.scraped_data?.image_urls && Array.isArray(y.scraped_data.image_urls)) {
        primaryImageUrl = y.scraped_data.image_urls[0] || null
        galleryImages = y.scraped_data.image_urls
      } else if (y.image_urls && Array.isArray(y.image_urls)) {
        primaryImageUrl = y.image_urls[0] || null
        galleryImages = y.image_urls
      }
      
      const insertData = {
        source_system: 'yahoo_scraped_products',
        source_id: String(y.id),
        sku: y.sku,
        title: y.title,
        title_en: y.english_title || y.title,
        description: y.listing_data?.html_description || null,
        current_price: y.price_usd || 0,
        cost_price: 0,
        profit_amount: y.profit_amount_usd || 0,
        profit_margin: y.profit_margin || 0,
        category: y.category_name || 'Uncategorized',
        category_id: y.category_number || null,
        condition_name: y.listing_data?.condition || 'Unknown',
        workflow_status: y.status || 'scraped',
        approval_status: y.approval_status || 'pending',
        listing_status: 'not_listed',
        listing_price: y.price_usd || 0,
        inventory_quantity: y.current_stock || 0,
        primary_image_url: primaryImageUrl,
        gallery_images: galleryImages,
        shipping_cost: y.shipping_cost_usd || null,
        ai_confidence_score: y.ai_confidence_score || null,
        ai_recommendation: y.ai_recommendation || null,
        approved_at: y.approved_at || null,
        approved_by: y.approved_by || null,
        rejection_reason: y.rejection_reason || null,
        created_at: y.created_at,
        updated_at: y.updated_at || y.created_at
      }
      
      const { error: insertError } = await supabase
        .from('products_master')
        .insert(insertData)
      
      if (insertError) {
        results.push({
          step: `Insert ${y.sku}`,
          success: false,
          error: insertError.message,
          data: insertData
        })
      }
    }
    
    results.push({
      step: 'データ同期完了',
      success: true,
      inserted: yahooData.length
    })
    
    // 確認
    const { data: gengar } = await supabase
      .from('products_master')
      .select('id, sku, title, primary_image_url, current_price')
      .ilike('title', '%ゲンガー%')
    
    results.push({
      step: 'ゲンガー確認',
      data: gengar
    })
    
    const { count } = await supabase
      .from('products_master')
      .select('*', { count: 'exact', head: true })
      .eq('source_system', 'yahoo_scraped_products')
    
    results.push({
      step: '最終確認',
      totalRecords: count
    })
    
    return NextResponse.json({
      success: true,
      message: '✓ データ同期完了',
      results
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      results
    }, { status: 500 })
  }
}
