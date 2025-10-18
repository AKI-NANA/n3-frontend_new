/**
 * 送料計算の正しいロジック
 * 
 * 2つの問題を区別:
 * 1. DDP費用が高すぎる → 重量帯を変更
 * 2. eBay送料上限超過 → 商品価格に転嫁
 */

export interface ShippingCalculationResult {
  // 基本情報
  actualWeight: number
  baseShipping: number
  ddpFee: number
  totalShippingCost: number  // 実際の送料コスト
  
  // ポリシー選択
  selectedWeightTier: number  // 選択された重量帯
  displayShipping: number     // 表示する送料
  
  // 価格調整
  productPriceAdjustment: number  // 商品価格への上乗せ額
  reason: string
  
  // 判定
  isViable: boolean
  warnings: string[]
}

/**
 * STEP 1 & 2 & 3: 実送料 + DDP費用を計算し、適切な重量帯を選択
 */
export async function calculateShippingWithDDP(params: {
  actualWeight: number
  productPrice: number
  tariffRate: number
  originCountry: string
}): Promise<{
  baseShipping: number
  ddpFee: number
  totalCost: number
  recommendedWeightTier: number
  canFitInTier: boolean
}> {
  const { actualWeight, productPrice, tariffRate, originCountry } = params

  // 実送料を取得（DBから）
  const baseShipping = await getBaseShippingCost(actualWeight)
  
  // DDP費用を計算
  const salesTaxRate = 0.08  // 8%
  const effectiveDDPRate = tariffRate + salesTaxRate
  const ddpFee = productPrice * effectiveDDPRate + 15  // サービス料$15
  
  const totalCost = baseShipping + ddpFee

  console.log(`📊 送料計算:`)
  console.log(`  実送料: $${baseShipping.toFixed(2)}`)
  console.log(`  DDP費用: $${ddpFee.toFixed(2)} (${(effectiveDDPRate * 100).toFixed(1)}%)`)
  console.log(`  合計: $${totalCost.toFixed(2)}`)

  // 💡 重要: 実際の重量に基づく重量帯を取得
  const supabase = createClient()
  const { data: tierData } = await supabase
    .from('usa_ddp_rates')
    .select('weight, price_60')
    .eq('weight', actualWeight)
    .single()

  if (!tierData) {
    return {
      baseShipping,
      ddpFee,
      totalCost,
      recommendedWeightTier: actualWeight,
      canFitInTier: false
    }
  }

  const tierCapacity = tierData.price_60  // この重量帯で扱える最大送料

  // この重量帯で収まるか？
  if (totalCost <= tierCapacity) {
    console.log(`✅ ${actualWeight}kg重量帯で対応可能`)
    return {
      baseShipping,
      ddpFee,
      totalCost,
      recommendedWeightTier: actualWeight,
      canFitInTier: true
    }
  }

  // 収まらない場合、より重い重量帯を探す
  console.log(`⚠️ ${actualWeight}kg重量帯（上限$${tierCapacity}）では不足`)
  
  const { data: heavierTiers } = await supabase
    .from('usa_ddp_rates')
    .select('weight, price_60')
    .gt('weight', actualWeight)
    .gte('price_60', totalCost)
    .order('weight', { ascending: true })
    .limit(1)

  if (heavierTiers && heavierTiers.length > 0) {
    const newTier = heavierTiers[0]
    console.log(`💡 ${newTier.weight}kg重量帯を使用（上限$${newTier.price_60}）`)
    return {
      baseShipping,
      ddpFee,
      totalCost,
      recommendedWeightTier: newTier.weight,
      canFitInTier: true
    }
  }

  // どの重量帯でも収まらない
  console.error(`❌ 利用可能な重量帯がありません`)
  return {
    baseShipping,
    ddpFee,
    totalCost,
    recommendedWeightTier: actualWeight,
    canFitInTier: false
  }
}

/**
 * STEP 4: eBay送料上限をチェック（規約）
 */
export function applyEbayShippingLimit(params: {
  calculatedShipping: number
  ebayShippingLimit: number | null
  ebayCategory: string | null
}): {
  displayShipping: number
  productPriceAdjustment: number
  reason: string
  isCompliant: boolean
} {
  const { calculatedShipping, ebayShippingLimit, ebayCategory } = params

  // 送料上限がない場合
  if (!ebayShippingLimit) {
    return {
      displayShipping: calculatedShipping,
      productPriceAdjustment: 0,
      reason: '送料上限なし',
      isCompliant: true
    }
  }

  // 送料が上限内
  if (calculatedShipping <= ebayShippingLimit) {
    return {
      displayShipping: calculatedShipping,
      productPriceAdjustment: 0,
      reason: `送料上限$${ebayShippingLimit}内`,
      isCompliant: true
    }
  }

  // 🚨 送料が上限を超過
  const excessAmount = calculatedShipping - ebayShippingLimit

  console.warn(`⚠️ eBay送料上限超過`)
  console.warn(`  カテゴリ: ${ebayCategory || '不明'}`)
  console.warn(`  計算送料: $${calculatedShipping.toFixed(2)}`)
  console.warn(`  上限: $${ebayShippingLimit}`)
  console.warn(`  超過額: $${excessAmount.toFixed(2)}`)
  console.warn(`  → 商品価格に$${excessAmount.toFixed(2)}を上乗せ`)

  return {
    displayShipping: ebayShippingLimit,
    productPriceAdjustment: excessAmount,
    reason: `eBay規約により送料上限$${ebayShippingLimit}。差額$${excessAmount.toFixed(2)}を商品価格に転嫁`,
    isCompliant: true  // 商品価格に転嫁することで規約遵守
  }
}

/**
 * 統合: 全体の送料計算
 */
export async function calculateFinalShipping(params: {
  actualWeight: number
  productPrice: number
  tariffRate: number
  originCountry: string
  ebayCategory: string | null
}): Promise<ShippingCalculationResult> {
  const { actualWeight, productPrice, tariffRate, originCountry, ebayCategory } = params

  // STEP 1-3: 実送料 + DDP + 重量帯選択
  const shippingCalc = await calculateShippingWithDDP({
    actualWeight,
    productPrice,
    tariffRate,
    originCountry
  })

  const warnings: string[] = []

  // 重量帯で対応できない場合
  if (!shippingCalc.canFitInTier) {
    warnings.push(`送料$${shippingCalc.totalCost.toFixed(2)}が利用可能な重量帯を超えています`)
    return {
      actualWeight,
      baseShipping: shippingCalc.baseShipping,
      ddpFee: shippingCalc.ddpFee,
      totalShippingCost: shippingCalc.totalCost,
      selectedWeightTier: actualWeight,
      displayShipping: shippingCalc.totalCost,
      productPriceAdjustment: 0,
      reason: '重量帯不足',
      isViable: false,
      warnings
    }
  }

  // 重量帯を変更した場合の警告
  if (shippingCalc.recommendedWeightTier !== actualWeight) {
    warnings.push(
      `実重量${actualWeight}kgですが、${shippingCalc.recommendedWeightTier}kg重量帯を使用。` +
      `送料は少し割高になります。`
    )
  }

  // STEP 4: eBay送料上限チェック
  const shippingLimit = getShippingLimitForCategory(ebayCategory)
  const limitCheck = applyEbayShippingLimit({
    calculatedShipping: shippingCalc.totalCost,
    ebayShippingLimit: shippingLimit,
    ebayCategory
  })

  if (limitCheck.productPriceAdjustment > 0) {
    warnings.push(limitCheck.reason)
  }

  return {
    actualWeight,
    baseShipping: shippingCalc.baseShipping,
    ddpFee: shippingCalc.ddpFee,
    totalShippingCost: shippingCalc.totalCost,
    selectedWeightTier: shippingCalc.recommendedWeightTier,
    displayShipping: limitCheck.displayShipping,
    productPriceAdjustment: limitCheck.productPriceAdjustment,
    reason: limitCheck.reason,
    isViable: true,
    warnings
  }
}

// ヘルパー関数
async function getBaseShippingCost(weight: number): Promise<number> {
  const supabase = createClient()
  const { data } = await supabase
    .from('usa_ddp_rates')
    .select('price_60')
    .eq('weight', weight)
    .single()
  
  return data?.price_60 || 20  // フォールバック
}

function getShippingLimitForCategory(category: string | null): number | null {
  if (!category) return null
  
  const limits: Record<string, number> = {
    '267': 20,      // Books
    '617': 20,      // DVDs
    '176985': 25,   // Music CDs
    '176984': 40    // Vinyl Records
  }
  
  return limits[category] || null
}

import { createClient } from '@/lib/supabase/client'
