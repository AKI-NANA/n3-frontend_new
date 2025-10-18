/**
 * eBay USA DDP価格計算エンジン V2（クラッシュ修正版）
 * 
 * 🔧 修正内容:
 * 1. STEP 1のクエリをより安全に（product_price_usd条件を削除）
 * 2. すべてのクエリでエラーハンドリングを強化
 * 3. デバッグログを追加して問題特定を容易に
 * 4. バッチ処理対応の基盤を追加
 */

import { supabase } from '@/lib/supabase/client'

const CONSUMPTION_TAX_RATE = 0.1
const DDP_SERVICE_FEE = 15

export const STORE_FEES = {
  none: { name: 'ストアなし', fvf_discount: 0 },
  basic: { name: 'Basic', fvf_discount: 0.04 },
  premium: { name: 'Premium', fvf_discount: 0.06 },
  anchor: { name: 'Anchor', fvf_discount: 0.08 },
}

export interface UsaPricingInputV2 {
  costJPY: number
  weight_kg: number
  targetProductPriceRatio?: number
  targetMargin?: number
  hsCode: string
  originCountry: string
  storeType?: keyof typeof STORE_FEES
  fvfRate?: number
  exchangeRate?: number
}

export interface PricingOptionV2 {
  policyName: string
  productPrice: number
  shipping: number
  total: number
  profit: number
  profitMargin: number
  baseShipping: number
  tariffAmount: number
  mpf: number
  hmf: number
  ddpServiceFee: number
  ddpTotal: number
  productPriceRatio: number
  isRecommended: boolean
  reason: string
}

export interface UsaPricingResultV2 {
  success: boolean
  error?: string
  
  recommended: PricingOptionV2
  alternative?: PricingOptionV2
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
  
  tariffRate: number
  tariffAmount: number
  mpf: number
  hmf: number
  ddpServiceFee: number
  ddpTotal: number
  
  totalFees: number
  calculationSteps: Array<{
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

/**
 * 🆕 バッチ処理用のインターフェース
 */
export interface BatchCalculationInput {
  id: string | number
  costJPY: number
  weight_kg: number
  hsCode: string
  originCountry: string
  storeType?: keyof typeof STORE_FEES
}

export interface BatchCalculationResult {
  id: string | number
  success: boolean
  result?: UsaPricingResultV2
  error?: string
}

/**
 * メイン計算関数（シングル計算）
 */
export async function calculateUsaPriceV2(
  input: UsaPricingInputV2
): Promise<UsaPricingResultV2> {
  const startTime = Date.now()
  
  try {
    const {
      costJPY,
      weight_kg,
      targetProductPriceRatio = 0.8,
      targetMargin = 0.15,
      hsCode,
      originCountry,
      storeType = 'none',
      fvfRate = 0.1315,
      exchangeRate = 154.32
    } = input

    const calculationSteps: Array<{
      step: string
      value: string
      description: string
    }> = []

    console.log('🚀 ============ USA DDP価格計算 V2（修正版） 開始 ============')
    console.log(`📦 入力: 仕入${costJPY}円, 重量${weight_kg}kg, HTS:${hsCode}, 原産国:${originCountry}`)

    // 入力値の検証
    if (!costJPY || costJPY <= 0) {
      throw new Error('仕入原価が無効です')
    }
    if (!weight_kg || weight_kg <= 0) {
      throw new Error('重量が無効です')
    }
    if (!hsCode) {
      throw new Error('HTSコードが指定されていません')
    }
    if (!originCountry) {
      throw new Error('原産国が指定されていません')
    }

    const costUSD = costJPY / exchangeRate

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 0: 原産国とHTSコードから関税率を取得
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n📋 STEP 0: 関税率の取得')
    
    const hsCodeNormalized = hsCode.replace(/\./g, '')
    console.log(`  🔍 元のHTS: ${hsCode} → 正規化: ${hsCodeNormalized}`)
    
    // 🔧 HTSコード検索を関数化して安全性を向上
    const hsData = await fetchHTSData(hsCode, hsCodeNormalized)
    
    if (!hsData) {
      console.error('❌ HTSコードが見つかりません:', hsCode)
      return {
        success: false,
        error: `HTSコード ${hsCode} がデータベースに見つかりません。正しいHTSコードを入力してください。`
      } as UsaPricingResultV2
    }

    // 原産国別追加関税を取得
    const { data: countryTariff, error: countryError } = await supabase
      .from('country_additional_tariffs')
      .select('country_code, additional_rate, tariff_type, description')
      .eq('country_code', originCountry)
      .eq('is_active', true)
      .maybeSingle()

    if (countryError) {
      console.warn('⚠️ 追加関税取得エラー:', countryError)
    }

    console.log(`  🔍 HTSデータ:`, hsData)
    console.log(`  🔍 原産国: ${originCountry}`)
    console.log(`  🔍 追加関税データ:`, countryTariff)

    // 関税率の決定
    let tariffRate = 0
    let tariffDescription = ''
    const baseDuty = parseFloat(hsData.base_duty as string) || 0
    
    if (countryTariff && countryTariff.additional_rate) {
      const additionalRate = parseFloat(countryTariff.additional_rate as string) || 0
      tariffRate = baseDuty + additionalRate
      tariffDescription = `${originCountry}: 基本${(baseDuty * 100).toFixed(2)}% + 追加${(additionalRate * 100).toFixed(0)}% (${countryTariff.tariff_type})`
      
      console.log(`  ✅ ${originCountry}からの輸入`)
      console.log(`    - 基本関税: ${(baseDuty * 100).toFixed(2)}%`)
      console.log(`    - 追加関税: +${(additionalRate * 100).toFixed(0)}% (${countryTariff.tariff_type})`)
      console.log(`    - 合計: ${(tariffRate * 100).toFixed(2)}%`)
    } else {
      tariffRate = baseDuty
      tariffDescription = `${originCountry}: ${(tariffRate * 100).toFixed(2)}%`
      console.log(`  ✅ ${originCountry}からの輸入 (追加関税なし)`)
      console.log(`    - 関税率: ${(tariffRate * 100).toFixed(2)}%`)
    }
    
    const salesTaxRate = 0.08
    const effectiveDDPRate = tariffRate + salesTaxRate
    
    console.log(`  ✅ 実効DDP率: ${(effectiveDDPRate * 100).toFixed(2)}% = 関税${(tariffRate * 100).toFixed(2)}% + 販売税${(salesTaxRate * 100).toFixed(2)}%`)

    calculationSteps.push({
      step: 'STEP 0',
      value: `${(effectiveDDPRate * 100).toFixed(2)}%`,
      description: `${tariffDescription} + 販売税${(salesTaxRate * 100).toFixed(2)}% = 実効率${(effectiveDDPRate * 100).toFixed(2)}% (${hsData.description})`
    })

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: 最安送料で基準総売上を決定（修正版）
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n📋 STEP 1: 最安送料で基準総売上を決定（修正版）')
    
    // 🔧 修正: product_price_usd条件を削除し、より柔軟に検索
    const { data: allWeightPolicies, error: weightError } = await supabase
      .from('usa_ddp_rates')
      .select('*')
      .lte('weight_min_kg', weight_kg)
      .gt('weight_max_kg', weight_kg)
      .order('total_shipping_usd', { ascending: true })

    if (weightError) {
      console.error('❌ usa_ddp_ratesクエリエラー:', weightError)
      return {
        success: false,
        error: `配送データ取得エラー: ${weightError.message || JSON.stringify(weightError)}`
      } as UsaPricingResultV2
    }

    if (!allWeightPolicies || allWeightPolicies.length === 0) {
      console.error('❌ 重量帯が見つかりません:', { weight_kg })
      return {
        success: false,
        error: `重量${weight_kg}kgに対応する配送ポリシーが見つかりません。配送ポリシーの設定を確認してください。`
      } as UsaPricingResultV2
    }

    console.log(`  ✅ ${allWeightPolicies.length}件の重量帯ポリシーが見つかりました`)

    // 商品価格を推定して、適切なポリシーを選択
    const estimatedProductPrice = costUSD * 1.5
    console.log(`  💰 推定商品価格: $${estimatedProductPrice.toFixed(2)}`)

    // 推定価格以下の最安ポリシーを探す（なければ最安を使用）
    let minPolicy = allWeightPolicies.find(p => p.product_price_usd >= estimatedProductPrice)
    if (!minPolicy) {
      minPolicy = allWeightPolicies[0]
      console.log(`  ⚠️ 推定価格に対応するポリシーがないため、最安ポリシーを使用`)
    }

    const minShipping = minPolicy.total_shipping_usd
    const minBaseShipping = minPolicy.base_shipping_usd

    console.log(`  ✅ 選択ポリシー: ${minPolicy.weight_band_name} (商品価格$${minPolicy.product_price_usd})`)
    console.log(`  ✅ 送料: $${minShipping.toFixed(2)} (実送料$${minBaseShipping.toFixed(2)})`)

    // ストア割引を適用
    const storeFee = STORE_FEES[storeType]
    const finalFVF = Math.max(0, fvfRate - storeFee.fvf_discount)
    const variableRate = finalFVF + 0.02 + 0.02 + 0.03 + 0.015
    const insertionFeeUSD = 0.35

    console.log(`  ✅ FVF: ${(fvfRate * 100).toFixed(2)}% - ストア割引${(storeFee.fvf_discount * 100).toFixed(2)}% = ${(finalFVF * 100).toFixed(2)}%`)

    // 固定コスト
    const baseFixedCost = costUSD + minBaseShipping + insertionFeeUSD
    
    // 必要売上（仮のDDP費用を含む）
    const tempDDP = costUSD * 0.2
    const tempFixedCost = baseFixedCost + tempDDP
    const baseRequiredRevenue = tempFixedCost / (1 - variableRate - targetMargin)
    
    // 商品価格
    let baseProductPrice = baseRequiredRevenue - minShipping
    baseProductPrice = Math.round(baseProductPrice / 5) * 5
    
    const baseTotalRevenue = baseProductPrice + minShipping

    console.log(`  ✅ 基準総売上: $${baseTotalRevenue.toFixed(2)} = 商品$${baseProductPrice.toFixed(2)} + 送料$${minShipping.toFixed(2)}`)

    calculationSteps.push({
      step: 'STEP 1',
      value: `$${baseTotalRevenue.toFixed(2)}`,
      description: `最安送料（${minPolicy.weight_band_name}）で基準総売上確定`
    })

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: 商品価格の20%分のDDP費用を確保できる送料を選択
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n📋 STEP 2: DDP費用を確保できる送料を選択')
    
    const requiredTariff = baseProductPrice * effectiveDDPRate
    const requiredMPF = baseProductPrice * 0.003464
    const requiredDDP = requiredTariff + requiredMPF + DDP_SERVICE_FEE
    const requiredTotalShipping = minBaseShipping + requiredDDP

    console.log(`  📊 商品価格$${baseProductPrice.toFixed(2)}に必要なDDP:`)
    console.log(`    - 関税: $${requiredTariff.toFixed(2)} (${(effectiveDDPRate * 100).toFixed(2)}%)`)
    console.log(`    - MPF: $${requiredMPF.toFixed(2)}`)
    console.log(`    - 通関手数料: $${DDP_SERVICE_FEE.toFixed(2)}`)
    console.log(`    - DDP合計: $${requiredDDP.toFixed(2)}`)
    console.log(`  ✅ 必要な送料: $${requiredTotalShipping.toFixed(2)}`)

    // 必要送料を確保できるポリシーを検索
    const suitablePolicies = allWeightPolicies.filter(p => 
      p.total_shipping_usd >= requiredTotalShipping
    )

    if (suitablePolicies.length === 0) {
      console.warn('⚠️ DDP費用を確保できる送料が見つかりません。最安送料を使用します。')
      
      const actualTariff = baseProductPrice * tariffRate
      const actualMPF = baseProductPrice * 0.003464
      const actualDDP = actualTariff + actualMPF + DDP_SERVICE_FEE
      
      const actualFixedCost = costUSD + minBaseShipping + actualDDP + insertionFeeUSD
      const actualVariableCosts = baseTotalRevenue * variableRate
      const actualTotalCosts = actualFixedCost + actualVariableCosts
      const actualProfit = baseTotalRevenue - actualTotalCosts
      const actualProfitMargin = actualProfit / baseTotalRevenue

      const selectedOption: PricingOptionV2 = {
        policyName: `${minPolicy.weight_band_name} (商品価格$${minPolicy.product_price_usd})`,
        productPrice: baseProductPrice,
        shipping: minShipping,
        total: baseTotalRevenue,
        profit: actualProfit,
        profitMargin: actualProfitMargin,
        baseShipping: minBaseShipping,
        tariffAmount: actualTariff,
        mpf: actualMPF,
        hmf: 0,
        ddpServiceFee: DDP_SERVICE_FEE,
        ddpTotal: actualDDP,
        productPriceRatio: baseProductPrice / baseTotalRevenue,
        isRecommended: true,
        reason: '最安送料（DDP費用不足のため最適化不可）'
      }

      const elapsedMs = Date.now() - startTime
      console.log(`⏱️ 計算時間: ${elapsedMs}ms`)

      return buildResultV2(
        selectedOption,
        minPolicy,
        costUSD,
        exchangeRate,
        finalFVF,
        variableRate,
        insertionFeeUSD,
        calculationSteps,
        tariffRate,
        effectiveDDPRate,
        hsCode,
        originCountry,
        hsData.description
      )
    }

    console.log(`  ✅ ${suitablePolicies.length}件の適合ポリシーが見つかりました`)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3: 商品価格比率80%に最も近いポリシーを選択
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n📋 STEP 3: 商品価格比率80%に最適化')
    
    let bestPolicy = suitablePolicies[0]
    let bestProductPrice = baseTotalRevenue - bestPolicy.total_shipping_usd
    bestProductPrice = Math.round(bestProductPrice / 5) * 5
    let bestDiff = Math.abs((bestProductPrice / baseTotalRevenue) - targetProductPriceRatio)

    for (const policy of suitablePolicies) {
      let productPrice = baseTotalRevenue - policy.total_shipping_usd
      productPrice = Math.round(productPrice / 5) * 5
      
      const productPriceRatio = productPrice / baseTotalRevenue
      const diff = Math.abs(productPriceRatio - targetProductPriceRatio)
      
      if (diff < bestDiff) {
        bestPolicy = policy
        bestProductPrice = productPrice
        bestDiff = diff
      }
    }

    const bestShipping = bestPolicy.total_shipping_usd
    const bestBaseShipping = bestPolicy.base_shipping_usd
    
    console.log(`  ✅ 選択: ${bestPolicy.weight_band_name} (商品価格$${bestPolicy.product_price_usd})`)
    console.log(`    - 送料: $${bestShipping.toFixed(2)}`)
    console.log(`    - 商品価格: $${bestProductPrice.toFixed(2)}`)
    console.log(`    - 商品価格比率: ${((bestProductPrice / baseTotalRevenue) * 100).toFixed(1)}%`)

    calculationSteps.push({
      step: 'STEP 2',
      value: bestPolicy.weight_band_name,
      description: `商品価格$${bestPolicy.product_price_usd}のポリシー（送料$${bestShipping.toFixed(2)}）`
    })

    calculationSteps.push({
      step: 'STEP 3',
      value: `${((bestProductPrice / baseTotalRevenue) * 100).toFixed(1)}%`,
      description: `商品価格比率を${((bestProductPrice / baseTotalRevenue) * 100).toFixed(1)}%に最適化（目標${(targetProductPriceRatio * 100).toFixed(0)}%）`
    })

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 4: 実際の関税とコストを計算
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n📋 STEP 4: 実際の関税とコストを計算')
    
    const finalTariff = bestProductPrice * tariffRate
    const finalMPF = bestProductPrice * 0.003464
    const finalHMF = 0
    const finalDDP = finalTariff + finalMPF + finalHMF + DDP_SERVICE_FEE
    
    console.log(`  📊 実際のDDP費用:`)
    console.log(`    - 関税: $${finalTariff.toFixed(2)}`)
    console.log(`    - MPF: $${finalMPF.toFixed(2)}`)
    console.log(`    - DDP合計: $${finalDDP.toFixed(2)}`)

    const finalFixedCost = costUSD + bestBaseShipping + finalDDP + insertionFeeUSD
    const finalVariableCosts = baseTotalRevenue * variableRate
    const finalTotalCosts = finalFixedCost + finalVariableCosts
    const finalProfit = baseTotalRevenue - finalTotalCosts
    const finalProfitMargin = finalProfit / baseTotalRevenue

    console.log(`  ✅ 利益率: ${(finalProfitMargin * 100).toFixed(2)}%`)

    const selectedOption: PricingOptionV2 = {
      policyName: `${bestPolicy.weight_band_name} (商品価格$${bestPolicy.product_price_usd})`,
      productPrice: bestProductPrice,
      shipping: bestShipping,
      total: baseTotalRevenue,
      profit: finalProfit,
      profitMargin: finalProfitMargin,
      baseShipping: bestBaseShipping,
      tariffAmount: finalTariff,
      mpf: finalMPF,
      hmf: finalHMF,
      ddpServiceFee: DDP_SERVICE_FEE,
      ddpTotal: finalDDP,
      productPriceRatio: bestProductPrice / baseTotalRevenue,
      isRecommended: true,
      reason: `商品価格比率${((bestProductPrice / baseTotalRevenue) * 100).toFixed(1)}%に最適化（利益率${(finalProfitMargin * 100).toFixed(2)}%）`
    }

    // 代替案
    const altTariff = baseProductPrice * tariffRate
    const altMPF = baseProductPrice * 0.003464
    const altDDP = altTariff + altMPF + DDP_SERVICE_FEE
    const altFixedCost = costUSD + minBaseShipping + altDDP + insertionFeeUSD
    const altVariableCosts = baseTotalRevenue * variableRate
    const altTotalCosts = altFixedCost + altVariableCosts
    const altProfit = baseTotalRevenue - altTotalCosts
    const altProfitMargin = altProfit / baseTotalRevenue

    const alternativeOption: PricingOptionV2 = {
      policyName: `${minPolicy.weight_band_name} (商品価格$${minPolicy.product_price_usd})`,
      productPrice: baseProductPrice,
      shipping: minShipping,
      total: baseTotalRevenue,
      profit: altProfit,
      profitMargin: altProfitMargin,
      baseShipping: minBaseShipping,
      tariffAmount: altTariff,
      mpf: altMPF,
      hmf: 0,
      ddpServiceFee: DDP_SERVICE_FEE,
      ddpTotal: altDDP,
      productPriceRatio: baseProductPrice / baseTotalRevenue,
      isRecommended: false,
      reason: '最安送料'
    }

    const elapsedMs = Date.now() - startTime
    console.log(`\n🎉 ============ 計算完了（${elapsedMs}ms） ============\n`)

    return buildResultV2(
      selectedOption,
      bestPolicy,
      costUSD,
      exchangeRate,
      finalFVF,
      variableRate,
      insertionFeeUSD,
      calculationSteps,
      tariffRate,
      effectiveDDPRate,
      hsCode,
      originCountry,
      hsData.description,
      alternativeOption
    )
  } catch (error: any) {
    console.error('❌ USA DDP価格計算中に予期せぬエラーが発生しました:', error)
    console.error('エラースタック:', error?.stack)
    
    return {
      success: false,
      error: `価格計算エラー: ${error?.message || '不明なエラー'}. 詳細はコンソールログを確認してください。`
    } as UsaPricingResultV2
  }
}

/**
 * 🆕 バッチ処理用の計算関数
 */
export async function calculateUsaPriceBatch(
  inputs: BatchCalculationInput[]
): Promise<BatchCalculationResult[]> {
  console.log(`🚀 バッチ計算開始: ${inputs.length}件`)
  
  const results: BatchCalculationResult[] = []
  
  for (const input of inputs) {
    try {
      const result = await calculateUsaPriceV2({
        costJPY: input.costJPY,
        weight_kg: input.weight_kg,
        hsCode: input.hsCode,
        originCountry: input.originCountry,
        storeType: input.storeType
      })
      
      results.push({
        id: input.id,
        success: result.success,
        result: result.success ? result : undefined,
        error: result.error
      })
    } catch (error: any) {
      results.push({
        id: input.id,
        success: false,
        error: error?.message || '不明なエラー'
      })
    }
  }
  
  console.log(`✅ バッチ計算完了: 成功${results.filter(r => r.success).length}件 / 失敗${results.filter(r => !r.success).length}件`)
  
  return results
}

/**
 * 🔧 HTSコードデータの取得（安全版）
 */
async function fetchHTSData(hsCode: string, hsCodeNormalized: string): Promise<any | null> {
  console.log('  🔎 HTSコード検索開始...')
  
  // パターン1: 正規化されたコードで検索
  const searchTerms = [hsCode, hsCodeNormalized]
  
  for (const term of searchTerms) {
    console.log(`    🔍 検索: "${term}"`)
    
    const { data, error } = await supabase
      .from('hts_codes_details')
      .select('hts_number, general_rate, description')
      .eq('hts_number', term)
      .limit(1)
      .maybeSingle()
    
    if (error) {
      console.warn(`    ⚠️ 検索エラー: ${error.message}`)
      continue
    }
    
    if (data) {
      const baseDuty = parseRate(data.general_rate)
      console.log(`  ✅ 検索成功: ${term} → 関税${(baseDuty * 100).toFixed(2)}%`)
      
      return {
        code: data.hts_number,
        base_duty: baseDuty.toString(),
        section301: false,
        section301_rate: '0.25',
        total_tariff_rate: baseDuty.toString(),
        description: data.description
      }
    }
  }
  
  // パターン2: 上位桁で検索（フォールバック）
  const fallbackCodes = [
    hsCodeNormalized.substring(0, 6),
    hsCodeNormalized.substring(0, 4),
    hsCodeNormalized.substring(0, 2)
  ]
  
  for (const fallbackCode of fallbackCodes) {
    console.log(`  🔄 上位桁で再検索: ${fallbackCode}`)
    
    const { data, error } = await supabase
      .from('hts_codes_details')
      .select('hts_number, general_rate, description')
      .ilike('hts_number', `${fallbackCode}%`)
      .limit(1)
      .maybeSingle()
    
    if (error) {
      console.warn(`    ⚠️ フォールバック検索エラー: ${error.message}`)
      continue
    }
    
    if (data) {
      const baseDuty = parseRate(data.general_rate)
      console.log(`  ⚠️ 上位桁 ${fallbackCode} で代替: 関税${(baseDuty * 100).toFixed(2)}%`)
      
      return {
        code: data.hts_number,
        base_duty: baseDuty.toString(),
        section301: false,
        section301_rate: '0.25',
        total_tariff_rate: baseDuty.toString(),
        description: data.description + ' (上位桁で代替)'
      }
    }
  }
  
  console.error('❌ すべての検索パターンで失敗')
  return null
}

/**
 * 関税率文字列をパース
 */
function parseRate(rate: string | null): number {
  if (!rate || rate === 'Free') return 0
  const match = rate.match(/([\d.]+)%?/)
  return match ? parseFloat(match[1]) / 100 : 0
}

function buildResultV2(
  selectedOption: PricingOptionV2,
  policy: any,
  costUSD: number,
  exchangeRate: number,
  finalFVF: number,
  variableRate: number,
  insertionFeeUSD: number,
  calculationSteps: any[],
  tariffRate: number,
  effectiveDDPRate: number,
  hsCode: string,
  originCountry: string,
  hsDescription: string,
  alternative?: PricingOptionV2
): UsaPricingResultV2 {
  const estimatedRevenue = costUSD * exchangeRate * 2.5
  const estimatedFVF = estimatedRevenue * finalFVF
  const insertionFeeJPY = insertionFeeUSD * exchangeRate
  const refundableFees = estimatedFVF + insertionFeeJPY
  const taxableAmount = (costUSD * exchangeRate) + refundableFees
  const refund = taxableAmount * (CONSUMPTION_TAX_RATE / (1 + CONSUMPTION_TAX_RATE))
  const refundUSD = refund / exchangeRate

  const profitUSD_WithRefund = selectedOption.profit + refundUSD
  const profitJPY_WithRefund = profitUSD_WithRefund * exchangeRate

  const formulas = [
    {
      step: 1,
      label: '関税率',
      formula: `${(tariffRate * 100).toFixed(2)}% (HTS: ${hsCode}, 原産国: ${originCountry})`
    },
    {
      step: 2,
      label: '関税額',
      formula: `$${selectedOption.tariffAmount.toFixed(2)} = 商品$${selectedOption.productPrice} × ${(tariffRate * 100).toFixed(2)}%`
    },
    {
      step: 3,
      label: 'DDP合計',
      formula: `$${selectedOption.ddpTotal.toFixed(2)} = 関税$${selectedOption.tariffAmount.toFixed(2)} + MPF$${selectedOption.mpf.toFixed(2)} + 手数料$${selectedOption.ddpServiceFee.toFixed(2)}`
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
    policy: {
      id: policy.id,
      name: `${policy.weight_band_name} (商品価格$${policy.product_price_usd})`,
      weight_range: `${policy.weight_min_kg}-${policy.weight_max_kg}kg`,
      base_rate_usd: policy.base_shipping_usd,
      shipping_total_usd: policy.total_shipping_usd
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
    tariffRate,
    tariffAmount: selectedOption.tariffAmount,
    mpf: selectedOption.mpf,
    hmf: selectedOption.hmf,
    ddpServiceFee: selectedOption.ddpServiceFee,
    ddpTotal: selectedOption.ddpTotal,
    totalFees: selectedOption.total * variableRate,
    calculationSteps,
    formulas,
    breakdown: {
      costUSD: costUSD.toFixed(2),
      actualShipping: policy.base_shipping_usd.toFixed(2),
      tariff: selectedOption.tariffAmount.toFixed(2),
      mpf: selectedOption.mpf.toFixed(2),
      hmf: selectedOption.hmf.toFixed(2),
      ddpServiceFee: selectedOption.ddpServiceFee.toFixed(2),
      ddpTotal: selectedOption.ddpTotal.toFixed(2),
      fvf: (selectedOption.total * finalFVF).toFixed(2),
      fvfRate: (finalFVF * 100).toFixed(2) + '%',
      payoneer: (selectedOption.total * 0.02).toFixed(2),
      exchangeLoss: (selectedOption.total * 0.03).toFixed(2),
      internationalFee: (selectedOption.total * 0.015).toFixed(2),
      totalCosts: (costUSD + policy.base_shipping_usd + selectedOption.ddpTotal + insertionFeeUSD + selectedOption.total * variableRate).toFixed(2),
      refund: refund.toFixed(2)
    }
  }
}
