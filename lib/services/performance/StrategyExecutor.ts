/**
 * 戦略実行サービス
 *
 * Task D-6: スコア低下時の出品入替（ルール12）ロジックの骨子を実装
 *
 * このサービスは：
 * - スコアに基づき、出品の停止、出品の入れ替え、価格調整ロジックの優先度変更を行う
 * - ルール2: スコア変動における出品の停止
 * - ルール12: スコア低下時の出品入替
 * - ルール13: 滞留商品の優先度低下
 */

import { createClient } from '@/lib/supabase/client'
import { scoringService } from './ScoringService'
import type {
  PerformanceScore,
  PerformanceScoreResult,
  ListingRotationConfig,
  StagnantProductConfig,
  AccountHealthScore
} from '@/types/dynamicPricing'

const supabase = createClient()

/**
 * 出品入替候補
 */
export interface RotationCandidate {
  product_id: string
  sku: string
  current_score: PerformanceScore
  score_value: number
  days_listed: number
  view_count: number
  watcher_count: number
  reason: string
  priority: number  // 入替優先度（高いほど優先）
}

/**
 * 入替実行結果
 */
export interface RotationResult {
  paused_products: string[]      // 停止した商品SKU
  activated_products: string[]   // 有効化した商品SKU
  total_rotated: number
  success: boolean
  errors: string[]
}

/**
 * StrategyExecutor クラス
 */
export class StrategyExecutor {
  /**
   * ルール12: スコア低下時の出品入替
   *
   * 出品上限に近いときに、最もスコアの低い商品をシステムが自動で検知し、
   * その出品を停止して「待機中」の高スコア商品と自動で入れ替える
   *
   * @param config 出品入替設定
   * @returns 入替結果
   */
  async executeListingRotation(config: ListingRotationConfig): Promise<RotationResult> {
    const result: RotationResult = {
      paused_products: [],
      activated_products: [],
      total_rotated: 0,
      success: false,
      errors: []
    }

    if (!config.enabled || !config.auto_rotate) {
      console.log('⏸️ 自動出品入替が無効です')
      return result
    }

    try {
      // 1. 現在の出品数を取得
      const { data: activeListings, error: countError } = await supabase
        .from('products_master')
        .select('id', { count: 'exact', head: true })
        .eq('listing_data->>listing_status', 'active')

      if (countError) {
        result.errors.push(`出品数取得エラー: ${countError.message}`)
        return result
      }

      const currentListingCount = activeListings || 0

      // 2. 出品上限に達しているかチェック
      if (currentListingCount < config.listing_limit) {
        console.log(`✅ 出品数 ${currentListingCount} / ${config.listing_limit} - 上限未達のため入替不要`)
        result.success = true
        return result
      }

      console.log(`⚠️ 出品上限に達しています: ${currentListingCount} / ${config.listing_limit}`)

      // 3. 低スコア商品を取得（入替候補）
      const lowScoreProducts = await scoringService.getLowScoreProducts(
        config.low_score_threshold,
        50
      )

      if (lowScoreProducts.length === 0) {
        console.log('✅ 低スコア商品が見つかりません')
        result.success = true
        return result
      }

      // 4. 待機中の高スコア商品を取得
      const { data: waitingProducts, error: waitingError } = await supabase
        .from('products_master')
        .select('id, sku, performance_score, performance_score_value')
        .eq('listing_data->>listing_status', 'waiting')
        .gte('performance_score_value', 60)  // スコアB以上
        .order('performance_score_value', { ascending: false })
        .limit(10)

      if (waitingError) {
        result.errors.push(`待機商品取得エラー: ${waitingError.message}`)
        return result
      }

      if (!waitingProducts || waitingProducts.length === 0) {
        console.log('⚠️ 待機中の高スコア商品が見つかりません')
        result.success = true
        return result
      }

      // 5. 入替を実行
      const rotationCount = Math.min(lowScoreProducts.length, waitingProducts.length)

      for (let i = 0; i < rotationCount; i++) {
        const lowScoreProduct = lowScoreProducts[i]
        const waitingProduct = waitingProducts[i]

        try {
          // 低スコア商品を一時停止
          await this.pauseProduct(lowScoreProduct.product_id, lowScoreProduct.sku)
          result.paused_products.push(lowScoreProduct.sku)

          // 待機商品を有効化
          await this.activateProduct(waitingProduct.id, waitingProduct.sku)
          result.activated_products.push(waitingProduct.sku)

          result.total_rotated++
          console.log(`🔄 入替完了: ${lowScoreProduct.sku} (${lowScoreProduct.score}) → ${waitingProduct.sku} (${waitingProduct.performance_score})`)
        } catch (error) {
          result.errors.push(`入替エラー: ${lowScoreProduct.sku} → ${waitingProduct.sku}: ${error}`)
        }
      }

      result.success = true
      console.log(`✅ 出品入替完了: ${result.total_rotated}件`)
      return result
    } catch (error) {
      result.errors.push(`出品入替エラー: ${error}`)
      console.error('出品入替エラー:', error)
      return result
    }
  }

  /**
   * 商品を一時停止
   */
  private async pauseProduct(product_id: string, sku: string): Promise<void> {
    const { error } = await supabase
      .from('products_master')
      .update({
        listing_data: supabase.rpc('jsonb_set', {
          target: 'listing_data',
          path: '{listing_status}',
          new_value: '"paused"'
        })
      })
      .eq('id', product_id)

    if (error) {
      throw new Error(`商品一時停止エラー: ${error.message}`)
    }

    console.log(`⏸️ 商品を一時停止: SKU=${sku}`)
  }

  /**
   * 商品を有効化
   */
  private async activateProduct(product_id: string, sku: string): Promise<void> {
    const { error } = await supabase
      .from('products_master')
      .update({
        listing_data: supabase.rpc('jsonb_set', {
          target: 'listing_data',
          path: '{listing_status}',
          new_value: '"active"'
        })
      })
      .eq('id', product_id)

    if (error) {
      throw new Error(`商品有効化エラー: ${error.message}`)
    }

    console.log(`✅ 商品を有効化: SKU=${sku}`)
  }

  /**
   * ルール13: 滞留商品の優先度低下
   *
   * ビュー数、ウォッチャー数が低く、出品期間が[N]日を超えている商品は、
   * スコアが下がり、自動アクションが停止され、交代の優先度が上がる
   *
   * @param config 滞留商品設定
   * @returns 滞留商品リスト
   */
  async identifyStagnantProducts(config: StagnantProductConfig): Promise<RotationCandidate[]> {
    try {
      const { data, error } = await supabase
        .from('products_master')
        .select('id, sku, performance_score, performance_score_value, days_listed, view_count, watcher_count')
        .eq('listing_data->>listing_status', 'active')
        .gte('days_listed', config.max_days_listed)
        .lte('view_count', config.min_view_count)
        .lte('watcher_count', config.min_watcher_count)
        .order('days_listed', { ascending: false })
        .limit(50)

      if (error) {
        console.error('滞留商品取得エラー:', error)
        return []
      }

      const candidates: RotationCandidate[] = (data || []).map(product => ({
        product_id: product.id,
        sku: product.sku,
        current_score: product.performance_score as PerformanceScore,
        score_value: product.performance_score_value || 0,
        days_listed: product.days_listed || 0,
        view_count: product.view_count || 0,
        watcher_count: product.watcher_count || 0,
        reason: `滞留商品: ${product.days_listed}日出品中、ビュー${product.view_count}回、ウォッチャー${product.watcher_count}人`,
        priority: this.calculateRotationPriority(product)
      }))

      console.log(`📊 滞留商品を検出: ${candidates.length}件`)

      // 自動優先度低下が有効な場合
      if (config.auto_deprioritize) {
        await this.deprioritizeProducts(candidates.map(c => c.product_id))
      }

      return candidates
    } catch (error) {
      console.error('滞留商品識別エラー:', error)
      return []
    }
  }

  /**
   * 入替優先度を計算
   */
  private calculateRotationPriority(product: any): number {
    // 優先度スコア = 滞留日数 * 2 - (ビュー数 + ウォッチャー数 * 3)
    const daysScore = (product.days_listed || 0) * 2
    const engagementScore = (product.view_count || 0) + (product.watcher_count || 0) * 3
    return Math.max(0, daysScore - engagementScore)
  }

  /**
   * 商品の優先度を低下
   */
  private async deprioritizeProducts(product_ids: string[]): Promise<void> {
    try {
      // 優先度を低下させるために、カスタムフィールドを追加
      // 実際の実装では、listing_data JSONB に priority フィールドを追加
      for (const product_id of product_ids) {
        await supabase
          .from('products_master')
          .update({
            listing_data: supabase.rpc('jsonb_set', {
              target: 'listing_data',
              path: '{priority}',
              new_value: '"low"'
            })
          })
          .eq('id', product_id)
      }

      console.log(`⬇️ ${product_ids.length}件の商品の優先度を低下させました`)
    } catch (error) {
      console.error('優先度低下エラー:', error)
    }
  }

  /**
   * ルール2: スコア変動における出品の停止（アカウント健全性連動）
   *
   * アカウントの健全性スコアが低くなった場合、高スコア商品から優先して出品を継続し、
   * 低スコア商品は一時停止させる（リスクの大きい出品を減らす）
   *
   * @param account_id アカウントID
   * @param marketplace マーケットプレイス
   * @returns 停止した商品リスト
   */
  async adjustListingsByAccountHealth(
    account_id: string,
    marketplace: string
  ): Promise<string[]> {
    try {
      // 1. アカウント健全性スコアを取得
      const { data: accountHealth, error: healthError } = await supabase
        .from('account_health_score')
        .select('*')
        .eq('account_id', account_id)
        .eq('marketplace', marketplace)
        .single()

      if (healthError || !accountHealth) {
        console.warn('アカウント健全性スコアが取得できません')
        return []
      }

      const healthScore = accountHealth.health_score || 0

      // 2. 健全性スコアが70未満の場合、低スコア商品を停止
      if (healthScore < 70) {
        console.log(`⚠️ アカウント健全性スコアが低下: ${healthScore}/100`)

        // 低スコア商品を取得（D, E）
        const lowScoreProducts = await scoringService.getLowScoreProducts('D', 20)

        const pausedSkus: string[] = []
        for (const product of lowScoreProducts) {
          await this.pauseProduct(product.product_id, product.sku)
          pausedSkus.push(product.sku)
        }

        console.log(`⏸️ アカウント健全性保護のため、${pausedSkus.length}件の低スコア商品を停止しました`)
        return pausedSkus
      }

      console.log(`✅ アカウント健全性スコア正常: ${healthScore}/100`)
      return []
    } catch (error) {
      console.error('アカウント健全性連動エラー:', error)
      return []
    }
  }

  /**
   * 入替候補リストを取得
   */
  async getRotationCandidates(
    lowScoreThreshold: PerformanceScore = 'D',
    limit: number = 20
  ): Promise<RotationCandidate[]> {
    try {
      const lowScoreProducts = await scoringService.getLowScoreProducts(lowScoreThreshold, limit)

      return lowScoreProducts.map(product => ({
        product_id: product.product_id,
        sku: product.sku,
        current_score: product.score,
        score_value: product.score_value,
        days_listed: product.factors.days_listed,
        view_count: product.factors.view_count,
        watcher_count: product.factors.watcher_count,
        reason: `低スコア: ${product.score} (${product.score_value}点)`,
        priority: this.calculateRotationPriority({
          days_listed: product.factors.days_listed,
          view_count: product.factors.view_count,
          watcher_count: product.factors.watcher_count
        })
      })).sort((a, b) => b.priority - a.priority)  // 優先度の高い順
    } catch (error) {
      console.error('入替候補取得エラー:', error)
      return []
    }
  }

  /**
   * 定期実行: スコアベースの自動調整
   *
   * 定期的に実行されるバッチ処理
   */
  async runScheduledAdjustments(
    rotationConfig: ListingRotationConfig,
    stagnantConfig: StagnantProductConfig
  ): Promise<void> {
    console.log('🤖 定期実行: スコアベースの自動調整を開始')

    try {
      // 1. 滞留商品を識別
      const stagnantProducts = await this.identifyStagnantProducts(stagnantConfig)
      console.log(`📊 滞留商品: ${stagnantProducts.length}件`)

      // 2. 出品入替を実行
      const rotationResult = await this.executeListingRotation(rotationConfig)
      console.log(`🔄 出品入替結果: ${rotationResult.total_rotated}件入替、${rotationResult.errors.length}件エラー`)

      // 3. エラーがあれば記録
      if (rotationResult.errors.length > 0) {
        console.error('⚠️ 出品入替エラー:', rotationResult.errors)
      }

      console.log('✅ 定期実行完了')
    } catch (error) {
      console.error('❌ 定期実行エラー:', error)
    }
  }
}

/**
 * シングルトンインスタンス
 */
export const strategyExecutor = new StrategyExecutor()
