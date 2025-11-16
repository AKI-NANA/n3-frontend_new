/**
 * 価格計算エンジン
 * 戦略に基づいて適切な販売価格を計算する
 */

import { ResolvedStrategy } from './strategy-resolver'

export interface PriceCalculationInput {
  product_id: number
  cost_jpy: number
  shipping_cost_jpy: number
  competitor_lowest_price_usd?: number
  competitor_average_price_usd?: number
  current_price_usd?: number
  exchange_rate?: number
}

export interface PriceCalculationResult {
  product_id: number
  suggested_price_usd: number
  min_price_usd: number
  max_price_usd: number
  expected_profit_usd: number
  profit_margin_percent: number
  strategy_applied: string
  red_flag: boolean // 🔴 赤字警告フラグ
  break_even_price_usd: number // 🔴 損益分岐点
  calculation_details: {
    base_cost_usd: number
    fees_usd: number
    target_profit_usd: number
    competitor_based_price?: number
    adjustment_applied?: number
    red_flag_triggered?: boolean // 🔴 赤字ストッパー発動
  }
}

/**
 * 戦略に基づいて価格を計算する
 */
export async function calculatePrice(
  input: PriceCalculationInput,
  strategy: ResolvedStrategy
): Promise<PriceCalculationResult> {
  const exchangeRate = input.exchange_rate || 150 // デフォルト為替レート

  // 1. 基本コスト計算（JPY → USD）
  const baseCostUsd = (input.cost_jpy + input.shipping_cost_jpy) / exchangeRate
  
  // 2. 手数料計算（仮: 13%）
  const feesUsd = baseCostUsd * 0.13
  
  // 🔴 損益分岐点（赤字にならない最低価格）
  const breakEvenPriceUsd = baseCostUsd + feesUsd
  
  // 3. 最低必要価格（利益確保）
  const minPriceUsd = breakEvenPriceUsd + strategy.params.min_profit_usd

  let suggestedPriceUsd = minPriceUsd
  let strategyApplied = strategy.strategy_type
  let adjustmentApplied = 0
  let redFlagTriggered = false

  // 4. 戦略別の価格計算
  switch (strategy.strategy_type) {
    case 'follow_lowest':
      // 最安値追従（最低利益確保）
      if (input.competitor_lowest_price_usd) {
        const competitorBased = input.competitor_lowest_price_usd + strategy.params.price_adjust_percent / 100 * input.competitor_lowest_price_usd
        
        // 🔴 赤字ストッパー: 競合価格が損益分岐点を下回る場合
        if (competitorBased < breakEvenPriceUsd) {
          console.warn(`[RedFlagStopper] 商品 ${input.product_id}: 競合価格 $${competitorBased.toFixed(2)} が損益分岐点 $${breakEvenPriceUsd.toFixed(2)} を下回っています`)
          suggestedPriceUsd = breakEvenPriceUsd
          strategyApplied = 'red_flag_stopper (break-even enforced)'
          redFlagTriggered = true
        }
        // 最低利益を確保しつつ競合に追従
        else if (competitorBased >= minPriceUsd) {
          suggestedPriceUsd = competitorBased
          adjustmentApplied = strategy.params.price_adjust_percent
        } else {
          // 競合価格が最低利益を下回るが損益分岐点は上回る場合
          console.warn(`[RedFlagStopper] 商品 ${input.product_id}: 競合価格 $${competitorBased.toFixed(2)} が最低利益目標を下回っています`)
          suggestedPriceUsd = breakEvenPriceUsd // 🔴 赤字回避優先
          strategyApplied = 'red_flag_stopper (low profit)'
          redFlagTriggered = true
        }
      }
      break

    case 'price_difference':
      // 基準価格からの差分維持
      if (input.competitor_average_price_usd) {
        const targetPrice = input.competitor_average_price_usd + strategy.params.price_difference_usd
        
        // 🔴 赤字ストッパー
        if (targetPrice < breakEvenPriceUsd) {
          console.warn(`[RedFlagStopper] 商品 ${input.product_id}: 計算価格 $${targetPrice.toFixed(2)} が損益分岐点を下回っています`)
          suggestedPriceUsd = breakEvenPriceUsd
          strategyApplied = 'red_flag_stopper (break-even enforced)'
          redFlagTriggered = true
        } else {
          suggestedPriceUsd = Math.max(minPriceUsd, targetPrice)
          adjustmentApplied = strategy.params.price_difference_usd
        }
      }
      break

    case 'minimum_profit':
      // 最低利益確保のみ
      suggestedPriceUsd = minPriceUsd
      break

    case 'seasonal':
      // 季節戦略（将来実装予定）
      suggestedPriceUsd = Math.max(minPriceUsd, minPriceUsd * 1.2)
      break

    case 'none':
      // 手動管理 - 現在価格を維持
      if (input.current_price_usd) {
        // 🔴 赤字ストッパー: 手動価格が損益分岐点を下回る場合
        if (input.current_price_usd < breakEvenPriceUsd) {
          console.warn(`[RedFlagStopper] 商品 ${input.product_id}: 現在価格 $${input.current_price_usd.toFixed(2)} が損益分岐点を下回っています`)
          suggestedPriceUsd = breakEvenPriceUsd
          strategyApplied = 'red_flag_stopper (manual override)'
          redFlagTriggered = true
        } else {
          suggestedPriceUsd = input.current_price_usd
          strategyApplied = 'manual'
        }
      } else {
        suggestedPriceUsd = minPriceUsd
      }
      break

    default:
      suggestedPriceUsd = minPriceUsd
  }

  // 5. 最大調整幅の適用
  if (input.current_price_usd && strategy.params.max_adjust_percent > 0) {
    const maxIncrease = input.current_price_usd * (1 + strategy.params.max_adjust_percent / 100)
    const maxDecrease = input.current_price_usd * (1 - strategy.params.max_adjust_percent / 100)
    
    const adjustedPrice = Math.min(Math.max(suggestedPriceUsd, maxDecrease), maxIncrease)
    
    // 🔴 赤字ストッパー: 調整後の価格が損益分岐点を下回る場合
    if (adjustedPrice < breakEvenPriceUsd) {
      console.warn(`[RedFlagStopper] 商品 ${input.product_id}: 調整後価格 $${adjustedPrice.toFixed(2)} が損益分岐点を下回っています`)
      suggestedPriceUsd = breakEvenPriceUsd
      strategyApplied += ' + red_flag_stopper'
      redFlagTriggered = true
    } else {
      suggestedPriceUsd = adjustedPrice
    }
  }

  // 6. "最安値より高い場合のみ適用"オプション
  if (strategy.params.apply_above_lowest && input.competitor_lowest_price_usd) {
    if (input.current_price_usd && input.current_price_usd <= input.competitor_lowest_price_usd) {
      // 現在価格が既に最安値以下なら変更しない（ただし赤字ストッパーは適用）
      if (input.current_price_usd >= breakEvenPriceUsd) {
        suggestedPriceUsd = input.current_price_usd
        strategyApplied += ' (skipped - already below lowest)'
      } else {
        // 🔴 現在価格が赤字の場合は強制的に損益分岐点まで上げる
        suggestedPriceUsd = breakEvenPriceUsd
        strategyApplied += ' + red_flag_stopper (forced)'
        redFlagTriggered = true
      }
    }
  }

  // 🔴 最終的な赤字チェック
  if (suggestedPriceUsd < breakEvenPriceUsd) {
    console.error(`[CRITICAL] 商品 ${input.product_id}: 最終価格 $${suggestedPriceUsd.toFixed(2)} が損益分岐点 $${breakEvenPriceUsd.toFixed(2)} を下回っています - 強制修正`)
    suggestedPriceUsd = breakEvenPriceUsd
    strategyApplied = 'CRITICAL_RED_FLAG_STOPPER'
    redFlagTriggered = true
  }

  // 7. 最終結果の計算
  const finalProfit = suggestedPriceUsd - baseCostUsd - feesUsd
  const profitMargin = (finalProfit / suggestedPriceUsd) * 100

  // 🔴 赤字警告フラグ（利益が目標を大きく下回る場合）
  const redFlag = finalProfit < strategy.params.min_profit_usd * 0.5 || redFlagTriggered

  const result: PriceCalculationResult = {
    product_id: input.product_id,
    suggested_price_usd: Math.round(suggestedPriceUsd * 100) / 100,
    min_price_usd: Math.round(minPriceUsd * 100) / 100,
    max_price_usd: Math.round((minPriceUsd * 2) * 100) / 100,
    expected_profit_usd: Math.round(finalProfit * 100) / 100,
    profit_margin_percent: Math.round(profitMargin * 10) / 10,
    strategy_applied: strategyApplied,
    red_flag: redFlag,
    break_even_price_usd: Math.round(breakEvenPriceUsd * 100) / 100,
    calculation_details: {
      base_cost_usd: Math.round(baseCostUsd * 100) / 100,
      fees_usd: Math.round(feesUsd * 100) / 100,
      target_profit_usd: strategy.params.min_profit_usd,
      competitor_based_price: input.competitor_lowest_price_usd,
      adjustment_applied: adjustmentApplied,
      red_flag_triggered: redFlagTriggered
    }
  }

  if (redFlag) {
    console.warn(`[PricingEngine] 🔴 商品 ${input.product_id} に赤字警告:`, {
      strategy: strategyApplied,
      suggested: result.suggested_price_usd,
      break_even: result.break_even_price_usd,
      profit: result.expected_profit_usd,
      margin: result.profit_margin_percent
    })
  } else {
    console.log(`[PricingEngine] 商品 ${input.product_id} の価格計算:`, {
      strategy: strategyApplied,
      suggested: result.suggested_price_usd,
      profit: result.expected_profit_usd,
      margin: result.profit_margin_percent
    })
  }

  return result
}

/**
 * 複数商品の価格を一括計算する
 */
export async function calculateBulkPrices(
  inputs: PriceCalculationInput[],
  strategies: Map<number, ResolvedStrategy>
): Promise<PriceCalculationResult[]> {
  const results: PriceCalculationResult[] = []

  for (const input of inputs) {
    const strategy = strategies.get(input.product_id)
    if (!strategy) {
      console.warn(`[PricingEngine] 商品 ${input.product_id} の戦略が見つかりません`)
      continue
    }

    const result = await calculatePrice(input, strategy)
    results.push(result)
  }

  const redFlagCount = results.filter(r => r.red_flag).length
  
  console.log(`[PricingEngine] ${results.length}件の価格を計算しました (🔴 赤字警告: ${redFlagCount}件)`)
  
  return results
}
