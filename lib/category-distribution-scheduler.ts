/**
 * カテゴリー分散スケジューラー
 * 毎日全カテゴリーから均等に出品するスケジュールを生成
 */

interface Product {
  id: number
  category_name: string
  listing_priority?: number
  ai_confidence_score?: number
}

interface ScheduleSettings {
  dailyLimit: number
  startDate: Date
  endDate: Date
  minCategoriesPerDay?: number
}

interface ScheduleItem {
  product_id: number
  scheduled_date: string
  category: string
  priority: number
}

/**
 * カテゴリー分散スケジュール生成
 * ラウンドロビン方式で各カテゴリーから均等に選択
 */
export function generateCategoryDistributedSchedule(
  products: Product[],
  settings: ScheduleSettings
): ScheduleItem[] {
  const { dailyLimit, startDate, endDate, minCategoriesPerDay = 1 } = settings
  
  // 1. カテゴリー別にグループ化
  const byCategory = products.reduce((acc, product) => {
    const category = product.category_name || 'uncategorized'
    if (!acc[category]) acc[category] = []
    acc[category].push(product)
    return acc
  }, {} as Record<string, Product[]>)
  
  // 2. 各カテゴリー内でスコア順にソート（高い順）
  Object.keys(byCategory).forEach(category => {
    byCategory[category].sort((a, b) => {
      const scoreA = a.ai_confidence_score || 0
      const scoreB = b.ai_confidence_score || 0
      if (scoreB !== scoreA) return scoreB - scoreA
      
      // スコアが同じ場合は優先度でソート
      const priorityA = a.listing_priority || 0
      const priorityB = b.listing_priority || 0
      return priorityB - priorityA
    })
  })
  
  // 3. カテゴリー名をソート
  const categoryNames = Object.keys(byCategory).sort()
  
  console.log(`カテゴリー分散: ${categoryNames.length}カテゴリー、${products.length}商品`)
  categoryNames.forEach(cat => {
    console.log(`  ${cat}: ${byCategory[cat].length}商品`)
  })
  
  // 4. 日ごとのスケジュール生成
  const schedule: ScheduleItem[] = []
  
  let currentDate = new Date(startDate)
  const end = new Date(endDate)
  
  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0]
    let dailyCount = 0
    let roundRobinIndex = 0
    
    // ラウンドロビン方式: 各カテゴリーから1件ずつ、繰り返し選択
    while (dailyCount < dailyLimit) {
      let addedThisRound = false
      
      for (const category of categoryNames) {
        if (dailyCount >= dailyLimit) break
        
        const categoryProducts = byCategory[category]
        if (categoryProducts.length > 0) {
          const product = categoryProducts.shift()!
          schedule.push({
            product_id: product.id,
            scheduled_date: dateStr,
            category,
            priority: 1000 - dailyCount // 早い商品ほど高い優先度
          })
          dailyCount++
          addedThisRound = true
        }
      }
      
      // どのカテゴリーからも商品を追加できなかった場合は終了
      if (!addedThisRound) break
      
      roundRobinIndex++
    }
    
    console.log(`${dateStr}: ${dailyCount}商品をスケジュール`)
    
    // 次の日へ
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return schedule
}

/**
 * カテゴリーバランスの検証
 * 各カテゴリーが均等に選択されているかチェック
 */
export function validateCategoryBalance(schedule: ScheduleItem[]): {
  balanced: boolean
  stats: Record<string, number>
  message: string
} {
  const categoryCount = schedule.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const counts = Object.values(categoryCount)
  const max = Math.max(...counts)
  const min = Math.min(...counts)
  const avg = counts.reduce((a, b) => a + b, 0) / counts.length
  
  // 最大と最小の差が平均の50%以内ならバランスが取れているとする
  const threshold = avg * 0.5
  const balanced = (max - min) <= threshold
  
  const message = balanced
    ? 'カテゴリー分散は良好です'
    : `カテゴリー分散に偏りがあります（最大${max}件、最小${min}件）`
  
  return {
    balanced,
    stats: categoryCount,
    message
  }
}
