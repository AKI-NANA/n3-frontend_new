// 価格再計算ロジック

import type { RecalculatedPricing, MonitoringTarget } from './types'
import { calculateUsaPriceV2 } from '@/lib/ebay-pricing/usa-price-calculator-v2'

/**
 * 価格変動時に自動的に再計算を実行
 */
export async function recalculatePricing(
  product: MonitoringTarget & {
    listing_data?: any
    weight_g?: number
    target_profit_margin?: number
  },
  newPriceJpy: number
): Promise<RecalculatedPricing> {
  try {
    // 重量情報を取得
    const weightG = product.listing_data?.weight_g || product.weight_g || 0
    const weightKg = weightG / 1000

    if (!weightKg || weightKg === 0) {
      throw new Error('商品重量が設定されていません')
    }

    // eBay価格計算システムを使用
    const pricingResult = await calculateUsaPriceV2({
      costJPY: newPriceJpy,
      weight_kg: weightKg,
      targetProductPriceRatio: 0.8, // 商品価格比率 80%
      targetMargin: product.target_profit_margin || 0.15, // 目標利益率 15%
      hsCode: '9620.00.20.00', // デフォルトHTS
      originCountry: 'JP',
      storeType: 'none',
      fvfRate: 0.1315,
    })

    if (!pricingResult || !pricingResult.success) {
      throw new Error(pricingResult?.error || '価格計算に失敗しました')
    }

    // 再計算結果を返す
    return {
      acquired_price_jpy: newPriceJpy,
      shipping_cost_usd: pricingResult.shippingCost || 0,
      profit_margin: pricingResult.profitMargin_NoRefund || 0,
      profit_amount_usd: pricingResult.profitUSD_NoRefund || 0,
      buy_it_now_price_usd: pricingResult.productPrice || 0,
      ddp_price_usd: pricingResult.totalRevenue || 0,
      ddu_price_usd: pricingResult.productPrice || 0,
    }
  } catch (error) {
    console.error('価格再計算エラー:', error)
    throw error
  }
}

/**
 * 為替レートを取得（キャッシュ付き）
 */
let cachedExchangeRate: { rate: number; timestamp: number } | null = null
const CACHE_DURATION = 1000 * 60 * 60 // 1時間

export async function getExchangeRate(): Promise<number> {
  // キャッシュチェック
  if (
    cachedExchangeRate &&
    Date.now() - cachedExchangeRate.timestamp < CACHE_DURATION
  ) {
    return cachedExchangeRate.rate
  }

  try {
    // 為替レートAPIを呼び出し
    const response = await fetch(
      'https://api.exchangerate-api.com/v4/latest/JPY'
    )
    const data = await response.json()
    const rate = data.rates.USD

    // キャッシュに保存
    cachedExchangeRate = {
      rate,
      timestamp: Date.now(),
    }

    return rate
  } catch (error) {
    console.error('為替レート取得エラー:', error)
    // フォールバック: 固定レート
    return 0.0067 // 1円 = 0.0067ドル（約149円/ドル）
  }
}

/**
 * 価格変動率を計算
 */
export function calculatePriceChangeRate(
  oldPrice: number,
  newPrice: number
): number {
  if (oldPrice === 0) return 0
  return ((newPrice - oldPrice) / oldPrice) * 100
}

/**
 * 利益率の変化を計算
 */
export function calculateProfitMarginChange(
  oldMargin: number,
  newMargin: number
): {
  change: number
  changePercent: number
  isImprovement: boolean
} {
  const change = newMargin - oldMargin
  const changePercent = oldMargin > 0 ? (change / oldMargin) * 100 : 0

  return {
    change,
    changePercent,
    isImprovement: change > 0,
  }
}
