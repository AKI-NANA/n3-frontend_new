// lib/shipping/ddp-ddu-calculator.ts
// DDP/DDU送料調整計算ロジック

import { createClient } from '@/lib/supabase/client'

export interface ShippingAdjustmentParams {
  countryCode: string
  weightKg: number
  productPriceUSD: number
  baseShippingCostUSD: number  // 基本送料
  insuranceCostUSD: number     // 保険料
  targetMargin: number         // 目標利益率（0.15 = 15%）
}

export interface ShippingAdjustmentResult {
  countryCode: string
  countryName: string
  isDDP: boolean
  recommendedShippingCost: number  // 推奨送料（保険込み）
  apparentShippingCost: number     // 見かけの送料
  handlingFee: number              // Handling Fee
  totalCost: number                // 総コスト
  estimatedTariff: number          // 推定関税
  calculatedMargin: number         // 実際の利益率
}

/**
 * DDP国判定（現在はUSAのみ）
 */
export function isDDPCountry(countryCode: string): boolean {
  return countryCode === 'US'
}

/**
 * 関税率を取得（国別）
 */
export function getEstimatedTariffRate(countryCode: string): number {
  // 簡易版：実際は商品カテゴリ別に設定すべき
  const tariffRates: Record<string, number> = {
    'US': 0.065,  // 6.5%平均
    'GB': 0.04,   // 4%
    'DE': 0.04,
    'FR': 0.04,
    'AU': 0.05,
    'CA': 0.065
  }
  
  return tariffRates[countryCode] || 0.05
}

/**
 * DDP/DDU調整計算
 */
export async function calculateShippingAdjustment(
  params: ShippingAdjustmentParams
): Promise<ShippingAdjustmentResult> {
  
  const {
    countryCode,
    weightKg,
    productPriceUSD,
    baseShippingCostUSD,
    insuranceCostUSD,
    targetMargin
  } = params
  
  // 推奨送料（基本送料 + 保険）
  const recommendedShippingCost = baseShippingCostUSD + insuranceCostUSD
  
  // DDP判定
  const isDDP = isDDPCountry(countryCode)
  
  // 関税計算
  const tariffRate = getEstimatedTariffRate(countryCode)
  const estimatedTariff = productPriceUSD * tariffRate
  
  let apparentShippingCost = 0
  let handlingFee = 0
  
  if (isDDP) {
    // DDP国（USA）の場合
    // 関税の50%をHandling Feeで回収
    handlingFee = estimatedTariff * 0.5
    
    // 見かけの送料 = 推奨送料 + 利益調整
    // 目標: (商品価格 - 実送料 - 関税) / 商品価格 = targetMargin
    // 実送料 = 推奨送料 + 関税の50%（セラー負担分）
    const actualCost = recommendedShippingCost + (estimatedTariff * 0.5)
    
    // 必要な見かけの送料を逆算
    // (商品価格 - actualCost) / 商品価格 = targetMargin
    // 商品価格 - actualCost = 商品価格 × targetMargin
    // actualCost = 商品価格 × (1 - targetMargin)
    
    // 見かけの送料 = 商品価格 × (1 - targetMargin) - 推奨送料
    const targetRevenue = productPriceUSD * (1 - targetMargin)
    apparentShippingCost = Math.max(0, targetRevenue - recommendedShippingCost)
    
  } else {
    // DDU国の場合
    // バイヤーが関税を負担するため、送料は低めに設定可能
    
    // 目標: (商品価格 - 実送料) / 商品価格 = targetMargin
    const targetRevenue = productPriceUSD * (1 - targetMargin)
    apparentShippingCost = Math.max(0, targetRevenue - recommendedShippingCost)
    
    handlingFee = 5.00  // 固定Handling Fee
  }
  
  // 総コスト計算
  const totalCost = apparentShippingCost + handlingFee
  
  // 実際の利益率計算
  const actualRevenue = productPriceUSD - recommendedShippingCost - (isDDP ? estimatedTariff * 0.5 : 0)
  const calculatedMargin = actualRevenue / productPriceUSD
  
  // 国名取得
  const supabase = createClient()
  const { data: countryData } = await supabase
    .from('region_country_mapping')
    .select('country_name')
    .eq('country_code', countryCode)
    .single()
  
  return {
    countryCode,
    countryName: countryData?.country_name || countryCode,
    isDDP,
    recommendedShippingCost,
    apparentShippingCost,
    handlingFee,
    totalCost,
    estimatedTariff,
    calculatedMargin
  }
}

/**
 * 複数国の送料を一括計算
 */
export async function calculateMultipleCountries(
  countryCodes: string[],
  weightKg: number,
  productPriceUSD: number,
  baseShippingCostUSD: number,
  insuranceCostUSD: number,
  targetMargin: number = 0.15
): Promise<ShippingAdjustmentResult[]> {
  
  const results: ShippingAdjustmentResult[] = []
  
  for (const countryCode of countryCodes) {
    const result = await calculateShippingAdjustment({
      countryCode,
      weightKg,
      productPriceUSD,
      baseShippingCostUSD,
      insuranceCostUSD,
      targetMargin
    })
    
    results.push(result)
  }
  
  return results
}
