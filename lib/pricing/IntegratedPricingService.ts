/**
 * 統合利益計算サービス (Integrated Pricing Service)
 *
 * 目的: 全てのマーケットプレイスで共通利用できる価格計算エンジン
 * marketplace_settingsを参照し、正確な手数料・送料・税金・利益を計算する
 *
 * Phase 1-1: Amazon統合の経済的な基盤
 */

import { createClient } from '@/lib/supabase/client'

/**
 * マーケットプレイス設定（marketplace_settings テーブルの型定義）
 */
export interface MarketplaceSettings {
  marketplace_id: string
  sales_fee_rate: number // 販売手数料率（例: 0.15 = 15%）
  fixed_fee: number // 固定手数料（現地通貨）
  cross_border_fee_rate: number // 越境手数料率（例: 0.02 = 2%）
  tax_rate: number // VAT/消費税率（例: 0.20 = 20%）
  default_currency: string // 標準表示通貨（USD, JPY, EUR等）
  payout_currency: string // 入金通貨
  target_profit_rate: number // 目標利益率（例: 0.20 = 20%）
  api_rate_limit_per_hour?: number
  account_id?: string
  marketplace?: string
}

/**
 * 送料ルール（shipping_rules テーブルの型定義）
 */
export interface ShippingRule {
  id: number
  marketplace_id: string
  shipping_method: string
  is_fba_like: boolean
  rule_json: {
    unit: 'g' | 'kg'
    base_weight: number
    base_price: number
    tiers?: Array<{
      max_weight: number
      price?: number
      price_per_kg?: number
      region?: string
    }>
    handling_fee?: number
    subsidy_rate?: number // Shopee SLS等の補助率
  }
}

/**
 * 価格計算の入力パラメータ
 */
export interface PricingInput {
  marketplace_id: string // マーケットプレイスID
  cost_jpy: number // 原価（JPY）
  target_profit_jpy?: number // 目標利益（JPY）
  target_profit_rate?: number // 目標利益率（0.20 = 20%）
  weight_g?: number // 商品重量（グラム）
  shipping_method?: string // 送料計算方法
  exchange_rate?: number // 為替レート（JPY → 現地通貨）

  // オプション設定
  include_tax?: boolean // VAT/税金を含むか
  include_cross_border_fee?: boolean // 越境手数料を含むか
  custom_shipping_cost?: number // カスタム送料（現地通貨）
}

/**
 * 価格計算の結果
 */
export interface PricingResult {
  // 基本価格情報
  selling_price: number // 販売価格（現地通貨）
  currency: string // 通貨

  // コスト内訳
  cost_local: number // 原価（現地通貨換算）
  shipping_cost: number // 送料（現地通貨）
  marketplace_fees: number // マーケットプレイス手数料
  cross_border_fee: number // 越境手数料
  tax_amount: number // VAT/税金
  total_costs: number // 総コスト

  // 利益情報
  profit_local: number // 利益（現地通貨）
  profit_jpy: number // 利益（JPY）
  profit_margin: number // 利益率（0.20 = 20%）
  target_profit_margin: number // 目標利益率
  margin_delta: number // 目標との差分

  // 判定
  is_profitable: boolean // 利益が出るか
  can_list: boolean // 出品可能か
  warnings: string[] // 警告メッセージ

  // 詳細情報
  breakdown: {
    base_cost: number
    shipping: number
    fees_breakdown: {
      sales_fee: number
      fixed_fee: number
      cross_border_fee: number
      tax: number
    }
  }
}

/**
 * 統合利益計算サービスクラス
 */
export class IntegratedPricingService {
  private supabase = createClient()

  /**
   * marketplace_settings を取得
   */
  async getMarketplaceSettings(marketplace_id: string): Promise<MarketplaceSettings | null> {
    const { data, error } = await this.supabase
      .from('marketplace_settings')
      .select('*')
      .eq('marketplace', marketplace_id)
      .single()

    if (error) {
      console.error('Failed to fetch marketplace settings:', error)
      return null
    }

    return data as MarketplaceSettings
  }

  /**
   * shipping_rules を取得
   */
  async getShippingRule(
    marketplace_id: string,
    shipping_method: string
  ): Promise<ShippingRule | null> {
    const { data, error } = await this.supabase
      .from('shipping_rules')
      .select('*')
      .eq('marketplace_id', marketplace_id)
      .eq('shipping_method', shipping_method)
      .single()

    if (error) {
      console.error('Failed to fetch shipping rule:', error)
      return null
    }

    return data as ShippingRule
  }

  /**
   * 送料を計算
   */
  calculateShipping(weight_g: number, rule: ShippingRule): number {
    const { rule_json } = rule
    const weight = rule_json.unit === 'kg' ? weight_g / 1000 : weight_g

    let shipping_cost = rule_json.base_price

    // 重量帯の計算
    if (rule_json.tiers && rule_json.tiers.length > 0) {
      for (const tier of rule_json.tiers) {
        if (weight <= tier.max_weight) {
          if (tier.price !== undefined) {
            shipping_cost = tier.price
          } else if (tier.price_per_kg !== undefined) {
            shipping_cost = weight * tier.price_per_kg
          }
          break
        }
      }
    }

    // ハンドリング手数料
    if (rule_json.handling_fee) {
      shipping_cost += rule_json.handling_fee
    }

    // 補助率適用（Shopee SLS等）
    if (rule_json.subsidy_rate) {
      shipping_cost = shipping_cost * (1 - rule_json.subsidy_rate)
    }

    return shipping_cost
  }

  /**
   * 目標利益から販売価格を逆算
   *
   * 計算式:
   * selling_price = (cost + shipping + target_profit) / (1 - total_fee_rate)
   *
   * total_fee_rate = sales_fee_rate + cross_border_fee_rate + (tax_rate if included)
   */
  calculateSellingPrice(
    cost: number,
    shipping: number,
    targetProfit: number,
    settings: MarketplaceSettings,
    options: {
      includeTax?: boolean
      includeCrossBorderFee?: boolean
    } = {}
  ): number {
    const { sales_fee_rate, cross_border_fee_rate, tax_rate, fixed_fee } = settings
    const { includeTax = false, includeCrossBorderFee = true } = options

    // 総手数料率を計算
    let totalFeeRate = sales_fee_rate

    if (includeCrossBorderFee) {
      totalFeeRate += cross_border_fee_rate
    }

    if (includeTax) {
      totalFeeRate += tax_rate
    }

    // 分母がゼロまたは負にならないかチェック
    if (totalFeeRate >= 1) {
      throw new Error('Total fee rate must be less than 100%')
    }

    // 販売価格を逆算
    // selling_price = (cost + shipping + target_profit + fixed_fee) / (1 - total_fee_rate)
    const numerator = cost + shipping + targetProfit + fixed_fee
    const denominator = 1 - totalFeeRate

    const sellingPrice = numerator / denominator

    return sellingPrice
  }

  /**
   * 利益の内訳を計算
   */
  calculateProfitBreakdown(
    sellingPrice: number,
    cost: number,
    shipping: number,
    settings: MarketplaceSettings,
    options: {
      includeTax?: boolean
      includeCrossBorderFee?: boolean
    } = {}
  ): {
    sales_fee: number
    fixed_fee: number
    cross_border_fee: number
    tax: number
    total_fees: number
    profit: number
    profit_margin: number
  } {
    const { sales_fee_rate, fixed_fee, cross_border_fee_rate, tax_rate } = settings
    const { includeTax = false, includeCrossBorderFee = true } = options

    // 各手数料を計算
    const sales_fee = sellingPrice * sales_fee_rate
    const cross_border_fee = includeCrossBorderFee ? sellingPrice * cross_border_fee_rate : 0
    const tax = includeTax ? sellingPrice * tax_rate : 0

    const total_fees = sales_fee + fixed_fee + cross_border_fee + tax
    const total_costs = cost + shipping + total_fees

    const profit = sellingPrice - total_costs
    const profit_margin = sellingPrice > 0 ? profit / sellingPrice : 0

    return {
      sales_fee,
      fixed_fee,
      cross_border_fee,
      tax,
      total_fees,
      profit,
      profit_margin,
    }
  }

  /**
   * メイン計算関数
   */
  async calculate(input: PricingInput): Promise<PricingResult> {
    const warnings: string[] = []

    // 1. marketplace_settings を取得
    const settings = await this.getMarketplaceSettings(input.marketplace_id)
    if (!settings) {
      throw new Error(`Marketplace settings not found for: ${input.marketplace_id}`)
    }

    // 2. 為替レートの設定（デフォルト: 1.0 = 同通貨）
    const exchangeRate = input.exchange_rate || 1.0

    // 3. 原価を現地通貨に換算
    const cost_local = input.cost_jpy / exchangeRate

    // 4. 送料を計算
    let shipping_cost = 0

    if (input.custom_shipping_cost !== undefined) {
      // カスタム送料が指定されている場合
      shipping_cost = input.custom_shipping_cost
    } else if (input.shipping_method && input.weight_g) {
      // shipping_rules から送料を計算
      const shippingRule = await this.getShippingRule(
        input.marketplace_id,
        input.shipping_method
      )

      if (shippingRule) {
        shipping_cost = this.calculateShipping(input.weight_g, shippingRule)
      } else {
        warnings.push(`Shipping rule not found for ${input.shipping_method}`)
      }
    }

    // 5. 目標利益を設定
    let target_profit_local = 0
    let target_profit_rate = settings.target_profit_rate

    if (input.target_profit_jpy !== undefined) {
      // 目標利益（JPY）が指定されている場合
      target_profit_local = input.target_profit_jpy / exchangeRate
      target_profit_rate = 0 // 逆算で計算するため
    } else if (input.target_profit_rate !== undefined) {
      // 目標利益率が指定されている場合
      target_profit_rate = input.target_profit_rate
    }

    // 6. オプション設定
    const options = {
      includeTax: input.include_tax ?? false,
      includeCrossBorderFee: input.include_cross_border_fee ?? true,
    }

    // 7. 販売価格を計算
    let selling_price: number
    let actual_target_profit: number

    if (input.target_profit_jpy !== undefined) {
      // 目標利益額から逆算
      selling_price = this.calculateSellingPrice(
        cost_local,
        shipping_cost,
        target_profit_local,
        settings,
        options
      )
      actual_target_profit = target_profit_local
    } else {
      // 目標利益率から逆算
      // まず仮の販売価格を計算し、その後利益率から実際の目標利益を算出
      // この場合、反復計算が必要だが、簡略化のため近似式を使用

      const totalFeeRate =
        settings.sales_fee_rate +
        (options.includeCrossBorderFee ? settings.cross_border_fee_rate : 0) +
        (options.includeTax ? settings.tax_rate : 0)

      // selling_price = (cost + shipping) / (1 - total_fee_rate - target_profit_rate)
      const numerator = cost_local + shipping_cost + settings.fixed_fee
      const denominator = 1 - totalFeeRate - target_profit_rate

      if (denominator <= 0) {
        throw new Error(
          `Target profit rate ${target_profit_rate * 100}% is too high for current fees`
        )
      }

      selling_price = numerator / denominator
      actual_target_profit = selling_price * target_profit_rate
    }

    // 8. 利益内訳を計算
    const breakdown = this.calculateProfitBreakdown(
      selling_price,
      cost_local,
      shipping_cost,
      settings,
      options
    )

    // 9. 総コスト
    const total_costs = cost_local + shipping_cost + breakdown.total_fees

    // 10. 実際の利益
    const profit_local = breakdown.profit
    const profit_jpy = profit_local * exchangeRate
    const profit_margin = breakdown.profit_margin
    const margin_delta = profit_margin - target_profit_rate

    // 11. 判定
    const is_profitable = profit_local > 0
    const break_even_price = total_costs

    let can_list = true
    if (!is_profitable) {
      warnings.push('❌ 赤字のため出品不可')
      can_list = false
    }

    if (profit_margin < target_profit_rate - 0.05) {
      warnings.push(
        `⚠️ 目標利益率${(target_profit_rate * 100).toFixed(1)}%に対し${(
          profit_margin * 100
        ).toFixed(1)}%`
      )
    }

    // 12. 結果を返す
    const result: PricingResult = {
      selling_price: Math.round(selling_price * 100) / 100,
      currency: settings.default_currency,

      cost_local: Math.round(cost_local * 100) / 100,
      shipping_cost: Math.round(shipping_cost * 100) / 100,
      marketplace_fees: Math.round(breakdown.sales_fee * 100) / 100,
      cross_border_fee: Math.round(breakdown.cross_border_fee * 100) / 100,
      tax_amount: Math.round(breakdown.tax * 100) / 100,
      total_costs: Math.round(total_costs * 100) / 100,

      profit_local: Math.round(profit_local * 100) / 100,
      profit_jpy: Math.round(profit_jpy * 100) / 100,
      profit_margin: Math.round(profit_margin * 10000) / 10000,
      target_profit_margin: target_profit_rate,
      margin_delta: Math.round(margin_delta * 10000) / 10000,

      is_profitable,
      can_list,
      warnings,

      breakdown: {
        base_cost: Math.round(cost_local * 100) / 100,
        shipping: Math.round(shipping_cost * 100) / 100,
        fees_breakdown: {
          sales_fee: Math.round(breakdown.sales_fee * 100) / 100,
          fixed_fee: Math.round(breakdown.fixed_fee * 100) / 100,
          cross_border_fee: Math.round(breakdown.cross_border_fee * 100) / 100,
          tax: Math.round(breakdown.tax * 100) / 100,
        },
      },
    }

    // ログ出力
    console.log(`\n💰 統合価格計算 [${input.marketplace_id}]`)
    console.log(`原価: ¥${input.cost_jpy} = ${result.currency}${cost_local.toFixed(2)}`)
    console.log(`送料: ${result.currency}${shipping_cost.toFixed(2)}`)
    console.log(`販売価格: ${result.currency}${selling_price.toFixed(2)}`)
    console.log(`利益: ${result.currency}${profit_local.toFixed(2)} (${(profit_margin * 100).toFixed(1)}%)`)

    if (warnings.length > 0) {
      console.warn('警告:', warnings)
    }

    return result
  }

  /**
   * 複数マーケットプレイスの価格を一括計算
   */
  async calculateBulk(inputs: PricingInput[]): Promise<PricingResult[]> {
    const results: PricingResult[] = []

    for (const input of inputs) {
      try {
        const result = await this.calculate(input)
        results.push(result)
      } catch (error) {
        console.error(`Failed to calculate pricing for ${input.marketplace_id}:`, error)
      }
    }

    return results
  }

  /**
   * 価格比較: 複数マーケットプレイスの利益を比較
   */
  async comparePrices(
    base_input: Omit<PricingInput, 'marketplace_id'>,
    marketplace_ids: string[]
  ): Promise<{
    results: PricingResult[]
    best_marketplace: string
    best_profit_jpy: number
  }> {
    const inputs = marketplace_ids.map((marketplace_id) => ({
      ...base_input,
      marketplace_id,
    }))

    const results = await this.calculateBulk(inputs)

    // 最も利益が高いマーケットプレイスを見つける
    let best_marketplace = ''
    let best_profit_jpy = -Infinity

    for (let i = 0; i < results.length; i++) {
      if (results[i].profit_jpy > best_profit_jpy) {
        best_profit_jpy = results[i].profit_jpy
        best_marketplace = marketplace_ids[i]
      }
    }

    return {
      results,
      best_marketplace,
      best_profit_jpy,
    }
  }
}

// シングルトンインスタンスをエクスポート
export const integratedPricingService = new IntegratedPricingService()
