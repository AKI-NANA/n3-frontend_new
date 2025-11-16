import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const results = []
  
  try {
    // yahoo_scraped_productsの全データを取得
    const { data: yahooData } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
    
    results.push({
      step: 'yahoo_scraped_products取得',
      count: yahooData?.length || 0
    })
    
    // 各商品の画像URL状況を確認
    const imageStatus = yahooData?.map(y => {
      const scrapedImages = y.scraped_data?.image_urls || []
      const directImages = y.image_urls || []
      
      return {
        id: y.id,
        sku: y.sku,
        title: y.title.substring(0, 50),
        has_scraped_images: scrapedImages.length > 0,
        has_direct_images: directImages.length > 0,
        scraped_count: scrapedImages.length,
        direct_count: directImages.length,
        scraped_urls: scrapedImages,
        direct_urls: directImages
      }
    })
    
    results.push({
      step: '画像URL分析',
      data: imageStatus
    })
    
    // products_masterを更新
    let updated = 0
    for (const y of yahooData || []) {
      const imageUrls = y.scraped_data?.image_urls || y.image_urls || []
      
      if (imageUrls.length > 0) {
        const { error } = await supabase
          .from('products_master')
          .update({
            primary_image_url: imageUrls[0],
            gallery_images: imageUrls
          })
          .eq('source_system', 'yahoo_scraped_products')
          .eq('source_id', String(y.id))
        
        if (!error) updated++
      }
    }
    
    results.push({
      step: 'products_master更新',
      updated_count: updated
    })
    
    // 確認
    const { data: afterUpdate } = await supabase
      .from('products_master')
      .select('id, sku, primary_image_url')
      .eq('source_system', 'yahoo_scraped_products')
      .not('primary_image_url', 'is', null)
    
    results.push({
      step: '更新後確認',
      with_images: afterUpdate?.length || 0
    })
    
    return NextResponse.json({
      success: true,
      results,
      note: 'yahoo_scraped_productsの画像を確認・更新しました'
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      results
    }, { status: 500 })
  }
}
