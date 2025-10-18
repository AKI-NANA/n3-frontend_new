// lib/ebay-pricing/shipping-policy-generator.ts
/**
 * 配送ポリシー自動生成エンジン
 * 
 * 関税率 × 送料実費 × 出品基準（DDP/DDU）の組み合わせで
 * 最適な配送ポリシーセットを生成
 */

export interface ShippingPolicyPattern {
  name: string
  basis: 'DDP' | 'DDU'  // どちらを基準に商品価格を決定するか
  tariffRateRange: { min: number; max: number }
  weightRange: { min: number; max: number }
  priceRange: { min: number; max: number }
  zones: ZoneConfig[]
  applicability: string  // どんな商品に適用可能か
}

export interface ZoneConfig {
  country: string
  actualCost: number  // 実費
  tariffRate: number  // 関税率
  displayShipping: number  // 表示送料
  handlingDDP: number | null
  handlingDDU: number
  profitMargin: number  // 想定利益率
}

/**
 * DDU基準が適用可能か判定
 * 
 * 条件：USA送料を実費の2.5倍以内に収められるか
 */
export function canUseDDUBasis(
  productPriceUSD: number,
  usaActualShipping: number,
  usaTariffRate: number,
  targetMargin: number = 0.20
): { canUse: boolean; reason: string; maxPrice: number } {
  // USAでDDPとして必要な追加コスト
  const ddpCost = calculateDDPCost(productPriceUSD + usaActualShipping, usaTariffRate)
  
  // 送料で吸収可能な金額（実費の2.5倍まで）
  const maxShippingAdjustment = usaActualShipping * 2.5 - usaActualShipping
  
  // DDPコストが送料調整可能範囲内か
  if (ddpCost <= maxShippingAdjustment) {
    return {
      canUse: true,
      reason: 'DDPコストを送料で吸収可能',
      maxPrice: productPriceUSD
    }
  }
  
  // 送料調整だけでは不足する場合、Handlingで補う
  const handlingAdjustment = ddpCost - maxShippingAdjustment
  
  // Handlingが商品価格の30%を超える場合は不自然
  if (handlingAdjustment > productPriceUSD * 0.3) {
    return {
      canUse: false,
      reason: `Handling調整が必要額$${handlingAdjustment.toFixed(2)}（商品価格の${((handlingAdjustment / productPriceUSD) * 100).toFixed(0)}%）で不自然`,
      maxPrice: (maxShippingAdjustment + productPriceUSD * 0.3) / usaTariffRate
    }
  }
  
  return {
    canUse: true,
    reason: 'Handlingで調整可能',
    maxPrice: productPriceUSD
  }
}

/**
 * DDP費用計算（関税+MPF+HMF+eBay手数料）
 */
function calculateDDPCost(cifPrice: number, tariffRate: number): number {
  const tariff = cifPrice * tariffRate
  const mpf = Math.min(Math.max(cifPrice * 0.003464, 0.3), 614.35)
  const hmf = cifPrice * 0.00125
  const ebayDDPFee = 5
  
  return tariff + mpf + hmf + ebayDDPFee
}

/**
 * 配送ポリシーパターン生成
 */
export function generateShippingPolicies(): ShippingPolicyPattern[] {
  const policies: ShippingPolicyPattern[] = []
  
  // 関税率の範囲
  const tariffRanges = [
    { min: 0, max: 0.05, label: '0-5%' },
    { min: 0.05, max: 0.10, label: '5-10%' },
    { min: 0.10, max: 0.15, label: '10-15%' },
    { min: 0.15, max: 1, label: '15%以上' },
  ]
  
  // 重量範囲
  const weightRanges = [
    { min: 0, max: 1, label: '軽量', actualCostUS: 15, actualCostOther: 18 },
    { min: 1, max: 3, label: '中量', actualCostUS: 25, actualCostOther: 30 },
    { min: 3, max: 10, label: '重量', actualCostUS: 45, actualCostOther: 55 },
    { min: 10, max: 999, label: '超重量', actualCostUS: 80, actualCostOther: 100 },
  ]
  
  // 主要国の関税率（代表値）
  const countries = [
    { code: 'US', name: 'USA', isDDP: true },
    { code: 'GB', name: 'イギリス', tariff: 0.04, isDDP: false },
    { code: 'CA', name: 'カナダ', tariff: 0.035, isDDP: false },
    { code: 'AU', name: 'オーストラリア', tariff: 0.05, isDDP: false },
    { code: 'DE', name: 'ドイツ', tariff: 0.04, isDDP: false },
    { code: 'FR', name: 'フランス', tariff: 0.04, isDDP: false },
    { code: 'IT', name: 'イタリア', tariff: 0.04, isDDP: false },
    { code: 'ES', name: 'スペイン', tariff: 0.04, isDDP: false },
    { code: 'NL', name: 'オランダ', tariff: 0.04, isDDP: false },
    { code: 'JP', name: '日本', tariff: 0.06, isDDP: false },
    { code: 'KR', name: '韓国', tariff: 0.08, isDDP: false },
    { code: 'TW', name: '台湾', tariff: 0.065, isDDP: false },
    { code: 'SG', name: 'シンガポール', tariff: 0, isDDP: false },
    { code: 'HK', name: '香港', tariff: 0, isDDP: false },
  ]
  
  // 組み合わせ生成
  for (const tariffRange of tariffRanges) {
    for (const weightRange of weightRanges) {
      const usaTariff = (tariffRange.min + tariffRange.max) / 2
      
      // 価格帯を計算（送料実費から逆算）
      const estimatedPrice = weightRange.actualCostUS * 3
      
      // DDU基準が適用可能か判定
      const dduCheck = canUseDDUBasis(
        estimatedPrice,
        weightRange.actualCostUS,
        usaTariff
      )
      
      // DDP基準ポリシー（常に作成）
      const ddpPolicy = generateDDPBasedPolicy(
        tariffRange,
        weightRange,
        countries,
        usaTariff
      )
      policies.push(ddpPolicy)
      
      // DDU基準ポリシー（適用可能な場合のみ）
      if (dduCheck.canUse) {
        const dduPolicy = generateDDUBasedPolicy(
          tariffRange,
          weightRange,
          countries,
          usaTariff
        )
        policies.push(dduPolicy)
      }
    }
  }
  
  return policies
}

/**
 * DDP基準ポリシー生成
 * USA価格を基準に、他国の送料を下げて利益率を合わせる
 */
function generateDDPBasedPolicy(
  tariffRange: any,
  weightRange: any,
  countries: any[],
  usaTariff: number
): ShippingPolicyPattern {
  const zones: ZoneConfig[] = []
  
  // USA（基準）
  const usaActualCost = weightRange.actualCostUS
  const usaDDPCost = calculateDDPCost(usaActualCost * 3, usaTariff)
  
  zones.push({
    country: 'US',
    actualCost: usaActualCost,
    tariffRate: usaTariff,
    displayShipping: usaActualCost * 2.0,  // 実費の2倍
    handlingDDP: Math.ceil(usaDDPCost),
    handlingDDU: 0,
    profitMargin: 0.20
  })
  
  // その他の国（調整）
  for (const country of countries.filter(c => c.code !== 'US')) {
    const actualCost = weightRange.actualCostOther
    const ddpCost = calculateDDPCost(usaActualCost * 3, usaTariff)
    
    // DDUは関税が購入者負担なので利益が多い
    // 送料とHandlingを下げて利益率を合わせる
    const excessProfit = ddpCost * 0.7  // DDP費用の70%分が余剰利益
    const adjustedShipping = Math.max(actualCost * 1.5, actualCost * 2.0 - excessProfit * 0.5)
    const adjustedHandling = Math.max(5, 15 - excessProfit * 0.5)
    
    zones.push({
      country: country.code,
      actualCost: actualCost,
      tariffRate: country.tariff || 0,
      displayShipping: Math.round(adjustedShipping * 2) / 2,  // $0.5単位
      handlingDDP: null,
      handlingDDU: Math.ceil(adjustedHandling),
      profitMargin: 0.20
    })
  }
  
  return {
    name: `DDP基準-関税${tariffRange.label}-${weightRange.label}`,
    basis: 'DDP',
    tariffRateRange: { min: tariffRange.min, max: tariffRange.max },
    weightRange: { min: weightRange.min, max: weightRange.max },
    priceRange: { min: weightRange.actualCostUS * 2, max: weightRange.actualCostUS * 5 },
    zones,
    applicability: `関税率${tariffRange.label}、重量${weightRange.min}-${weightRange.max}kg、USA価格基準`
  }
}

/**
 * DDU基準ポリシー生成
 * 他国価格を基準に、USAの送料を上げて利益率を合わせる
 */
function generateDDUBasedPolicy(
  tariffRange: any,
  weightRange: any,
  countries: any[],
  usaTariff: number
): ShippingPolicyPattern {
  const zones: ZoneConfig[] = []
  
  const otherActualCost = weightRange.actualCostOther
  
  // その他の国（基準）
  for (const country of countries.filter(c => c.code !== 'US')) {
    zones.push({
      country: country.code,
      actualCost: otherActualCost,
      tariffRate: country.tariff || 0,
      displayShipping: otherActualCost * 2.0,  // 実費の2倍
      handlingDDP: null,
      handlingDDU: 10,
      profitMargin: 0.20
    })
  }
  
  // USA（調整）
  const usaActualCost = weightRange.actualCostUS
  const ddpCost = calculateDDPCost(otherActualCost * 3, usaTariff)
  
  // DDPコストを送料で吸収（実費の2.5倍まで）
  const maxShippingAdjustment = usaActualCost * 2.5 - usaActualCost
  const shippingAbsorption = Math.min(ddpCost * 0.6, maxShippingAdjustment)
  const handlingAbsorption = ddpCost - shippingAbsorption
  
  zones.unshift({
    country: 'US',
    actualCost: usaActualCost,
    tariffRate: usaTariff,
    displayShipping: Math.round((usaActualCost + shippingAbsorption) * 2) / 2,
    handlingDDP: Math.ceil(handlingAbsorption + 5),
    handlingDDU: 0,
    profitMargin: 0.20
  })
  
  return {
    name: `DDU基準-関税${tariffRange.label}-${weightRange.label}`,
    basis: 'DDU',
    tariffRateRange: { min: tariffRange.min, max: tariffRange.max },
    weightRange: { min: weightRange.min, max: weightRange.max },
    priceRange: { min: weightRange.actualCostOther * 2, max: weightRange.actualCostOther * 5 },
    zones,
    applicability: `関税率${tariffRange.label}、重量${weightRange.min}-${weightRange.max}kg、他国価格基準`
  }
}

/**
 * 商品に最適なポリシーを選択
 */
export function selectOptimalPolicy(
  productPriceUSD: number,
  weight: number,
  tariffRate: number,
  policies: ShippingPolicyPattern[]
): ShippingPolicyPattern | null {
  const candidates = policies.filter(p => 
    weight >= p.weightRange.min &&
    weight < p.weightRange.max &&
    tariffRate >= p.tariffRateRange.min &&
    tariffRate < p.tariffRateRange.max &&
    productPriceUSD >= p.priceRange.min &&
    productPriceUSD <= p.priceRange.max
  )
  
  if (candidates.length === 0) return null
  
  // DDP基準とDDU基準の両方がある場合、
  // 商品価格が低い場合はDDU基準を優先
  if (candidates.length > 1) {
    const dduPolicy = candidates.find(p => p.basis === 'DDU')
    if (dduPolicy && productPriceUSD < 100) {
      return dduPolicy
    }
  }
  
  return candidates[0]
}
