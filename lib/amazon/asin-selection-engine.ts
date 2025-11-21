import { createClient } from '@supabase/supabase-js'
import { AmazonResearchStrategy, StrategyExecutionResult } from '@/types/amazon-strategy'

/**
 * ASIN選定エンジン
 * 3つの主要戦略に基づいてASINを選定します：
 * 1. 資産の保護（有在庫品・高スコア品）
 * 2. 市場の開拓（新規・特定の条件）
 * 3. 競合の追跡（外部データとの連携）
 */
export class AsinSelectionEngine {
  private supabase: ReturnType<typeof createClient>

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  /**
   * 戦略に基づいてASINを選定
   */
  async executeStrategy(
    strategy: AmazonResearchStrategy,
    userId: string
  ): Promise<StrategyExecutionResult> {
    const result: StrategyExecutionResult = {
      success: false,
      asins_selected: 0,
      asins_queued: 0,
      asins_skipped: 0,
      breakdown: {
        inventory_protection: 0,
        high_score: 0,
        new_product: 0,
        category: 0,
        keyword: 0,
        competitor: 0,
        ebay_sold: 0
      },
      errors: []
    }

    try {
      const selectedAsins = new Set<string>()
      const asinSources = new Map<string, string>()

      // 1. 資産の保護: 有在庫品の更新
      if (strategy.enable_inventory_protection) {
        const inventoryAsins = await this.selectInventoryAsins(userId)
        inventoryAsins.forEach(asin => {
          selectedAsins.add(asin)
          asinSources.set(asin, 'inventory_protection')
        })
        result.breakdown.inventory_protection = inventoryAsins.length
      }

      // 2. 資産の保護: 高スコア品の更新
      if (strategy.min_profit_score_threshold > 0) {
        const highScoreAsins = await this.selectHighScoreAsins(
          userId,
          strategy.min_profit_score_threshold
        )
        highScoreAsins.forEach(asin => {
          if (!selectedAsins.has(asin)) {
            selectedAsins.add(asin)
            asinSources.set(asin, 'high_score')
          }
        })
        result.breakdown.high_score = highScoreAsins.length
      }

      // 3. 市場の開拓: 新規商品
      if (strategy.enable_new_products) {
        const newProductAsins = await this.selectNewProducts(
          userId,
          strategy.new_products_days
        )
        newProductAsins.forEach(asin => {
          if (!selectedAsins.has(asin)) {
            selectedAsins.add(asin)
            asinSources.set(asin, 'new_product')
          }
        })
        result.breakdown.new_product = newProductAsins.length
      }

      // 4. 市場の開拓: 特定カテゴリーの商品
      if (strategy.monitor_categories.length > 0) {
        const categoryAsins = await this.selectByCategoryAndPrice(
          userId,
          strategy.monitor_categories,
          strategy.price_range_min,
          strategy.price_range_max
        )
        categoryAsins.forEach(asin => {
          if (!selectedAsins.has(asin)) {
            selectedAsins.add(asin)
            asinSources.set(asin, 'category')
          }
        })
        result.breakdown.category = categoryAsins.length
      }

      // 5. 市場の開拓: キーワード監視
      if (strategy.monitor_keywords.length > 0) {
        const keywordAsins = await this.selectByKeywords(
          userId,
          strategy.monitor_keywords,
          strategy.price_range_min,
          strategy.price_range_max
        )
        keywordAsins.forEach(asin => {
          if (!selectedAsins.has(asin)) {
            selectedAsins.add(asin)
            asinSources.set(asin, 'keyword')
          }
        })
        result.breakdown.keyword = keywordAsins.length
      }

      // 6. 競合の追跡: 競合セラーの商品
      if (strategy.enable_competitor_tracking && strategy.competitor_seller_ids.length > 0) {
        const competitorAsins = await this.selectCompetitorProducts(
          strategy.competitor_seller_ids
        )
        competitorAsins.forEach(asin => {
          if (!selectedAsins.has(asin)) {
            selectedAsins.add(asin)
            asinSources.set(asin, 'competitor')
          }
        })
        result.breakdown.competitor = competitorAsins.length
      }

      // 7. 競合の追跡: eBay Sold実績のある商品
      if (strategy.enable_ebay_sold_tracking) {
        const ebaySoldAsins = await this.selectEbaySoldProducts(userId)
        ebaySoldAsins.forEach(asin => {
          if (!selectedAsins.has(asin)) {
            selectedAsins.add(asin)
            asinSources.set(asin, 'ebay_sold')
          }
        })
        result.breakdown.ebay_sold = ebaySoldAsins.length
      }

      result.asins_selected = selectedAsins.size

      // 最大ASIN数の制限を適用
      let asinsToQueue = Array.from(selectedAsins)
      if (asinsToQueue.length > strategy.max_asins_per_execution) {
        // 優先度順にソート（inventory_protection > high_score > その他）
        asinsToQueue = this.prioritizeAsins(asinsToQueue, asinSources)
        asinsToQueue = asinsToQueue.slice(0, strategy.max_asins_per_execution)
        result.asins_skipped = selectedAsins.size - asinsToQueue.length
      }

      // キューに追加
      const queuedCount = await this.addToQueue(asinsToQueue, asinSources)
      result.asins_queued = queuedCount

      result.success = true

      // 最後に実行時刻を更新
      await this.supabase
        .from('amazon_research_strategies')
        .update({
          last_executed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

    } catch (error: any) {
      result.errors = [error.message]
      console.error('Strategy execution error:', error)
    }

    return result
  }

  /**
   * 1. 有在庫品のASINを選定
   */
  private async selectInventoryAsins(userId: string): Promise<string[]> {
    try {
      // SKUマスターから有在庫品のASINを取得
      // 注: SKUマスターのテーブル名は実際の実装に合わせて調整してください
      const { data, error } = await this.supabase
        .from('sku_master')
        .select('asin')
        .eq('user_id', userId)
        .not('asin', 'is', null)
        .eq('stock_status', 'in_stock') // 在庫ありの条件

      if (error) throw error

      return data?.map(item => item.asin).filter(Boolean) || []
    } catch (error) {
      console.error('Select inventory ASINs error:', error)
      return []
    }
  }

  /**
   * 2. 高スコア品のASINを選定
   */
  private async selectHighScoreAsins(
    userId: string,
    minScore: number
  ): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('amazon_products')
        .select('asin')
        .eq('user_id', userId)
        .gte('profit_score', minScore)
        .not('asin', 'is', null)

      if (error) throw error

      return data?.map(item => item.asin).filter(Boolean) || []
    } catch (error) {
      console.error('Select high score ASINs error:', error)
      return []
    }
  }

  /**
   * 3. 新規商品のASINを選定
   */
  private async selectNewProducts(
    userId: string,
    daysBack: number
  ): Promise<string[]> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysBack)

      const { data, error } = await this.supabase
        .from('amazon_products')
        .select('asin')
        .eq('user_id', userId)
        .gte('created_at', cutoffDate.toISOString())
        .not('asin', 'is', null)

      if (error) throw error

      return data?.map(item => item.asin).filter(Boolean) || []
    } catch (error) {
      console.error('Select new products error:', error)
      return []
    }
  }

  /**
   * 4. カテゴリーと価格帯で商品を選定
   */
  private async selectByCategoryAndPrice(
    userId: string,
    categories: string[],
    minPrice?: number,
    maxPrice?: number
  ): Promise<string[]> {
    try {
      // カテゴリーフィルタは browse_nodes JSONB フィールドを使用
      // 実際のスキーマに合わせて調整が必要
      let query = this.supabase
        .from('amazon_products')
        .select('asin')
        .eq('user_id', userId)
        .not('asin', 'is', null)

      if (minPrice !== undefined) {
        query = query.gte('current_price', minPrice)
      }

      if (maxPrice !== undefined) {
        query = query.lte('current_price', maxPrice)
      }

      // カテゴリーフィルタは実装が複雑なため、後で全データを取得してフィルタリング
      const { data, error } = await query

      if (error) throw error

      // カテゴリーでフィルタリング（browse_nodesに該当カテゴリーIDが含まれているか）
      const filtered = data?.filter(item => {
        // 実際のJSONB構造に合わせて調整が必要
        return true // プレースホルダー
      }) || []

      return filtered.map(item => item.asin).filter(Boolean)
    } catch (error) {
      console.error('Select by category error:', error)
      return []
    }
  }

  /**
   * 5. キーワードで商品を選定
   */
  private async selectByKeywords(
    userId: string,
    keywords: string[],
    minPrice?: number,
    maxPrice?: number
  ): Promise<string[]> {
    try {
      const asins = new Set<string>()

      for (const keyword of keywords) {
        let query = this.supabase
          .from('amazon_products')
          .select('asin')
          .eq('user_id', userId)
          .not('asin', 'is', null)
          .ilike('title', `%${keyword}%`)

        if (minPrice !== undefined) {
          query = query.gte('current_price', minPrice)
        }

        if (maxPrice !== undefined) {
          query = query.lte('current_price', maxPrice)
        }

        const { data, error } = await query

        if (error) throw error

        data?.forEach(item => {
          if (item.asin) asins.add(item.asin)
        })
      }

      return Array.from(asins)
    } catch (error) {
      console.error('Select by keywords error:', error)
      return []
    }
  }

  /**
   * 6. 競合セラーの商品を選定
   */
  private async selectCompetitorProducts(sellerIds: string[]): Promise<string[]> {
    try {
      // 競合セラーの商品情報は merchant_info JSONB フィールドに格納されていると仮定
      // 実際の実装はデータ構造に依存
      const { data, error } = await this.supabase
        .from('amazon_products')
        .select('asin')
        .not('asin', 'is', null)
        // merchant_info内のseller_idでフィルタリング（実装が必要）

      if (error) throw error

      // プレースホルダー: 実際のセラーIDフィルタリングロジックを実装
      return data?.map(item => item.asin).filter(Boolean) || []
    } catch (error) {
      console.error('Select competitor products error:', error)
      return []
    }
  }

  /**
   * 7. eBay Sold実績のある商品を選定
   */
  private async selectEbaySoldProducts(userId: string): Promise<string[]> {
    try {
      // eBay sold dataとの照合
      // 実際の実装はeBayデータの構造に依存
      const { data, error } = await this.supabase
        .from('ebay_sold_items')
        .select('asin')
        .eq('user_id', userId)
        .not('asin', 'is', null)
        .eq('sold', true)

      if (error) {
        // テーブルが存在しない場合はスキップ
        return []
      }

      return data?.map(item => item.asin).filter(Boolean) || []
    } catch (error) {
      console.error('Select eBay sold products error:', error)
      return []
    }
  }

  /**
   * ASINを優先度順にソート
   */
  private prioritizeAsins(
    asins: string[],
    sources: Map<string, string>
  ): string[] {
    const priorityOrder = {
      'inventory_protection': 10,
      'high_score': 9,
      'competitor': 8,
      'ebay_sold': 7,
      'new_product': 6,
      'category': 5,
      'keyword': 4
    }

    return asins.sort((a, b) => {
      const sourceA = sources.get(a) || 'keyword'
      const sourceB = sources.get(b) || 'keyword'
      const priorityA = priorityOrder[sourceA as keyof typeof priorityOrder] || 0
      const priorityB = priorityOrder[sourceB as keyof typeof priorityOrder] || 0
      return priorityB - priorityA
    })
  }

  /**
   * キューにASINを追加（重複排除）
   */
  private async addToQueue(
    asins: string[],
    sources: Map<string, string>
  ): Promise<number> {
    try {
      // 既にキューに存在するASINをチェック
      const { data: existingQueue, error: checkError } = await this.supabase
        .from('amazon_update_queue')
        .select('asin')
        .in('asin', asins)
        .in('status', ['pending', 'processing'])

      if (checkError) throw checkError

      const existingAsins = new Set(existingQueue?.map(q => q.asin) || [])
      const newAsins = asins.filter(asin => !existingAsins.has(asin))

      if (newAsins.length === 0) {
        return 0
      }

      // 優先度マッピング
      const priorityMap = {
        'inventory_protection': 10,
        'high_score': 9,
        'competitor': 8,
        'ebay_sold': 7,
        'new_product': 6,
        'category': 5,
        'keyword': 4
      }

      // キューアイテムを作成
      const queueItems = newAsins.map(asin => ({
        asin,
        source: sources.get(asin) || 'manual',
        priority: priorityMap[sources.get(asin) as keyof typeof priorityMap] || 5,
        status: 'pending',
        retry_count: 0,
        scheduled_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { error: insertError } = await this.supabase
        .from('amazon_update_queue')
        .insert(queueItems)

      if (insertError) throw insertError

      return newAsins.length
    } catch (error) {
      console.error('Add to queue error:', error)
      return 0
    }
  }
}
