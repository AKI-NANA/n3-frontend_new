import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // products_master から YAH-502882 を取得
    const { data: masterData, error: masterError } = await supabase
      .from('products_master')
      .select('*')
      .eq('sku', 'YAH-502882')
      .single()
    
    if (masterError) {
      console.error('Master query error:', masterError)
    }
    
    // yahoo_scraped_products からも取得
    const { data: yahooData, error: yahooError } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
      .eq('sku', 'YAH-502882')
      .single()
    
    if (yahooError) {
      console.error('Yahoo query error:', yahooError)
    }
    
    // 画像情報の詳細分析
    const imageAnalysis = {
      master: {
        primary_image_url: masterData?.primary_image_url || null,
        images_array: masterData?.images || null,
        images_count: Array.isArray(masterData?.images) ? masterData.images.length : 0,
        scraped_data_exists: !!masterData?.scraped_data,
        scraped_data_images: masterData?.scraped_data?.images || null,
        scraped_data_images_count: Array.isArray(masterData?.scraped_data?.images) 
          ? masterData.scraped_data.images.length 
          : 0
      },
      yahoo: {
        primary_image_url: yahooData?.primary_image_url || null,
        images_array: yahooData?.images || null,
        images_count: Array.isArray(yahooData?.images) ? yahooData.images.length : 0,
        scraped_data_exists: !!yahooData?.scraped_data,
        scraped_data_images: yahooData?.scraped_data?.images || null,
        scraped_data_images_count: Array.isArray(yahooData?.scraped_data?.images) 
          ? yahooData.scraped_data.images.length 
          : 0
      }
    }
    
    return NextResponse.json({
      success: true,
      master_found: !!masterData,
      yahoo_found: !!yahooData,
      master_data: masterData,
      yahoo_data: yahooData,
      image_analysis: imageAnalysis,
      comparison: {
        titles_match: masterData?.title === yahooData?.title,
        image_counts_match: imageAnalysis.master.images_count === imageAnalysis.yahoo.images_count,
        primary_urls_match: imageAnalysis.master.primary_image_url === imageAnalysis.yahoo.primary_image_url
      }
    })
    
  } catch (error: any) {
    console.error('Debug API error:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
