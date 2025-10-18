/**
 * 簡易版USA DDP価格計算（DBの送料を直接使用）
 * 
 * 配送ポリシーAPIを使わず、usa_ddp_ratesテーブルから直接取得
 * DBにデータがない場合は簡易計算式でフォールバック
 */

import { createClient } from '@/lib/supabase/client'
import { getShippingFromDB } from './shipping-from-db'
import { getShippingLimit, inferCategoryFromHTS, adjustPriceForShippingLimit } from './shipping-limit-checker'
import { calculatePriceWithHighTariff } from './high-tariff-calculator'

const CONSUMPTION_TAX_RATE = 0.1
const DDP_SERVICE_FEE = 15

export interface SimplePricingInput {
  costJPY: number
  weight_kg: number
  targetMargin: number
  hsCode: string
  originCountry: string
  fvfRate: number
  exchangeRate: number
  ebayCategory?: string // 🆕 追加
}

export interface SimplePricingResult {
  success: boolean
  error?: string
  productPrice: number
  shipping: number
  totalRevenue: number
  profitUSD: number
  profitMargin: number
  hasShippingLimit?: boolean
  shippingLimitAdjusted?: boolean
  originalShipping?: number
  isViable?: boolean  // 🆕 USA向けDDPが利益率的に可能か
  minAchievableMargin?: number  // 🆕 達成可能な最低利益率(%)
  viabilityReason?: string  // 🆕 理由
  breakdown: {
    costUSD: number
    baseShipping: number
    ddpCosts: number
    tariffRate: number
    fvf: number
    totalCosts: number
  }
}

/**
 * 簡易計算
 */
export async function calculateSimpleUsaPrice(
  input: SimplePricingInput
): Promise<SimplePricingResult> {
  try {
    const { costJPY, weight_kg, targetMargin, hsCode, originCountry, fvfRate, exchangeRate, ebayCategory } = input

    // 🆕 STEP 0: 送料上限をチェック
    let shippingLimit = null
    
    if (ebayCategory) {
      shippingLimit = await getShippingLimit(ebayCategory)
    } else {
      // HTSコードからカテゴリーを推測
      const inferredCategory = inferCategoryFromHTS(hsCode)
      if (inferredCategory) {
        shippingLimit = await getShippingLimit(inferredCategory)
      }
    }

    // STEP 1: 関税率を取得
    const supabase = createClient()
    
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

    const additionalTariffRate = additionalData?.additional_rate || 0
    const totalTariffRate = baseTariffRate + additionalTariffRate
    const effectiveDDPRate = totalTariffRate + 0.08 // 販売税8%
    
    console.log(`📊 ${originCountry}関税:`, {
      base: `${(baseTariffRate * 100).toFixed(2)}%`,
      additional: `${(additionalTariffRate * 100).toFixed(0)}%`,
      total: `${(totalTariffRate * 100).toFixed(2)}%`,
      effectiveDDP: `${(effectiveDDPRate * 100).toFixed(2)}%`
    })

    // STEP 2: コスト計算
    const costUSD = costJPY / exchangeRate

    // STEP 3: 仮の商品価格を推定（コストの2倍から開始）
    let estimatedProductPrice = costUSD * 2

    // STEP 4: DBから送料を取得（フォールバックあり）
    let baseShipping: number
    let totalShipping: number

    const shippingRate = await getShippingFromDB(weight_kg, estimatedProductPrice)

    if (!shippingRate) {
      // 🔧 フォールバック: 簡易的な送料計算
      console.warn(`⚠️ 重量${weight_kg}kg: DBに送料データがありません。簡易計算を使用します。`)
      baseShipping = 20 + (weight_kg * 10) // 基本送料 + 重量別料金
      const ddpFee = estimatedProductPrice * 0.15 // DDP費用（15%）
      totalShipping = baseShipping + ddpFee
    } else {
      // DBから取得した送料を使用
      baseShipping = shippingRate.base_shipping
      totalShipping = shippingRate.total_shipping
    }

    // STEP 5: 商品価格を計算
    const targetMarginDecimal = targetMargin / 100
    const variableRate = fvfRate + 0.02 + 0.03 + 0.015 // FVF + Payoneer + 交換損失 + 国際手数料
    const insertionFee = 0.35

    let productPrice: number

    // 💈 高関税商品（DDP > 50%）は直接計算
    if (effectiveDDPRate > 0.5) {
      console.log(`🚨 高関税商品 (${(effectiveDDPRate * 100).toFixed(1)}%): 直接計算を使用`)
      
      try {
        productPrice = calculatePriceWithHighTariff({
          costUSD,
          baseShipping,
          totalShipping,
          targetMarginDecimal,
          ddpRate: effectiveDDPRate,
          variableRate,
          insertionFee
        })
      } catch (error) {
        // 🆕 エラー情報を詳細に返す
        const maxMargin = (error as any).maxAchievableMargin || 0
        const ddpRate = (error as any).ddpRate || 0
        const variableRate = (error as any).variableRate || 0
        
        return {
          success: false,
          error: error instanceof Error ? error.message : '計算エラー',
          productPrice: 0,
          shipping: 0,
          totalRevenue: 0,
          profitUSD: 0,
          profitMargin: 0,
          isViable: false,
          minAchievableMargin: maxMargin * 100,  // %に変換
          viabilityReason: `DDP費用${(ddpRate*100).toFixed(1)}%と変動費${(variableRate*100).toFixed(1)}%の合計が高すぎます。`,
          breakdown: {
            costUSD: 0,
            baseShipping: 0,
            ddpCosts: 0,
            tariffRate: 0,
            fvf: 0,
            totalCosts: 0
          }
        }
      }
    } else {
      // 通常商品: 反復計算
      productPrice = estimatedProductPrice

      for (let i = 0; i < 5; i++) {
        // DDP費用
        const tariff = productPrice * effectiveDDPRate
        const mpf = productPrice * 0.003464
        const ddpCosts = tariff + mpf + DDP_SERVICE_FEE

        // 固定コスト
        const fixedCost = costUSD + baseShipping + ddpCosts + insertionFee

        // 必要な総売上
        const requiredRevenue = fixedCost / (1 - targetMarginDecimal - variableRate)

        // 新しい商品価格
        const newProductPrice = requiredRevenue - totalShipping

        // 収束判定
        if (Math.abs(newProductPrice - productPrice) < 0.5) {
          productPrice = newProductPrice
          break
        }

        productPrice = newProductPrice
      }
    }

    // 5ドル単位に丸める
    productPrice = Math.round(productPrice / 5) * 5

    // 🆕 STEP 6.5: 送料上限の調整
    let finalProductPrice = productPrice
    let finalShipping = totalShipping
    let hasShippingLimit = false
    let shippingLimitAdjusted = false
    let originalShipping = totalShipping

    if (shippingLimit && totalShipping > shippingLimit.max_shipping_usd) {
      console.log(`⚠️ 送料${totalShipping.toFixed(2)}が上限${shippingLimit.max_shipping_usd}を超えています。調整します。`)
      
      hasShippingLimit = true
      shippingLimitAdjusted = true
      originalShipping = totalShipping
      
      const adjusted = adjustPriceForShippingLimit(
        productPrice,
        totalShipping,
        shippingLimit
      )
      
      finalProductPrice = adjusted.adjustedProductPrice
      finalShipping = adjusted.adjustedShipping
      
      console.log(`✅ 調整後: 商品価格${finalProductPrice.toFixed(2)} / 送料${finalShipping.toFixed(2)}`)
    }

    // STEP 7: 最終計算
    const totalRevenue = productPrice + totalShipping
    const tariff = productPrice * effectiveDDPRate
    const mpf = productPrice * 0.003464
    const ddpCosts = tariff + mpf + DDP_SERVICE_FEE

    const fvf = totalRevenue * fvfRate
    const payoneer = totalRevenue * 0.02
    const exchangeLoss = totalRevenue * 0.03
    const internationalFee = totalRevenue * 0.015

    const totalCosts = costUSD + baseShipping + ddpCosts + fvf + payoneer + exchangeLoss + internationalFee + insertionFee
    const profitUSD = totalRevenue - totalCosts
    const profitMargin = (profitUSD / totalRevenue) * 100

    // 🆕 赤字チェック
    if (profitUSD < 0) {
      console.error(`❌ 赤字: 利益${profitUSD.toFixed(2)} (${profitMargin.toFixed(1)}%)`)
      return {
        success: false,
        error: `赤字のため出品不可。利益: ${profitUSD.toFixed(2)} (${profitMargin.toFixed(1)}%)`,
        productPrice: finalProductPrice,
        shipping: finalShipping,
        totalRevenue: finalProductPrice + finalShipping,
        profitUSD,
        profitMargin,
        hasShippingLimit: hasShippingLimit && shippingLimit !== null,
        shippingLimitAdjusted,
        originalShipping: shippingLimitAdjusted ? originalShipping : undefined,
        isViable: false,
        minAchievableMargin: profitMargin,
        viabilityReason: `利益が${profitUSD.toFixed(2)} (${profitMargin.toFixed(1)}%)の赤字です`,
        breakdown: {
          costUSD,
          baseShipping,
          ddpCosts,
          tariffRate: effectiveDDPRate,
          fvf,
          totalCosts
        }
      }
    }

    // 🆕 目標利益率未達チェック（警告のみ）
    const warnings: string[] = []
    if (profitMargin < targetMargin - 5) {
      warnings.push(`目標利益率${targetMargin}%に対し、実際は${profitMargin.toFixed(1)}%`)
    }

    return {
      success: true,
      productPrice: finalProductPrice,
      shipping: finalShipping,
      totalRevenue: finalProductPrice + finalShipping,
      profitUSD,
      profitMargin,
      hasShippingLimit: hasShippingLimit && shippingLimit !== null,
      shippingLimitAdjusted,
      originalShipping: shippingLimitAdjusted ? originalShipping : undefined,
      isViable: true,
      breakdown: {
        costUSD,
        baseShipping,
        ddpCosts,
        tariffRate: effectiveDDPRate,
        fvf,
        totalCosts
      }
    }
  } catch (error) {
    console.error('❌ 計算エラー:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
      productPrice: 0,
      shipping: 0,
      totalRevenue: 0,
      profitUSD: 0,
      profitMargin: 0,
      breakdown: {
        costUSD: 0,
        baseShipping: 0,
        ddpCosts: 0,
        tariffRate: 0,
        fvf: 0,
        totalCosts: 0
      }
    }
  }
}
