/**
 * eBay USA配送ポリシーベース価格計算エンジン（完全修正版）
 * 
 * 重要ルール:
 * 1. 顧客表示送料は必ずDBのtotal_shipping_usdを使う
 * 2. HTSコードと原産国でDDP率を計算（参考値）
 * 3. DBから最適なポリシーを選択
 * 4. 総売上を同じに保つ（利益率維持）
 */

import { supabase } from '@/lib/supabase/client'

const CONSUMPTION_TAX_RATE = 0.1

export const STORE_FEES = {
  none: { name: 'ストアなし', fvf_discount: 0 },
  basic: { name: 'Basic', fvf_discount: 0.04 },
  premium: { name: 'Premium', fvf_discount: 0.06 },
  anchor: { name: 'Anchor', fvf_discount: 0.08 },
}

export interface UsaPricingInput {
  costJPY: number
  weight_kg: number
  targetProductPriceRatio?: number
  targetMargin?: number
  hsCode?: string
  originCountry?: string
  storeType?: keyof typeof STORE_FEES
  fvfRate?: number
  exchangeRate?: number
}

export interface PricingOption {
  policyName: string
  productPrice: number
  shipping: number
  total: number
  profit: number
  profitMargin: number
  baseShipping: number
  ddpFee: number
  productPriceRatio: number
  isRecommended: boolean
  reason: string
}

export interface UsaPricingResult {
  success: boolean
  error?: string
  recommended: PricingOption
  alternative?: PricingOption
  comparison?: any
  policy: any
  productPrice: number
  shipping: number
  totalRevenue: number
  searchDisplayPrice: number
  profitUSD_NoRefund: number
  profitMargin_NoRefund: number
  profitUSD_WithRefund: number
  profitJPY_WithRefund: number
  refundUSD: number
  costUSD: number
  shippingCost: number
  ddpFee: number
  totalFees: number
  calculationSteps?: Array<{
    step: string
    value: string
    description: string
  }>
  formulas: Array<{
    step: number
    label: string
    formula: string
  }>
  breakdown: any
}

export async function calculateUsaPrice(
  input: UsaPricingInput
): Promise<UsaPricingResult> {
  const {
    costJPY,
    weight_kg,
    targetProductPriceRatio = 0.8,
    targetMargin = 0.15,
    hsCode = '9503.00.0000',
    originCountry = 'CN',
    storeType = 'none',
    fvfRate = 0.1315,
    exchangeRate = 154.32
  } = input

  const calculationSteps: Array<{
    step: string
    value: string
    description: string
  }> = []

  const costUSD = costJPY / exchangeRate

  // 消費税還付
  const estimatedRevenue = costUSD * 2.5
  const estimatedFVF = estimatedRevenue * fvfRate
  const estimatedFVF_JPY = estimatedFVF * exchangeRate
  const insertionFeeJPY = 0.35 * exchangeRate
  const refundableFees = estimatedFVF_JPY + insertionFeeJPY
  const taxableAmount = costJPY + refundableFees
  const refund = taxableAmount * (CONSUMPTION_TAX_RATE / (1 + CONSUMPTION_TAX_RATE))
  const refundUSD = refund / exchangeRate

  // 変動コスト率
  const storeFee = STORE_FEES[storeType]
  const finalFVF = Math.max(0, fvfRate - storeFee.fvf_discount)
  const variableRate = finalFVF + 0.02 + 0.02 + 0.03 + 0.015
  const insertionFeeUSD = 0.35

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 0: HTSコードと原産国でDDP率を取得
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const { data: hsData } = await supabase
    .from('hs_codes')
    .select('base_duty, section301, section301_rate, description')
    .or(`code.eq.${hsCode},code.like.${hsCode.substring(0, 7)}%`)
    .limit(1)
    .single()

  // ⚠️ 重要: HTSコードから関税率を取得（固定値を使わない）
  let tariffRate = 0
  let tariffDescription = ''
  
  console.log(`🌍 原産国: ${originCountry}, HTSコード: ${hsCode}`)
  
  if (hsData) {
    // 基本関税率（すべての国に適用）
    tariffRate = parseFloat(hsData.base_duty as string) || 0
    tariffDescription = `基本関税: ${(tariffRate * 100).toFixed(2)}%`
    
    console.log(`  ⇒ 基本関税率: ${(tariffRate * 100).toFixed(2)}%`)
    
    // 原産国が中国でSection 301が適用される場合
    if (originCountry === 'CN' && hsData.section301) {
      const section301Rate = parseFloat(hsData.section301_rate as string) || 0.25
      tariffRate += section301Rate
      tariffDescription += ` + Section 301: ${(section301Rate * 100).toFixed(0)}%`
      console.log(`  ⇒ Section 301追加: +${(section301Rate * 100).toFixed(0)}%`)
    }
    
    console.log(`  ⇒ 最終関税率: ${(tariffRate * 100).toFixed(2)}%`)
  } else {
    // HTSデータがない場合は警告
    console.warn(`⚠️ HTSコード ${hsCode} のデータが見つかりません`)
    tariffRate = 0
    tariffDescription = '関税データなし'
  }

  const taxRate = 0.08
  const ddpRate = tariffRate + taxRate

  calculationSteps.push({
    step: 'STEP 0',
    value: `${(ddpRate * 100).toFixed(2)}%`,
    description: `DDP率計算: ${tariffDescription} + 販売税${(taxRate * 100).toFixed(2)}% = 実効率${(ddpRate * 100).toFixed(2)}% (HTS: ${hsCode}, 原産国: ${originCountry})${hsData ? ` - ${hsData.description}` : ''}`
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 1: 最安送料ポリシーで基準総売上を計算
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const { data: minPolicy, error: minError } = await supabase
    .from('usa_ddp_rates')
    .select('*')
    .lte('weight_min_kg', weight_kg)
    .gt('weight_max_kg', weight_kg)
    .order('total_shipping_usd', { ascending: true })
    .limit(1)
    .single()

  if (minError || !minPolicy) {
    // 利用可能な重量帯を取得
    const { data: availableWeights } = await supabase
      .from('usa_ddp_rates')
      .select('weight_band_name, weight_min_kg, weight_max_kg')
      .order('weight_min_kg', { ascending: true })
    
    const weightBands = Array.from(new Set(
      availableWeights?.map(w => `${w.weight_band_name} (${w.weight_min_kg}-${w.weight_max_kg}kg)`) || []
    )).slice(0, 10).join(', ')
    
    return {
      success: false,
      error: `重量${weight_kg}kgに対応する配送データがusa_ddp_ratesテーブルに見つかりません。\n\n利用可能な重量帯: ${weightBands}...`
    } as UsaPricingResult
  }

  // 最安送料ポリシーのDB値を使用
  const minShipping = minPolicy.total_shipping_usd
  const minBaseShipping = minPolicy.base_shipping_usd
  const minDDP = minShipping - minBaseShipping

  // 固定コスト
  const baseFixedCost = costUSD + minBaseShipping + minDDP + insertionFeeUSD
  
  // 必要売上
  const baseRequiredRevenue = baseFixedCost / (1 - variableRate - targetMargin)
  
  // 商品価格
  let baseProductPrice = baseRequiredRevenue - minShipping
  baseProductPrice = Math.round(baseProductPrice / 5) * 5
  
  const baseTotalRevenue = baseProductPrice + minShipping
  const baseVariableCosts = baseTotalRevenue * variableRate
  const baseTotalCosts = baseFixedCost + baseVariableCosts
  const baseProfit = baseTotalRevenue - baseTotalCosts
  const baseProfitMargin = baseProfit / baseTotalRevenue

  calculationSteps.push({
    step: 'STEP 1',
    value: `$${baseTotalRevenue.toFixed(2)}`,
    description: `最安送料ポリシー（${minPolicy.weight_band_name}）で基準総売上確定、利益率${(baseProfitMargin * 100).toFixed(2)}%`
  })

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 2: 商品価格に応じたDDP費用を確保するため、より高い送料ポリシーを選択
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ✅ 重要: 商品価格が高いほど、DDP費用（関税）も高くなる
  // ⇒ 商品価格の20%程度のDDP費用を確保できる送料ポリシーを選ぶ
  
  // 必要なDDP費用を計算（商品価格の20%程度）
  const requiredDDP = baseProductPrice * 0.2
  const requiredTotalShipping = minBaseShipping + requiredDDP
  
  console.log(`📦 STEP 2: 商品価格${baseProductPrice.toFixed(2)}に必要なDDP: ${requiredDDP.toFixed(2)}`)
  console.log(`  ⇒ 必要な送料: ${requiredTotalShipping.toFixed(2)} = 実送料${minBaseShipping.toFixed(2)} + DDP${requiredDDP.toFixed(2)}`)
  
  const { data: allPolicies, error: policiesError } = await supabase
    .from('usa_ddp_rates')
    .select('*')
    .lte('weight_min_kg', weight_kg)
    .gt('weight_max_kg', weight_kg)
    .gte('total_shipping_usd', requiredTotalShipping)  // ✅ DDP費用を確保できる送料を選ぶ
    .order('total_shipping_usd', { ascending: true })  // 最も近いものを選ぶ

  if (policiesError || !allPolicies || allPolicies.length === 0) {
    // 最安送料を使用
    const selectedOption: PricingOption = {
      policyName: `${minPolicy.weight_band_name} (商品価格$${minPolicy.product_price_usd})`,
      productPrice: baseProductPrice,
      shipping: minShipping,
      total: baseTotalRevenue,
      profit: baseProfit,
      profitMargin: baseProfitMargin,
      baseShipping: minBaseShipping,
      ddpFee: minDDP,
      productPriceRatio: baseProductPrice / baseTotalRevenue,
      isRecommended: true,
      reason: '最安送料'
    }

    return buildResult(selectedOption, minPolicy, costUSD, refundUSD, refund, exchangeRate, finalFVF, variableRate, insertionFeeUSD, calculationSteps, undefined, undefined, ddpRate, hsCode, originCountry)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 3: 商品価格比率が80%に最も近いポリシーを選択
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  let bestPolicy = minPolicy
  let bestProductPrice = baseProductPrice
  let bestShipping = minShipping
  let bestDiff = Math.abs((baseProductPrice / baseTotalRevenue) - targetProductPriceRatio)

  for (const policy of allPolicies) {
    // DBのtotal_shipping_usdを使用
    const policyShipping = policy.total_shipping_usd
    
    // このポリシーでの商品価格
    let productPrice = baseTotalRevenue - policyShipping
    productPrice = Math.round(productPrice / 5) * 5
    
    const productPriceRatio = productPrice / baseTotalRevenue
    const diff = Math.abs(productPriceRatio - targetProductPriceRatio)
    
    // 80%に近い方を選択
    if (diff < bestDiff) {
      bestPolicy = policy
      bestProductPrice = productPrice
      bestShipping = policyShipping
      bestDiff = diff
    }
  }

  const selectedTotalRevenue = bestProductPrice + bestShipping
  const selectedVariableCosts = selectedTotalRevenue * variableRate
  
  // DDPを逆算（表示用）
  const selectedBaseShipping = bestPolicy.base_shipping_usd
  const selectedDDP = bestShipping - selectedBaseShipping
  const selectedFixedCost = costUSD + selectedBaseShipping + selectedDDP + insertionFeeUSD
  const selectedTotalCosts = selectedFixedCost + selectedVariableCosts
  const selectedProfit = selectedTotalRevenue - selectedTotalCosts
  const selectedProfitMargin = selectedProfit / selectedTotalRevenue
  const selectedProductPriceRatio = bestProductPrice / selectedTotalRevenue

  calculationSteps.push({
    step: 'STEP 2',
    value: bestPolicy.weight_band_name,
    description: `DBから選択: 商品価格$${bestPolicy.product_price_usd}のポリシー（送料$${bestShipping.toFixed(2)}）`
  })

  calculationSteps.push({
    step: 'STEP 3',
    value: `${(selectedProductPriceRatio * 100).toFixed(1)}%`,
    description: `商品価格比率を${(selectedProductPriceRatio * 100).toFixed(1)}%に最適化（目標${(targetProductPriceRatio * 100).toFixed(0)}%）`
  })

  const selectedOption: PricingOption = {
    policyName: `${bestPolicy.weight_band_name} (商品価格$${bestPolicy.product_price_usd})`,
    productPrice: bestProductPrice,
    shipping: bestShipping,
    total: selectedTotalRevenue,
    profit: selectedProfit,
    profitMargin: selectedProfitMargin,
    baseShipping: selectedBaseShipping,
    ddpFee: selectedDDP,
    productPriceRatio: selectedProductPriceRatio,
    isRecommended: true,
    reason: `商品価格を${(selectedProductPriceRatio * 100).toFixed(0)}%に最適化（利益率${(selectedProfitMargin * 100).toFixed(2)}%維持）`
  }

  // 代替案
  const baseOption: PricingOption = {
    policyName: `${minPolicy.weight_band_name} (商品価格$${minPolicy.product_price_usd})`,
    productPrice: baseProductPrice,
    shipping: minShipping,
    total: baseTotalRevenue,
    profit: baseProfit,
    profitMargin: baseProfitMargin,
    baseShipping: minBaseShipping,
    ddpFee: minDDP,
    productPriceRatio: baseProductPrice / baseTotalRevenue,
    isRecommended: false,
    reason: '最安送料'
  }

  // 比較情報
  const comparison = bestPolicy.id !== minPolicy.id ? {
    productPriceReduction: baseProductPrice - bestProductPrice,
    shippingIncrease: bestShipping - minShipping,
    profitMarginDiff: baseProfitMargin - selectedProfitMargin,
    message: `商品価格を$${(baseProductPrice - bestProductPrice).toFixed(2)}下げて検索で有利に（利益率${(selectedProfitMargin * 100).toFixed(2)}%維持）`
  } : undefined

  return buildResult(selectedOption, bestPolicy, costUSD, refundUSD, refund, exchangeRate, finalFVF, variableRate, insertionFeeUSD, calculationSteps, bestPolicy.id !== minPolicy.id ? baseOption : undefined, comparison, ddpRate, hsCode, originCountry)
}

function buildResult(
  selectedOption: PricingOption,
  policy: any,
  costUSD: number,
  refundUSD: number,
  refund: number,
  exchangeRate: number,
  finalFVF: number,
  variableRate: number,
  insertionFeeUSD: number,
  calculationSteps: any[],
  alternative?: PricingOption,
  comparison?: any,
  ddpRate?: number,
  hsCode?: string,
  originCountry?: string
): UsaPricingResult {
  const profitUSD_WithRefund = selectedOption.profit + refundUSD
  const profitJPY_WithRefund = profitUSD_WithRefund * exchangeRate

  const formulas = [
    {
      step: 1,
      label: '使用ポリシー',
      formula: `${policy.weight_band_name} (商品価格$${policy.product_price_usd}のポリシー)`
    },
    {
      step: 2,
      label: '送料（DB値）',
      formula: `$${policy.total_shipping_usd.toFixed(2)} = 実送料$${policy.base_shipping_usd.toFixed(2)} + DDP$${selectedOption.ddpFee.toFixed(2)}`
    },
    {
      step: 3,
      label: 'DDP率',
      formula: ddpRate ? `${(ddpRate * 100).toFixed(2)}% (HTS: ${hsCode}, 原産国: ${originCountry})` : '計算なし'
    },
    {
      step: 4,
      label: '最終価格',
      formula: `商品$${selectedOption.productPrice} + 送料$${selectedOption.shipping.toFixed(2)} = $${selectedOption.total.toFixed(2)}`
    }
  ]

  return {
    success: true,
    recommended: selectedOption,
    alternative,
    comparison,
    policy: {
      id: policy.id,
      name: `${policy.weight_band_name} (商品価格$${policy.product_price_usd})`,
      weight_range: `${policy.weight_min_kg}-${policy.weight_max_kg}kg`,
      base_rate_usd: policy.base_shipping_usd,
      ddp_duty_usd: 0,
      ddp_tax_usd: selectedOption.ddpFee,
      shipping_total_usd: policy.total_shipping_usd,
      additional_item_usd: 0
    },
    productPrice: selectedOption.productPrice,
    shipping: selectedOption.shipping,
    totalRevenue: selectedOption.total,
    searchDisplayPrice: selectedOption.total,
    profitUSD_NoRefund: selectedOption.profit,
    profitMargin_NoRefund: selectedOption.profitMargin,
    profitUSD_WithRefund,
    profitJPY_WithRefund,
    refundUSD,
    costUSD,
    shippingCost: policy.base_shipping_usd,
    ddpFee: selectedOption.ddpFee,
    totalFees: selectedOption.total * variableRate,
    calculationSteps,
    formulas,
    breakdown: {
      costUSD: costUSD.toFixed(2),
      actualShipping: policy.base_shipping_usd.toFixed(2),
      ddpDuty: '0.00',
      ddpTax: selectedOption.ddpFee.toFixed(2),
      ddpTotal: selectedOption.ddpFee.toFixed(2),
      fvf: (selectedOption.total * (finalFVF)).toFixed(2),
      fvfRate: (finalFVF * 100).toFixed(2) + '%',
      payoneer: (selectedOption.total * 0.02).toFixed(2),
      promotedListing: (selectedOption.total * 0.02).toFixed(2),
      exchangeLoss: (selectedOption.total * 0.03).toFixed(2),
      internationalFee: (selectedOption.total * 0.015).toFixed(2),
      totalCosts: (costUSD + policy.base_shipping_usd + selectedOption.ddpFee + insertionFeeUSD + selectedOption.total * variableRate).toFixed(2),
      refund: refund.toFixed(2)
    }
  }
}
