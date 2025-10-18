/**
 * 利益分析ライブラリ
 * 
 * リサーチツールとデータ編集で共通利用
 * 最安値での利益計算、推奨仕入れ価格の算出
 */

import { calculateUsaPriceV2 } from '@/lib/ebay-pricing/usa-price-calculator-v2'

export interface LowestPriceAnalysis {
  lowestPrice: number          // 最安値（USD）
  lowestPriceSeller: string    // 最安値の出品者
  competitorCount: number       // 競合数
  averagePrice: number          // 平均価格
  priceRange: {
    min: number
    max: number
  }
}

export interface ProfitAnalysis {
  targetPrice: number           // 目標販売価格（最安値）
  productPrice: number          // 商品価格部分
  shippingCost: number          // 送料
  profitMargin: number          // 利益率（%）
  profitAmount: number          // 利益額（USD）
  profitAmountJPY: number       // 利益額（JPY）
  breakEvenCostJPY: number      // 損益分岐点の仕入れ価格
  recommendedMaxCostJPY: number // 推奨最大仕入れ価格（利益15%確保）
  shippingPolicy: string | null // 配送ポリシー名
}

export interface CompetitorData {
  itemId: string
  title: string
  price: number
  seller: string
  soldCount?: number
  condition?: string
  shippingCost?: number
}

/**
 * 競合データから最安値を分析
 */
export function analyzeLowestPrice(competitors: CompetitorData[]): LowestPriceAnalysis {
  if (!competitors || competitors.length === 0) {
    throw new Error('競合データがありません')
  }

  const prices = competitors.map(c => c.price).filter(p => p > 0)
  const lowestPrice = Math.min(...prices)
  const averagePrice = prices.reduce((sum, p) => sum + p, 0) / prices.length
  
  const lowestCompetitor = competitors.find(c => c.price === lowestPrice)

  return {
    lowestPrice,
    lowestPriceSeller: lowestCompetitor?.seller || 'Unknown',
    competitorCount: competitors.length,
    averagePrice,
    priceRange: {
      min: lowestPrice,
      max: Math.max(...prices)
    }
  }
}

/**
 * 最安値に合わせた時の利益を計算
 * 
 * @param targetPrice 目標販売価格（最安値）
 * @param actualCostJPY 実際の仕入れ価格
 * @param weightG 重量（グラム）
 * @param exchangeRate 為替レート
 */
export async function calculateProfitAtLowestPrice(
  targetPrice: number,
  actualCostJPY: number,
  weightG: number,
  exchangeRate: number = 150
): Promise<ProfitAnalysis> {
  const weightKg = weightG / 1000

  // eBay価格計算システムを使用して、目標価格から逆算
  // 目標価格 = 商品価格 + 送料
  // まず、通常の計算で送料を取得
  const pricingResult = await calculateUsaPriceV2({
    costJPY: actualCostJPY,
    weight_kg: weightKg,
    targetProductPriceRatio: 0.8,
    targetMargin: 0.15,
    hsCode: '9620.00.20.00',
    originCountry: 'JP',
    storeType: 'none',
    fvfRate: 0.1315,
    exchangeRate
  })

  if (!pricingResult || !pricingResult.success) {
    throw new Error('価格計算に失敗しました')
  }

  const shippingCost = pricingResult.shipping
  const productPrice = targetPrice - shippingCost // 目標価格から送料を引いた商品価格

  // 実際の仕入れ価格での利益を計算
  const costUSD = actualCostJPY / exchangeRate
  
  // eBay手数料
  const fvfRate = 0.1315
  const fvf = targetPrice * fvfRate
  
  // Payoneer手数料
  const payoneerRate = 0.01
  const payoneerFee = targetPrice * payoneerRate
  
  // 為替ロス
  const exchangeLossRate = 0.005
  const exchangeLoss = targetPrice * exchangeLossRate
  
  // 国際取引手数料
  const intlFeeRate = 0.015
  const intlFee = targetPrice * intlFeeRate
  
  // 総コスト
  const totalCost = costUSD + shippingCost + fvf + payoneerFee + exchangeLoss + intlFee
  
  // 利益
  const profitAmount = targetPrice - totalCost
  const profitMargin = (profitAmount / targetPrice) * 100

  // 損益分岐点の仕入れ価格（利益0円）
  const breakEvenCostUSD = targetPrice - shippingCost - fvf - payoneerFee - exchangeLoss - intlFee
  const breakEvenCostJPY = breakEvenCostUSD * exchangeRate

  // 推奨最大仕入れ価格（利益率15%確保）
  const targetProfitRate = 0.15
  const targetProfitAmount = targetPrice * targetProfitRate
  const recommendedMaxCostUSD = targetPrice - shippingCost - fvf - payoneerFee - exchangeLoss - intlFee - targetProfitAmount
  const recommendedMaxCostJPY = recommendedMaxCostUSD * exchangeRate

  return {
    targetPrice,
    productPrice,
    shippingCost,
    profitMargin,
    profitAmount,
    profitAmountJPY: profitAmount * exchangeRate,
    breakEvenCostJPY,
    recommendedMaxCostJPY,
    shippingPolicy: pricingResult.policy?.policy_name || null
  }
}

/**
 * 推奨仕入れ価格を計算（利益率15%確保）
 */
export function calculateRecommendedCost(
  lowestPrice: number,
  shippingCost: number,
  exchangeRate: number = 150
): number {
  const targetProfitRate = 0.15
  const fvfRate = 0.1315
  const payoneerRate = 0.01
  const exchangeLossRate = 0.005
  const intlFeeRate = 0.015

  // 目標利益
  const targetProfitAmount = lowestPrice * targetProfitRate
  
  // 手数料合計
  const fvf = lowestPrice * fvfRate
  const payoneerFee = lowestPrice * payoneerRate
  const exchangeLoss = lowestPrice * exchangeLossRate
  const intlFee = lowestPrice * intlFeeRate
  
  // 推奨仕入れ価格（USD）
  const recommendedCostUSD = lowestPrice - shippingCost - fvf - payoneerFee - exchangeLoss - intlFee - targetProfitAmount
  
  // JPYに変換
  return recommendedCostUSD * exchangeRate
}
