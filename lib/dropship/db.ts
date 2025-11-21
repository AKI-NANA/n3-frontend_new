/**
 * 無在庫輸入システム - データベースアクセスレイヤー
 *
 * Supabaseを使用したデータベース操作
 */

import { createClient } from '@/lib/supabase/client'
import { Product } from '@/types/product'

// ===============================================
// 型定義
// ===============================================

export interface DropshipOrder {
  id: string
  order_id: string
  marketplace: 'Amazon_JP' | 'eBay_JP'
  product_id: string
  sku: string
  quantity: number
  customer_address?: string
  order_date: Date

  purchase_id?: string
  purchase_status?: string
  supplier?: string
  supplier_price?: number
  purchase_date?: Date

  tracking_number?: string
  tracking_status?: string
  estimated_delivery_date?: Date
  actual_delivery_date?: Date

  fulfillment_status: string

  created_at: Date
  updated_at: Date
}

export interface PriceHistory {
  id: string
  product_id: string
  sku: string
  supplier: string
  supplier_price: number
  selling_price_jp?: number
  amazon_jp_price?: number
  ebay_jp_price?: number
  profit_margin?: number
  net_profit?: number
  change_reason?: string
  recorded_at: Date
}

export interface ScoringHistory {
  id: string
  product_id: string
  sku: string
  total_score: number
  profit_score?: number
  lead_time_score?: number
  reliability_score?: number
  selling_price_jp?: number
  supplier_price_usd?: number
  net_profit?: number
  profit_margin?: number
  lead_time_exceeded?: boolean
  low_profit_margin?: boolean
  unreliable_supplier?: boolean
  should_list?: boolean
  listing_priority?: 'high' | 'medium' | 'low'
  calculated_at: Date
}

export interface ListingHistory {
  id: string
  product_id: string
  sku: string
  marketplace: 'Amazon_JP' | 'eBay_JP'
  listing_id?: string
  listing_url?: string
  listing_status?: string
  listed_price?: number
  quantity?: number
  action: string
  action_date: Date
}

// ===============================================
// 商品関連
// ===============================================

/**
 * 無在庫輸入商品を取得
 */
export async function getDropshipProducts(filters?: {
  status?: string[]
  minScore?: number
  supplier?: string
  limit?: number
  offset?: number
}): Promise<{ data: Product[] | null; error: any }> {
  const supabase = createClient()

  let query = supabase
    .from('products')
    .select('*')
    .not('arbitrage_score', 'is', null)

  if (filters?.status && filters.status.length > 0) {
    query = query.in('arbitrage_status', filters.status)
  }

  if (filters?.minScore) {
    query = query.gte('arbitrage_score', filters.minScore)
  }

  if (filters?.supplier) {
    query = query.eq('potential_supplier', filters.supplier)
  }

  query = query.order('arbitrage_score', { ascending: false })

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
  }

  const { data, error } = await query

  return { data, error }
}

/**
 * 出品候補商品を取得
 */
export async function getListingCandidates(): Promise<{ data: any[] | null; error: any }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('dropship_listing_candidates')
    .select('*')

  return { data, error }
}

/**
 * 商品のスコアとステータスを更新
 */
export async function updateProductScore(
  productId: string,
  score: number,
  status?: string,
  supplierInfo?: {
    supplier: string
    price: number
    leadTime: number
  }
): Promise<{ error: any }> {
  const supabase = createClient()

  const updates: any = {
    arbitrage_score: score,
    updated_at: new Date().toISOString(),
  }

  if (status) {
    updates.arbitrage_status = status
  }

  if (supplierInfo) {
    updates.potential_supplier = supplierInfo.supplier
    updates.supplier_current_price = supplierInfo.price
    updates.estimated_lead_time_days = supplierInfo.leadTime
  }

  const { error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)

  return { error }
}

/**
 * 商品の出品IDを更新
 */
export async function updateListingId(
  productId: string,
  marketplace: 'amazon' | 'ebay',
  listingId: string
): Promise<{ error: any }> {
  const supabase = createClient()

  const field = marketplace === 'amazon' ? 'amazon_jp_listing_id' : 'ebay_jp_listing_id'

  const { error } = await supabase
    .from('products')
    .update({
      [field]: listingId,
      arbitrage_status: 'listed_on_multi',
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)

  return { error }
}

// ===============================================
// 受注関連
// ===============================================

/**
 * 受注を作成
 */
export async function createOrder(order: Omit<DropshipOrder, 'id' | 'created_at' | 'updated_at'>): Promise<{
  data: DropshipOrder | null
  error: any
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('dropship_orders')
    .insert([order])
    .select()
    .single()

  return { data, error }
}

/**
 * 受注を更新
 */
export async function updateOrder(
  orderId: string,
  updates: Partial<DropshipOrder>
): Promise<{ error: any }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('dropship_orders')
    .update(updates)
    .eq('id', orderId)

  return { error }
}

/**
 * アクティブな受注を取得
 */
export async function getActiveOrders(): Promise<{ data: any[] | null; error: any }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('dropship_active_orders')
    .select('*')

  return { data, error }
}

/**
 * 受注を検索
 */
export async function getOrderById(orderId: string): Promise<{
  data: DropshipOrder | null
  error: any
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('dropship_orders')
    .select('*')
    .eq('order_id', orderId)
    .single()

  return { data, error }
}

// ===============================================
// 価格履歴関連
// ===============================================

/**
 * 価格履歴を記録
 */
export async function recordPriceHistory(history: Omit<PriceHistory, 'id' | 'recorded_at'>): Promise<{
  data: PriceHistory | null
  error: any
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('dropship_price_history')
    .insert([history])
    .select()
    .single()

  return { data, error }
}

/**
 * 商品の価格履歴を取得
 */
export async function getPriceHistory(
  productId: string,
  limit: number = 30
): Promise<{ data: PriceHistory[] | null; error: any }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('dropship_price_history')
    .select('*')
    .eq('product_id', productId)
    .order('recorded_at', { ascending: false })
    .limit(limit)

  return { data, error }
}

/**
 * 価格改定が必要な商品を取得
 */
export async function getPriceUpdateNeeded(): Promise<{ data: any[] | null; error: any }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('dropship_price_update_needed')
    .select('*')

  return { data, error }
}

// ===============================================
// スコアリング履歴関連
// ===============================================

/**
 * スコアリング履歴を記録
 */
export async function recordScoringHistory(history: Omit<ScoringHistory, 'id' | 'calculated_at'>): Promise<{
  data: ScoringHistory | null
  error: any
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('dropship_scoring_history')
    .insert([history])
    .select()
    .single()

  return { data, error }
}

/**
 * 商品のスコアリング履歴を取得
 */
export async function getScoringHistory(
  productId: string,
  limit: number = 30
): Promise<{ data: ScoringHistory[] | null; error: any }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('dropship_scoring_history')
    .select('*')
    .eq('product_id', productId)
    .order('calculated_at', { ascending: false })
    .limit(limit)

  return { data, error }
}

// ===============================================
// 出品履歴関連
// ===============================================

/**
 * 出品履歴を記録
 */
export async function recordListingHistory(history: Omit<ListingHistory, 'id' | 'action_date'>): Promise<{
  data: ListingHistory | null
  error: any
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('dropship_listing_history')
    .insert([history])
    .select()
    .single()

  return { data, error }
}

/**
 * 商品の出品履歴を取得
 */
export async function getListingHistory(
  productId: string,
  limit: number = 30
): Promise<{ data: ListingHistory[] | null; error: any }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('dropship_listing_history')
    .select('*')
    .eq('product_id', productId)
    .order('action_date', { ascending: false })
    .limit(limit)

  return { data, error }
}

// ===============================================
// 統計情報関連
// ===============================================

/**
 * ダッシュボード統計情報を取得
 */
export async function getDashboardStats(): Promise<{
  data: {
    totalProducts: number
    listingCandidates: number
    activeListings: number
    activeOrders: number
    avgScore: number
  } | null
  error: any
}> {
  const supabase = createClient()

  try {
    // 総商品数
    const { count: totalProducts, error: error1 } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .not('arbitrage_score', 'is', null)

    // 出品候補数
    const { count: listingCandidates, error: error2 } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .in('arbitrage_status', ['in_research', 'tracked'])
      .gte('arbitrage_score', 60)

    // 出品中の商品数
    const { count: activeListings, error: error3 } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('arbitrage_status', 'listed_on_multi')

    // アクティブな受注数
    const { count: activeOrders, error: error4 } = await supabase
      .from('dropship_orders')
      .select('*', { count: 'exact', head: true })
      .not('fulfillment_status', 'in', ['shipped', 'cancelled'])

    // 平均スコア
    const { data: avgData, error: error5 } = await supabase
      .from('products')
      .select('arbitrage_score')
      .not('arbitrage_score', 'is', null)

    const avgScore = avgData && avgData.length > 0
      ? avgData.reduce((sum, p) => sum + (p.arbitrage_score || 0), 0) / avgData.length
      : 0

    if (error1 || error2 || error3 || error4 || error5) {
      return {
        data: null,
        error: error1 || error2 || error3 || error4 || error5,
      }
    }

    return {
      data: {
        totalProducts: totalProducts || 0,
        listingCandidates: listingCandidates || 0,
        activeListings: activeListings || 0,
        activeOrders: activeOrders || 0,
        avgScore: Math.round(avgScore * 10) / 10,
      },
      error: null,
    }
  } catch (error) {
    return { data: null, error }
  }
}
