/**
 * 送料と利益計算の統合版
 * 
 * より重い重量帯を使う場合の利益への影響を正しく計算
 */

import { createClient } from '@/lib/supabase/client'
import { calculatePriceWithHighTariff } from './high-tariff-calculator'

export interface IntegratedPricingResult {
  // 価格
  productPrice: number
  shipping: number
  totalRevenue: number
  
  // コスト
  costUSD: number
  actualShippingCost: number
  ddpFee: number
  fvf: number
  totalCosts: number
  
  // 利益
  profitUSD: number
  profitMargin: number
  targetMargin: number
  marginDelta: number  // 目標との差
  
  // 送料詳細
  actualWeight: number
  selectedWeightTier: number
  usingHeavierTier: boolean
  tierExtraCost: number  // 重量帯変更による追加コスト
  
  // 判定
  canList: boolean
  reason: string
  warnings: string[]
}

/**
 * 統合計算
 */
export async function calculateIntegratedPricing(params: {
  costJPY: number
  actualWeight: number
  targetMargin: number
  hsCode: string
  originCountry: string
  fvfRate: number
  exchangeRate: number
  ebayCategory?: string | null
}): Promise<IntegratedPricingResult> {
  const {
    costJPY,
    actualWeight,
    targetMargin,
    hsCode,
    originCountry,
    fvfRate,
    exchangeRate,
    ebayCategory
  } = params

  const warnings: string[] = []
  const supabase = createClient()

  console.log(`\n💰 統合価格計算開始`)
  console.log(`コスト: ¥${costJPY} = $${(costJPY / exchangeRate).toFixed(2)}`)
  console.log(`実重量: ${actualWeight}kg`)
  console.log(`目標利益率: ${targetMargin}%`)

  const costUSD = costJPY / exchangeRate

  // ========================================
  // STEP 1: 関税率を取得
  // ========================================
  
  const { data: hsData } = await supabase
    .from('hts_codes')
    .select('base_rate')
    .eq('code', hsCode)
    .single()

  const baseTariffRate = hsData?.base_rate || 0.058

  const { data: additionalData } = await supabase
    .from('country_additional_tariffs')
    .select('additional_rate')
    .eq('country_code', originCountry)
    .eq('is_active', true)
    .single()

  const additionalTariff = additionalData?.additional_rate || 0
  const totalTariffRate = baseTariffRate + additionalTariff
  const effectiveDDPRate = totalTariffRate + 0.08

  console.log(`関税率: ${(effectiveDDPRate * 100).toFixed(1)}%`)

  // ========================================
  // STEP 2: 基準送料を取得（実重量の重量帯）
  // ========================================
  
  const { data: baseTierData } = await supabase
    .from('usa_ddp_rates')
    .select('weight, price_60')
    .eq('weight', actualWeight)
    .single()

  if (!baseTierData) {
    return createErrorResult(costUSD, actualWeight, targetMargin, '重量帯データなし')
  }

  const baseShipping = baseTierData.price_60
  console.log(`基準送料: $${baseShipping}（${actualWeight}kg重量帯）`)

  // ========================================
  // STEP 3: 基準送料で商品価格を計算
  // ========================================
  
  try {
    const basePrice = calculatePriceWithHighTariff({
      cost: costUSD,
      baseShipping,
      ddpRate: effectiveDDPRate,
      variableRate: fvfRate,
      targetMargin: targetMargin / 100,
      insertionFee: 0
    })

    console.log(`基準価格: $${basePrice.productPrice.toFixed(2)}`)

    // ========================================
    // STEP 4: この価格でDDP費用と必要な重量帯を計算
    // ========================================
    
    const ddpServiceFee = 15
    const ddpFee = basePrice.productPrice * effectiveDDPRate + ddpServiceFee
    const totalShippingNeeded = baseShipping + ddpFee

    console.log(`DDP費用: $${ddpFee.toFixed(2)}`)
    console.log(`必要な送料: $${totalShippingNeeded.toFixed(2)}`)

    // 重量帯の容量チェック
    let selectedTier = actualWeight
    let tierCapacity = baseShipping
    let actualShippingCost = totalShippingNeeded
    let usingHeavierTier = false
    let tierExtraCost = 0

    if (totalShippingNeeded > baseShipping) {
      console.log(`⚠️ 基準送料$${baseShipping}では不足`)
      
      // より重い重量帯を探す
      const { data: heavierTiers } = await supabase
        .from('usa_ddp_rates')
        .select('weight, price_60')
        .gt('weight', actualWeight)
        .gte('price_60', totalShippingNeeded)
        .order('weight', { ascending: true })
        .limit(1)

      if (!heavierTiers || heavierTiers.length === 0) {
        console.error(`❌ 利用可能な重量帯なし`)
        return createErrorResult(
          costUSD,
          actualWeight,
          targetMargin,
          `送料$${totalShippingNeeded.toFixed(2)}をカバーできる重量帯がありません`
        )
      }

      selectedTier = heavierTiers[0].weight
      tierCapacity = heavierTiers[0].price_60
      actualShippingCost = totalShippingNeeded
      usingHeavierTier = true
      tierExtraCost = 0  // 実際のコストは変わらない（表示上の問題）

      console.log(`✅ ${selectedTier}kg重量帯を使用（容量$${tierCapacity}）`)
      warnings.push(`実重量${actualWeight}kgですが${selectedTier}kg重量帯を使用`)
    }

    // ========================================
    // STEP 5: 最終的な利益計算
    // ========================================
    
    const productPrice = basePrice.productPrice
    const shipping = actualShippingCost
    const totalRevenue = productPrice + shipping

    const fvf = totalRevenue * fvfRate
    const totalCosts = costUSD + actualShippingCost + fvf

    const profitUSD = totalRevenue - totalCosts
    const profitMargin = (profitUSD / totalRevenue) * 100
    const marginDelta = profitMargin - targetMargin

    console.log(`\n📊 最終結果`)
    console.log(`商品価格: $${productPrice.toFixed(2)}`)
    console.log(`送料: $${shipping.toFixed(2)}`)
    console.log(`総売上: $${totalRevenue.toFixed(2)}`)
    console.log(`総コスト: $${totalCosts.toFixed(2)}`)
    console.log(`利益: $${profitUSD.toFixed(2)}`)
    console.log(`利益率: ${profitMargin.toFixed(1)}% (目標${targetMargin}%)`)

    // 赤字チェック
    if (profitUSD < 0) {
      console.error(`❌ 赤字のため出品不可`)
      return {
        productPrice,
        shipping,
        totalRevenue,
        costUSD,
        actualShippingCost,
        ddpFee,
        fvf,
        totalCosts,
        profitUSD,
        profitMargin,
        targetMargin,
        marginDelta,
        actualWeight,
        selectedWeightTier: selectedTier,
        usingHeavierTier,
        tierExtraCost,
        canList: false,
        reason: '赤字',
        warnings: [...warnings, '❌ 赤字のため出品不可']
      }
    }

    // 目標未達の警告
    if (profitMargin < targetMargin - 3) {
      warnings.push(`⚠️ 目標利益率${targetMargin}%に対し${profitMargin.toFixed(1)}%`)
    }

    return {
      productPrice,
      shipping,
      totalRevenue,
      costUSD,
      actualShippingCost,
      ddpFee,
      fvf,
      totalCosts,
      profitUSD,
      profitMargin,
      targetMargin,
      marginDelta,
      actualWeight,
      selectedWeightTier: selectedTier,
      usingHeavierTier,
      tierExtraCost,
      canList: true,
      reason: '出品可能',
      warnings
    }

  } catch (error) {
    console.error(`❌ 計算エラー:`, error)
    return createErrorResult(
      costUSD,
      actualWeight,
      targetMargin,
      error instanceof Error ? error.message : '計算エラー'
    )
  }
}

function createErrorResult(
  costUSD: number,
  weight: number,
  targetMargin: number,
  reason: string
): IntegratedPricingResult {
  return {
    productPrice: 0,
    shipping: 0,
    totalRevenue: 0,
    costUSD,
    actualShippingCost: 0,
    ddpFee: 0,
    fvf: 0,
    totalCosts: costUSD,
    profitUSD: 0,
    profitMargin: 0,
    targetMargin,
    marginDelta: -targetMargin,
    actualWeight: weight,
    selectedWeightTier: weight,
    usingHeavierTier: false,
    tierExtraCost: 0,
    canList: false,
    reason,
    warnings: [reason]
  }
}
