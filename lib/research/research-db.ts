// lib/research/research-db.ts
import { supabase } from '@/lib/supabase'

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
