import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // 1. yahoo_scraped_products から YAH-502882 を取得
    const { data: yahooData, error: yahooError } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
      .eq('sku', 'YAH-502882')
      .single()
    
    // 2. products_master から YAH-502882 を取得
    const { data: masterData, error: masterError } = await supabase
      .from('products_master')
      .select('*')
      .eq('sku', 'YAH-502882')
      .single()
    
    // 3. 各テーブルの存在確認
    const comparison = {
      yahoo_exists: !yahooError && !!yahooData,
      master_exists: !masterError && !!masterData,
      
      yahoo_images: {
        primary_image_url: yahooData?.primary_image_url,
        images: yahooData?.images,
        images_type: typeof yahooData?.images,
        images_count: Array.isArray(yahooData?.images) ? yahooData.images.length : 0,
        scraped_data: yahooData?.scraped_data,
        scraped_data_has_images: !!(yahooData?.scraped_data?.images),
        scraped_data_images_count: Array.isArray(yahooData?.scraped_data?.images) 
          ? yahooData.scraped_data.images.length 
          : 0
      },
      
      master_images: {
        primary_image_url: masterData?.primary_image_url,
        gallery_images: masterData?.gallery_images,
        gallery_images_count: Array.isArray(masterData?.gallery_images) ? masterData.gallery_images.length : 0,
        images: masterData?.images,
        scraped_data: masterData?.scraped_data,
        listing_data: masterData?.listing_data,
        ebay_api_data: masterData?.ebay_api_data
      },
      
      field_comparison: {
        title_match: yahooData?.title === masterData?.title,
        sku_match: yahooData?.sku === masterData?.sku,
        price_match: yahooData?.price_jpy === masterData?.current_price
      }
    }
    
    return NextResponse.json({
      success: true,
      comparison,
      yahoo_data: yahooData,
      master_data: masterData,
      yahoo_error: yahooError?.message || null,
      master_error: masterError?.message || null
    })
    
  } catch (error: any) {
    console.error('Compare tables error:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
