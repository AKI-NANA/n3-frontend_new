/**
 * パフォーマンススコアリングサービス
 *
 * Task D-5: ルール15に基づき、パフォーマンススコア（A-Eランク）を計算
 *
 * このサービスは：
 * - 市場在庫数、ビュー数、滞留期間、利益率などから総合スコアを算出
 * - A〜Eランクを付与
 * - スコア履歴を記録
 */

import { createClient } from '@/lib/supabase/client'
import type {
  PerformanceScore,
  PerformanceScoreFactors,
  PerformanceScoreResult,
  ScoringWeights,
  PerformanceScoreHistory
} from '@/types/dynamicPricing'

const supabase = createClient()

/**
 * デフォルトのスコアリング重み設定
 */
const DEFAULT_WEIGHTS: ScoringWeights = {
  market_inventory_weight: 0.2,      // 市場在庫数の重み（少ない方が高スコア）
  view_count_weight: 0.15,            // ビュー数の重み（多い方が高スコア）
  watcher_count_weight: 0.2,          // ウォッチャー数の重み（多い方が高スコア）
  days_listed_weight: -0.15,          // 滞留期間の重み（短い方が高スコア、負の重み）
  profit_margin_weight: 0.2,          // 利益率の重み（高い方が高スコア）
  sold_count_weight: 0.1              // 販売数の重み（多い方が高スコア）
}

/**
 * スコアランク閾値
 */
const SCORE_THRESHOLDS = {
  A: 80,   // 80-100
  B: 60,   // 60-79
  C: 40,   // 40-59
  D: 20,   // 20-39
  E: 0     // 0-19
}

/**
 * ScoringService クラス
 */
export class ScoringService {
  private weights: ScoringWeights

  constructor(weights?: ScoringWeights) {
    this.weights = weights || DEFAULT_WEIGHTS
  }

  /**
   * パフォーマンススコアを計算
   *
   * @param product_id 商品ID
   * @param sku SKU
   * @param factors スコア計算要因
   * @returns スコア計算結果
   */
  async calculateScore(
    product_id: string,
    sku: string,
    factors: PerformanceScoreFactors
  ): Promise<PerformanceScoreResult> {
    // 1. 各要因を正規化（0-100スケール）
    const normalizedFactors = this.normalizeFactors(factors)

    // 2. 重み付けスコアを計算
    const scoreValue = this.calculateWeightedScore(normalizedFactors)

    // 3. A-Eランクを判定
    const score = this.determineScoreRank(scoreValue)

    // 4. 有効期限を設定（24時間後）
    const calculatedAt = new Date()
    const expiresAt = new Date(calculatedAt.getTime() + 24 * 60 * 60 * 1000)

    const result: PerformanceScoreResult = {
      product_id,
      sku,
      score,
      score_value: Math.round(scoreValue),
      factors,
      calculated_at: calculatedAt.toISOString(),
      expires_at: expiresAt.toISOString()
    }

    // 5. スコアをデータベースに保存
    await this.saveScore(result)

    // 6. スコア履歴を記録
    await this.recordScoreHistory(result)

    return result
  }

  /**
   * 各要因を0-100スケールに正規化
   */
  private normalizeFactors(factors: PerformanceScoreFactors): Record<string, number> {
    return {
      market_inventory: this.normalizeMarketInventory(factors.market_inventory_count),
      view_count: this.normalizeViewCount(factors.view_count),
      watcher_count: this.normalizeWatcherCount(factors.watcher_count),
      days_listed: this.normalizeDaysListed(factors.days_listed),
      profit_margin: this.normalizeProfitMargin(factors.profit_margin_percent),
      sold_count: this.normalizeSoldCount(factors.sold_count)
    }
  }

  /**
   * 市場在庫数を正規化（少ない方が高スコア）
   */
  private normalizeMarketInventory(count: number): number {
    // 0個: 100点, 50個: 50点, 100個以上: 0点
    if (count === 0) return 100
    if (count >= 100) return 0
    return 100 - count
  }

  /**
   * ビュー数を正規化（多い方が高スコア）
   */
  private normalizeViewCount(count: number): number {
    // 0回: 0点, 100回: 50点, 500回以上: 100点
    if (count === 0) return 0
    if (count >= 500) return 100
    return Math.min(100, (count / 500) * 100)
  }

  /**
   * ウォッチャー数を正規化（多い方が高スコア）
   */
  private normalizeWatcherCount(count: number): number {
    // 0人: 0点, 10人: 50点, 50人以上: 100点
    if (count === 0) return 0
    if (count >= 50) return 100
    return Math.min(100, (count / 50) * 100)
  }

  /**
   * 滞留期間を正規化（短い方が高スコア）
   */
  private normalizeDaysListed(days: number): number {
    // 0日: 100点, 30日: 50点, 90日以上: 0点
    if (days === 0) return 100
    if (days >= 90) return 0
    return 100 - (days / 90) * 100
  }

  /**
   * 利益率を正規化（高い方が高スコア）
   */
  private normalizeProfitMargin(percent: number): number {
    // 0%: 0点, 20%: 50点, 50%以上: 100点
    if (percent <= 0) return 0
    if (percent >= 50) return 100
    return (percent / 50) * 100
  }

  /**
   * 販売数を正規化（多い方が高スコア）
   */
  private normalizeSoldCount(count: number): number {
    // 0個: 0点, 5個: 50点, 20個以上: 100点
    if (count === 0) return 0
    if (count >= 20) return 100
    return Math.min(100, (count / 20) * 100)
  }

  /**
   * 重み付けスコアを計算
   */
  private calculateWeightedScore(normalizedFactors: Record<string, number>): number {
    const {
      market_inventory_weight,
      view_count_weight,
      watcher_count_weight,
      days_listed_weight,
      profit_margin_weight,
      sold_count_weight
    } = this.weights

    const score =
      normalizedFactors.market_inventory * market_inventory_weight +
      normalizedFactors.view_count * view_count_weight +
      normalizedFactors.watcher_count * watcher_count_weight +
      normalizedFactors.days_listed * days_listed_weight +
      normalizedFactors.profit_margin * profit_margin_weight +
      normalizedFactors.sold_count * sold_count_weight

    // 0-100の範囲に収める
    return Math.max(0, Math.min(100, score))
  }

  /**
   * スコアランクを判定（A-E）
   */
  private determineScoreRank(scoreValue: number): PerformanceScore {
    if (scoreValue >= SCORE_THRESHOLDS.A) return 'A'
    if (scoreValue >= SCORE_THRESHOLDS.B) return 'B'
    if (scoreValue >= SCORE_THRESHOLDS.C) return 'C'
    if (scoreValue >= SCORE_THRESHOLDS.D) return 'D'
    return 'E'
  }

  /**
   * スコアをデータベースに保存
   */
  private async saveScore(result: PerformanceScoreResult): Promise<void> {
    try {
      const { error } = await supabase
        .from('products_master')
        .update({
          performance_score: result.score,
          performance_score_value: result.score_value,
          score_calculated_at: result.calculated_at
        })
        .eq('id', result.product_id)

      if (error) {
        console.error('スコア保存エラー:', error)
        throw error
      }

      console.log(`✅ スコアを保存: SKU=${result.sku}, Score=${result.score} (${result.score_value})`)
    } catch (error) {
      console.error('スコア保存エラー:', error)
      throw error
    }
  }

  /**
   * スコア履歴を記録
   */
  private async recordScoreHistory(result: PerformanceScoreResult): Promise<void> {
    try {
      const { error } = await supabase
        .from('performance_score_history')
        .insert({
          product_id: result.product_id,
          sku: result.sku,
          score: result.score,
          score_value: result.score_value,
          factors: result.factors,
          calculated_at: result.calculated_at
        })

      if (error) {
        console.error('スコア履歴記録エラー:', error)
      }
    } catch (error) {
      console.error('スコア履歴記録エラー:', error)
    }
  }

  /**
   * 商品の現在のスコアを取得
   */
  async getCurrentScore(product_id: string): Promise<PerformanceScoreResult | null> {
    try {
      const { data, error } = await supabase
        .from('products_master')
        .select('id, sku, performance_score, performance_score_value, score_calculated_at, watcher_count, view_count, sold_count, days_listed')
        .eq('id', product_id)
        .single()

      if (error || !data) {
        console.error('スコア取得エラー:', error)
        return null
      }

      // スコアが存在しない場合
      if (!data.performance_score) {
        return null
      }

      // 有効期限を計算（計算日時から24時間後）
      const calculatedAt = new Date(data.score_calculated_at || new Date())
      const expiresAt = new Date(calculatedAt.getTime() + 24 * 60 * 60 * 1000)

      return {
        product_id: data.id,
        sku: data.sku,
        score: data.performance_score as PerformanceScore,
        score_value: data.performance_score_value || 0,
        factors: {
          market_inventory_count: 0, // TODO: 市場在庫数を取得
          view_count: data.view_count || 0,
          watcher_count: data.watcher_count || 0,
          days_listed: data.days_listed || 0,
          profit_margin_percent: 0, // TODO: 利益率を取得
          sold_count: data.sold_count || 0,
          conversion_rate: 0 // TODO: 転換率を計算
        },
        calculated_at: calculatedAt.toISOString(),
        expires_at: expiresAt.toISOString()
      }
    } catch (error) {
      console.error('スコア取得エラー:', error)
      return null
    }
  }

  /**
   * バッチ処理: 複数商品のスコアを一括計算
   */
  async batchCalculateScores(products: Array<{ id: string; sku: string }>): Promise<PerformanceScoreResult[]> {
    const results: PerformanceScoreResult[] = []

    for (const product of products) {
      try {
        // 商品データを取得
        const { data, error } = await supabase
          .from('products_master')
          .select('id, sku, watcher_count, view_count, sold_count, days_listed, profit_margin_percent')
          .eq('id', product.id)
          .single()

        if (error || !data) {
          console.warn(`商品データ取得エラー: SKU=${product.sku}`, error)
          continue
        }

        // スコア計算要因を構築
        const factors: PerformanceScoreFactors = {
          market_inventory_count: 0, // TODO: 市場在庫数を取得
          view_count: data.view_count || 0,
          watcher_count: data.watcher_count || 0,
          days_listed: data.days_listed || 0,
          profit_margin_percent: data.profit_margin_percent || 0,
          sold_count: data.sold_count || 0,
          conversion_rate: 0 // TODO: 転換率を計算
        }

        // スコアを計算
        const result = await this.calculateScore(data.id, data.sku, factors)
        results.push(result)
      } catch (error) {
        console.error(`スコア計算エラー: SKU=${product.sku}`, error)
      }
    }

    return results
  }

  /**
   * 低スコア商品を取得（ルール12, 13用）
   */
  async getLowScoreProducts(
    threshold: PerformanceScore = 'D',
    limit: number = 50
  ): Promise<PerformanceScoreResult[]> {
    try {
      const thresholdValue = SCORE_THRESHOLDS[threshold]

      const { data, error } = await supabase
        .from('products_master')
        .select('id, sku, performance_score, performance_score_value, score_calculated_at, watcher_count, view_count, sold_count, days_listed')
        .lte('performance_score_value', thresholdValue)
        .order('performance_score_value', { ascending: true })
        .limit(limit)

      if (error) {
        console.error('低スコア商品取得エラー:', error)
        return []
      }

      return (data || []).map(product => {
        const calculatedAt = new Date(product.score_calculated_at || new Date())
        const expiresAt = new Date(calculatedAt.getTime() + 24 * 60 * 60 * 1000)

        return {
          product_id: product.id,
          sku: product.sku,
          score: product.performance_score as PerformanceScore,
          score_value: product.performance_score_value || 0,
          factors: {
            market_inventory_count: 0,
            view_count: product.view_count || 0,
            watcher_count: product.watcher_count || 0,
            days_listed: product.days_listed || 0,
            profit_margin_percent: 0,
            sold_count: product.sold_count || 0,
            conversion_rate: 0
          },
          calculated_at: calculatedAt.toISOString(),
          expires_at: expiresAt.toISOString()
        }
      })
    } catch (error) {
      console.error('低スコア商品取得エラー:', error)
      return []
    }
  }

  /**
   * スコア履歴を取得
   */
  async getScoreHistory(product_id: string, limit: number = 30): Promise<PerformanceScoreHistory[]> {
    try {
      const { data, error } = await supabase
        .from('performance_score_history')
        .select('*')
        .eq('product_id', product_id)
        .order('calculated_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('スコア履歴取得エラー:', error)
        return []
      }

      return (data || []) as PerformanceScoreHistory[]
    } catch (error) {
      console.error('スコア履歴取得エラー:', error)
      return []
    }
  }
}

/**
 * シングルトンインスタンス
 */
export const scoringService = new ScoringService()
