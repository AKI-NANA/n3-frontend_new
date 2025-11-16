import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const results = []
  let totalInserted = 0
  
  try {
    // ============================================================
    // ステップ1: products_master を完全クリア
    // ============================================================
    const { error: clearError } = await supabase
      .from('products_master')
      .delete()
      .neq('id', 0)
    
    results.push({ step: '1. products_master 完全クリア', success: !clearError })
    
    // ============================================================
    // ステップ2: yahoo_scraped_products (11件)
    // ============================================================
    const { data: yahooData } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
    
    for (const y of yahooData || []) {
      const imageUrls = y.scraped_data?.image_urls || []
      
      await supabase.from('products_master').insert({
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
        condition_name: y.listing_data?.condition || 'Unknown',
        workflow_status: y.status || 'scraped',
        approval_status: y.approval_status || 'pending',
        listing_status: 'not_listed',
        listing_price: y.price_usd || 0,
        inventory_quantity: y.current_stock || 0,
        primary_image_url: imageUrls[0] || null,
        gallery_images: imageUrls,
        shipping_cost: y.shipping_cost_usd || null,
        ai_confidence_score: y.ai_confidence_score || null,
        created_at: y.created_at,
        updated_at: y.updated_at
      })
      totalInserted++
    }
    
    results.push({ step: '2. yahoo_scraped_products 同期', count: yahooData?.length || 0 })
    
    // ============================================================
    // ステップ3: products (1件)
    // ============================================================
    const { data: productsData } = await supabase
      .from('products_master')
      .select('*')
    
    for (const p of productsData || []) {
      await supabase.from('products_master').insert({
        source_system: 'products',
        source_id: p.id,
        sku: p.sku || `PROD-${p.id}`,
        title: p.title,
        title_en: p.english_title || p.title,
        current_price: p.price_usd || 0,
        profit_amount: p.price_usd || 0,
        profit_margin: 100,
        category: p.category || 'Collectibles',
        workflow_status: p.status || 'imported',
        approval_status: p.approval_status || 'pending',
        listing_status: 'not_listed',
        listing_price: p.price_usd || 0,
        inventory_quantity: p.quantity || 1,
        primary_image_url: null,
        gallery_images: [],
        created_at: p.created_at,
        updated_at: p.updated_at
      })
      totalInserted++
    }
    
    results.push({ step: '3. products 同期', count: productsData?.length || 0 })
    
    // ============================================================
    // ステップ4: ebay_inventory (100件)
    // ============================================================
    const { data: ebayData } = await supabase
      .from('ebay_inventory')
      .select('*')
    
    for (const e of ebayData || []) {
      await supabase.from('products_master').insert({
        source_system: 'ebay_inventory',
        source_id: String(e.id),
        sku: `EBAY-${e.item_id}`,
        title: e.title,
        title_en: e.title,
        description: e.description || null,
        current_price: e.price_usd || 0,
        cost_price: 0,
        profit_amount: 0,
        profit_margin: 0,
        category: e.metadata?.category_name || 'General',
        condition_name: e.metadata?.condition || 'Unknown',
        workflow_status: 'listed',
        approval_status: 'approved',
        listing_status: e.listing_status === 'Active' ? 'active' : 'not_listed',
        ebay_item_id: e.item_id,
        listing_price: e.price_usd || 0,
        inventory_quantity: e.quantity || 1,
        primary_image_url: null,
        gallery_images: [],
        seller: e.metadata?.seller_name || null,
        shipping_cost: e.metadata?.shipping_cost || null,
        created_at: e.created_at,
        updated_at: e.updated_at
      })
      totalInserted++
    }
    
    results.push({ step: '4. ebay_inventory 同期', count: ebayData?.length || 0 })
    
    // ============================================================
    // ステップ5: 最終確認
    // ============================================================
    const { count: finalCount } = await supabase
      .from('products_master')
      .select('*', { count: 'exact', head: true })
    
    const { data: gengar } = await supabase
      .from('products_master')
      .select('*')
      .eq('sku', 'NH0QT')
      .single()
    
    results.push({
      step: '5. 最終確認',
      total_inserted: totalInserted,
      actual_count: finalCount,
      gengar_has_image: !!gengar?.primary_image_url
    })
    
    return NextResponse.json({
      success: true,
      message: `✓ 完全統合完了！${totalInserted}件を同期`,
      results,
      summary: {
        yahoo: yahooData?.length || 0,
        products: productsData?.length || 0,
        ebay: ebayData?.length || 0,
        total: totalInserted,
        expected: 112
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      results
    }, { status: 500 })
  }
}
