/**
 * 承認システムAPI関数
 */

import { createClient } from '@/lib/supabase/client'
import type {
  Product,
  ApprovalStats,
  FilterState,
  ApprovalQueueResponse,
  ApprovalActionResponse,
  ApprovalHistoryEntry
} from '@/types/approval'

const supabase = createClient()

/**
 * 承認キューデータ取得
 */
export async function getApprovalQueue(
  filters: FilterState
): Promise<ApprovalQueueResponse> {
  try {
    let query = supabase
      .from('yahoo_scraped_products')
      .select('*', { count: 'exact' })

    // ステータスフィルター
    if (filters.status !== 'all') {
      query = query.eq('approval_status', filters.status)
    }

    // AI判定フィルター
    if (filters.aiFilter !== 'all') {
      switch (filters.aiFilter) {
        case 'ai-approved':
          query = query.gte('ai_confidence_score', 80)
          break
        case 'ai-pending':
          query = query.gte('ai_confidence_score', 40).lt('ai_confidence_score', 80)
          break
        case 'ai-rejected':
          query = query.lt('ai_confidence_score', 40)
          break
      }
    }

    // 価格フィルター
    if (filters.minPrice > 0) {
      query = query.gte('current_price', filters.minPrice)
    }
    if (filters.maxPrice > 0) {
      query = query.lte('current_price', filters.maxPrice)
    }

    // 検索キーワード
    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`)
    }

    // ソート: 承認待ち優先 → AIスコア降順 → 作成日降順
    query = query
      .order('approval_status', { ascending: true })
      .order('ai_confidence_score', { ascending: false })
      .order('created_at', { ascending: false })

    // ページネーション
    const from = (filters.page - 1) * filters.limit
    const to = from + filters.limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    return {
      products: data || [],
      totalCount: count || 0,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil((count || 0) / filters.limit)
    }
  } catch (error) {
    console.error('承認キュー取得エラー:', error)
    throw error
  }
}

/**
 * 統計情報取得
 */
export async function getApprovalStats(): Promise<ApprovalStats> {
  try {
    // 全商品数
    const { count: totalProducts } = await supabase
      .from('yahoo_scraped_products')
      .select('*', { count: 'exact', head: true })

    // 承認待ち
    const { count: totalPending } = await supabase
      .from('yahoo_scraped_products')
      .select('*', { count: 'exact', head: true })
      .eq('approval_status', 'pending')

    // 承認済み
    const { count: totalApproved } = await supabase
      .from('yahoo_scraped_products')
      .select('*', { count: 'exact', head: true })
      .eq('approval_status', 'approved')

    // 否認済み
    const { count: totalRejected } = await supabase
      .from('yahoo_scraped_products')
      .select('*', { count: 'exact', head: true })
      .eq('approval_status', 'rejected')

    // AI推奨
    const { count: aiApproved } = await supabase
      .from('yahoo_scraped_products')
      .select('*', { count: 'exact', head: true })
      .gte('ai_confidence_score', 80)

    // AI保留
    const { count: aiPending } = await supabase
      .from('yahoo_scraped_products')
      .select('*', { count: 'exact', head: true })
      .gte('ai_confidence_score', 40)
      .lt('ai_confidence_score', 80)

    // AI非推奨
    const { count: aiRejected } = await supabase
      .from('yahoo_scraped_products')
      .select('*', { count: 'exact', head: true })
      .lt('ai_confidence_score', 40)

    // 平均価格
    const { data: avgData } = await supabase
      .from('yahoo_scraped_products')
      .select('current_price')

    const avgPrice = avgData && avgData.length > 0
      ? Math.round(avgData.reduce((sum, p) => sum + (p.current_price || 0), 0) / avgData.length)
      : 0

    return {
      totalProducts: totalProducts || 0,
      totalPending: totalPending || 0,
      totalApproved: totalApproved || 0,
      totalRejected: totalRejected || 0,
      aiApproved: aiApproved || 0,
      aiPending: aiPending || 0,
      aiRejected: aiRejected || 0,
      avgPrice
    }
  } catch (error) {
    console.error('統計情報取得エラー:', error)
    throw error
  }
}

/**
 * 商品承認
 */
export async function approveProducts(
  productIds: number[],
  approvedBy: string = 'web_user'
): Promise<ApprovalActionResponse> {
  try {
    const errors: string[] = []
    let successCount = 0

    for (const productId of productIds) {
      try {
        // 商品情報取得
        const { data: product } = await supabase
          .from('yahoo_scraped_products')
          .select('approval_status, ai_confidence_score')
          .eq('id', productId)
          .single()

        // 承認処理
        const { error } = await supabase
          .from('yahoo_scraped_products')
          .update({
            approval_status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: approvedBy
          })
          .eq('id', productId)

        if (error) throw error

        // 履歴記録
        await recordApprovalHistory(
          productId,
          'approve',
          product?.approval_status || 'pending',
          'approved',
          null,
          approvedBy,
          product?.ai_confidence_score || 0
        )

        successCount++
      } catch (error) {
        errors.push(`商品ID ${productId}: ${error}`)
      }
    }

    return {
      success: successCount > 0,
      successCount,
      totalRequested: productIds.length,
      errors
    }
  } catch (error) {
    console.error('承認処理エラー:', error)
    throw error
  }
}

/**
 * 商品否認
 */
export async function rejectProducts(
  productIds: number[],
  reason: string,
  rejectedBy: string = 'web_user'
): Promise<ApprovalActionResponse> {
  try {
    const errors: string[] = []
    let successCount = 0

    for (const productId of productIds) {
      try {
        // 商品情報取得
        const { data: product } = await supabase
          .from('yahoo_scraped_products')
          .select('approval_status, ai_confidence_score')
          .eq('id', productId)
          .single()

        // 否認処理
        const { error } = await supabase
          .from('yahoo_scraped_products')
          .update({
            approval_status: 'rejected',
            rejection_reason: reason,
            approved_by: rejectedBy,
            approved_at: new Date().toISOString()
          })
          .eq('id', productId)

        if (error) throw error

        // 履歴記録
        await recordApprovalHistory(
          productId,
          'reject',
          product?.approval_status || 'pending',
          'rejected',
          reason,
          rejectedBy,
          product?.ai_confidence_score || 0
        )

        successCount++
      } catch (error) {
        errors.push(`商品ID ${productId}: ${error}`)
      }
    }

    return {
      success: successCount > 0,
      successCount,
      totalRequested: productIds.length,
      errors
    }
  } catch (error) {
    console.error('否認処理エラー:', error)
    throw error
  }
}

/**
 * 承認履歴記録
 */
async function recordApprovalHistory(
  productId: number,
  action: 'approve' | 'reject' | 'pending' | 'reset',
  previousStatus: string,
  newStatus: string,
  reason: string | null,
  processedBy: string,
  aiScore: number
): Promise<void> {
  try {
    await supabase
      .from('approval_history')
      .insert({
        product_id: productId,
        action,
        previous_status: previousStatus,
        new_status: newStatus,
        reason,
        processed_by: processedBy,
        ai_score_at_time: aiScore,
        processed_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('履歴記録エラー:', error)
  }
}

/**
 * 承認履歴取得
 */
export async function getApprovalHistory(
  productId: number
): Promise<ApprovalHistoryEntry[]> {
  try {
    const { data, error } = await supabase
      .from('approval_history')
      .select('*')
      .eq('product_id', productId)
      .order('processed_at', { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('履歴取得エラー:', error)
    return []
  }
}

/**
 * AIスコア更新
 */
export async function updateAIScore(
  productId: number,
  score: number,
  recommendation: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('yahoo_scraped_products')
      .update({
        ai_confidence_score: score,
        ai_recommendation: recommendation
      })
      .eq('id', productId)

    if (error) throw error

    return true
  } catch (error) {
    console.error('AIスコア更新エラー:', error)
    return false
  }
}

/**
 * ステータスリセット
 */
export async function resetApprovalStatus(
  productIds: number[]
): Promise<ApprovalActionResponse> {
  try {
    const errors: string[] = []
    let successCount = 0

    for (const productId of productIds) {
      try {
        const { error } = await supabase
          .from('yahoo_scraped_products')
          .update({
            approval_status: 'pending',
            approved_at: null,
            approved_by: null,
            rejection_reason: null
          })
          .eq('id', productId)

        if (error) throw error

        await recordApprovalHistory(
          productId,
          'reset',
          'approved',
          'pending',
          'ステータスリセット',
          'system',
          0
        )

        successCount++
      } catch (error) {
        errors.push(`商品ID ${productId}: ${error}`)
      }
    }

    return {
      success: successCount > 0,
      successCount,
      totalRequested: productIds.length,
      errors
    }
  } catch (error) {
    console.error('ステータスリセットエラー:', error)
    throw error
  }
}
