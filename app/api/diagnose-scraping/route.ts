import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const report: any = {
    scraping_system_status: {},
    recent_scrapes: [],
    api_endpoints: [],
    frontend_files: [],
    recommendations: []
  }
  
  try {
    // ============================================================
    // 1. 最近のスクレイピング履歴（過去7日間）
    // ============================================================
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { data: recentScrapes, count: totalCount } = await supabase
      .from('yahoo_scraped_products')
      .select('*', { count: 'exact' })
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10)
    
    report.recent_scrapes = {
      last_7_days: recentScrapes?.length || 0,
      total_ever: totalCount || 0,
      latest_items: recentScrapes?.map(item => ({
        id: item.id,
        sku: item.sku,
        title: item.title?.substring(0, 50),
        created_at: item.created_at,
        has_images: !!(item.scraped_data?.images || item.scraped_data?.image_urls),
        image_count: (item.scraped_data?.images || item.scraped_data?.image_urls || []).length
      }))
    }
    
    // ============================================================
    // 2. 今日のスクレイピング
    // ============================================================
    const today = new Date().toISOString().split('T')[0]
    const { data: todayData } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
      .gte('created_at', today)
    
    report.scraping_system_status.today = {
      count: todayData?.length || 0,
      items: todayData?.map(item => ({
        sku: item.sku,
        title: item.title?.substring(0, 40),
        has_data: !!(item.scraped_data || item.listing_data)
      }))
    }
    
    // ============================================================
    // 3. データ構造の確認（最新1件のフル構造）
    // ============================================================
    const { data: latestItem } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (latestItem) {
      report.scraping_system_status.latest_structure = {
        has_scraped_data: !!latestItem.scraped_data,
        has_listing_data: !!latestItem.listing_data,
        has_ebay_api_data: !!latestItem.ebay_api_data,
        scraped_data_keys: latestItem.scraped_data ? Object.keys(latestItem.scraped_data) : [],
        image_field_location: latestItem.scraped_data?.images ? 'scraped_data.images' : 
                              latestItem.scraped_data?.image_urls ? 'scraped_data.image_urls' :
                              latestItem.image_urls ? 'image_urls' : 'なし',
        sample_data: latestItem
      }
    }
    
    // ============================================================
    // 4. products_masterへの同期状況
    // ============================================================
    const { data: yahooInMaster } = await supabase
      .from('products_master')
      .select('id, source_id, sku, created_at')
      .eq('source_system', 'yahoo_scraped_products')
      .order('created_at', { ascending: false })
      .limit(5)
    
    const yahooIds = recentScrapes?.map(s => String(s.id)) || []
    const masterIds = yahooInMaster?.map(m => m.source_id) || []
    const notSynced = yahooIds.filter(id => !masterIds.includes(id))
    
    report.scraping_system_status.sync_status = {
      yahoo_count: totalCount || 0,
      master_count: yahooInMaster?.length || 0,
      recent_not_synced: notSynced.length,
      needs_sync: notSynced.length > 0
    }
    
    // ============================================================
    // 5. 推奨事項
    // ============================================================
    if (todayData?.length === 0) {
      report.recommendations.push({
        priority: 'HIGH',
        issue: '本日のスクレイピングなし',
        detail: 'データ収集ページでスクレイピングが実行されていません',
        action: 'http://localhost:3000/data-collection でURLを入力してスクレイピング実行'
      })
    }
    
    if (recentScrapes?.some(s => !s.scraped_data && !s.listing_data)) {
      report.recommendations.push({
        priority: 'CRITICAL',
        issue: 'スクレイピングデータが空',
        detail: '一部のレコードでscraped_dataが欠落しています',
        action: 'スクレイピングロジックの確認が必要'
      })
    }
    
    if (notSynced.length > 0) {
      report.recommendations.push({
        priority: 'MEDIUM',
        issue: `${notSynced.length}件が未同期`,
        detail: 'yahoo_scraped_productsのデータがproducts_masterに同期されていません',
        action: 'GET /api/sync-all-tables を実行'
      })
    }
    
    return NextResponse.json(report, { status: 200 })
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      partial_report: report
    }, { status: 500 })
  }
}
