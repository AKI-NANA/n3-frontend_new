// lib/ebay-pricing/ddp-handling-calculator.ts
/**
 * DDP Handling手数料の計算
 * 
 * 構成：
 * - 基本Handling: 梱包・処理手数料
 * - DDP代行手数料: 1個あたりの関税代行コスト
 * 
 * 重要：Handlingは数量に比例させる必要がある
 */

export interface DDPHandlingParams {
  quantity: number
  itemPriceUSD: number
  shippingCostUSD: number
  tariffRate: number
  originCountry: string
}

export interface DDPHandlingResult {
  baseHandlingPerItem: number // 基本Handling（1個あたり）
  ddpProxyFeePerItem: number // DDP代行手数料（1個あたり）
  totalHandlingPerItem: number // 合計Handling（1個あたり）
  totalHandlingAll: number // 合計Handling（全数量）
  breakdown: {
    packaging: number // 梱包費
    processing: number // 処理費
    ddpProxy: number // DDP代行
    tariffAmount: number // 関税額
    ebayDdpFee: number // eBay DDP手数料（固定$5）
  }
}

/**
 * DDP Handling手数料を計算
 */
export function calculateDDPHandling(params: DDPHandlingParams): DDPHandlingResult {
  const { quantity, itemPriceUSD, shippingCostUSD, tariffRate } = params

  // 1. CIF価格計算
  const cifPrice = itemPriceUSD * quantity + shippingCostUSD

  // 2. 関税計算
  const tariffAmount = cifPrice * tariffRate

  // 3. eBay DDP手数料（固定$5）
  const ebayDdpFee = 5.0

  // 4. 基本Handling（1個あたり）
  const packagingFee = 3.0 // 梱包費
  const processingFee = 2.0 // 処理費
  const baseHandlingPerItem = packagingFee + processingFee

  // 5. DDP代行手数料（1個あたり）
  // 関税額を数量で割り、eBay DDP手数料を分配
  const ddpProxyFeePerItem = (tariffAmount + ebayDdpFee) / quantity

  // 6. 合計Handling
  const totalHandlingPerItem = baseHandlingPerItem + ddpProxyFeePerItem
  const totalHandlingAll = totalHandlingPerItem * quantity

  return {
    baseHandlingPerItem,
    ddpProxyFeePerItem,
    totalHandlingPerItem,
    totalHandlingAll,
    breakdown: {
      packaging: packagingFee * quantity,
      processing: processingFee * quantity,
      ddpProxy: ddpProxyFeePerItem * quantity,
      tariffAmount,
      ebayDdpFee
    }
  }
}

/**
 * eBay配送ポリシー用のHandling設定
 */
export function getHandlingForEbayPolicy(
  weightKg: number,
  pricingBasis: 'DDP' | 'DDU'
): {
  baseHandling: number
  includesDDP: boolean
  description: string
} {
  if (pricingBasis === 'DDU') {
    // DDUの場合はDDP代行なし
    return {
      baseHandling: weightKg < 2 ? 5.0 : weightKg < 5 ? 8.0 : 10.0,
      includesDDP: false,
      description: '梱包・処理費のみ'
    }
  }

  // DDPの場合
  // 基本Handling + DDP代行の想定コスト
  const baseHandling = weightKg < 2 ? 5.0 : weightKg < 5 ? 8.0 : 10.0
  const estimatedDdpProxy = 5.0 // 1個あたりの平均DDP代行コスト

  return {
    baseHandling: baseHandling + estimatedDdpProxy,
    includesDDP: true,
    description: '梱包・処理費 + DDP代行手数料'
  }
}

/**
 * 複数購入時のHandling計算
 */
export function calculateMultiQuantityHandling(
  baseHandling: number,
  quantity: number,
  includesDDP: boolean
): {
  perItemHandling: number
  totalHandling: number
  breakdown: string
} {
  if (!includesDDP) {
    // DDUの場合は単純に数量をかける
    return {
      perItemHandling: baseHandling,
      totalHandling: baseHandling * quantity,
      breakdown: `基本Handling $${baseHandling} × ${quantity}個`
    }
  }

  // DDPの場合は数量に比例
  return {
    perItemHandling: baseHandling,
    totalHandling: baseHandling * quantity,
    breakdown: `DDP Handling $${baseHandling}/個 × ${quantity}個（DDP代行含む）`
  }
}

/**
 * eBay API用のHandling設定生成
 */
export function generateEbayHandlingConfig(
  policyName: string,
  weightKg: number,
  pricingBasis: 'DDP' | 'DDU'
) {
  const handling = getHandlingForEbayPolicy(weightKg, pricingBasis)

  return {
    policyName,
    domesticHandling: {
      handlingCost: {
        value: handling.baseHandling.toFixed(2),
        currency: 'USD'
      }
    },
    // 重要：eBayでは複数購入時のHandlingも自動的に数量をかける
    // つまり、baseHandlingを設定すれば自動的に数量比例する
    description: handling.description,
    includesDDP: handling.includesDDP
  }
}
