// lib/research/research-db.ts
import { supabase } from '@/lib/supabase'
import type { Product, ResearchStatus, ReferenceUrl } from '@/types/product'

export interface ResearchResult {
  search_keyword: string
  ebay_item_id: string
  title: string
  price_usd: number
  sold_count: number
  category_id?: string
  category_name?: string
  condition?: string
  seller_username?: string
  image_url?: string
  view_item_url?: string
  
  // SellerMirror情報
  lowest_price_usd?: number
  average_price_usd?: number
  competitor_count?: number
  estimated_weight_g?: number
  
  // 利益計算結果
  profit_margin_at_lowest?: number
  profit_amount_at_lowest_usd?: number
  profit_amount_at_lowest_jpy?: number
  recommended_cost_jpy?: number
  
  // その他
  item_specifics?: any
  listing_type?: string
  location_country?: string
  location_city?: string
  shipping_cost_usd?: number
}

/**
 * リサーチ結果をDBに保存
 */
export async function saveResearchResults(results: ResearchResult[]) {
  try {
    console.log(`💾 リサーチ結果をDBに保存: ${results.length}件`)
    
    const { data, error } = await supabase
      .from('research_results')
      .upsert(results, {
        onConflict: 'ebay_item_id',
        ignoreDuplicates: false
      })
    
    if (error) {
      console.error('❌ DB保存エラー:', error)
      throw error
    }
    
    console.log('✅ DB保存完了')
    return { success: true, data }
  } catch (error) {
    console.error('❌ saveResearchResults エラー:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * eBay Item IDからリサーチ結果を取得
 */
export async function getResearchResult(ebayItemId: string) {
  try {
    const { data, error } = await supabase
      .from('research_results')
      .select('*')
      .eq('ebay_item_id', ebayItemId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        // データが見つからない場合
        return { success: true, data: null }
      }
      throw error
    }
    
    return { success: true, data }
  } catch (error) {
    console.error('❌ getResearchResult エラー:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * キーワードでリサーチ結果を検索
 */
export async function searchResearchResults(keyword: string, limit = 100) {
  try {
    const { data, error } = await supabase
      .from('research_results')
      .select('*')
      .ilike('search_keyword', `%${keyword}%`)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error) {
    console.error('❌ searchResearchResults エラー:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * カテゴリ必須項目をキャッシュから取得
 */
export async function getCategoryAspects(categoryId: string) {
  try {
    const { data, error } = await supabase
      .from('ebay_category_aspects')
      .select('*')
      .eq('category_id', categoryId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true, data: null }
      }
      throw error
    }
    
    return { success: true, data }
  } catch (error) {
    console.error('❌ getCategoryAspects エラー:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * カテゴリ必須項目をキャッシュに保存
 */
export async function saveCategoryAspects(categoryId: string, categoryName: string, aspects: any) {
  try {
    const { data, error } = await supabase
      .from('ebay_category_aspects')
      .upsert({
        category_id: categoryId,
        category_name: categoryName,
        aspects: aspects
      }, {
        onConflict: 'category_id'
      })

    if (error) throw error

    console.log(`✅ カテゴリ必須項目をキャッシュ: ${categoryId}`)
    return { success: true, data }
  } catch (error) {
    console.error('❌ saveCategoryAspects エラー:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// ============================================
// リサーチデータリポジトリ 操作関数
// フェーズI: データアーキテクチャ基盤構築
// ============================================

/**
 * リサーチレコードインターフェース
 * research_repository テーブル用の型定義
 */
export interface ResearchRecord {
  repository_id?: string
  product_id?: string | null
  research_date?: string
  research_user_id?: string | null

  // 商品基本情報
  title: string
  english_title?: string | null
  external_url?: string | null
  asin_sku?: string | null

  // ステータス管理
  status: ResearchStatus

  // 価格・利益情報
  price_jpy?: number | null
  purchase_price_jpy?: number | null
  profit_margin?: number | null
  profit_amount_usd?: number | null

  // AI解析結果
  vero_risk_score?: number | null
  vero_risk_level?: string | null
  hts_code?: string | null
  hts_confidence?: string | null
  origin_country?: string | null

  // スコアリング情報
  priority_score?: number | null

  // 市場分析情報
  ranking?: number | null
  sales_count?: number | null
  release_date?: string | null
  median_price?: number | null

  // 競合情報
  sm_lowest_price?: number | null
  sm_average_price?: number | null
  sm_competitor_count?: number | null
  sm_sales_count?: number | null

  // 在庫追従情報
  current_stock_count?: number | null
  last_check_time?: string | null
  check_frequency?: string | null

  // 重複チェック
  is_duplicate?: boolean

  // 詳細データ（JSONB）
  analysis_details?: any
  reference_urls?: ReferenceUrl[]

  // カテゴリ情報
  category_name?: string | null
  category_id?: string | null
  ebay_category_id?: string | null

  // データソース
  data_source?: string | null
}

/**
 * 販売実績レコードインターフェース
 * sales_records テーブル用の型定義
 */
export interface SalesRecord {
  sale_id?: string
  original_research_id: string
  sale_date?: string
  marketplace: string
  marketplace_listing_id?: string | null

  final_selling_price_usd: number
  final_selling_price_jpy?: number | null
  final_profit_margin?: number | null
  final_profit_amount_usd?: number | null

  quantity_sold?: number

  sold_title?: string | null
  sold_sku?: string | null
  sold_condition?: string | null

  buyer_country?: string | null
  shipping_cost_usd?: number | null

  sale_details?: any
}

/**
 * 新しいリサーチレコードをリポジトリに挿入
 *
 * @param data Product型のデータ（Productインターフェースからマッピング）
 * @returns 挿入結果
 */
export async function insertResearchRecord(data: Partial<Product>): Promise<{ success: boolean; data?: any; error?: string; repository_id?: string }> {
  try {
    console.log('💾 リサーチレコードをリポジトリに挿入中...')

    // Product型からResearchRecord型へマッピング
    const researchRecord: ResearchRecord = {
      title: data.title || 'Untitled',
      english_title: data.english_title,
      external_url: data.external_url,
      asin_sku: data.asin_sku,
      status: data.research_status || 'Pending',
      price_jpy: data.price,
      purchase_price_jpy: data.cost,
      profit_margin: data.profit,
      priority_score: data.priority_score,
      ranking: data.ranking,
      sales_count: data.sales_count,
      release_date: data.release_date,
      median_price: data.median_price,
      current_stock_count: data.current_stock_count,
      last_check_time: data.last_check_time,
      check_frequency: data.check_frequency,
      is_duplicate: data.is_duplicate || false,
      reference_urls: data.reference_urls,
      hts_code: data.hts_code,
      origin_country: data.origin_country,
      category_name: data.category_name,
      analysis_details: {
        hts_source: data.hts_source,
        hts_score: data.hts_score,
        hts_confidence: data.hts_confidence,
        // 他のメタデータも格納可能
      }
    }

    const { data: insertedData, error } = await supabase
      .from('research_repository')
      .insert([researchRecord])
      .select()
      .single()

    if (error) {
      console.error('❌ リサーチレコード挿入エラー:', error)
      throw error
    }

    console.log('✅ リサーチレコード挿入完了:', insertedData.repository_id)
    return {
      success: true,
      data: insertedData,
      repository_id: insertedData.repository_id
    }
  } catch (error) {
    console.error('❌ insertResearchRecord エラー:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * リサーチレコードのステータスを更新
 *
 * @param id リポジトリID
 * @param newStatus 新しいステータス（Pending/Promoted/Rejected/Draft）
 * @returns 更新結果
 */
export async function updateResearchStatus(
  id: string,
  newStatus: ResearchStatus
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log(`🔄 リサーチステータス更新中: ${id} -> ${newStatus}`)

    const { data, error } = await supabase
      .from('research_repository')
      .update({ status: newStatus })
      .eq('repository_id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ ステータス更新エラー:', error)
      throw error
    }

    console.log('✅ ステータス更新完了:', data.repository_id)
    return { success: true, data }
  } catch (error) {
    console.error('❌ updateResearchStatus エラー:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 承認されたリサーチレコードをSKUマスター（products_master）にコピー
 * status が 'Promoted' になった際に呼び出される
 *
 * @param repositoryId リポジトリID
 * @returns コピー結果
 */
export async function copyToSKUMaster(
  repositoryId: string
): Promise<{ success: boolean; data?: any; error?: string; product_id?: string }> {
  try {
    console.log(`📋 SKUマスターへコピー中: ${repositoryId}`)

    // リポジトリからデータを取得
    const { data: researchData, error: fetchError } = await supabase
      .from('research_repository')
      .select('*')
      .eq('repository_id', repositoryId)
      .single()

    if (fetchError || !researchData) {
      console.error('❌ リサーチデータ取得エラー:', fetchError)
      throw fetchError || new Error('リサーチデータが見つかりません')
    }

    // ステータスが Promoted でない場合はエラー
    if (researchData.status !== 'Promoted') {
      throw new Error(`ステータスがPromotedではありません: ${researchData.status}`)
    }

    // products_masterにコピーするデータを構築
    const productData = {
      source_table: 'research_repository',
      source_id: repositoryId,
      title: researchData.title,
      english_title: researchData.english_title,
      price_jpy: researchData.price_jpy,
      purchase_price_jpy: researchData.purchase_price_jpy,
      profit_margin: researchData.profit_margin,
      profit_amount_usd: researchData.profit_amount_usd,
      hts_code: researchData.hts_code,
      origin_country: researchData.origin_country,
      category_name: researchData.category_name,
      category_id: researchData.category_id,
      ebay_category_id: researchData.ebay_category_id,
      sm_lowest_price: researchData.sm_lowest_price,
      sm_average_price: researchData.sm_average_price,
      sm_competitor_count: researchData.sm_competitor_count,
      sm_sales_count: researchData.sm_sales_count,
      listing_score: researchData.priority_score,
      status: 'Approved', // products_masterのステータス
      listing_data: {
        reference_urls: researchData.reference_urls,
        analysis_details: researchData.analysis_details,
      }
    }

    // products_masterに挿入
    const { data: insertedProduct, error: insertError } = await supabase
      .from('products_master')
      .insert([productData])
      .select()
      .single()

    if (insertError) {
      console.error('❌ products_master挿入エラー:', insertError)
      throw insertError
    }

    // リポジトリのproduct_idを更新（紐付け）
    const { error: updateError } = await supabase
      .from('research_repository')
      .update({ product_id: insertedProduct.id })
      .eq('repository_id', repositoryId)

    if (updateError) {
      console.warn('⚠️ product_id更新エラー:', updateError)
      // エラーでも処理は続行（紐付けは任意）
    }

    console.log('✅ SKUマスターへコピー完了:', insertedProduct.id)
    return {
      success: true,
      data: insertedProduct,
      product_id: insertedProduct.id
    }
  } catch (error) {
    console.error('❌ copyToSKUMaster エラー:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * リサーチリポジトリから全データを取得（フィルタ付き）
 *
 * @param filters フィルタ条件
 * @returns リサーチレコードの配列
 */
export async function getResearchRepository(filters?: {
  status?: ResearchStatus
  data_source?: string
  limit?: number
}) {
  try {
    let query = supabase
      .from('research_repository')
      .select('*')
      .order('research_date', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.data_source) {
      query = query.eq('data_source', filters.data_source)
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('❌ getResearchRepository エラー:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 販売実績を記録
 *
 * @param salesData 販売実績データ
 * @returns 挿入結果
 */
export async function recordSale(salesData: SalesRecord): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('💰 販売実績を記録中...')

    const { data, error } = await supabase
      .from('sales_records')
      .insert([salesData])
      .select()
      .single()

    if (error) {
      console.error('❌ 販売実績記録エラー:', error)
      throw error
    }

    console.log('✅ 販売実績記録完了:', data.sale_id)
    return { success: true, data }
  } catch (error) {
    console.error('❌ recordSale エラー:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 統計分析用ビューからデータを取得
 * research_sales_analytics ビューを使用
 *
 * @returns クロス集計データ
 */
export async function getResearchSalesAnalytics() {
  try {
    const { data, error } = await supabase
      .from('research_sales_analytics')
      .select('*')
      .order('research_date', { ascending: false })

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('❌ getResearchSalesAnalytics エラー:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
