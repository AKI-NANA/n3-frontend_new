// lib/smart-scheduler.ts - カテゴリ分散対応版
import { SupabaseClient } from '@supabase/supabase-js'
import {
  CategoryDistributionSettings,
  getRecentCategoryStats,
  findUnderrepresentedCategories,
  sortProductsWithCategoryDistribution,
  groupProductsByCategory,
  generateCategoryDistributionReport
} from './category-distribution'

export interface MarketplaceSettings {
  marketplace: string
  account: string
  dailyLimit: number
  enabled: boolean
  randomization: {
    enabled: boolean
    sessionsPerDay: { min: number; max: number }
    timeRandomization: { enabled: boolean; range: number }
    itemInterval: { min: number; max: number }
  }
}

export interface ScheduleSettings {
  limits: {
    dailyMin: number
    dailyMax: number
    weeklyMin: number
    weeklyMax: number
    monthlyMax: number
  }
  marketplaceAccounts: MarketplaceSettings[]
  categoryDistribution?: CategoryDistributionSettings // カテゴリ分散設定（オプション）
}

export interface Product {
  id: number
  ai_confidence_score: number | null
  profit_amount_usd: number | null
  target_marketplaces: string[]
  listing_priority: string
  ebay_api_data?: {
    category_id?: string
    category_name?: string
  }
}

export interface ScheduledSession {
  date: string
  sessionNumber: number
  scheduledTime: Date
  marketplace: string
  account: string
  plannedCount: number
  avgAiScore: number
  categoryId?: string // カテゴリIDを追加
  products: Product[]
  itemIntervalMin: number
  itemIntervalMax: number
}

export class SmartScheduleGenerator {
  private settings: ScheduleSettings
  private supabase?: SupabaseClient
  
  constructor(settings: ScheduleSettings, supabase?: SupabaseClient) {
    this.settings = settings
    this.supabase = supabase
  }

  /**
   * 月次スケジュール生成（カテゴリ分散対応）
   */
  async generateMonthlySchedule(
    products: Product[], 
    startDate: Date, 
    endDate: Date
  ): Promise<ScheduledSession[]> {
    console.log('📅 [Scheduler] スケジュール生成開始')
    console.log(`📦 [Scheduler] 対象商品: ${products.length}件`)
    
    // カテゴリ分散設定がある場合は適用
    let sortedProducts: Product[]
    
    if (this.settings.categoryDistribution && this.supabase) {
      console.log('🎯 [Scheduler] カテゴリ分散ロジック適用中...')
      
      try {
        // 直近の出品カテゴリ統計を取得
        const recentStats = await getRecentCategoryStats(
          this.supabase,
          this.settings.categoryDistribution.lookbackDays
        )
        
        console.log(`📊 [Scheduler] 直近${this.settings.categoryDistribution.lookbackDays}日間のカテゴリ統計: ${recentStats.length}件`)
        
        // 商品をカテゴリ別にグループ化
        const categoryGroups = groupProductsByCategory(products)
        console.log(`📂 [Scheduler] ユニークカテゴリ数: ${categoryGroups.size}件`)
        
        // 不足しているカテゴリを特定
        const underrepresentedCategories = findUnderrepresentedCategories(
          categoryGroups,
          recentStats,
          this.settings.categoryDistribution.minCategoriesPerDay
        )
        
        console.log(`⚠️ [Scheduler] 出品不足カテゴリ: ${underrepresentedCategories.length}件`)
        
        // カテゴリ分散を考慮してソート
        sortedProducts = sortProductsWithCategoryDistribution(
          products,
          underrepresentedCategories,
          this.settings.categoryDistribution
        )
        
        // レポート生成
        const report = generateCategoryDistributionReport(sortedProducts)
        console.log('📊 [Scheduler] カテゴリ分散レポート:', report)
        
      } catch (error) {
        console.error('❌ [Scheduler] カテゴリ分散処理エラー:', error)
        console.log('⚠️ [Scheduler] フォールバック: 通常の優先度ソートを使用')
        sortedProducts = this.sortProductsByPriority(products)
      }
    } else {
      console.log('📊 [Scheduler] 通常の優先度ソートを使用')
      sortedProducts = this.sortProductsByPriority(products)
    }
    
    const availableDays = this.calculateAvailableDays(startDate, endDate)
    const dailyDistribution = this.randomDistribution(
      sortedProducts.length, 
      availableDays.length, 
      this.settings.limits
    )
    
    console.log(`📅 [Scheduler] 配分日数: ${availableDays.length}日`)
    
    const sessions: ScheduledSession[] = []
    let productIndex = 0
    
    for (let i = 0; i < availableDays.length; i++) {
      const date = availableDays[i]
      const dailyCount = dailyDistribution[i]
      
      if (dailyCount === 0) continue
      
      const dayProducts = sortedProducts.slice(productIndex, productIndex + dailyCount)
      const daySessions = this.splitIntoSessions(dayProducts, date)
      
      sessions.push(...daySessions)
      productIndex += dailyCount
      
      console.log(`📅 [Scheduler] ${date.toISOString().split('T')[0]}: ${dailyCount}件 → ${daySessions.length}セッション`)
    }
    
    console.log(`✅ [Scheduler] スケジュール生成完了: ${sessions.length}セッション`)
    
    return sessions
  }

  private sortProductsByPriority(products: Product[]): Product[] {
    return [...products].sort((a, b) => {
      const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.listing_priority || 'medium'] - priorityOrder[a.listing_priority || 'medium']
      if (priorityDiff !== 0) return priorityDiff
      
      const scoreA = a.ai_confidence_score || 0
      const scoreB = b.ai_confidence_score || 0
      if (scoreB !== scoreA) return scoreB - scoreA
      
      const profitA = a.profit_amount_usd || 0
      const profitB = b.profit_amount_usd || 0
      return profitB - profitA
    })
  }

  private calculateAvailableDays(startDate: Date, endDate: Date): Date[] {
    const days: Date[] = []
    const current = new Date(startDate)
    
    while (current <= endDate) {
      if (current >= new Date(new Date().toDateString())) {
        days.push(new Date(current))
      }
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }

  private randomDistribution(
    totalProducts: number, 
    daysCount: number, 
    limits: ScheduleSettings['limits']
  ): number[] {
    const distribution: number[] = []
    let remaining = totalProducts
    
    for (let i = 0; i < daysCount; i++) {
      const daysLeft = daysCount - i
      const maxForDay = Math.min(limits.dailyMax, remaining - (daysLeft - 1) * limits.dailyMin)
      const minForDay = Math.min(limits.dailyMin, Math.max(0, remaining - (daysLeft - 1) * limits.dailyMax))
      
      if (remaining <= 0 || maxForDay <= 0) {
        distribution.push(0)
        continue
      }
      
      let count = this.randomBetween(minForDay, maxForDay)
      const variance = 0.3
      const variation = count * (Math.random() * variance * 2 - variance)
      count = Math.round(count + variation)
      count = Math.max(minForDay, Math.min(maxForDay, count))
      
      distribution.push(count)
      remaining -= count
    }
    
    return distribution
  }

  private splitIntoSessions(products: Product[], date: Date): ScheduledSession[] {
    const sessions: ScheduledSession[] = []
    const marketplaceGroups = this.groupByMarketplace(products)
    
    for (const [key, marketplaceProducts] of marketplaceGroups.entries()) {
      if (marketplaceProducts.length === 0) continue
      
      const [marketplace, account] = key.split('_')
      const marketplaceConfig = this.settings.marketplaceAccounts.find(
        ma => ma.marketplace === marketplace && ma.account === account && ma.enabled
      )
      
      if (!marketplaceConfig) continue
      
      const randomConfig = marketplaceConfig.randomization
      const sessionCount = randomConfig.enabled
        ? this.randomBetween(randomConfig.sessionsPerDay.min, Math.min(randomConfig.sessionsPerDay.max, marketplaceProducts.length))
        : 1
      
      const productsPerSession = Math.ceil(marketplaceProducts.length / sessionCount)
      
      for (let i = 0; i < sessionCount; i++) {
        const sessionProducts = marketplaceProducts.slice(i * productsPerSession, (i + 1) * productsPerSession)
        if (sessionProducts.length === 0) continue
        
        const scheduledTime = this.randomTime(date, i, sessionCount, randomConfig)
        const avgAiScore = sessionProducts.reduce((sum, p) => sum + (p.ai_confidence_score || 0), 0) / sessionProducts.length
        
        // セッションの主要カテゴリを決定（最も多いカテゴリ）
        const categoryMap = new Map<string, number>()
        sessionProducts.forEach(p => {
          const catId = p.ebay_api_data?.category_id || 'unknown'
          categoryMap.set(catId, (categoryMap.get(catId) || 0) + 1)
        })
        
        let primaryCategory = 'unknown'
        let maxCount = 0
        categoryMap.forEach((count, catId) => {
          if (count > maxCount) {
            maxCount = count
            primaryCategory = catId
          }
        })
        
        sessions.push({
          date: date.toISOString().split('T')[0],
          sessionNumber: i + 1,
          scheduledTime,
          marketplace,
          account,
          plannedCount: sessionProducts.length,
          avgAiScore: Math.round(avgAiScore),
          categoryId: primaryCategory,
          products: sessionProducts,
          itemIntervalMin: randomConfig.itemInterval.min,
          itemIntervalMax: randomConfig.itemInterval.max
        })
      }
    }
    
    return sessions
  }

  private groupByMarketplace(products: Product[]): Map<string, Product[]> {
    const groups = new Map<string, Product[]>()
    
    for (const product of products) {
      for (const target of product.target_marketplaces) {
        if (!groups.has(target)) {
          groups.set(target, [])
        }
        groups.get(target)!.push(product)
      }
    }
    
    return groups
  }

  private randomTime(
    date: Date, 
    sessionIndex: number, 
    totalSessions: number, 
    config: MarketplaceSettings['randomization']
  ): Date {
    const startHour = 9
    const endHour = 21
    const hoursRange = endHour - startHour
    const baseHour = startHour + (hoursRange * sessionIndex) / totalSessions
    
    let hour = Math.floor(baseHour)
    let minute = Math.floor((baseHour - hour) * 60)
    
    if (config.enabled && config.timeRandomization.enabled) {
      const range = config.timeRandomization.range
      const minuteVariation = this.randomBetween(-range, range)
      minute += minuteVariation
      
      while (minute < 0) {
        minute += 60
        hour -= 1
      }
      while (minute >= 60) {
        minute -= 60
        hour += 1
      }
      
      hour = Math.max(startHour, Math.min(endHour - 1, hour))
    }
    
    const scheduledTime = new Date(date)
    scheduledTime.setHours(hour, minute, 0, 0)
    
    return scheduledTime
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
}

/**
 * スケジュールをデータベースに保存
 */
export async function saveSchedulesToDatabase(
  sessions: ScheduledSession[], 
  supabase: SupabaseClient
) {
  console.log('💾 [Scheduler] データベース保存開始')
  
  // 既存のpendingスケジュールを削除
  await supabase.from('listing_schedules').delete().eq('status', 'pending')
  
  const scheduleInserts = sessions.map(session => ({
    date: session.date,
    session_number: session.sessionNumber,
    scheduled_time: session.scheduledTime.toISOString(),
    marketplace: session.marketplace,
    account: session.account,
    planned_count: session.plannedCount,
    avg_ai_score: session.avgAiScore,
    category_id: session.categoryId, // カテゴリIDを保存
    item_interval_min: session.itemIntervalMin,
    item_interval_max: session.itemIntervalMax,
    status: 'pending'
  }))
  
  const { data: schedules, error } = await supabase
    .from('listing_schedules')
    .insert(scheduleInserts)
    .select()
  
  if (error) {
    console.error('❌ [Scheduler] スケジュール保存エラー:', error)
    throw error
  }
  
  console.log(`✅ [Scheduler] ${schedules.length}件のスケジュールを保存`)
  
  // 商品とスケジュールを紐付け
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i]
    const schedule = schedules[i]
    const productIds = session.products.map(p => p.id)
    
    if (productIds.length > 0) {
      await supabase
        .from('yahoo_scraped_products')
        .update({
          listing_session_id: `${schedule.id}`,
          scheduled_listing_date: session.scheduledTime.toISOString()
        })
        .in('id', productIds)
    }
  }
  
  console.log('✅ [Scheduler] 商品とスケジュールの紐付け完了')
  
  return schedules
}
