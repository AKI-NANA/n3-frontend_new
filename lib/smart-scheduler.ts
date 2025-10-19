// lib/smart-scheduler.ts - モール別ランダム化対応版
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
}

export interface Product {
  id: number
  ai_confidence_score: number | null
  profit_amount_usd: number | null
  target_marketplaces: string[]
  listing_priority: string
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
}

export class SmartScheduleGenerator {
  private settings: ScheduleSettings
  
  constructor(settings: ScheduleSettings) {
    this.settings = settings
  }

  generateMonthlySchedule(products: Product[], startDate: Date, endDate: Date): ScheduledSession[] {
    const sortedProducts = this.sortProductsByPriority(products)
    const availableDays = this.calculateAvailableDays(startDate, endDate)
    const dailyDistribution = this.randomDistribution(sortedProducts.length, availableDays.length, this.settings.limits)
    
    const sessions: ScheduledSession[] = []
    let productIndex = 0
    
    for (let i = 0; i < availableDays.length; i++) {
      const date = availableDays[i]
      const dailyCount = dailyDistribution[i]
      
      if (dailyCount === 0) continue
      
      const daySessions = this.splitIntoSessions(
        sortedProducts.slice(productIndex, productIndex + dailyCount),
        date
      )
      
      sessions.push(...daySessions)
      productIndex += dailyCount
    }
    
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

  private randomDistribution(totalProducts: number, daysCount: number, limits: ScheduleSettings['limits']): number[] {
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

  private randomTime(date: Date, sessionIndex: number, totalSessions: number, config: MarketplaceSettings['randomization']): Date {
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

export async function saveSchedulesToDatabase(sessions: ScheduledSession[], supabase: any) {
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
    status: 'pending'
  }))
  
  const { data: schedules, error } = await supabase.from('listing_schedules').insert(scheduleInserts).select()
  
  if (error) throw error
  
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i]
    const schedule = schedules[i]
    const productIds = session.products.map(p => p.id)
    
    await supabase.from('yahoo_scraped_products').update({
      listing_session_id: `${schedule.id}`,
      scheduled_listing_date: session.scheduledTime.toISOString()
    }).in('id', productIds)
  }
  
  return schedules
}
