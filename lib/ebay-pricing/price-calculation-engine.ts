// lib/ebay-pricing/price-calculation-engine.ts
/**
 * eBay価格計算エンジン（統合版）
 * 
 * DDP精密計算を統合した完全版価格計算エンジン
 */

import {
  calculateDDPPrecise,
  calculateMPF,
  calculateHMF,
  estimateShippingMethod,
  compareDDPvsDDU,
  type DDPCalculationParams,
} from './ddp-calculator'

// 消費税率
const CONSUMPTION_TAX_RATE = 0.1

// ストアタイプ
export const STORE_FEES = {
  none: { name: 'ストアなし', fvf_discount: 0 },
  basic: { name: 'Basic', fvf_discount: 0.04 },
  premium: { name: 'Premium', fvf_discount: 0.06 },
  anchor: { name: 'Anchor', fvf_discount: 0.08 },
}

export interface CalculationParams {
  costJPY: number
  actualWeight: number
  length: number
  width: number
  height: number
  destCountry: string
  originCountry?: string
  hsCode: string
  storeType?: keyof typeof STORE_FEES
  refundableFeesJPY?: number
}

export interface Policy {
  id: number
  policy_name: string
  weight_min: number
  weight_max: number
  price_min: number
  price_max: number
  zones: Zone[]
}

export interface Zone {
  country_code: string
  display_shipping: number
  actual_cost: number
  handling_ddp: number | null
  handling_ddu: number
}

export interface MarginSetting {
  default_margin: number
  min_margin: number
  min_amount: number
  max_margin: number
}

export interface CategoryFee {
  fvf: number
  cap: number | null
  insertion_fee: number
}

export interface ExchangeRate {
  spot: number
  buffer: number
  safe: number
}

export interface HSCodesDB {
  [code: string]: {
    code: string
    description: string
    base_duty: number
    section301: boolean
    section301_rate: number
  }
}

export const PriceCalculationEngine = {
  /**
   * 容積重量計算
   */
  calculateVolumetricWeight(length: number, width: number, height: number): number {
    return (length * width * height) / 5000
  },

  /**
   * 適用重量計算（実重量 vs 容積重量）
   */
  getEffectiveWeight(
    actualWeight: number,
    length: number,
    width: number,
    height: number
  ): number {
    const volumetric = this.calculateVolumetricWeight(length, width, height)
    return Math.max(actualWeight, volumetric)
  },

  /**
   * 関税率取得（Section 301考慮）
   */
  getTariffRate(hsCode: string, originCountry: string, hsCodesDB: HSCodesDB) {
    const hsData = hsCodesDB[hsCode]
    if (!hsData)
      return { rate: 0.06, description: 'HSコード未登録', section301: false }

    let totalRate = hsData.base_duty
    if (originCountry === 'CN' && hsData.section301) {
      totalRate += hsData.section301_rate || 0.25
    }

    return {
      rate: totalRate,
      description: hsData.description,
      section301: hsData.section301,
    }
  },

  /**
   * 消費税還付計算（eBay手数料の一部を含む）
   */
  calculateConsumptionTaxRefund(costJPY: number, refundableFeesJPY: number) {
    // 還付対象: 仕入原価 + FVF + 出品料
    // Payoneer、広告、為替は還付対象外
    const taxableAmount = costJPY + refundableFeesJPY
    const refund = taxableAmount * (CONSUMPTION_TAX_RATE / (1 + CONSUMPTION_TAX_RATE))
    return {
      taxableAmount,
      refund,
      effectiveCost: costJPY - refund,
    }
  },

  /**
   * メイン価格計算（DDP精密計算統合版）
   */
  calculate(
    params: CalculationParams,
    policy: Policy,
    marginSetting: MarginSetting,
    categoryFee: CategoryFee,
    exchangeRate: ExchangeRate,
    hsCodesDB: HSCodesDB
  ) {
    const {
      costJPY,
      actualWeight,
      length,
      width,
      height,
      destCountry,
      originCountry = 'JP',
      hsCode,
      storeType = 'none',
      refundableFeesJPY = 0,
    } = params

    // 1. 重量・容積計算
    const effectiveWeight = this.getEffectiveWeight(actualWeight, length, width, height)
    const volumetricWeight = this.calculateVolumetricWeight(length, width, height)
    const volume = length * width * height

    // 2. 消費税還付計算（FVFと出品料を還付対象に含む）
    // 予測売上からFVFを推定
    const estimatedRevenue = (costJPY / exchangeRate.safe) * 2.5  // 仮の売上（2.5倍）
    const estimatedFVF = estimatedRevenue * categoryFee.fvf
    const estimatedFVF_JPY = estimatedFVF * exchangeRate.safe
    const refundableFees = estimatedFVF_JPY + (categoryFee.insertion_fee * exchangeRate.safe)
    
    const refundCalc = this.calculateConsumptionTaxRefund(costJPY, refundableFees)
    const costUSD = costJPY / exchangeRate.safe

    // 2.5. DDP/DDU判定（ゾーン検索前に必要）
    const isDDP = destCountry === 'US'

    // 3. 配送ゾーン取得（国コード→ゾーンコード変換対応）
    let zone = policy.zones?.find((z) => z.country_code === destCountry)
    
    // 見つからない場合、国コードをゾーンコードに変換して再検索
    if (!zone && !isDDP) {
      // DDUの場合、国コード→FedExゾーンコードのマッピングを使用
      const countryToZone: Record<string, string> = {
        // Zone M (Major Europe)
        'GB': 'FM', 'DE': 'FM', 'FR': 'FM', 'IT': 'FM', 'ES': 'FM', 'NL': 'FM', 'BE': 'FM', 'AT': 'FM', 'CH': 'FM',
        // Zone H (Europe 1)
        'IE': 'FH', 'PT': 'FH', 'DK': 'FH', 'SE': 'FH', 'NO': 'FH', 'FI': 'FH', 'GR': 'FH', 'PL': 'FH', 'CZ': 'FH', 'HU': 'FH',
        // Zone I (Europe 2)
        'RO': 'FI', 'BG': 'FI', 'HR': 'FI', 'SI': 'FI', 'SK': 'FI', 'EE': 'FI', 'LV': 'FI', 'LT': 'FI', 'AL': 'FI', 'TR': 'FI',
        // Zone U (Oceania)
        'AU': 'FU', 'NZ': 'FU',
        // アジア
        'CN': 'FK', 'HK': 'FV', 'TW': 'FX', 'KR': 'FZ', 'SG': 'FY',
        'TH': 'FR', 'MY': 'FQ', 'PH': 'FS', 'ID': 'FT', 'VN': 'FN', 'IN': 'FO',
        // 北米
        'CA': 'FF',
        // その他主要国
        'BR': 'FG', 'AR': 'FG', 'CL': 'FG', 'MX': 'FF',
        'SA': 'FJ', 'AE': 'FJ', 'IL': 'FJ', 'ZA': 'FJ', 'EG': 'FJ'
      }
      
      const zoneCode = countryToZone[destCountry]
      if (zoneCode) {
        zone = policy.zones?.find((z) => z.country_code === zoneCode)
      }
    }
    
    if (!zone) {
      return { success: false, error: `国 ${destCountry} は未対応です` }
    }

    // 4. 関税率取得
    const tariffData = this.getTariffRate(hsCode, originCountry, hsCodesDB)

    // 5. CIF価格計算
    const cifPrice = costUSD + zone.actual_cost

    // 6. 輸送方法推定
    const shippingMethod = estimateShippingMethod(effectiveWeight, volume)

    // 7. DDP/DDUによる計算分岐

    let ddpFee = 0
    let mpf = 0
    let hmf = 0
    let ddpBreakdown: string[] = []

    if (isDDP) {
      // DDP精密計算
      const ddpResult = calculateDDPPrecise({
        cifPrice,
        hsCode,
        originCountry,
        isPortEntry: shippingMethod.isPortEntry,
        tariffRate: tariffData.rate,
      })

      ddpFee = ddpResult.totalDDP
      mpf = ddpResult.mpf
      hmf = ddpResult.hmf
      ddpBreakdown = ddpResult.breakdown
    } else {
      // DDU: 関税のみ
      ddpFee = cifPrice * tariffData.rate
    }

    // 8. 固定コスト計算
    const fixedCosts = costUSD + zone.actual_cost + ddpFee + categoryFee.insertion_fee

    // 9. 変動手数料率計算
    const targetMargin = marginSetting.default_margin
    const minMargin = marginSetting.min_margin
    const minProfitAmount = marginSetting.min_amount

    const storeFee = STORE_FEES[storeType]
    const finalFVF = Math.max(0, categoryFee.fvf - storeFee.fvf_discount)
    const payoneerFee = 0.02  // Payoneer 2%
    const promotedListingFee = 0.02  // eBay広告 2%
    const exchangeLossFee = 0.03  // 為替损失 3%
    const internationalFee = 0.015  // 国際取引手数料 1.5%
    const variableRate = finalFVF + payoneerFee + promotedListingFee + exchangeLossFee + internationalFee

    // 10. 必要売上計算
    const requiredRevenue = fixedCosts / (1 - variableRate - targetMargin)

    // 11. 商品価格計算
    const baseHandling = isDDP ? (zone.handling_ddp || 0) : zone.handling_ddu
    let productPrice = requiredRevenue - zone.display_shipping - baseHandling
    productPrice = Math.round(productPrice / 5) * 5 // $5単位に丸める

    // 12. 総売上計算
    const totalRevenue = productPrice + zone.display_shipping + baseHandling

    // 13. 変動コスト計算
    let fvf = totalRevenue * finalFVF
    if (categoryFee.cap && fvf > categoryFee.cap) {
      fvf = categoryFee.cap
    }

    const variableCosts =
      fvf + 
      totalRevenue * payoneerFee + 
      totalRevenue * promotedListingFee + 
      totalRevenue * exchangeLossFee + 
      totalRevenue * internationalFee

    // 14. 総コスト・利益計算
    const totalCosts = fixedCosts + variableCosts
    const profitUSD_NoRefund = totalRevenue - totalCosts
    const profitMargin_NoRefund = profitUSD_NoRefund / totalRevenue

    // 15. 還付込み利益計算
    const refundUSD = refundCalc.refund / exchangeRate.safe
    const profitUSD_WithRefund = profitUSD_NoRefund + refundUSD
    const profitJPY_WithRefund = profitUSD_WithRefund * exchangeRate.spot

    // 16. 利益率・利益額チェック（削除）
    // 目標利益率は必ず達成する価格を計算しているため、チェック不要
    // minMargin と minProfitAmount は参考値として返すのみ

    // 17. 検索表示価格
    const searchDisplayPrice = productPrice + zone.display_shipping + baseHandling

    // 18. 計算式の詳細内訳（DDP精密計算含む）
    const formulas = [
      {
        step: 1,
        label: '容積重量',
        formula: `(${length} × ${width} × ${height}) ÷ 5000 = ${volumetricWeight.toFixed(2)}kg`,
      },
      {
        step: 2,
        label: '適用重量',
        formula: `max(実重量${actualWeight}kg, 容積${volumetricWeight.toFixed(2)}kg) = ${effectiveWeight.toFixed(2)}kg`,
      },
      {
        step: 3,
        label: '輸送方法推定',
        formula: `${shippingMethod.method === 'port' ? '港湾経由' : '空輸'} (${shippingMethod.reason})`,
      },
      {
        step: 4,
        label: '消費税還付額',
        formula: `(仕入¥${costJPY.toLocaleString()} + 還付対象手数料¥${refundableFeesJPY.toLocaleString()}) × 10/110 = ¥${Math.round(refundCalc.refund).toLocaleString()}`,
      },
      {
        step: 5,
        label: 'USD変換',
        formula: `¥${costJPY.toLocaleString()} ÷ ${exchangeRate.safe.toFixed(2)} = $${costUSD.toFixed(2)}`,
      },
      {
        step: 6,
        label: 'CIF価格',
        formula: `原価$${costUSD.toFixed(2)} + 実送料$${zone.actual_cost} = $${cifPrice.toFixed(2)}`,
      },
      {
        step: 7,
        label: 'DDP精密計算',
        formula: isDDP
          ? `関税($${(cifPrice * tariffData.rate).toFixed(2)}) + MPF($${mpf.toFixed(2)}) + HMF($${hmf.toFixed(2)}) + eBay DDP($${(ddpFee - cifPrice * tariffData.rate - mpf - hmf).toFixed(2)}) = $${ddpFee.toFixed(2)}`
          : `関税のみ: CIF × ${(tariffData.rate * 100).toFixed(2)}% = $${ddpFee.toFixed(2)}`,
      },
      {
        step: 8,
        label: '固定コスト',
        formula: `原価 + 実送料 + DDP手数料 + 出品料 = $${fixedCosts.toFixed(2)}`,
      },
      {
        step: 9,
        label: 'Handling',
        formula: `${isDDP ? 'DDP' : 'DDU'}モード、価格帯${policy.policy_name} = $${baseHandling}`,
      },
      {
        step: 10,
        label: '商品価格',
        formula: `必要売上 - 送料 - Handling = $${productPrice}`,
      },
      {
        step: 11,
        label: '検索表示価格',
        formula: `$${productPrice} + $${zone.display_shipping} + $${baseHandling} = $${searchDisplayPrice.toFixed(2)}`,
      },
      {
        step: 12,
        label: '利益（還付なし）',
        formula: `売上$${totalRevenue.toFixed(2)} - コスト$${totalCosts.toFixed(2)} = $${profitUSD_NoRefund.toFixed(2)} (${(profitMargin_NoRefund * 100).toFixed(2)}%)`,
      },
      {
        step: 13,
        label: '利益（還付込み）',
        formula: `還付なし$${profitUSD_NoRefund.toFixed(2)} + 還付$${refundUSD.toFixed(2)} = $${profitUSD_WithRefund.toFixed(2)} (¥${Math.round(profitJPY_WithRefund).toLocaleString()})`,
      },
    ]

    return {
      success: true,
      suggestedPrice: searchDisplayPrice, // 追加
      productPrice,
      shipping: zone.display_shipping,
      handling: baseHandling,
      totalRevenue,
      searchDisplayPrice,
      profitUSD_NoRefund,
      profitMargin_NoRefund,
      profitJPY_NoRefund: profitUSD_NoRefund * exchangeRate.spot,
      profitUSD_WithRefund,
      profitJPY_WithRefund,
      refundAmount: refundCalc.refund,
      refundUSD,
      costUSD,
      shippingCost: zone.actual_cost,
      tariffCost: cifPrice * tariffData.rate,
      totalFees: variableCosts,
      minMargin,
      minProfitAmount,
      policyUsed: policy.policy_name,
      isDDP,
      hsCode,
      tariffData,
      effectiveWeight,
      volumetricWeight,
      actualWeight,
      shippingMethod,
      ddpBreakdown: isDDP ? ddpBreakdown : [],
      mpf: isDDP ? mpf : 0,
      hmf: isDDP ? hmf : 0,
      formulas,
      breakdown: {
        costUSD: costUSD.toFixed(2),
        actualShipping: zone.actual_cost.toFixed(2),
        cifPrice: cifPrice.toFixed(2),
        tariff: (cifPrice * tariffData.rate).toFixed(2),
        ddpFee: ddpFee.toFixed(2),
        mpf: isDDP ? mpf.toFixed(2) : '0.00',
        hmf: isDDP ? hmf.toFixed(2) : '0.00',
        fvf: fvf.toFixed(2),
        fvfRate: (finalFVF * 100).toFixed(2) + '%',
        storeDiscount: (storeFee.fvf_discount * 100).toFixed(2) + '%',
        payoneer: (totalRevenue * payoneerFee).toFixed(2),
        promotedListing: (totalRevenue * promotedListingFee).toFixed(2),
        exchangeLoss: (totalRevenue * exchangeLossFee).toFixed(2),
        internationalFee: (totalRevenue * 0.015).toFixed(2),
        totalCosts: totalCosts.toFixed(2),
      },
    }
  },
}
