// lib/smart-scheduler-v2.ts - カテゴリ分散対応版
/**
 * スマート出品スケジューラー V2
 * 
 * 新機能:
 * - カテゴリ分散ロジック（SEO最適化）
 * - 直近N日間の出品カテゴリを分析
 * - 出品が少ないカテゴリを優先的に選択
 * - スコアとカテゴリのバランスを取った配分
 */

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
  categoryDistribution: {
    enabled: boolean
    lookbackDays: number          // 直近N日間をチェック
    minCategoriesPerDay: number   // 1日最低N個の異なるカテゴリ
    categoryBalanceWeight: number // 0-1: カテゴリバランスの重み（0=スコア優先、1=カテゴリ優先）
  }
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
  category_id?: string
}

export interface ScheduledSession {
  date: string
  sessionNumber: number
  scheduledTime: Date
  marketplace: string
  account: string
  plannedCount: number
  avgAiScore: number
  products: Product[]
  itemIntervalMin: number
  itemIntervalMax: number
  categoryDistribution: {
    [categoryId: string]: number
  }
}

interface CategoryStats {
  categoryId: string
  recentCount: number
  lastListedDate: string | null
  daysSinceLastListing: number
}

export class SmartScheduleGeneratorV2 {
  private settings: ScheduleSettings
  private supabase: any
  
  constructor(settings: ScheduleSettings, supabase?: any) {
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
    
    // カテゴリ分散が有効な場合、直近の出品統計を取得
    let categoryStats: CategoryStats[] | null = null
    if (this.settings.categoryDistribution.enabled && this.supabase) {
      categoryStats = await this.getRecentCategoryStats()
    }
    
    // 商品を優先度順にソート（カテゴリ分散を考慮）
    const sortedProducts = this.sortProductsWithCategoryBalance(products, categoryStats)
    
    // 利用可能な日付を計算
    const availableDays = this.calculateAvailableDays(startDate, endDate)
    
    // 日次の出品数分布を生成
    const dailyDistribution = this.randomDistribution(
      sortedProducts.length, 
      availableDays.length, 
      this.settings.limits
    )
    
    const sessions: ScheduledSession[] = []
    let productIndex = 0
    
    // 各日のスケジュールを生成
    for (let i = 0; i < availableDays.length; i++) {
      const date = availableDays[i]
      const dailyCount = dailyDistribution[i]
      
      if (dailyCount === 0) continue
      
      // その日の商品を取得
      const dailyProducts = sortedProducts.slice(productIndex, productIndex + dailyCount)
      
      // カテゴリ分散を考慮して再配置
      const balancedProducts = this.balanceProductsByCategory(
        dailyProducts, 
        categoryStats
      )
      
      // セッションに分割
      const daySessions = this.splitIntoSessions(balancedProducts, date)
      
      sessions.push(...daySessions)
      productIndex += dailyCount
    }
    
    return sessions
  }

  /**
   * 直近N日間のカテゴリ統計を取得
   */
  private async getRecentCategoryStats(): Promise<CategoryStats[]> {
    if (!this.supabase) return []
    
    const { lookbackDays } = this.settings.categoryDistribution
    const lookbackDate = new Date()
    lookbackDate.setDate(lookbackDate.getDate() - lookbackDays)
    
    try {
      // 直近N日間の出品履歴からカテゴリ統計を取得
      const { data: listings, error } = await this.supabase
        .from('listing_history')
        .select(`
          product_id,
          listed_at,
          yahoo_scraped_products!inner(
            ebay_api_data
          )
        `)
        .eq('status', 'success')
        .gte('listed_at', lookbackDate.toISOString())
      
      if (error) {
        console.error('カテゴリ統計取得エラー:', error)
        return []
      }
      
      // カテゴリごとに集計
      const categoryMap = new Map<string, {
        count: number
        lastDate: string
      }>()
      
      for (const listing of listings || []) {
        const categoryId = listing.yahoo_scraped_products?.ebay_api_data?.category_id
        if (!categoryId) continue
        
        const existing = categoryMap.get(categoryId)
        const listedDate = new Date(listing.listed_at)
        
        if (!existing || new Date(existing.lastDate) < listedDate) {
          categoryMap.set(categoryId, {
            count: (existing?.count || 0) + 1,
            lastDate: listing.listed_at
          })
        }
      }
      
      // 統計配列に変換
      const now = new Date()
      const stats: CategoryStats[] = Array.from(categoryMap.entries()).map(([categoryId, data]) => {
        const daysSince = Math.floor(
          (now.getTime() - new Date(data.lastDate).getTime()) / (1000 * 60 * 60 * 24)
        )
        
        return {
          categoryId,
          recentCount: data.count,
          lastListedDate: data.lastDate,
          daysSinceLastListing: daysSince
        }
      })
      
      return stats
      
    } catch (error) {
      console.error('カテゴリ統計取得エラー:', error)
      return []
    }
  }

  /**
   * カテゴリバランスを考慮した商品ソート
   */
  private sortProductsWithCategoryBalance(
    products: Product[], 
    categoryStats: CategoryStats[] | null
  ): Product[] {
    
    if (!this.settings.categoryDistribution.enabled || !categoryStats) {
      // カテゴリ分散が無効な場合は通常のソート
      return this.sortProductsByPriority(products)
    }
    
    const { categoryBalanceWeight } = this.settings.categoryDistribution
    
    // カテゴリ統計をマップに変換
    const statsMap = new Map(
      categoryStats.map(stat => [stat.categoryId, stat])
    )
    
    // 各商品にスコアを計算
    const scoredProducts = products.map(product => {
      // 基本スコア（優先度・AIスコア・利益）
      const baseScore = this.calculateBaseScore(product)
      
      // カテゴリスコア（出品が少ないほど高い）
      const categoryId = product.ebay_api_data?.category_id || product.category_id
      const categoryScore = categoryId 
        ? this.calculateCategoryScore(categoryId, statsMap)
        : 0
      
      // 重み付け合成
      const finalScore = 
        baseScore * (1 - categoryBalanceWeight) + 
        categoryScore * categoryBalanceWeight
      
      return {
        product,
        baseScore,
        categoryScore,
        finalScore
      }
    })
    
    // 最終スコアでソート
    scoredProducts.sort((a, b) => b.finalScore - a.finalScore)
    
    return scoredProducts.map(item => item.product)
  }

  /**
   * 基本スコア計算（優先度・AIスコア・利益）
   */
  private calculateBaseScore(product: Product): number {
    const priorityOrder: Record<string, number> = { 
      high: 1000, 
      medium: 500, 
      low: 100 
    }
    
    const priorityScore = priorityOrder[product.listing_priority || 'medium']
    const aiScore = (product.ai_confidence_score || 0) * 10
    const profitScore = (product.profit_amount_usd || 0)
    
    return priorityScore + aiScore + profitScore
  }

  /**
   * カテゴリスコア計算（出品が少ないほど高い）
   */
  private calculateCategoryScore(
    categoryId: string, 
    statsMap: Map<string, CategoryStats>
  ): number {
    const stat = statsMap.get(categoryId)
    
    if (!stat) {
      // 出品履歴がないカテゴリは最高スコア
      return 1000
    }
    
    // 日数と出品回数から逆数スコアを計算
    const daysFactor = Math.min(stat.daysSinceLastListing, 30) / 30 * 500
    const countFactor = Math.max(0, 10 - stat.recentCount) * 50
    
    return daysFactor + countFactor
  }

  /**
   * 1日分の商品をカテゴリバランスで再配置
   */
  private balanceProductsByCategory(
    products: Product[], 
    categoryStats: CategoryStats[] | null
  ): Product[] {
    
    if (!this.settings.categoryDistribution.enabled || !categoryStats) {
      return products
    }
    
    const { minCategoriesPerDay } = this.settings.categoryDistribution
    
    // カテゴリごとにグループ化
    const categoryGroups = new Map<string, Product[]>()
    const uncategorized: Product[] = []
    
    for (const product of products) {
      const categoryId = product.ebay_api_data?.category_id || product.category_id
      if (categoryId) {
        if (!categoryGroups.has(categoryId)) {
          categoryGroups.set(categoryId, [])
        }
        categoryGroups.get(categoryId)!.push(product)
      } else {
        uncategorized.push(product)
      }
    }
    
    // 統計マップ作成
    const statsMap = new Map(
      categoryStats.map(stat => [stat.categoryId, stat])
    )
    
    // カテゴリを出品頻度でソート（少ない順）
    const sortedCategories = Array.from(categoryGroups.keys()).sort((a, b) => {
      const statA = statsMap.get(a)
      const statB = statsMap.get(b)
      
      // 出品履歴がないカテゴリを優先
      if (!statA && statB) return -1
      if (statA && !statB) return 1
      if (!statA && !statB) return 0
      
      // 日数が長い方を優先
      if (statA.daysSinceLastListing !== statB.daysSinceLastListing) {
        return statB.daysSinceLastListing - statA.daysSinceLastListing
      }
      
      // 出品回数が少ない方を優先
      return statA.recentCount - statB.recentCount
    })
    
    // 各カテゴリから最低1個ずつ選択
    const balanced: Product[] = []
    const remaining: Product[] = []
    
    let categoriesUsed = 0
    for (const categoryId of sortedCategories) {
      const categoryProducts = categoryGroups.get(categoryId)!
      
      if (categoriesUsed < minCategoriesPerDay && categoryProducts.length > 0) {
        // 最初の1個を選択
        balanced.push(categoryProducts[0])
        remaining.push(...categoryProducts.slice(1))
        categoriesUsed++
      } else {
        remaining.push(...categoryProducts)
      }
    }
    
    // 残りの商品を追加
    balanced.push(...remaining)
    balanced.push(...uncategorized)
    
    return balanced
  }

  /**
   * 通常の優先度ソート
   */
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

  /**
   * 利用可能な日付を計算
   */
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

  /**
   * ランダム分布生成
   */
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

  /**
   * セッションに分割
   */
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
        
        // カテゴリ分布を計算
        const categoryDistribution: { [categoryId: string]: number } = {}
        for (const product of sessionProducts) {
          const categoryId = product.ebay_api_data?.category_id || product.category_id || 'unknown'
          categoryDistribution[categoryId] = (categoryDistribution[categoryId] || 0) + 1
        }
        
        sessions.push({
          date: date.toISOString().split('T')[0],
          sessionNumber: i + 1,
          scheduledTime,
          marketplace,
          account,
          plannedCount: sessionProducts.length,
          avgAiScore: Math.round(avgAiScore),
          products: sessionProducts,
          itemIntervalMin: randomConfig.itemInterval.min,
          itemIntervalMax: randomConfig.itemInterval.max,
          categoryDistribution
        })
      }
    }
    
    return sessions
  }

  /**
   * マーケットプレイス別にグループ化
   */
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

  /**
   * ランダム時刻生成
   */
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

  /**
   * ランダム数値生成
   */
  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
}

/**
 * スケジュールをデータベースに保存
 */
export async function saveSchedulesToDatabaseV2(
  sessions: ScheduledSession[], 
  supabase: any
) {
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
    item_interval_min: session.itemIntervalMin,
    item_interval_max: session.itemIntervalMax,
    category_distribution: session.categoryDistribution,
    status: 'pending'
  }))
  
  const { data: schedules, error } = await supabase
    .from('listing_schedules')
    .insert(scheduleInserts)
    .select()
  
  if (error) throw error
  
  // 商品とスケジュールを紐付け
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i]
    const schedule = schedules[i]
    const productIds = session.products.map(p => p.id)
    
    await supabase
      .from('yahoo_scraped_products')
      .update({
        listing_session_id: `${schedule.id}`,
        scheduled_listing_date: session.scheduledTime.toISOString()
      })
      .in('id', productIds)
  }
  
  return schedules
}
