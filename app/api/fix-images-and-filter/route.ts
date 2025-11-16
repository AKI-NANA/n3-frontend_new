import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const results = []
  
  try {
    // ============================================================
    // ステップ1: ebay_inventory を products_master から削除
    // ============================================================
    const { error: deleteEbay } = await supabase
      .from('products_master')
      .delete()
      .eq('source_system', 'ebay_inventory')
    
    results.push({
      step: '1. ebay_inventory削除（出品済みは表示しない）',
      success: !deleteEbay
    })
    
    // ============================================================
    // ステップ2: yahoo_scraped_products の画像を修正
    // ============================================================
    const { data: yahooData } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
    
    let fixed = 0
    for (const y of yahooData || []) {
      // scraped_data.images を確認（image_urlsではない！）
      const imageUrls = y.scraped_data?.images || y.scraped_data?.image_urls || []
      
      if (imageUrls.length > 0) {
        await supabase
          .from('products_master')
          .update({
            primary_image_url: imageUrls[0],
            gallery_images: imageUrls
          })
          .eq('source_system', 'yahoo_scraped_products')
          .eq('source_id', String(y.id))
        
        fixed++
      }
    }
    
    results.push({
      step: '2. yahoo画像修正（scraped_data.imagesから取得）',
      fixed_count: fixed
    })
    
    // ============================================================
    // ステップ3: 確認
    // ============================================================
    const { count: totalCount } = await supabase
      .from('products_master')
      .select('*', { count: 'exact', head: true })
    
    const { count: withImages } = await supabase
      .from('products_master')
      .select('*', { count: 'exact', head: true })
      .not('primary_image_url', 'is', null)
    
    const { data: sampleWithImages } = await supabase
      .from('products_master')
      .select('id, sku, title, primary_image_url')
      .not('primary_image_url', 'is', null)
      .limit(5)
    
    results.push({
      step: '3. 最終確認',
      total: totalCount,
      with_images: withImages,
      without_images: (totalCount || 0) - (withImages || 0),
      sample: sampleWithImages
    })
    
    return NextResponse.json({
      success: true,
      message: `✓ 修正完了！ebay除外、画像${fixed}件修正`,
      results,
      note: 'これで承認画面には未出品データのみ、画像付きで表示されます'
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      results
    }, { status: 500 })
  }
}
