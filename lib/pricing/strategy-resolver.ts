/**
 * 価格戦略解決ロジック
 * 商品ごとのカスタム設定とグローバルデフォルト設定を解決する
 */

import { createClient } from '@/lib/supabase/client'

export interface ResolvedStrategy {
  strategy_type: string
  params: {
    min_profit_usd: number
    price_adjust_percent: number
    follow_competitor: boolean
    max_adjust_percent: number
    price_difference_usd: number
    apply_above_lowest: boolean
  }
  inventory: {
    out_of_stock_action: string
    check_frequency: string
  }
  source: 'custom' | 'default'
}

/**
 * 商品の価格戦略を解決する
 */
export async function resolveProductStrategy(productId: number): Promise<ResolvedStrategy | null> {
  const supabase = createClient()

  try {
    // 1. 商品の個別設定を取得
    const { data: productStrategy, error: productError } = await supabase
      .from('product_pricing_strategies')
      .select('*')
      .eq('product_id', productId)
      .single()

    if (productError && productError.code !== 'PGRST116') {
      console.error('[StrategyResolver] 商品戦略取得エラー:', productError)
    }

    // 2. グローバルデフォルト設定を取得
    const { data: defaultStrategy, error: defaultError } = await supabase
      .from('global_pricing_strategy')
      .select('*')
      .single()

    if (defaultError) {
      console.error('[StrategyResolver] デフォルト戦略取得エラー:', defaultError)
      return null
    }

    // 3. 戦略の解決
    const useCustomPricing = productStrategy?.use_default_pricing === false
    const useCustomInventory = productStrategy?.use_default_inventory === false

    const resolved: ResolvedStrategy = {
      strategy_type: useCustomPricing 
        ? productStrategy.custom_pricing_strategy 
        : defaultStrategy.pricing_strategy,
      
      params: useCustomPricing
        ? productStrategy.custom_strategy_params
        : {
            min_profit_usd: defaultStrategy.min_profit_usd,
            price_adjust_percent: defaultStrategy.price_adjust_percent,
            follow_competitor: defaultStrategy.follow_competitor,
            max_adjust_percent: defaultStrategy.max_adjust_percent,
            price_difference_usd: defaultStrategy.price_difference_usd,
            apply_above_lowest: defaultStrategy.apply_above_lowest
          },
      
      inventory: useCustomInventory
        ? {
            out_of_stock_action: productStrategy.custom_out_of_stock_action,
            check_frequency: productStrategy.custom_check_frequency
          }
        : {
            out_of_stock_action: defaultStrategy.out_of_stock_action,
            check_frequency: defaultStrategy.check_frequency
          },
      
      source: (useCustomPricing || useCustomInventory) ? 'custom' : 'default'
    }

    console.log(`[StrategyResolver] 商品 ${productId} の戦略解決:`, {
      source: resolved.source,
      strategy_type: resolved.strategy_type,
      params: resolved.params
    })

    return resolved

  } catch (error) {
    console.error('[StrategyResolver] 戦略解決エラー:', error)
    return null
  }
}

/**
 * 複数商品の戦略を一括解決する
 */
export async function resolveBulkStrategies(productIds: number[]): Promise<Map<number, ResolvedStrategy>> {
  const supabase = createClient()
  const strategies = new Map<number, ResolvedStrategy>()

  try {
    // グローバルデフォルト設定を取得
    const { data: defaultStrategy, error: defaultError } = await supabase
      .from('global_pricing_strategy')
      .select('*')
      .single()

    if (defaultError) {
      console.error('[StrategyResolver] デフォルト戦略取得エラー:', defaultError)
      return strategies
    }

    // 商品の個別設定を一括取得
    const { data: productStrategies, error: productError } = await supabase
      .from('product_pricing_strategies')
      .select('*')
      .in('product_id', productIds)

    if (productError) {
      console.error('[StrategyResolver] 商品戦略取得エラー:', productError)
    }

    const strategyMap = new Map(
      (productStrategies || []).map(s => [s.product_id, s])
    )

    // 各商品の戦略を解決
    for (const productId of productIds) {
      const productStrategy = strategyMap.get(productId)
      
      const useCustomPricing = productStrategy?.use_default_pricing === false
      const useCustomInventory = productStrategy?.use_default_inventory === false

      const resolved: ResolvedStrategy = {
        strategy_type: useCustomPricing 
          ? productStrategy.custom_pricing_strategy 
          : defaultStrategy.pricing_strategy,
        
        params: useCustomPricing
          ? productStrategy.custom_strategy_params
          : {
              min_profit_usd: defaultStrategy.min_profit_usd,
              price_adjust_percent: defaultStrategy.price_adjust_percent,
              follow_competitor: defaultStrategy.follow_competitor,
              max_adjust_percent: defaultStrategy.max_adjust_percent,
              price_difference_usd: defaultStrategy.price_difference_usd,
              apply_above_lowest: defaultStrategy.apply_above_lowest
            },
        
        inventory: useCustomInventory
          ? {
              out_of_stock_action: productStrategy.custom_out_of_stock_action,
              check_frequency: productStrategy.custom_check_frequency
            }
          : {
              out_of_stock_action: defaultStrategy.out_of_stock_action,
              check_frequency: defaultStrategy.check_frequency
            },
        
        source: (useCustomPricing || useCustomInventory) ? 'custom' : 'default'
      }

      strategies.set(productId, resolved)
    }

    console.log(`[StrategyResolver] ${productIds.length}件の戦略を解決しました`)
    return strategies

  } catch (error) {
    console.error('[StrategyResolver] 一括戦略解決エラー:', error)
    return strategies
  }
}
