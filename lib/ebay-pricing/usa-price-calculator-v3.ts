/**
 * eBay USA DDP価格計算エンジン V3（利益率固定版）
 * 
 * 🎯 重要な変更:
 * **目標利益率を入力し、それを達成する商品価格と送料を逆算**
 * 
 * 計算方法:
 * 1. 固定コスト（仕入れ値、実送料、出品手数料）を計算
 * 2. 変動コスト率（FVF、Payoneer、為替損失、国際手数料）を計算
 * 3. 目標利益率から必要な総売上を逆算
 * 4. 商品価格 = 総売上 - 送料
 * 5. DDP費用を商品価格から再計算
 * 6. 反復計算で精度を高める
 */

import { supabase } from '@/lib/supabase/client'

const CONSUMPTION_TAX_RATE = 0.1
const DDP_SERVICE_FEE = 15
const TARGET_PRODUCT_PRICE_RATIO = 0.80

export const STORE_FEES = {
  none: { name: 'ストアなし', fvf_discount: 0 },
  basic: { name: 'Basic', fvf_discount: 0.04 },
  premium: { name: 'Premium', fvf_discount: 0.06 },
  anchor: { name: 'Anchor', fvf_discount: 0.08 },
}

export interface UsaPricingInputV3 {
  costJPY: number
  weight_kg: number
  targetMargin: number // 目標利益率（%）
  hsCode: string
  originCountry: string
  storeType: keyof typeof STORE_FEES
  fvfRate: number
  exchangeRate: number
}

export interface DetailedBreakdown {
  costJPY: number
  costUSD: number
  exchangeRate: number
  weight_kg: number
  targetMargin: number
  
  hsCode: string
  originCountry: string
  baseTariffRate: number
  additionalTariffRate: number
  totalTariffRate: number
  salesTaxRate: number
  effectiveDDPRate: number
  
  minPolicyName: string
  minBaseShipping: number
  minDDPFee: number
  minTotalShipping: number
  
  tempProductPrice: number
  requiredTariff: number
  requiredMPF: number
  requiredDDP: number
  requiredTotalShipping: number
  
  storeType: string
  baseFVF: number
  storeDiscount: number
  finalFVF: number
  
  ebayFees: {
    fvf: number
    payoneer: number
    exchangeLoss: number
    internationalFee: number
    insertionFee: number
    total: number
  }
  
  ddpCosts: {
    tariff: number
    mpf: number
    hmf: number
    serviceFee: number
    total: number
  }
  
  selectedPolicyName: string
  selectedBaseShipping: number
  selectedTotalShipping: number
  
  finalProductPrice: number
  finalShipping: number
  finalTotal: number
  productPriceRatio: number
  
  totalCosts: number
  profit: number
  profitMargin: number
  
  refundJPY: number
  refundUSD: number
  profitWithRefund: number
  profitMarginWithRefund: number
}

export interface UsaPricingResultV3 {
  success: boolean
  error?: string
  breakdown: DetailedBreakdown
  calculationSteps: Array<{
    step: number
    title: string
    description: string
    values: Array<{ label: string; value: string; formula?: string }>
  }>
}

/**
 * 目標利益率から商品価格を逆算する反復計算
 */
function calculatePriceForTargetMargin(
  costUSD: number,
  baseShipping: number,
  effectiveDDPRate: number,
  finalFVF: number,
  targetMarginDecimal: number,
  shippingTotal: number,
  insertionFee: number
): { productPrice: number; totalRevenue: number; ddpCost: number } {
  const variableRate = finalFVF + 0.02 + 0.02 + 0.03 + 0.015 // FVF + Payoneer + 交換損失 + 国際手数料
  
  // 反復計算で最適な商品価格を求める
  let productPrice = 100 // 初期値
  
  for (let i = 0; i < 10; i++) {
    // DDP費用を計算
    const tariff = productPrice * effectiveDDPRate
    const mpf = productPrice * 0.003464
    const ddpCost = tariff + mpf + DDP_SERVICE_FEE
    
    // 固定コスト
    const fixedCost = costUSD + baseShipping + ddpCost + insertionFee
    
    // 目標利益率から必要な総売上を逆算
    // 利益率 = (総売上 - 固定コスト - 変動コスト) / 総売上
    // 利益率 = (総売上 - 固定コスト - 総売上×変動率) / 総売上
    // 利益率 = 1 - 固定コスト/総売上 - 変動率
    // 固定コスト/総売上 = 1 - 利益率 - 変動率
    // 総売上 = 固定コスト / (1 - 利益率 - 変動率)
    const requiredRevenue = fixedCost / (1 - targetMarginDecimal - variableRate)
    
    // 新しい商品価格
    const newProductPrice = requiredRevenue - shippingTotal
    
    // 収束判定
    if (Math.abs(newProductPrice - productPrice) < 0.01) {
      productPrice = newProductPrice
      break
    }
    
    productPrice = newProductPrice
  }
  
  // 5ドル単位に丸める
  productPrice = Math.round(productPrice / 5) * 5
  
  const totalRevenue = productPrice + shippingTotal
  const tariff = productPrice * effectiveDDPRate
  const mpf = productPrice * 0.003464
  const ddpCost = tariff + mpf + DDP_SERVICE_FEE
  
  return { productPrice, totalRevenue, ddpCost }
}

export async function calculateUsaPriceV3(
  input: UsaPricingInputV3
): Promise<UsaPricingResultV3> {
  try {
    const {
      costJPY,
      weight_kg,
      targetMargin,
      hsCode,
      originCountry,
      storeType,
      fvfRate,
      exchangeRate
    } = input

    console.log('🚀 ============ USA DDP価格計算 V3（利益率固定版） ============')
    console.log(`📦 入力: 仕入${costJPY}円, 重量${weight_kg}kg, 目標利益率${targetMargin}%`)

    const calculationSteps: UsaPricingResultV3['calculationSteps'] = []
    const costUSD = costJPY / exchangeRate
    const targetMarginDecimal = targetMargin / 100

    calculationSteps.push({
      step: 1,
      title: '基本情報の確認',
      description: '仕入れ値を米ドルに換算し、目標利益率を設定します',
      values: [
        { label: '仕入れ値（円）', value: `¥${costJPY.toLocaleString()}` },
        { label: '為替レート', value: `¥${exchangeRate}/USD` },
        { label: '仕入れ値（USD）', value: `$${costUSD.toFixed(2)}`, formula: `¥${costJPY} ÷ ${exchangeRate} = $${costUSD.toFixed(2)}` },
        { label: '重量', value: `${weight_kg}kg` },
        { label: '🎯 目標利益率（固定）', value: `${targetMargin}%`, formula: 'この利益率を達成する価格を逆算します' }
      ]
    })

    // STEP 2: 関税率の取得
    const hsCodeNormalized = hsCode.replace(/\./g, '')
    const searchTerms = [hsCode, hsCodeNormalized]
    let hsData: any = null
    
    for (const term of searchTerms) {
      const { data } = await supabase
        .from('hts_codes_details')
        .select('hts_number, general_rate, description')
        .eq('hts_number', term)
        .limit(1)
        .maybeSingle()
      
      if (data) {
        const parseRate = (rate: string | null): number => {
          if (!rate || rate === 'Free') return 0
          const match = rate.match(/([\d.]+)%?/)
          return match ? parseFloat(match[1]) / 100 : 0
        }
        
        hsData = {
          code: data.hts_number,
          base_duty: parseRate(data.general_rate),
          description: data.description
        }
        break
      }
    }

    if (!hsData) {
      return { success: false, error: `HTSコード ${hsCode} が見つかりません` } as UsaPricingResultV3
    }

    const { data: countryTariff } = await supabase
      .from('country_additional_tariffs')
      .select('country_code, additional_rate, tariff_type')
      .eq('country_code', originCountry)
      .eq('is_active', true)
      .single()

    const baseTariffRate = hsData.base_duty
    const additionalTariffRate = countryTariff ? parseFloat(countryTariff.additional_rate as string) : 0
    const totalTariffRate = baseTariffRate + additionalTariffRate
    const salesTaxRate = 0.08
    const effectiveDDPRate = totalTariffRate + salesTaxRate

    calculationSteps.push({
      step: 2,
      title: '関税率の計算',
      description: `HTSコード${hsCode}と原産国${originCountry}から関税率を算出`,
      values: [
        { label: 'HTSコード', value: hsCode },
        { label: '原産国', value: originCountry },
        { label: '基本関税率', value: `${(baseTariffRate * 100).toFixed(2)}%` },
        ...(additionalTariffRate > 0 ? [
          { label: '追加関税率', value: `${(additionalTariffRate * 100).toFixed(2)}%` },
          { label: '合計関税率', value: `${(totalTariffRate * 100).toFixed(2)}%` }
        ] : []),
        { label: '販売税率', value: `${(salesTaxRate * 100).toFixed(2)}%` },
        { label: '実効DDP率', value: `${(effectiveDDPRate * 100).toFixed(2)}%`, formula: `関税${(totalTariffRate * 100).toFixed(2)}% + 販売税${(salesTaxRate * 100).toFixed(2)}%` }
      ]
    })

    // STEP 3: 最安送料ポリシー取得
    const estimatedProductPrice = costUSD * 2.0
    
    const { data: minPolicy, error: minError } = await supabase
      .from('usa_ddp_rates')
      .select('*')
      .lte('weight_min_kg', weight_kg)
      .gt('weight_max_kg', weight_kg)
      .lte('product_price_usd', estimatedProductPrice)
      .order('total_shipping_usd', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (minError || !minPolicy) {
      return { success: false, error: `重量${weight_kg}kgの配送ポリシーが見つかりません` } as UsaPricingResultV3
    }

    calculationSteps.push({
      step: 3,
      title: '最安送料ポリシーの選択',
      description: '重量帯に対応する最も安い配送ポリシーを取得',
      values: [
        { label: 'ポリシー名', value: minPolicy.weight_band_name },
        { label: '実送料', value: `$${minPolicy.base_shipping_usd.toFixed(2)}` },
        { label: 'DDP上乗せ', value: `$${(minPolicy.total_shipping_usd - minPolicy.base_shipping_usd).toFixed(2)}` },
        { label: '送料合計', value: `$${minPolicy.total_shipping_usd.toFixed(2)}` }
      ]
    })

    // STEP 4: ストア割引適用
    const storeFee = STORE_FEES[storeType]
    const finalFVF = Math.max(0, fvfRate - storeFee.fvf_discount)

    calculationSteps.push({
      step: 4,
      title: 'ストア割引の適用',
      description: 'eBayストアプランによるFVF割引を計算',
      values: [
        { label: 'ストアタイプ', value: storeFee.name },
        { label: '基本FVF率', value: `${(fvfRate * 100).toFixed(2)}%` },
        { label: 'ストア割引', value: `-${(storeFee.fvf_discount * 100).toFixed(2)}%` },
        { label: '最終FVF率', value: `${(finalFVF * 100).toFixed(2)}%`, formula: `${(fvfRate * 100).toFixed(2)}% - ${(storeFee.fvf_discount * 100).toFixed(2)}% = ${(finalFVF * 100).toFixed(2)}%` }
      ]
    })

    // STEP 5: 目標利益率から商品価格を逆算
    const insertionFeeUSD = 0.35
    
    const { productPrice: initialPrice, totalRevenue: initialRevenue, ddpCost: initialDDP } = 
      calculatePriceForTargetMargin(
        costUSD,
        minPolicy.base_shipping_usd,
        effectiveDDPRate,
        finalFVF,
        targetMarginDecimal,
        minPolicy.total_shipping_usd,
        insertionFeeUSD
      )

    calculationSteps.push({
      step: 5,
      title: '🎯 目標利益率から商品価格を逆算',
      description: `目標利益率${targetMargin}%を達成するための商品価格を反復計算で求めます`,
      values: [
        { label: '計算方法', value: '反復計算（10回）', formula: '総売上 = 固定コスト / (1 - 目標利益率 - 変動コスト率)' },
        { label: '変動コスト率', value: `${((finalFVF + 0.02 + 0.02 + 0.03 + 0.015) * 100).toFixed(2)}%`, formula: 'FVF + Payoneer(2%) + 為替損失(3%) + 国際手数料(1.5%)' },
        { label: '算出された商品価格', value: `$${initialPrice.toFixed(2)}` },
        { label: '送料', value: `$${minPolicy.total_shipping_usd.toFixed(2)}` },
        { label: '総売上', value: `$${initialRevenue.toFixed(2)}` }
      ]
    })

    // STEP 6: 最適な配送ポリシー選択（1〜2段階上）
    const { data: allPolicies } = await supabase
      .from('usa_ddp_rates')
      .select('*')
      .lte('weight_min_kg', weight_kg)
      .gt('weight_max_kg', weight_kg)
      .gte('product_price_usd', initialPrice)
      .order('total_shipping_usd', { ascending: true })
      .limit(10)

    let selectedPolicy = minPolicy
    if (allPolicies && allPolicies.length > 1) {
      const targetIndex = Math.min(1, allPolicies.length - 1)
      selectedPolicy = allPolicies[targetIndex]
    }

    calculationSteps.push({
      step: 6,
      title: '最適な配送ポリシーの選択',
      description: '実送料+DDP費用より1〜2段階上のポリシーを選択',
      values: [
        { label: '選択ポリシー', value: selectedPolicy.weight_band_name },
        { label: '商品価格帯', value: `$${selectedPolicy.product_price_usd}以下` },
        { label: '実送料', value: `$${selectedPolicy.base_shipping_usd.toFixed(2)}` },
        { label: '送料合計', value: `$${selectedPolicy.total_shipping_usd.toFixed(2)}` }
      ]
    })

    // STEP 7: 選択したポリシーで価格を再計算
    const { productPrice: finalProductPrice, totalRevenue: finalTotalRevenue, ddpCost: finalDDPCost } = 
      calculatePriceForTargetMargin(
        costUSD,
        selectedPolicy.base_shipping_usd,
        effectiveDDPRate,
        finalFVF,
        targetMarginDecimal,
        selectedPolicy.total_shipping_usd,
        insertionFeeUSD
      )

    const productPriceRatio = finalProductPrice / finalTotalRevenue

    calculationSteps.push({
      step: 7,
      title: '最終価格の決定',
      description: '選択した配送ポリシーで商品価格を最終決定',
      values: [
        { label: '商品価格', value: `$${finalProductPrice.toFixed(2)}` },
        { label: '送料', value: `$${selectedPolicy.total_shipping_usd.toFixed(2)}` },
        { label: '総売上', value: `$${finalTotalRevenue.toFixed(2)}` },
        { label: '商品価格比率', value: `${(productPriceRatio * 100).toFixed(1)}%` }
      ]
    })

    // STEP 8: DDP関連コスト
    const finalTariff = finalProductPrice * totalTariffRate
    const finalSalesTax = finalProductPrice * salesTaxRate
    const finalMPF = finalProductPrice * 0.003464
    const finalDDP = finalTariff + finalSalesTax + finalMPF + DDP_SERVICE_FEE

    calculationSteps.push({
      step: 8,
      title: 'DDP関連コストの計算',
      description: '最終商品価格に基づいてDDP費用を計算',
      values: [
        { label: '関税', value: `$${finalTariff.toFixed(2)}`, formula: `$${finalProductPrice.toFixed(2)} × ${(totalTariffRate * 100).toFixed(2)}%` },
        { label: '販売税', value: `$${finalSalesTax.toFixed(2)}`, formula: `$${finalProductPrice.toFixed(2)} × ${(salesTaxRate * 100).toFixed(2)}%` },
        { label: 'MPF', value: `$${finalMPF.toFixed(2)}`, formula: `$${finalProductPrice.toFixed(2)} × 0.3464%` },
        { label: '通関手数料', value: `$${DDP_SERVICE_FEE.toFixed(2)}` },
        { label: 'DDP合計', value: `$${finalDDP.toFixed(2)}` }
      ]
    })

    // STEP 9: eBay手数料
    const fvfFee = finalTotalRevenue * finalFVF
    const payoneerFee = finalTotalRevenue * 0.02
    const exchangeLossFee = finalTotalRevenue * 0.03
    const internationalFee = finalTotalRevenue * 0.015
    const ebayFeesTotal = fvfFee + payoneerFee + exchangeLossFee + internationalFee + insertionFeeUSD

    calculationSteps.push({
      step: 9,
      title: 'eBay手数料の計算',
      description: '総売上に対するeBay関連の各種手数料を計算',
      values: [
        { label: 'FVF', value: `$${fvfFee.toFixed(2)}`, formula: `$${finalTotalRevenue.toFixed(2)} × ${(finalFVF * 100).toFixed(2)}%` },
        { label: 'Payoneer', value: `$${payoneerFee.toFixed(2)}`, formula: `$${finalTotalRevenue.toFixed(2)} × 2%` },
        { label: '為替損失', value: `$${exchangeLossFee.toFixed(2)}`, formula: `$${finalTotalRevenue.toFixed(2)} × 3%` },
        { label: '国際手数料', value: `$${internationalFee.toFixed(2)}`, formula: `$${finalTotalRevenue.toFixed(2)} × 1.5%` },
        { label: '出品手数料', value: `$${insertionFeeUSD.toFixed(2)}` },
        { label: 'eBay手数料合計', value: `$${ebayFeesTotal.toFixed(2)}` }
      ]
    })

    // STEP 10: 利益計算
    const totalCosts = costUSD + selectedPolicy.base_shipping_usd + finalDDP + ebayFeesTotal
    const profit = finalTotalRevenue - totalCosts
    const profitMargin = (profit / finalTotalRevenue) * 100

    // 消費税還付
    const estimatedRevenue = costUSD * exchangeRate * 2.5
    const estimatedFVF = estimatedRevenue * finalFVF
    const insertionFeeJPY = insertionFeeUSD * exchangeRate
    const refundableFees = estimatedFVF + insertionFeeJPY
    const taxableAmount = (costUSD * exchangeRate) + refundableFees
    const refundJPY = taxableAmount * (CONSUMPTION_TAX_RATE / (1 + CONSUMPTION_TAX_RATE))
    const refundUSD = refundJPY / exchangeRate
    const profitWithRefund = profit + refundUSD
    const profitMarginWithRefund = (profitWithRefund / finalTotalRevenue) * 100

    calculationSteps.push({
      step: 10,
      title: '✅ 最終利益の確認',
      description: `目標利益率${targetMargin}%が達成されているか確認します`,
      values: [
        { label: '総売上', value: `$${finalTotalRevenue.toFixed(2)}` },
        { label: '総コスト', value: `$${totalCosts.toFixed(2)}`, formula: `仕入$${costUSD.toFixed(2)} + 送料$${selectedPolicy.base_shipping_usd.toFixed(2)} + DDP$${finalDDP.toFixed(2)} + eBay手数料$${ebayFeesTotal.toFixed(2)}` },
        { label: '利益（還付前）', value: `$${profit.toFixed(2)}` },
        { label: '🎯 利益率（還付前）', value: `${profitMargin.toFixed(2)}%`, formula: `目標: ${targetMargin}% → 達成: ${profitMargin.toFixed(2)}%` },
        { label: '消費税還付', value: `$${refundUSD.toFixed(2)} (¥${refundJPY.toFixed(0)})` },
        { label: '利益（還付後）', value: `$${profitWithRefund.toFixed(2)}` },
        { label: '利益率（還付後）', value: `${profitMarginWithRefund.toFixed(2)}%` }
      ]
    })

    const breakdown: DetailedBreakdown = {
      costJPY,
      costUSD,
      exchangeRate,
      weight_kg,
      targetMargin,
      hsCode,
      originCountry,
      baseTariffRate,
      additionalTariffRate,
      totalTariffRate,
      salesTaxRate,
      effectiveDDPRate,
      minPolicyName: minPolicy.weight_band_name,
      minBaseShipping: minPolicy.base_shipping_usd,
      minDDPFee: minPolicy.total_shipping_usd - minPolicy.base_shipping_usd,
      minTotalShipping: minPolicy.total_shipping_usd,
      tempProductPrice: initialPrice,
      requiredTariff: initialPrice * totalTariffRate,
      requiredMPF: initialPrice * 0.003464,
      requiredDDP: initialDDP,
      requiredTotalShipping: minPolicy.base_shipping_usd + initialDDP,
      storeType: storeFee.name,
      baseFVF: fvfRate,
      storeDiscount: storeFee.fvf_discount,
      finalFVF,
      ebayFees: {
        fvf: fvfFee,
        payoneer: payoneerFee,
        exchangeLoss: exchangeLossFee,
        internationalFee,
        insertionFee: insertionFeeUSD,
        total: ebayFeesTotal
      },
      ddpCosts: {
        tariff: finalTariff,
        mpf: finalMPF,
        hmf: 0,
        serviceFee: DDP_SERVICE_FEE,
        total: finalDDP
      },
      selectedPolicyName: selectedPolicy.weight_band_name,
      selectedBaseShipping: selectedPolicy.base_shipping_usd,
      selectedTotalShipping: selectedPolicy.total_shipping_usd,
      finalProductPrice,
      finalShipping: selectedPolicy.total_shipping_usd,
      finalTotal: finalTotalRevenue,
      productPriceRatio,
      totalCosts,
      profit,
      profitMargin,
      refundJPY,
      refundUSD,
      profitWithRefund,
      profitMarginWithRefund
    }

    // 🆕 赤字チェック
    if (profit < 0) {
      console.warn(`⚠️ 赤字: 利益${profit.toFixed(2)} (${profitMargin.toFixed(1)}%)`)
      
      // 赤字でも全ての計算結果を返す（UIで表示するため）
      return {
        success: false,  // ← falseだが、データは全て含む
        error: `赤字のため出品不可。利益: ${profit.toFixed(2)} (${profitMargin.toFixed(1)}%)`,
        profitUSD: profit,
        profitMargin,
        totalRevenue: finalTotalRevenue,
        breakdown,
        calculationSteps
      } as UsaPricingResultV3
    }

    return {
      success: true,
      breakdown,
      calculationSteps
    }
  } catch (error: any) {
    console.error('❌ 計算エラー:', error)
    return {
      success: false,
      error: `計算エラー: ${error?.message || '不明なエラー'}`
    } as UsaPricingResultV3
  }
}
