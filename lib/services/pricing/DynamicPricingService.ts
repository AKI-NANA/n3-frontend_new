/**
 * ダイナミックプライシングサービス
 *
 * Task D-3: 最安値追従（ルール1）と基準価格からの差分調整（ルール6）を実装
 *
 * このサービスは、統合利益計算サービスからの価格を上書きし、
 * 市場状況、競合、在庫、ウォッチャー数に応じて価格を調整します。
 */

import { createClient } from '@/lib/supabase/client'
import type {
  DynamicPricingConfig,
  FollowLowestWithMinProfitConfig,
  PriceDifferenceTrackingConfig,
  DynamicPricingResponse,
  PriceAdjustmentLog
} from '@/types/dynamicPricing'

const supabase = createClient()

/**
 * 競合商品の最安値情報
 */
export interface CompetitorPriceInfo {
  lowest_price_usd: number
  competitor_count: number
  avg_price_usd: number
  marketplace: string
  fetched_at: string
}

/**
 * 価格調整リクエスト
 */
export interface PriceAdjustmentRequest {
  product_id: string
  sku: string
  current_price_usd: number
  base_cost_usd: number              // 原価
  competitor_info?: CompetitorPriceInfo
  strategy_config?: DynamicPricingConfig
  marketplace?: string
}

/**
 * 価格調整結果
 */
export interface PriceAdjustmentResult {
  new_price_usd: number
  old_price_usd: number
  adjustment_reason: string
  strategy_applied: string
  min_profit_enforced: boolean       // 最低利益ストッパーが発動したか
  adjustment_details: {
    base_cost_usd: number
    min_profit_usd: number
    calculated_price_usd: number
    final_price_usd: number
  }
}

/**
 * DynamicPricingService クラス
 */
export class DynamicPricingService {
  /**
   * メイン関数: 価格を動的に調整する
   *
   * @param request 価格調整リクエスト
   * @returns 調整結果
   */
  async adjustPrice(request: PriceAdjustmentRequest): Promise<PriceAdjustmentResult> {
    const { product_id, sku, current_price_usd, base_cost_usd, competitor_info, strategy_config, marketplace } = request

    // 戦略設定を取得（個別設定 > デフォルト設定）
    const strategy = strategy_config || await this.getEffectiveStrategy(product_id, sku)

    if (!strategy) {
      // 戦略が設定されていない場合は現在価格を維持
      return {
        new_price_usd: current_price_usd,
        old_price_usd: current_price_usd,
        adjustment_reason: '価格戦略が設定されていません',
        strategy_applied: 'none',
        min_profit_enforced: false,
        adjustment_details: {
          base_cost_usd,
          min_profit_usd: 0,
          calculated_price_usd: current_price_usd,
          final_price_usd: current_price_usd
        }
      }
    }

    // 戦略タイプに応じて価格調整を実行
    let result: PriceAdjustmentResult

    switch (strategy.strategy_type) {
      case 'follow_lowest_with_min_profit':
        result = await this.applyFollowLowestWithMinProfit(
          request,
          strategy as FollowLowestWithMinProfitConfig
        )
        break

      case 'price_difference_tracking':
        result = await this.applyPriceDifferenceTracking(
          request,
          strategy as PriceDifferenceTrackingConfig
        )
        break

      default:
        // 未実装の戦略は現在価格を維持
        result = {
          new_price_usd: current_price_usd,
          old_price_usd: current_price_usd,
          adjustment_reason: `戦略タイプ ${strategy.strategy_type} は未実装です`,
          strategy_applied: strategy.strategy_type,
          min_profit_enforced: false,
          adjustment_details: {
            base_cost_usd,
            min_profit_usd: 0,
            calculated_price_usd: current_price_usd,
            final_price_usd: current_price_usd
          }
        }
    }

    // 価格調整ログを記録
    if (result.new_price_usd !== result.old_price_usd) {
      await this.logPriceAdjustment({
        product_id,
        sku,
        old_price_usd: result.old_price_usd,
        new_price_usd: result.new_price_usd,
        adjustment_reason: result.adjustment_reason,
        strategy_type: strategy.strategy_type,
        strategy_config: strategy,
        adjusted_by: 'system',
        adjusted_at: new Date().toISOString(),
        marketplace
      })
    }

    return result
  }

  /**
   * ルール1: 最安値追従（最低利益確保）
   *
   * 最安値に合わせるが、事前に設定した「最低利益額」を下回る場合は
   * その価格で固定（赤字回避の最終ストッパー）
   */
  private async applyFollowLowestWithMinProfit(
    request: PriceAdjustmentRequest,
    config: FollowLowestWithMinProfitConfig
  ): Promise<PriceAdjustmentResult> {
    const { current_price_usd, base_cost_usd, competitor_info } = request
    const { min_profit_amount_usd, enable_stopper } = config

    // 競合情報がない場合は現在価格を維持
    if (!competitor_info || !competitor_info.lowest_price_usd) {
      return {
        new_price_usd: current_price_usd,
        old_price_usd: current_price_usd,
        adjustment_reason: '競合価格情報が取得できません',
        strategy_applied: 'follow_lowest_with_min_profit',
        min_profit_enforced: false,
        adjustment_details: {
          base_cost_usd,
          min_profit_usd: min_profit_amount_usd,
          calculated_price_usd: current_price_usd,
          final_price_usd: current_price_usd
        }
      }
    }

    const lowest_competitor_price = competitor_info.lowest_price_usd
    const min_price_with_profit = base_cost_usd + min_profit_amount_usd

    let new_price = lowest_competitor_price
    let min_profit_enforced = false
    let adjustment_reason = `最安値追従: 競合最安値 $${lowest_competitor_price.toFixed(2)} に調整`

    // 最低利益ストッパーのチェック
    if (enable_stopper && lowest_competitor_price < min_price_with_profit) {
      new_price = min_price_with_profit
      min_profit_enforced = true
      adjustment_reason = `最低利益ストッパー発動: 最安値 $${lowest_competitor_price.toFixed(2)} では利益が確保できないため、$${min_price_with_profit.toFixed(2)} に固定`
    }

    return {
      new_price_usd: parseFloat(new_price.toFixed(2)),
      old_price_usd: current_price_usd,
      adjustment_reason,
      strategy_applied: 'follow_lowest_with_min_profit',
      min_profit_enforced,
      adjustment_details: {
        base_cost_usd,
        min_profit_usd: min_profit_amount_usd,
        calculated_price_usd: lowest_competitor_price,
        final_price_usd: new_price
      }
    }
  }

  /**
   * ルール6: 基準価格からの差分調整
   *
   * 最安値より[N]円/ドル下げて、または上げて出品し、
   * その差分を維持したまま価格を自動追従させる
   */
  private async applyPriceDifferenceTracking(
    request: PriceAdjustmentRequest,
    config: PriceDifferenceTrackingConfig
  ): Promise<PriceAdjustmentResult> {
    const { current_price_usd, base_cost_usd, competitor_info } = request
    const { price_difference_usd, apply_above_lowest, auto_follow } = config

    // 競合情報がない場合は現在価格を維持
    if (!competitor_info || !competitor_info.lowest_price_usd) {
      return {
        new_price_usd: current_price_usd,
        old_price_usd: current_price_usd,
        adjustment_reason: '競合価格情報が取得できません',
        strategy_applied: 'price_difference_tracking',
        min_profit_enforced: false,
        adjustment_details: {
          base_cost_usd,
          min_profit_usd: 0,
          calculated_price_usd: current_price_usd,
          final_price_usd: current_price_usd
        }
      }
    }

    const lowest_competitor_price = competitor_info.lowest_price_usd

    // 差分を適用した価格を計算
    let new_price: number
    let adjustment_reason: string

    if (apply_above_lowest) {
      // 最安値より上に設定
      new_price = lowest_competitor_price + price_difference_usd
      adjustment_reason = `差分追従: 最安値 $${lowest_competitor_price.toFixed(2)} より $${price_difference_usd.toFixed(2)} 高く設定`
    } else {
      // 最安値より下に設定
      new_price = lowest_competitor_price + price_difference_usd  // price_difference_usd が負の場合
      adjustment_reason = `差分追従: 最安値 $${lowest_competitor_price.toFixed(2)} より $${Math.abs(price_difference_usd).toFixed(2)} 低く設定`
    }

    // 自動追従が無効の場合、現在価格を維持
    if (!auto_follow) {
      new_price = current_price_usd
      adjustment_reason = '差分追従（自動追従無効）: 現在価格を維持'
    }

    // 負の価格にならないようチェック
    if (new_price < 0.01) {
      new_price = 0.01
      adjustment_reason = '差分追従: 価格が負になるため、最低価格 $0.01 に設定'
    }

    return {
      new_price_usd: parseFloat(new_price.toFixed(2)),
      old_price_usd: current_price_usd,
      adjustment_reason,
      strategy_applied: 'price_difference_tracking',
      min_profit_enforced: false,
      adjustment_details: {
        base_cost_usd,
        min_profit_usd: 0,
        calculated_price_usd: new_price,
        final_price_usd: new_price
      }
    }
  }

  /**
   * 有効な価格戦略を取得（個別設定 > デフォルト設定）
   */
  private async getEffectiveStrategy(product_id: string, sku: string): Promise<DynamicPricingConfig | null> {
    try {
      // 1. 商品の個別戦略設定を確認
      const { data: product, error: productError } = await supabase
        .from('products_master')
        .select('strategy_id, custom_strategy_config')
        .eq('id', product_id)
        .single()

      if (productError) {
        console.error('商品の戦略設定取得エラー:', productError)
      }

      // 個別設定が存在する場合
      if (product?.custom_strategy_config) {
        return product.custom_strategy_config as DynamicPricingConfig
      }

      // 2. strategy_id が設定されている場合、マスターから取得
      if (product?.strategy_id) {
        const { data: strategy, error: strategyError } = await supabase
          .from('pricing_strategy_master')
          .select('strategy_config')
          .eq('id', product.strategy_id)
          .eq('enabled', true)
          .single()

        if (!strategyError && strategy) {
          return strategy.strategy_config as DynamicPricingConfig
        }
      }

      // 3. デフォルト戦略を取得
      const { data: defaultStrategy, error: defaultError } = await supabase
        .from('pricing_strategy_master')
        .select('strategy_config')
        .eq('is_default', true)
        .eq('enabled', true)
        .order('priority', { ascending: false })
        .limit(1)
        .single()

      if (!defaultError && defaultStrategy) {
        return defaultStrategy.strategy_config as DynamicPricingConfig
      }

      return null
    } catch (error) {
      console.error('戦略設定取得エラー:', error)
      return null
    }
  }

  /**
   * 価格調整ログを記録
   */
  private async logPriceAdjustment(log: Omit<PriceAdjustmentLog, 'id'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('price_adjustment_log')
        .insert({
          product_id: log.product_id,
          sku: log.sku,
          old_price_usd: log.old_price_usd,
          new_price_usd: log.new_price_usd,
          adjustment_reason: log.adjustment_reason,
          strategy_type: log.strategy_type,
          strategy_config: log.strategy_config,
          adjusted_by: log.adjusted_by,
          adjusted_at: log.adjusted_at,
          marketplace: log.marketplace
        })

      if (error) {
        console.error('価格調整ログ記録エラー:', error)
      }
    } catch (error) {
      console.error('価格調整ログ記録エラー:', error)
    }
  }

  /**
   * 商品の価格を更新（データベースに反映）
   */
  async updateProductPrice(product_id: string, new_price_usd: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('products_master')
        .update({
          price_usd: new_price_usd,
          price_last_adjusted_at: new Date().toISOString()
        })
        .eq('id', product_id)

      if (error) {
        console.error('商品価格更新エラー:', error)
        throw error
      }
    } catch (error) {
      console.error('商品価格更新エラー:', error)
      throw error
    }
  }

  /**
   * バッチ処理: 複数商品の価格を一括調整
   */
  async batchAdjustPrices(
    requests: PriceAdjustmentRequest[]
  ): Promise<PriceAdjustmentResult[]> {
    const results: PriceAdjustmentResult[] = []

    for (const request of requests) {
      try {
        const result = await this.adjustPrice(request)
        results.push(result)

        // 価格が変更された場合、DBを更新
        if (result.new_price_usd !== result.old_price_usd) {
          await this.updateProductPrice(request.product_id, result.new_price_usd)
        }
      } catch (error) {
        console.error(`商品 ${request.sku} の価格調整エラー:`, error)
        // エラーが発生しても続行
        results.push({
          new_price_usd: request.current_price_usd,
          old_price_usd: request.current_price_usd,
          adjustment_reason: `エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
          strategy_applied: 'error',
          min_profit_enforced: false,
          adjustment_details: {
            base_cost_usd: request.base_cost_usd,
            min_profit_usd: 0,
            calculated_price_usd: request.current_price_usd,
            final_price_usd: request.current_price_usd
          }
        })
      }
    }

    return results
  }
}

/**
 * シングルトンインスタンス
 */
export const dynamicPricingService = new DynamicPricingService()
