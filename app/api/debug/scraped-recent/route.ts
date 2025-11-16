import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // 最新のスクレイピングデータを取得
    const { data: recentScraped } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    // 今日のデータ
    const today = new Date().toISOString().split('T')[0]
    const { data: todayData } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
      .gte('created_at', today)
    
    // 最新データの画像状況
    const imageAnalysis = recentScraped?.map(item => ({
      id: item.id,
      sku: item.sku,
      title: item.title?.substring(0, 50),
      created_at: item.created_at,
      has_scraped_data: !!item.scraped_data,
      image_urls_in_scraped_data: item.scraped_data?.image_urls || [],
      direct_image_urls: item.image_urls || [],
      ebay_api_data: item.ebay_api_data || null
    }))
    
    return NextResponse.json({
      recent_5: recentScraped,
      today_count: todayData?.length || 0,
      today_data: todayData,
      image_analysis: imageAnalysis,
      note: '今スクレイピングしたデータがここに表示されます。画像URLがあるか確認してください。'
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
