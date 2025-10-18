// lib/ebay-pricing/real-world-calculation-engine.ts
/**
 * 実世界データベース連携型 価格計算エンジン
 * 
 * - 実際の送料DBから取得
 * - 変動する燃油サーチャージ
 * - 全国の原産国関税率
 * - 配送ポリシー自動選択
 * - DDP/DDU最適化
 */

import { supabase } from '@/lib/supabase/client'

// ============================================
// 型定義
// ============================================

export interface RealWorldPricingInput {
  // 基本情報
  costJPY: number
  weight: number
  
  // 関税情報
  hsCode: string
  originCountry: string  // コード（'CN', 'JP' etc）
  
  // eBay情報
  categoryKey: string
  storeType: 'none' | 'basic' | 'premium' | 'anchor' | 'enterprise'
  
  // オプション
  targetMargin?: number  // デフォルト0.15 (15%)
  carrierPreference?: 'FEDEX' | 'DHL' | 'UPS' | 'AUTO'
}

export interface RealWorldPricingResult {
  success: boolean
  error?: string
  
  // 計算モード
  mode: 'DDP' | 'DDU'
  recommendation: 'DDP' | 'DDU'
  
  // 選択された配送ポリシー
  shippingPolicy: {
    id: number
    name: string
    weight_category: string
  }
  
  // 価格
  productPrice: number
  shipping: number
  handling: number
  searchDisplayPrice: number
  
  // 実コスト
  actualShippingCost: number
  fuelSurcharge: number
  fuelSurchargeRate: number
  
  // 関税詳細
  tariff: {
    hts: number          // HTSコード関税
    origin: number       // 原産国追加関税
    section301: number   // Section 301
    section232: number   // Section 232
    antidumping: number  // Anti-dumping
    total: number
  }
  
  mpf: number
  hmf: number
  ddpServiceFee: number
  
  // eBay手数料
  fees: {
    fvf: number
    storeDiscount: number
    fvfNet: number
    payoneer: number     // 2%
    ads: number          // 2%
    insertion: number
    total: number
  }
  
  // 利益
  profitUSD: number
  profitJPY: number
  profitMargin: number
  roi: number
  
  // 比較用（DDP vs DDU）
  comparison?: {
    ddp: RealWorldPricingResult
    ddu: RealWorldPricingResult
    profitDiff: number
    profitDiffPercent: number
    recommendation: 'DDP' | 'DDU'
    reason: string
  }
}

// ============================================
// データ取得関数
// ============================================

/**
 * 実送料取得（DBから）
 */
async function getActualShippingCost(
  weight: number,
  destination: string,
  carrier: string = 'FEDEX'
): Promise<{ cost: number; fuelRate: number }> {
  // 実送料
  const { data: rateData } = await supabase
    .from('actual_shipping_rates')
    .select('base_cost, fuel_surcharge_rate')
    .eq('carrier', carrier)
    .eq('destination_country', destination)
    .lte('weight_min_kg', weight)
    .gte('weight_max_kg', weight)
    .eq('is_active', true)
    .single()
  
  if (!rateData) {
    // フォールバック
    const baseCost = estimateShippingCost(weight, destination)
    return { cost: baseCost, fuelRate: 0.05 }
  }
  
  return {
    cost: rateData.base_cost,
    fuelRate: rateData.fuel_surcharge_rate || 0.05,
  }
}

/**
 * フォールバック送料計算
 */
function estimateShippingCost(weight: number, destination: string): number {
  let base = 0
  if (weight <= 0.5) base = 15
  else if (weight <= 1.0) base = 20
  else if (weight <= 2.0) base = 30
  else if (weight <= 5.0) base = 50
  else if (weight <= 10.0) base = 80
  else if (weight <= 20.0) base = 120
  else base = 180
  
  const multiplier: Record<string, number> = {
    'US': 1.0,
    'GB': 1.2,
    'DE': 1.2,
    'FR': 1.2,
    'CA': 1.15,
    'AU': 1.4,
    'JP': 0.8,
  }
  
  return base * (multiplier[destination] || 1.3)
}

/**
 * 原産国関税率取得（DBから）
 */
async function getOriginCountryTariff(countryCode: string) {
  const { data } = await supabase
    .from('origin_countries')
    .select('base_tariff_rate, section301_rate, section232_rate, antidumping_rate, total_additional_tariff')
    .eq('code', countryCode)
    .eq('active', true)
    .single()
  
  if (!data) {
    return {
      base: 0,
      section301: 0,
      section232: 0,
      antidumping: 0,
      total: 0,
    }
  }
  
  return {
    base: data.base_tariff_rate || 0,
    section301: data.section301_rate || 0,
    section232: data.section232_rate || 0,
    antidumping: data.antidumping_rate || 0,
    total: data.total_additional_tariff || 0,
  }
}

/**
 * HTSコード関税率取得
 */
async function getHTSTariff(hsCode: string): Promise<number> {
  const { data } = await supabase
    .from('hs_codes')
    .select('base_duty')
    .eq('code', hsCode)
    .single()
  
  return data?.base_duty || 0
}

/**
 * カテゴリFVF取得
 */
async function getCategoryFVF(categoryKey: string): Promise<number> {
  const { data } = await supabase
    .from('ebay_pricing_category_fees')
    .select('fvf_rate')
    .eq('category_key', categoryKey)
    .eq('active', true)
    .single()
  
  return data?.fvf_rate || 0.1315
}

/**
 * ストア割引率取得
 */
function getStoreDiscount(storeType: string): number {
  const discounts: Record<string, number> = {
    'none': 0,
    'basic': -0.04,
    'premium': -0.06,
    'anchor': -0.08,
    'enterprise': -0.10,
  }
  return discounts[storeType] || 0
}

/**
 * 為替レート取得
 */
async function getExchangeRate(): Promise<number> {
  const { data } = await supabase
    .from('latest_exchange_rate')
    .select('safe_rate')
    .single()
  
  return data?.safe_rate || 154.0
}

/**
 * 配送ポリシー選択
 */
async function selectOptimalShippingPolicy(
  weight: number,
  destination: string,
  isDDP: boolean
): Promise<any> {
  // 重量カテゴリ決定
  let category = 'XS'
  if (weight > 0.5) category = 'S'
  if (weight > 1.0) category = 'M'
  if (weight > 2.0) category = 'L'
  if (weight > 5.0) category = 'XL'
  if (weight > 10.0) category = 'XXL'
  if (weight > 20.0) category = 'XXXL'
  
  const policyName = isDDP ? `DDP_${category}` : `DDU_${category}`
  
  return {
    id: 1,
    name: policyName,
    weight_category: category,
  }
}

// ============================================
// メイン計算関数
// ============================================

export async function calculateRealWorldPricing(
  input: RealWorldPricingInput
): Promise<RealWorldPricingResult> {
  try {
    const targetMargin = input.targetMargin || 0.15
    
    // データ取得
    const exchangeRate = await getExchangeRate()
    const htsTariff = await getHTSTariff(input.hsCode)
    const originTariff = await getOriginCountryTariff(input.originCountry)
    const categoryFVF = await getCategoryFVF(input.categoryKey)
    const storeDiscount = getStoreDiscount(input.storeType)
    
    // DDP（USA）計算
    const ddpResult = await calculateForMode(
      'DDP',
      'US',
      input,
      targetMargin,
      exchangeRate,
      htsTariff,
      originTariff,
      categoryFVF,
      storeDiscount
    )
    
    // DDU（その他）計算 - 主要国の平均
    const dduCountries = ['GB', 'DE', 'FR', 'CA', 'AU']
    const dduResults = await Promise.all(
      dduCountries.map(country =>
        calculateForMode(
          'DDU',
          country,
          input,
          targetMargin,
          exchangeRate,
          htsTariff,
          originTariff,
          categoryFVF,
          storeDiscount
        )
      )
    )
    
    // DDU平均
    const dduAvg = averageDDUResults(dduResults)
    
    // 比較・推奨
    const profitDiff = ddpResult.profitUSD - dduAvg.profitUSD
    const profitDiffPercent = (profitDiff / Math.abs(dduAvg.profitUSD)) * 100
    
    const recommendation = profitDiff > 0 ? 'DDP' : 'DDU'
    const reason = profitDiff > 0
      ? `DDPの方が$${Math.abs(profitDiff).toFixed(2)}利益が高い`
      : `DDUの方が$${Math.abs(profitDiff).toFixed(2)}利益が高い`
    
    const result = recommendation === 'DDP' ? ddpResult : dduAvg
    
    result.recommendation = recommendation
    result.comparison = {
      ddp: ddpResult,
      ddu: dduAvg,
      profitDiff,
      profitDiffPercent,
      recommendation,
      reason,
    }
    
    return result
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      mode: 'DDP',
      recommendation: 'DDP',
      shippingPolicy: { id: 0, name: '', weight_category: '' },
      productPrice: 0,
      shipping: 0,
      handling: 0,
      searchDisplayPrice: 0,
      actualShippingCost: 0,
      fuelSurcharge: 0,
      fuelSurchargeRate: 0,
      tariff: { hts: 0, origin: 0, section301: 0, section232: 0, antidumping: 0, total: 0 },
      mpf: 0,
      hmf: 0,
      ddpServiceFee: 0,
      fees: { fvf: 0, storeDiscount: 0, fvfNet: 0, payoneer: 0, ads: 0, insertion: 0, total: 0 },
      profitUSD: 0,
      profitJPY: 0,
      profitMargin: 0,
      roi: 0,
    }
  }
}

/**
 * モード別計算
 */
async function calculateForMode(
  mode: 'DDP' | 'DDU',
  destination: string,
  input: RealWorldPricingInput,
  targetMargin: number,
  exchangeRate: number,
  htsTariff: number,
  originTariff: any,
  categoryFVF: number,
  storeDiscount: number
): Promise<RealWorldPricingResult> {
  
  const costUSD = input.costJPY / exchangeRate
  
  // 実送料取得
  const shipping = await getActualShippingCost(input.weight, destination)
  const actualCost = shipping.cost
  const fuelSurcharge = actualCost * shipping.fuelRate
  const totalShipping = actualCost + fuelSurcharge
  
  // 関税計算
  const dutyHTS = costUSD * htsTariff
  const dutyOrigin = costUSD * originTariff.total
  const totalDuty = dutyHTS + dutyOrigin
  
  // DDP費用
  let mpf = 0
  let ddpServiceFee = 0
  if (mode === 'DDP') {
    const mpfCalc = (costUSD + totalDuty) * 0.003464
    mpf = Math.max(31.67, Math.min(614.35, mpfCalc))
    ddpServiceFee = 35.00
  }
  
  const totalCustoms = totalDuty + mpf + ddpServiceFee
  
  // Handling
  const handling = mode === 'DDP'
    ? Math.max(5, input.weight * 5)
    : Math.max(3, totalShipping * 0.15)
  
  // 表示送料（実費の1.5-2.5倍）
  const displayShipping = mode === 'DDP'
    ? Math.ceil(totalShipping * 1.5 / 5) * 5
    : Math.ceil(totalShipping * 2.0 / 5) * 5
  
  // 総コスト
  const baseCost = costUSD + totalShipping + totalCustoms
  
  // 価格逆算
  const feeRate = categoryFVF + storeDiscount + 0.02 + 0.02  // FVF + Payoneer + Ads
  const productPrice = Math.ceil((baseCost + handling) / (1 - feeRate - targetMargin) / 5) * 5
  
  // eBay手数料
  const fvf = productPrice * categoryFVF
  const storeDiscountAmount = productPrice * storeDiscount
  const fvfNet = fvf + storeDiscountAmount
  const totalRevenue = productPrice + displayShipping + handling
  const payoneer = totalRevenue * 0.02
  const ads = productPrice * 0.02
  const insertion = 0
  const totalFees = fvfNet + payoneer + ads + insertion
  
  // 利益
  const profitUSD = totalRevenue - (baseCost + totalFees)
  const profitJPY = profitUSD * exchangeRate
  const profitMargin = totalRevenue > 0 ? profitUSD / totalRevenue : 0
  const roi = input.costJPY > 0 ? (profitJPY / input.costJPY) * 100 : 0
  
  // 配送ポリシー選択
  const shippingPolicy = await selectOptimalShippingPolicy(
    input.weight,
    destination,
    mode === 'DDP'
  )
  
  return {
    success: true,
    mode,
    recommendation: 'DDP',  // 後で更新
    shippingPolicy,
    productPrice,
    shipping: displayShipping,
    handling,
    searchDisplayPrice: productPrice + displayShipping,
    actualShippingCost: actualCost,
    fuelSurcharge,
    fuelSurchargeRate: shipping.fuelRate,
    tariff: {
      hts: dutyHTS,
      origin: dutyOrigin,
      section301: costUSD * originTariff.section301,
      section232: costUSD * originTariff.section232,
      antidumping: costUSD * originTariff.antidumping,
      total: totalDuty,
    },
    mpf,
    hmf: 0,
    ddpServiceFee,
    fees: {
      fvf,
      storeDiscount: storeDiscountAmount,
      fvfNet,
      payoneer,
      ads,
      insertion,
      total: totalFees,
    },
    profitUSD,
    profitJPY,
    profitMargin,
    roi,
  }
}

/**
 * DDU結果の平均
 */
function averageDDUResults(results: RealWorldPricingResult[]): RealWorldPricingResult {
  const avg = results[0]  // ベース
  
  avg.productPrice = Math.round(results.reduce((sum, r) => sum + r.productPrice, 0) / results.length)
  avg.shipping = Math.round(results.reduce((sum, r) => sum + r.shipping, 0) / results.length)
  avg.handling = Math.round(results.reduce((sum, r) => sum + r.handling, 0) / results.length * 100) / 100
  avg.profitUSD = results.reduce((sum, r) => sum + r.profitUSD, 0) / results.length
  avg.profitJPY = results.reduce((sum, r) => sum + r.profitJPY, 0) / results.length
  avg.profitMargin = results.reduce((sum, r) => sum + r.profitMargin, 0) / results.length
  
  return avg
}

// ブラウザで使えるようにする
if (typeof window !== 'undefined') {
  (window as any).calculateRealWorldPricing = calculateRealWorldPricing
}
