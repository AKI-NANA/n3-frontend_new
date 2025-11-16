// lib/category-distribution.ts
/**
 * カテゴリ分散ロジック - SEO最適化のため
 * 直近の出品カテゴリを分析し、分散が偏らないよう調整
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface CategoryDistributionSettings {
  lookbackDays: number           // 直近N日間をチェック
  minCategoriesPerDay: number    // 1日最低N個の異なるカテゴリ
  categoryPriority: 'balanced' | 'underrepresented' // バランス型 or 不足優先型
}

export interface CategoryStats {
  category_id: string
  category_name: string
  count: number
  last_listed: string | null
  days_since_last: number
}

export interface Product {
  id: number
  ai_confidence_score: number | null
  profit_amount_usd: number | null
  target_marketplaces: string[]
  listing_priority: string
  ebay_api_data: {
    category_id?: string
    category_name?: string
  }
}

/**
 * 直近の出品カテゴリ統計を取得
 */
export async function getRecentCategoryStats(
  supabase: SupabaseClient,
  lookbackDays: number
): Promise<CategoryStats[]> {
  const lookbackDate = new Date()
  lookbackDate.setDate(lookbackDate.getDate() - lookbackDays)

  const { data: schedules, error } = await supabase
    .from('listing_schedules')
    .select('category_id, date')
    .gte('date', lookbackDate.toISOString().split('T')[0])
    .eq('status', 'completed')

  if (error) {
    console.error('カテゴリ統計取得エラー:', error)
    return []
  }

  // カテゴリごとに集計
  const categoryMap = new Map<string, { count: number; lastDate: string }>()

  schedules?.forEach(schedule => {
    if (schedule.category_id) {
      const existing = categoryMap.get(schedule.category_id)
      if (existing) {
        existing.count++
        if (schedule.date > existing.lastDate) {
          existing.lastDate = schedule.date
        }
      } else {
        categoryMap.set(schedule.category_id, {
          count: 1,
          lastDate: schedule.date
        })
      }
    }
  })

  // CategoryStatsに変換
  const now = new Date()
  const stats: CategoryStats[] = []

  categoryMap.forEach((value, categoryId) => {
    const lastDate = new Date(value.lastDate)
    const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

    stats.push({
      category_id: categoryId,
      category_name: categoryId, // TODO: カテゴリ名のマッピング
      count: value.count,
      last_listed: value.lastDate,
      days_since_last: daysSince
    })
  })

  return stats.sort((a, b) => a.count - b.count) // 出品が少ない順
}

/**
 * 商品をカテゴリ別にグループ化
 */
export function groupProductsByCategory(products: Product[]): Map<string, Product[]> {
  const groups = new Map<string, Product[]>()

  products.forEach(product => {
    const categoryId = product.ebay_api_data?.category_id || 'unknown'
    
    if (!groups.has(categoryId)) {
      groups.set(categoryId, [])
    }
    
    groups.get(categoryId)!.push(product)
  })

  return groups
}

/**
 * 出品が不足しているカテゴリを特定
 */
export function findUnderrepresentedCategories(
  categoryGroups: Map<string, Product[]>,
  recentStats: CategoryStats[],
  minCategoriesPerDay: number
): string[] {
  const allCategories = Array.from(categoryGroups.keys())
  const recentCategoryIds = new Set(recentStats.map(s => s.category_id))

  // 最近出品がないカテゴリを優先
  const notRecentlyListed = allCategories.filter(cat => !recentCategoryIds.has(cat))

  // 出品が少ないカテゴリを追加
  const underrepresented = recentStats
    .slice(0, Math.max(0, minCategoriesPerDay - notRecentlyListed.length))
    .map(s => s.category_id)

  return [...notRecentlyListed, ...underrepresented]
}

/**
 * カテゴリ分散を考慮して商品を並べ替え
 */
export function sortProductsWithCategoryDistribution(
  products: Product[],
  underrepresentedCategories: string[],
  settings: CategoryDistributionSettings
): Product[] {
  const categoryGroups = groupProductsByCategory(products)
  const result: Product[] = []
  const usedCategories = new Set<string>()

  // Phase 1: 不足カテゴリから優先的に選択
  console.log(`📊 [Category Distribution] 不足カテゴリ: ${underrepresentedCategories.length}件`)
  
  underrepresentedCategories.forEach(categoryId => {
    const categoryProducts = categoryGroups.get(categoryId)
    if (categoryProducts && categoryProducts.length > 0) {
      // そのカテゴリ内でスコアが最も高い商品を選択
      const bestProduct = categoryProducts.sort((a, b) => {
        const scoreA = a.ai_confidence_score || 0
        const scoreB = b.ai_confidence_score || 0
        return scoreB - scoreA
      })[0]

      result.push(bestProduct)
      usedCategories.add(categoryId)

      // 使用した商品を元のリストから削除
      const index = products.findIndex(p => p.id === bestProduct.id)
      if (index > -1) {
        products.splice(index, 1)
      }

      console.log(`✅ [Category Distribution] カテゴリ ${categoryId} から商品 ${bestProduct.id} を選択 (スコア: ${bestProduct.ai_confidence_score})`)
    }
  })

  // Phase 2: 残りの商品をスコア順に追加（カテゴリバランスを考慮）
  const sortedRemaining = sortProductsByPriority(products)

  if (settings.categoryPriority === 'balanced') {
    // バランス型: カテゴリが重複しないように分散
    const categoryQueue: string[] = []
    
    sortedRemaining.forEach(product => {
      const categoryId = product.ebay_api_data?.category_id || 'unknown'
      
      // 同じカテゴリが連続しないように調整
      if (!usedCategories.has(categoryId) || categoryQueue.length === 0 || categoryQueue[categoryQueue.length - 1] !== categoryId) {
        result.push(product)
        categoryQueue.push(categoryId)
        usedCategories.add(categoryId)
        
        // キューが長すぎたら古いものを削除
        if (categoryQueue.length > 3) {
          categoryQueue.shift()
        }
      } else {
        // 同じカテゴリが連続する場合は後ろに回す
        result.push(product)
      }
    })
  } else {
    // 不足優先型: 単純にスコア順
    result.push(...sortedRemaining)
  }

  console.log(`📊 [Category Distribution] 最終商品数: ${result.length}件`)
  console.log(`📊 [Category Distribution] ユニークカテゴリ数: ${usedCategories.size}件`)

  return result
}

/**
 * 商品を優先度順にソート（従来のロジック）
 */
export function sortProductsByPriority(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    // 1. listing_priority
    const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 }
    const priorityDiff = priorityOrder[b.listing_priority || 'medium'] - priorityOrder[a.listing_priority || 'medium']
    if (priorityDiff !== 0) return priorityDiff

    // 2. ai_confidence_score
    const scoreA = a.ai_confidence_score || 0
    const scoreB = b.ai_confidence_score || 0
    if (scoreB !== scoreA) return scoreB - scoreA

    // 3. profit_amount_usd
    const profitA = a.profit_amount_usd || 0
    const profitB = b.profit_amount_usd || 0
    return profitB - profitA
  })
}

/**
 * カテゴリ分散の統計情報を生成
 */
export function generateCategoryDistributionReport(
  products: Product[]
): {
  totalProducts: number
  uniqueCategories: number
  categoryBreakdown: { category_id: string; count: number; avg_score: number }[]
} {
  const categoryGroups = groupProductsByCategory(products)
  const breakdown: { category_id: string; count: number; avg_score: number }[] = []

  categoryGroups.forEach((products, categoryId) => {
    const avgScore = products.reduce((sum, p) => sum + (p.ai_confidence_score || 0), 0) / products.length
    breakdown.push({
      category_id: categoryId,
      count: products.length,
      avg_score: Math.round(avgScore)
    })
  })

  return {
    totalProducts: products.length,
    uniqueCategories: categoryGroups.size,
    categoryBreakdown: breakdown.sort((a, b) => b.count - a.count)
  }
}
