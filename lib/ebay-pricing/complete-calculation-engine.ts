// lib/ebay-pricing/complete-calculation-engine.ts
/**
 * eBay価格計算エンジン - 完全版
 * 
 * 全ての手数料・関税・送料を正確に計算
 */

export interface PricingInput {
  // 基本情報
  costJPY: number              // 仕入値（円）
  weight: number               // 重量（kg）
  
  // 関税情報
  hsCode: string               // HTSコード
  originCountry: string        // 原産国コード
  hsCodeTariff: number         // HTSコードの関税率（0.0-1.0）
  originCountryTariff: number  // 原産国の関税率（0.0-1.0）※Section 301等
  
  // eBay情報
  categoryFVF: number          // カテゴリFVF（0.0-1.0）
  storeDiscount: number        // ストア割引（0.0-1.0、マイナス値）
  
  // 配送情報
  shippingActualCost: number   // 実送料（USD）
  shippingDisplay: number      // 表示送料（USD）
  handlingFee: number          // Handling Fee（USD）
  
  // 為替・サーチャージ
  exchangeRate: number         // 為替レート
  fuelSurcharge: number        // 燃油サーチャージ率（0.0-1.0）
  
  // その他手数料
  payoneerFee: number          // Payoneer手数料（0.0-1.0）デフォルト0.02
  adFee: number                // eBay広告費（0.0-1.0）デフォルト0.02
  
  // DDP/DDU
  mode: 'DDP' | 'DDU'
}

export interface PricingResult {
  success: boolean
  error?: string
  
  // 入力値
  input: PricingInput
  
  // 計算結果
  productPrice: number         // 商品価格（USD）
  shipping: number             // 送料（USD）
  handling: number             // Handling（USD）
  searchDisplayPrice: number   // 検索表示価格（USD）
  
  // コスト内訳（USD）
  costUSD: number              // 仕入値（USD）
  shippingCost: number         // 送料実費（USD）
  fuelSurchargeCost: number    // 燃油サーチャージ（USD）
  
  // 関税・通関費用（USD）
  dutyHTS: number              // HTSコードの関税（USD）
  dutyOrigin: number           // 原産国関税（Section 301等）（USD）
  totalDuty: number            // 合計関税（USD）
  mpf: number                  // MPF（USD）
  hmf: number                  // HMF（USD）
  ddpServiceFee: number        // DDP手数料（USD）※DDPのみ
  totalCustomsCost: number     // 通関費用合計（USD）
  
  // eBay手数料（USD）
  fvf: number                  // FVF（USD）
  insertionFee: number         // 出品料（USD）
  payoneerFee: number          // Payoneer（USD）
  adFee: number                // 広告費（USD）
  totalEbayFees: number        // eBay関連手数料合計（USD）
  
  // 利益（USD & JPY）
  profitUSD: number            // 純利益（USD）
  profitJPY: number            // 純利益（JPY）
  profitMargin: number         // 利益率（0.0-1.0）
  
  // 内訳表示用
  breakdown: {
    revenue: number            // 総収入（USD）
    totalCosts: number         // 総コスト（USD）
    costBreakdown: {
      product: number
      shipping: number
      customs: number
      ebayFees: number
    }
  }
}

/**
 * 完全版価格計算
 */
export function calculateCompletePricing(input: PricingInput): PricingResult {
  try {
    // ========================================
    // 1. 基本コスト計算
    // ========================================
    
    const costUSD = input.costJPY / input.exchangeRate
    const shippingCost = input.shippingActualCost
    const fuelSurchargeCost = input.shippingActualCost * input.fuelSurcharge
    const totalShippingCost = shippingCost + fuelSurchargeCost
    
    // ========================================
    // 2. 関税・通関費用計算
    // ========================================
    
    // 関税計算ベース = 商品原価（USD）
    const dutyBase = costUSD
    
    // HTSコードの関税
    const dutyHTS = dutyBase * input.hsCodeTariff
    
    // 原産国関税（Section 301等）
    const dutyOrigin = dutyBase * input.originCountryTariff
    
    // 合計関税
    const totalDuty = dutyHTS + dutyOrigin
    
    // MPF: 0.3464%、最低$31.67、最高$614.35
    let mpf = 0
    if (input.mode === 'DDP') {
      const mpfCalculated = (dutyBase + totalDuty) * 0.003464
      mpf = Math.max(31.67, Math.min(614.35, mpfCalculated))
    }
    
    // HMF: $0（通常は不要、特定条件のみ）
    const hmf = 0
    
    // DDP手数料: 通関業者への支払い
    const ddpServiceFee = input.mode === 'DDP' ? 35.0 : 0
    
    // 通関費用合計
    const totalCustomsCost = totalDuty + mpf + hmf + ddpServiceFee
    
    // ========================================
    // 3. 販売価格の逆算
    // ========================================
    
    // 目標利益率を30%と仮定（後で調整可能）
    const targetMargin = 0.30
    
    // 総コスト
    const baseCost = costUSD + totalShippingCost + totalCustomsCost
    
    // eBay手数料を考慮した販売価格の逆算
    // 販売価格 = (コスト + Handling) / (1 - FVF - Payoneer - 広告費 - 利益率)
    
    const feeRate = input.categoryFVF + input.storeDiscount + input.payoneerFee + input.adFee
    const priceBeforeMargin = (baseCost + input.handlingFee) / (1 - feeRate - targetMargin)
    
    // 商品価格（$5単位に切り上げ）
    const productPrice = Math.ceil(priceBeforeMargin / 5) * 5
    
    // ========================================
    // 4. eBay手数料計算
    // ========================================
    
    // FVF: 商品価格に対して
    const fvf = productPrice * input.categoryFVF
    const storeDiscount = productPrice * input.storeDiscount  // マイナス値
    const fvfAfterDiscount = fvf + storeDiscount  // 割引適用後
    
    // 出品料（通常$0、一部カテゴリで課金）
    const insertionFee = 0
    
    // Payoneer手数料: 総収入（商品価格 + 送料 + Handling）に対して
    const totalRevenue = productPrice + input.shippingDisplay + input.handlingFee
    const payoneerFee = totalRevenue * input.payoneerFee
    
    // 広告費: 商品価格に対して
    const adFee = productPrice * input.adFee
    
    // eBay関連手数料合計
    const totalEbayFees = fvfAfterDiscount + insertionFee + payoneerFee + adFee
    
    // ========================================
    // 5. 利益計算
    // ========================================
    
    // 総収入
    const revenue = totalRevenue
    
    // 総コスト
    const totalCosts = costUSD + totalShippingCost + totalCustomsCost + totalEbayFees
    
    // 純利益（USD）
    const profitUSD = revenue - totalCosts
    
    // 純利益（JPY）
    const profitJPY = profitUSD * input.exchangeRate
    
    // 利益率
    const profitMargin = revenue > 0 ? profitUSD / revenue : 0
    
    // ========================================
    // 6. 結果返却
    // ========================================
    
    return {
      success: true,
      input,
      
      productPrice,
      shipping: input.shippingDisplay,
      handling: input.handlingFee,
      searchDisplayPrice: productPrice + input.shippingDisplay,
      
      costUSD,
      shippingCost,
      fuelSurchargeCost,
      
      dutyHTS,
      dutyOrigin,
      totalDuty,
      mpf,
      hmf,
      ddpServiceFee,
      totalCustomsCost,
      
      fvf: fvfAfterDiscount,
      insertionFee,
      payoneerFee,
      adFee,
      totalEbayFees,
      
      profitUSD,
      profitJPY,
      profitMargin,
      
      breakdown: {
        revenue,
        totalCosts,
        costBreakdown: {
          product: costUSD,
          shipping: totalShippingCost,
          customs: totalCustomsCost,
          ebayFees: totalEbayFees,
        },
      },
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      input,
      productPrice: 0,
      shipping: 0,
      handling: 0,
      searchDisplayPrice: 0,
      costUSD: 0,
      shippingCost: 0,
      fuelSurchargeCost: 0,
      dutyHTS: 0,
      dutyOrigin: 0,
      totalDuty: 0,
      mpf: 0,
      hmf: 0,
      ddpServiceFee: 0,
      totalCustomsCost: 0,
      fvf: 0,
      insertionFee: 0,
      payoneerFee: 0,
      adFee: 0,
      totalEbayFees: 0,
      profitUSD: 0,
      profitJPY: 0,
      profitMargin: 0,
      breakdown: {
        revenue: 0,
        totalCosts: 0,
        costBreakdown: {
          product: 0,
          shipping: 0,
          customs: 0,
          ebayFees: 0,
        },
      },
    }
  }
}

/**
 * 計算例
 */
export function getCalculationExample(): PricingResult {
  const input: PricingInput = {
    // 基本情報
    costJPY: 15000,
    weight: 1.5,
    
    // 関税情報
    hsCode: '9503.00.0074',
    originCountry: 'CN',
    hsCodeTariff: 0.0,      // おもちゃ: 0%
    originCountryTariff: 0.25,  // 中国: Section 301 25%
    
    // eBay情報
    categoryFVF: 0.1315,    // Collectibles: 13.15%
    storeDiscount: -0.04,   // Basic Store: -4%
    
    // 配送情報
    shippingActualCost: 30.0,
    shippingDisplay: 35.0,
    handlingFee: 12.0,
    
    // 為替・サーチャージ
    exchangeRate: 154.0,
    fuelSurcharge: 0.05,    // 5%
    
    // その他手数料
    payoneerFee: 0.02,      // 2%
    adFee: 0.02,            // 2%
    
    mode: 'DDP',
  }
  
  return calculateCompletePricing(input)
}
