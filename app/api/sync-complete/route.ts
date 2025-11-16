import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const results = []
  
  try {
    // ステップ1: yahoo_scraped_productsの既存データを削除
    const { error: deleteError } = await supabase
      .from('products_master')
      .delete()
      .eq('source_system', 'yahoo_scraped_products')
    
    results.push({ step: '既存データ削除', success: !deleteError })
    
    // ステップ2: yahoo_scraped_productsから全データ取得
    const { data: yahooData } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
    
    if (!yahooData) throw new Error('データ取得失敗')
    
    results.push({ step: 'データ取得', count: yahooData.length })
    
    // ステップ3: 完全版でinsert
    for (const y of yahooData) {
      // 画像URL
      const imageUrls = y.scraped_data?.image_urls || y.image_urls || []
      const primaryImage = Array.isArray(imageUrls) ? imageUrls[0] : null
      
      const completeData = {
        source_system: 'yahoo_scraped_products',
        source_id: String(y.id),
        sku: y.sku,
        title: y.title,
        title_en: y.english_title || y.title,
        description: y.listing_data?.html_description || null,
        
        // 価格
        current_price: y.price_usd || 0,
        cost_price: 0,
        profit_amount: y.profit_amount_usd || 0,
        profit_margin: y.profit_margin || 0,
        listing_price: y.price_usd || 0,
        suggested_price: y.recommended_price_usd || null,
        
        // カテゴリ
        category: y.category_name || y.ebay_api_data?.category_name || 'Uncategorized',
        category_id: y.category_number || y.ebay_api_data?.category_id || null,
        condition_name: y.listing_data?.condition || 'Unknown',
        
        // ステータス
        workflow_status: y.status || 'scraped',
        approval_status: y.approval_status || 'pending',
        listing_status: 'not_listed',
        
        // 在庫
        inventory_quantity: y.current_stock || 0,
        
        // 画像
        primary_image_url: primaryImage,
        gallery_images: imageUrls,
        
        // 配送・寸法
        shipping_cost: y.shipping_cost_usd || y.listing_data?.shipping_cost_usd || null,
        shipping_method: y.listing_data?.shipping_service || null,
        
        // AI
        ai_confidence_score: y.ai_confidence_score || null,
        ai_recommendation: y.ai_recommendation || null,
        
        // 承認
        approved_at: y.approved_at || null,
        approved_by: y.approved_by || null,
        rejection_reason: y.rejection_reason || null,
        
        // タイムスタンプ
        created_at: y.created_at,
        updated_at: y.updated_at || y.created_at
      }
      
      await supabase.from('products_master').insert(completeData)
    }
    
    results.push({ step: '同期完了', count: yahooData.length })
    
    // ステップ4: 確認
    const { data: gengar } = await supabase
      .from('products_master')
      .select('*')
      .eq('sku', 'NH0QT')
      .single()
    
    results.push({
      step: 'ゲンガー確認',
      has_all_data: {
        image: !!gengar?.primary_image_url,
        category: !!gengar?.category,
        price: !!gengar?.current_price
      }
    })
    
    return NextResponse.json({
      success: true,
      results,
      note: 'yahoo_scraped_productsの基本データのみ同期。SMデータ等は別途追加が必要'
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      results
    }, { status: 500 })
  }
}
