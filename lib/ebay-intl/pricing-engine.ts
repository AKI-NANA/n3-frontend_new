// lib/ebay-intl/pricing-engine.ts

import type { GatheredData, ShippingInfo, TariffInfo, CategoryFeeInfo } from './data-fetcher'

// =====================================================
// 型定義
// =====================================================

export interface Strategy {
  strategy: 'DDP_BASE' | 'DDU_BASE' | 'HYBRID' | 'HIGH_TARIFF_EXCLUDE'
  baseCountry: 'US' | 'CA' | 'MIXED'
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  reason: string
  policyType: 'A' | 'B' | 'C'
}

export interface CountryPricing {
  country: string
  itemPrice: number
  shippingFee: number
  shippingType: 'DDP' | 'DDU'
  actualShipping: number
  multiplier: number
  buyerTariff?: number
  sellerTariff?: number
  totalRevenue: number
  totalCost: number
  fees: number
  profit: number
  margin: number
  feasible: boolean
  notes: string[]
}

export interface PricingResult {
  strategy: Strategy
  itemPrice: number
  shippingByCountry: CountryPricing[]
  summary: {
    avgMargin: number
    minMargin: number
    maxMargin: number
    feasibleCountries: number
    totalCountries: number
  }
}

// =====================================================
// 送料倍率制約
// =====================================================

const SHIPPING_CONSTRAINTS = {
  MIN_MULTIPLIER: 1.5,
  MAX_MULTIPLIER: 2.5,
  
  getMaxMultiplier(categoryId: number, actualShipping: number): number {
    if (categoryId === 11450) return 2.0 // アパレル
    if (actualShipping > 150) return 1.5 // 高額送料
    if (actualShipping < 20) return 3.0  // 低額送料
    return 2.5
  }
}

// =====================================================
// Step 1: 戦略判定
// =====================================================

export function determineStrategy(data: GatheredData): Strategy {
  const usaTariff = data.tariffData.find(t => t.country === 'US')
  const usaShipping = data.shippingData.find(s => s.country === 'US')
  const canadaShipping = data.shippingData.find(s => s.country === 'CA')

  if (!usaTariff || !usaShipping) {
    return {
      strategy: 'HIGH_TARIFF_EXCLUDE',
      baseCountry: 'US',
      confidence: 'LOW',
      reason: 'データ不足',
      policyType: 'C'
    }
  }

  const estimatedPrice = data.costUSD * 1.8
  const usaTariffAmount = estimatedPrice * usaTariff.tariffRate
  const usaDDPCost = usaShipping.totalUSD + usaTariffAmount
  const usaMultiplier = (usaDDPCost * 2.0) / usaShipping.totalUSD

  // 低関税判定（0-10%）
  if (usaTariff.tariffRate <= 0.10 && usaMultiplier <= 3.0) {
    return {
      strategy: 'DDP_BASE',
      baseCountry: 'US',
      confidence: 'HIGH',
      reason: `USA関税${(usaTariff.tariffRate * 100).toFixed(1)}% - DDP適用可能`,
      policyType: 'A'
    }
  }

  // 中関税判定（10-25%）
  if (usaTariff.tariffRate <= 0.25 && canadaShipping && canadaShipping.totalUSD >= 30) {
    return {
      strategy: 'DDU_BASE',
      baseCountry: 'CA',
      confidence: 'HIGH',
      reason: 'Canada基準でDDU調整可能',
      policyType: 'B'
    }
  }

  // 高関税判定（25%+）
  return {
    strategy: 'HIGH_TARIFF_EXCLUDE',
    baseCountry: 'US',
    confidence: 'MEDIUM',
    reason: '高関税国除外が必要',
    policyType: 'C'
  }
}

// =====================================================
// Step 2: 価格計算メイン
// =====================================================

export function calculateOptimalPricing(
  strategy: Strategy,
  data: GatheredData
): PricingResult {
  if (strategy.strategy === 'DDP_BASE') {
    return calculateDDPPricing(data, strategy)
  } else if (strategy.strategy === 'DDU_BASE') {
    return calculateDDUPricing(data, strategy)
  } else {
    return calculateExcludePricing(data, strategy)
  }
}

// =====================================================
// DDP基準の価格計算
// =====================================================

function calculateDDPPricing(data: GatheredData, strategy: Strategy): PricingResult {
  const usaShipping = data.shippingData.find(s => s.country === 'US')!
  const usaTariff = data.tariffData.find(t => t.country === 'US')!
  
  const targetMargin = data.profitSettings.margin / 100
  
  // Step 1: USA DDP基準で商品価格を逆算
  let bestItemPrice = 0
  let bestShipping = 0
  
  for (let testPrice = data.costUSD * 1.5; testPrice < data.costUSD * 3; testPrice += 10) {
    const tariffAmount = testPrice * usaTariff.tariffRate
    const shippingCost = usaShipping.totalUSD + tariffAmount
    
    const maxShipping = SHIPPING_CONSTRAINTS.getMaxMultiplier(data.categoryFee.categoryId, usaShipping.totalUSD)
    const proposedShipping = Math.min(shippingCost * 1.5, usaShipping.totalUSD * maxShipping)
    
    const revenue = testPrice + proposedShipping
    const fees = calculateFees(revenue, data.categoryFee)
    const totalCost = data.costUSD + usaShipping.totalUSD + tariffAmount + 5
    const profit = revenue - fees - totalCost
    const actualMargin = profit / revenue
    
    if (Math.abs(actualMargin - targetMargin) < 0.01) {
      bestItemPrice = Math.round(testPrice / 10) * 10
      bestShipping = Math.round(proposedShipping)
      break
    }
  }
  
  if (bestItemPrice === 0) {
    bestItemPrice = Math.round(data.costUSD * 2)
    bestShipping = Math.round(usaShipping.totalUSD * 1.5)
  }
  
  // Step 2: 各国の価格計算
  const countryPricings = data.shippingData.map(shipping => 
    calculateCountryPricing(
      shipping,
      data.tariffData.find(t => t.country === shipping.country)!,
      bestItemPrice,
      data.costUSD,
      data.categoryFee,
      'DDP',
      shipping.country === 'US'
    )
  )
  
  return {
    strategy,
    itemPrice: bestItemPrice,
    shippingByCountry: countryPricings,
    summary: calculateSummary(countryPricings)
  }
}

// =====================================================
// DDU基準の価格計算
// =====================================================

function calculateDDUPricing(data: GatheredData, strategy: Strategy): PricingResult {
  const canadaShipping = data.shippingData.find(s => s.country === 'CA')!
  const canadaTariff = data.tariffData.find(t => t.country === 'CA')!
  
  const targetMargin = data.profitSettings.margin / 100
  
  // Step 1: Canada DDU基準で商品価格を逆算
  let bestItemPrice = 0
  let bestShipping = 0
  
  for (let testPrice = data.costUSD * 1.5; testPrice < data.costUSD * 3; testPrice += 10) {
    const maxMultiplier = SHIPPING_CONSTRAINTS.getMaxMultiplier(data.categoryFee.categoryId, canadaShipping.totalUSD)
    const proposedShipping = Math.min(canadaShipping.totalUSD * 2.2, canadaShipping.totalUSD * maxMultiplier)
    
    const revenue = testPrice + proposedShipping
    const fees = calculateFees(revenue, data.categoryFee)
    const totalCost = data.costUSD + canadaShipping.totalUSD + 5
    const profit = revenue - fees - totalCost
    const actualMargin = profit / revenue
    
    if (Math.abs(actualMargin - targetMargin) < 0.01) {
      bestItemPrice = Math.round(testPrice / 10) * 10
      bestShipping = Math.round(proposedShipping)
      break
    }
  }
  
  if (bestItemPrice === 0) {
    bestItemPrice = Math.round(data.costUSD * 2)
    bestShipping = Math.round(canadaShipping.totalUSD * 2.0)
  }
  
  // Step 2: 各国の価格計算
  const countryPricings = data.shippingData.map(shipping => {
    const isUSA = shipping.country === 'US'
    const tariff = data.tariffData.find(t => t.country === shipping.country)!
    
    return calculateCountryPricing(
      shipping,
      tariff,
      bestItemPrice,
      data.costUSD,
      data.categoryFee,
      isUSA ? 'DDP' : 'DDU',
      shipping.country === 'CA'
    )
  })
  
  return {
    strategy,
    itemPrice: bestItemPrice,
    shippingByCountry: countryPricings,
    summary: calculateSummary(countryPricings)
  }
}

// =====================================================
// 高関税除外の価格計算
// =====================================================

function calculateExcludePricing(data: GatheredData, strategy: Strategy): PricingResult {
  // 低関税国のみ対象
  const lowTariffCountries = data.tariffData.filter(t => t.tariffRate <= 0.15)
  const filteredShipping = data.shippingData.filter(s => 
    lowTariffCountries.some(t => t.country === s.country)
  )
  
  const usaShipping = filteredShipping.find(s => s.country === 'US')!
  const itemPrice = Math.round(data.costUSD * 2)
  
  const countryPricings = filteredShipping.map(shipping => {
    const tariff = data.tariffData.find(t => t.country === shipping.country)!
    return calculateCountryPricing(
      shipping,
      tariff,
      itemPrice,
      data.costUSD,
      data.categoryFee,
      'DDP',
      shipping.country === 'US'
    )
  })
  
  return {
    strategy,
    itemPrice,
    shippingByCountry: countryPricings,
    summary: calculateSummary(countryPricings)
  }
}

// =====================================================
// 国別価格計算
// =====================================================

function calculateCountryPricing(
  shipping: ShippingInfo,
  tariff: TariffInfo,
  itemPrice: number,
  costUSD: number,
  categoryFee: CategoryFeeInfo,
  shippingType: 'DDP' | 'DDU',
  isBase: boolean
): CountryPricing {
  const notes: string[] = []
  let shippingFee = 0
  let sellerTariff = 0
  let buyerTariff = 0
  
  if (shippingType === 'DDP') {
    sellerTariff = itemPrice * tariff.tariffRate
    const totalCost = shipping.totalUSD + sellerTariff
    const maxMultiplier = SHIPPING_CONSTRAINTS.getMaxMultiplier(categoryFee.categoryId, shipping.totalUSD)
    shippingFee = Math.min(totalCost * 1.5, shipping.totalUSD * maxMultiplier)
    
    if (shippingFee / shipping.totalUSD > maxMultiplier) {
      notes.push(`送料倍率が${maxMultiplier}倍を超過`)
    }
  } else {
    buyerTariff = itemPrice * tariff.tariffRate
    const maxMultiplier = SHIPPING_CONSTRAINTS.getMaxMultiplier(categoryFee.categoryId, shipping.totalUSD)
    shippingFee = Math.min(shipping.totalUSD * 2.2, shipping.totalUSD * maxMultiplier)
  }
  
  shippingFee = Math.round(shippingFee)
  
  const multiplier = shippingFee / shipping.totalUSD
  const totalRevenue = itemPrice + shippingFee
  const fees = calculateFees(totalRevenue, categoryFee)
  const totalCost = costUSD + shipping.totalUSD + sellerTariff + 5
  const profit = totalRevenue - fees - totalCost
  const margin = (profit / totalRevenue) * 100
  
  const feasible = 
    multiplier >= SHIPPING_CONSTRAINTS.MIN_MULTIPLIER &&
    multiplier <= SHIPPING_CONSTRAINTS.getMaxMultiplier(categoryFee.categoryId, shipping.totalUSD) &&
    margin >= 10
  
  if (!feasible) {
    if (multiplier < SHIPPING_CONSTRAINTS.MIN_MULTIPLIER) {
      notes.push('送料倍率が低すぎる')
    }
    if (margin < 10) {
      notes.push('利益率が低すぎる')
    }
  }
  
  return {
    country: shipping.country,
    itemPrice,
    shippingFee,
    shippingType,
    actualShipping: shipping.totalUSD,
    multiplier,
    buyerTariff: shippingType === 'DDU' ? buyerTariff : undefined,
    sellerTariff: shippingType === 'DDP' ? sellerTariff : undefined,
    totalRevenue,
    totalCost,
    fees,
    profit,
    margin,
    feasible,
    notes
  }
}

// =====================================================
// 手数料計算（tier構造対応）
// =====================================================

function calculateFees(revenue: number, categoryFee: CategoryFeeInfo): number {
  let fee = 0
  
  if (revenue <= categoryFee.tier1Threshold) {
    fee = revenue * categoryFee.tier1Rate
  } else {
    fee = 
      categoryFee.tier1Threshold * categoryFee.tier1Rate +
      (revenue - categoryFee.tier1Threshold) * categoryFee.tier2Rate
  }
  
  return fee + categoryFee.perOrderFee
}

// =====================================================
// サマリー計算
// =====================================================

function calculateSummary(pricings: CountryPricing[]) {
  const feasible = pricings.filter(p => p.feasible)
  const margins = pricings.map(p => p.margin)
  
  return {
    avgMargin: margins.reduce((a, b) => a + b, 0) / margins.length,
    minMargin: Math.min(...margins),
    maxMargin: Math.max(...margins),
    feasibleCountries: feasible.length,
    totalCountries: pricings.length
  }
}
