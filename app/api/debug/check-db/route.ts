import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const results: any = {
    yahoo_scraped_products: null,
    products_master: null,
    analysis: {}
  }

  try {
    // 1. yahoo_scraped_products の最新データを確認
    const { data: yahooData, error: yahooError } = await supabase
      .from('yahoo_scraped_products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (yahooError) {
      results.yahoo_scraped_products = { error: yahooError.message }
    } else {
      results.yahoo_scraped_products = {
        count: yahooData?.length || 0,
        items: yahooData?.map(item => ({
          id: item.id,
          sku: item.sku,
          title: item.title?.substring(0, 50),
          price_jpy: item.price_jpy,
          created_at: item.created_at,
          scraped_data: {
            images_count: item.scraped_data?.images?.length || 0,
            condition: item.scraped_data?.condition,
            category: item.scraped_data?.category,
            shipping_cost: item.scraped_data?.shipping_cost
          }
        }))
      }
    }

    // 2. products_master の最新データを確認
    const { data: masterData, error: masterError } = await supabase
      .from('products_master')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (masterError) {
      results.products_master = { error: masterError.message }
    } else {
      results.products_master = {
        count: masterData?.length || 0,
        items: masterData?.map(item => ({
          id: item.id,
          sku: item.sku,
          title: item.title?.substring(0, 50),
          english_title: item.english_title?.substring(0, 50),
          category: item.category,
          condition_name: item.condition_name,
          price_jpy: item.price_jpy,
          gallery_images_count: item.gallery_images?.length || 0,
          created_at: item.created_at,
          scraped_data: {
            images_count: item.scraped_data?.images?.length || 0,
            condition: item.scraped_data?.condition,
            category: item.scraped_data?.category,
            shipping_cost: item.scraped_data?.shipping_cost
          }
        }))
      }
    }

    // 3. データ分析
    if (results.yahoo_scraped_products?.items?.length > 0) {
      const latest = results.yahoo_scraped_products.items[0]
      results.analysis.yahoo_latest = {
        has_price: !!latest.price_jpy && latest.price_jpy > 0,
        has_images: latest.scraped_data.images_count > 0,
        has_condition: !!latest.scraped_data.condition && latest.scraped_data.condition !== '不明',
        has_category: !!latest.scraped_data.category && latest.scraped_data.category !== '未分類',
        has_shipping: !!latest.scraped_data.shipping_cost
      }
    }

    if (results.products_master?.items?.length > 0) {
      const latest = results.products_master.items[0]
      results.analysis.master_latest = {
        has_price: !!latest.price_jpy && latest.price_jpy > 0,
        has_images: latest.gallery_images_count > 0,
        has_condition: !!latest.condition_name && latest.condition_name !== 'Unknown',
        has_category: !!latest.category && latest.category !== 'Uncategorized',
        has_english_title: !!latest.english_title
      }
    }

    // 4. 問題診断
    results.diagnosis = {
      scraping_working: results.analysis.yahoo_latest?.has_price || false,
      sync_working: results.analysis.master_latest?.has_price || false,
      missing_data_in_scraping: [],
      missing_data_in_master: []
    }

    if (results.analysis.yahoo_latest) {
      const yahoo = results.analysis.yahoo_latest
      if (!yahoo.has_price) results.diagnosis.missing_data_in_scraping.push('価格')
      if (!yahoo.has_images) results.diagnosis.missing_data_in_scraping.push('画像')
      if (!yahoo.has_condition) results.diagnosis.missing_data_in_scraping.push('商品状態')
      if (!yahoo.has_category) results.diagnosis.missing_data_in_scraping.push('カテゴリー')
      if (!yahoo.has_shipping) results.diagnosis.missing_data_in_scraping.push('送料')
    }

    if (results.analysis.master_latest) {
      const master = results.analysis.master_latest
      if (!master.has_price) results.diagnosis.missing_data_in_master.push('価格')
      if (!master.has_images) results.diagnosis.missing_data_in_master.push('画像')
      if (!master.has_condition) results.diagnosis.missing_data_in_master.push('商品状態')
      if (!master.has_category) results.diagnosis.missing_data_in_master.push('カテゴリー')
      if (!master.has_english_title) results.diagnosis.missing_data_in_master.push('英語タイトル')
    }

    return NextResponse.json(results, { status: 200 })

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      results
    }, { status: 500 })
  }
}
