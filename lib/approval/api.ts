/**
 * 承認システム - API通信関数
 * NAGANO-3 v2.0
 */

import { createClient } from '@/lib/supabase/client'
import type {
  ApprovalProduct,
  ApprovalListResponse,
  ApprovalActionResponse,
  FilterState,
  ApprovalStats,
} from '@/types/approval'

const supabase = createClient()

/**
 * 商品リストを取得
 */
export async function fetchApprovalProducts(
  filters: FilterState
): Promise<ApprovalListResponse> {
  try {
    // クエリ構築
    let query = supabase
      .from('products_master')
      .select('*', { count: 'exact' })

    // ステータスフィルター
    if (filters.status !== 'all') {
      query = query.eq('approval_status', filters.status)
    }

    // 検索
    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,title_en.ilike.%${filters.search}%`
      )
    }

    // カテゴリ
    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    // 原産国
    if (filters.originCountry) {
      query = query.eq('origin_country', filters.originCountry)
    }

    // 価格範囲
    if (filters.minPrice !== undefined) {
      query = query.gte('yahoo_price', filters.minPrice)
    }
    if (filters.maxPrice !== undefined) {
      query = query.lte('yahoo_price', filters.maxPrice)
    }

    // 利益範囲
    if (filters.minProfit !== undefined) {
      query = query.gte('profit_jpy', filters.minProfit)
    }
    if (filters.maxProfit !== undefined) {
      query = query.lte('profit_jpy', filters.maxProfit)
    }
    if (filters.minProfitRate !== undefined) {
      query = query.gte('profit_rate', filters.minProfitRate)
    }
    if (filters.maxProfitRate !== undefined) {
      query = query.lte('profit_rate', filters.maxProfitRate)
    }

    // スコア範囲
    if (filters.minScore !== undefined) {
      query = query.gte('final_score', filters.minScore)
    }
    if (filters.maxScore !== undefined) {
      query = query.lte('final_score', filters.maxScore)
    }

    // AIフィルター
    if (filters.aiFilter !== 'all') {
      switch (filters.aiFilter) {
        case 'high':
          query = query.gte('ai_confidence_score', 70)
          break
        case 'medium':
          query = query.gte('ai_confidence_score', 40).lt('ai_confidence_score', 70)
          break
        case 'low':
          query = query.lt('ai_confidence_score', 40)
          break
      }
    }

    // ソート
    const sortBy = filters.sortBy || 'created_at'
    const sortOrder = filters.sortOrder || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // ページネーション
    const from = (filters.page - 1) * filters.limit
    const to = from + filters.limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('商品リスト取得エラー:', error)
      throw new Error(`商品リストの取得に失敗しました: ${error.message}`)
    }

    // 統計を取得
    const stats = await fetchApprovalStats()

    return {
      products: (data as ApprovalProduct[]) || [],
      stats,
      total: count || 0,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil((count || 0) / filters.limit),
    }
  } catch (error) {
    console.error('商品リスト取得エラー:', error)
    throw error
  }
}

/**
 * 統計データを取得
 */
export async function fetchApprovalStats(): Promise<ApprovalStats> {
  try {
    const { data, error } = await supabase.rpc('get_approval_stats')

    if (error) {
      console.error('統計取得エラー:', error)
      // エラーの場合はデフォルト値を返す
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        avgScore: 0,
        avgPrice: 0,
        totalProfit: 0,
      }
    }

    return data || {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      avgScore: 0,
      avgPrice: 0,
      totalProfit: 0,
    }
  } catch (error) {
    console.error('統計取得エラー:', error)
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      avgScore: 0,
      avgPrice: 0,
      totalProfit: 0,
    }
  }
}

/**
 * 商品を承認
 */
export async function approveProducts(ids: number[]): Promise<ApprovalActionResponse> {
  try {
    const { data, error } = await supabase
      .from('products_master')
      .update({
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: 'system', // TODO: ユーザー名を取得
      })
      .in('id', ids)
      .select('id')

    if (error) {
      console.error('承認エラー:', error)
      throw new Error(`商品の承認に失敗しました: ${error.message}`)
    }

    return {
      success: true,
      message: `${ids.length}件の商品を承認しました`,
      updatedProducts: data?.map((p) => p.id) || [],
    }
  } catch (error) {
    console.error('承認エラー:', error)
    throw error
  }
}

/**
 * 商品を否認
 */
export async function rejectProducts(
  ids: number[],
  reason: string
): Promise<ApprovalActionResponse> {
  try {
    const { data, error } = await supabase
      .from('products_master')
      .update({
        approval_status: 'rejected',
        rejection_reason: reason,
        approved_at: new Date().toISOString(),
        approved_by: 'system', // TODO: ユーザー名を取得
      })
      .in('id', ids)
      .select('id')

    if (error) {
      console.error('否認エラー:', error)
      throw new Error(`商品の否認に失敗しました: ${error.message}`)
    }

    return {
      success: true,
      message: `${ids.length}件の商品を否認しました`,
      updatedProducts: data?.map((p) => p.id) || [],
    }
  } catch (error) {
    console.error('否認エラー:', error)
    throw error
  }
}

/**
 * フィルターオプションを取得
 */
export async function fetchFilterOptions() {
  try {
    // カテゴリ一覧
    const { data: categories } = await supabase
      .from('products_master')
      .select('category')
      .not('category', 'is', null)
      .order('category')

    // 原産国一覧
    const { data: countries } = await supabase
      .from('products_master')
      .select('origin_country')
      .not('origin_country', 'is', null)
      .order('origin_country')

    return {
      categories: [...new Set(categories?.map((c) => c.category).filter(Boolean) || [])],
      originCountries: [...new Set(countries?.map((c) => c.origin_country).filter(Boolean) || [])],
    }
  } catch (error) {
    console.error('フィルターオプション取得エラー:', error)
    return {
      categories: [],
      originCountries: [],
    }
  }
}
