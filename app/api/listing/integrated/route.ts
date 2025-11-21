// app/api/listing/integrated/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  ListingItem,
  ListingFilter,
  ListingSort,
  PerformanceGrade,
  StockDetail,
  MallStatus
} from '@/lib/types/listing'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * GET: 統合出品データ取得・集約API
 *
 * クエリパラメータ:
 * - mall: フィルタリングするモール
 * - status: ステータスフィルター
 * - performance_grade: パフォーマンスグレードフィルター
 * - sort_field: ソートフィールド
 * - sort_order: ソート順序 (asc/desc)
 * - search: 検索クエリ (SKU, タイトル)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // フィルター取得
    const filter: ListingFilter = {
      mall: searchParams.get('mall') as any,
      status: searchParams.get('status') as any,
      performance_grade: searchParams.get('performance_grade') as any,
      search_query: searchParams.get('search') || undefined,
      price_min: searchParams.get('price_min') ? parseFloat(searchParams.get('price_min')!) : undefined,
      price_max: searchParams.get('price_max') ? parseFloat(searchParams.get('price_max')!) : undefined,
      stock_min: searchParams.get('stock_min') ? parseInt(searchParams.get('stock_min')!) : undefined,
      stock_max: searchParams.get('stock_max') ? parseInt(searchParams.get('stock_max')!) : undefined,
    }

    // ソート取得
    const sort: ListingSort = {
      field: (searchParams.get('sort_field') || 'updated_at') as any,
      order: (searchParams.get('sort_order') || 'desc') as any
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 実際のデータベースからデータを取得する場合、ここでクエリを実行
    // 今回はモックデータで実装

    const listings = await fetchIntegratedListings(supabase, filter, sort)

    return NextResponse.json({
      success: true,
      data: listings,
      total: listings.length
    })

  } catch (error: any) {
    console.error('統合出品データ取得エラー:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * 統合出品データを取得する関数
 */
async function fetchIntegratedListings(
  supabase: any,
  filter: ListingFilter,
  sort: ListingSort
): Promise<ListingItem[]> {
  // TODO: 実際のデータベーステーブルに基づいて実装
  // 以下はモックデータの実装

  const mockListings: ListingItem[] = generateMockListings()

  // フィルタリング
  let filtered = mockListings

  if (filter.search_query) {
    filtered = filtered.filter(item =>
      item.sku.toLowerCase().includes(filter.search_query!.toLowerCase()) ||
      item.title.toLowerCase().includes(filter.search_query!.toLowerCase())
    )
  }

  if (filter.mall) {
    filtered = filtered.filter(item =>
      item.mall_statuses.some(status => status.mall === filter.mall)
    )
  }

  if (filter.status) {
    filtered = filtered.filter(item =>
      item.mall_statuses.some(status => status.status === filter.status)
    )
  }

  if (filter.performance_grade) {
    filtered = filtered.filter(item => item.performance_score === filter.performance_grade)
  }

  if (filter.price_min !== undefined) {
    filtered = filtered.filter(item => item.current_price >= filter.price_min!)
  }

  if (filter.price_max !== undefined) {
    filtered = filtered.filter(item => item.current_price <= filter.price_max!)
  }

  if (filter.stock_min !== undefined) {
    filtered = filtered.filter(item => item.total_stock_count >= filter.stock_min!)
  }

  if (filter.stock_max !== undefined) {
    filtered = filtered.filter(item => item.total_stock_count <= filter.stock_max!)
  }

  // ソート
  filtered.sort((a, b) => {
    const aValue = a[sort.field as keyof ListingItem]
    const bValue = b[sort.field as keyof ListingItem]

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sort.order === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sort.order === 'asc' ? aValue - bValue : bValue - aValue
    }

    return 0
  })

  return filtered
}

/**
 * モックデータ生成
 */
function generateMockListings(): ListingItem[] {
  const performanceGrades: PerformanceGrade[] = ['A+', 'A', 'B', 'C', 'D']
  const malls = ['ebay', 'amazon', 'shopee'] as const
  const statuses = ['Active', 'Inactive', 'SoldOut', 'PolicyViolation', 'SyncError'] as const
  const modes = ['中古優先', '新品優先'] as const

  return Array.from({ length: 50 }, (_, i) => {
    const sku = `SKU-${String(i + 1000).padStart(5, '0')}`
    const hasOwnStock = Math.random() > 0.3
    const supplierAStock = Math.floor(Math.random() * 20)
    const supplierBStock = Math.floor(Math.random() * 15)

    const stock_details: StockDetail[] = []

    if (hasOwnStock) {
      stock_details.push({
        source: '自社有在庫',
        count: Math.floor(Math.random() * 10) + 1,
        priority: 1,
        is_active_pricing: true
      })
    }

    if (supplierAStock > 0) {
      stock_details.push({
        source: '仕入れ先A',
        count: supplierAStock,
        priority: 2,
        is_active_pricing: !hasOwnStock && Math.random() > 0.5
      })
    }

    if (supplierBStock > 0) {
      stock_details.push({
        source: '仕入れ先B',
        count: supplierBStock,
        priority: 3,
        is_active_pricing: !hasOwnStock && stock_details.every(s => !s.is_active_pricing)
      })
    }

    const total_stock = stock_details.reduce((sum, detail) => sum + detail.count, 0)

    // モールステータス生成
    const numMalls = Math.floor(Math.random() * 3) + 1
    const selectedMalls = malls.slice(0, numMalls)
    const mall_statuses: MallStatus[] = selectedMalls.map((mall, idx) => ({
      mall,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      listing_id: `${mall.toUpperCase()}-${i + 1000}`,
      variation_count: Math.floor(Math.random() * 5) + 1,
      view_count: Math.floor(Math.random() * 1000),
      last_sync: new Date(Date.now() - Math.random() * 86400000).toISOString()
    }))

    return {
      id: `listing-${i + 1}`,
      sku,
      title: `商品タイトル ${i + 1} - ${['プレミアム', 'スタンダード', '限定版', '高品質'][Math.floor(Math.random() * 4)]}`,
      description: `これは商品 ${sku} の詳細説明です。高品質で信頼性の高い商品をお届けします。`,
      current_price: Math.floor(Math.random() * 50000) + 1000,
      total_stock_count: total_stock,
      performance_score: performanceGrades[Math.floor(Math.random() * performanceGrades.length)],
      sales_30d: Math.floor(Math.random() * 100),
      mall_statuses,
      stock_details,
      listing_mode: modes[Math.floor(Math.random() * modes.length)],
      created_at: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString()
    }
  })
}
