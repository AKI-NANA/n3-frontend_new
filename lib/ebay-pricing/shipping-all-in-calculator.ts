// lib/ebay-pricing/shipping-all-in-calculator.ts
/**
 * 送料オールイン計算（最終決定版）
 * 
 * eBayの制約：
 * - Handlingは数量比例しない
 * - additionalHandlingCost は存在しない
 * 
 * 解決策：
 * - 送料に全てを含める（基本送料 + DDP代行 + 梱包費）
 * - Handlingは使わない
 */

export interface ShippingAllInParams {
  baseShippingUSD: number       // 基本送料（実費）
  ddpProxyCostUSD: number        // DDP代行手数料
  packagingCostUSD: number       // 梱包費
  processingCostUSD: number      // 処理費
}

export interface ShippingAllInResult {
  displayShippingPerItem: number // 表示送料（1個あたり）
  additionalShippingPerItem: number // 2個目以降の送料
  handlingCost: number // Handling（使わないので$0）
  breakdown: {
    baseShipping: number
    ddpProxy: number
    packaging: number
    processing: number
    total: number
  }
  ebayPolicyData: any
}

/**
 * 送料オールイン計算
 */
export function calculateAllInShipping(
  params: ShippingAllInParams
): ShippingAllInResult {
  const {
    baseShippingUSD,
    ddpProxyCostUSD,
    packagingCostUSD,
    processingCostUSD
  } = params

  // 全てを送料に含める
  const totalShippingPerItem = 
    baseShippingUSD + 
    ddpProxyCostUSD + 
    packagingCostUSD + 
    processingCostUSD

  // 2個目以降も同額
  const additionalShippingPerItem = totalShippingPerItem

  // Handlingは使わない
  const handlingCost = 0

  return {
    displayShippingPerItem: totalShippingPerItem,
    additionalShippingPerItem,
    handlingCost,
    breakdown: {
      baseShipping: baseShippingUSD,
      ddpProxy: ddpProxyCostUSD,
      packaging: packagingCostUSD,
      processing: processingCostUSD,
      total: totalShippingPerItem
    },
    ebayPolicyData: generateEbayPolicyData(
      totalShippingPerItem,
      additionalShippingPerItem,
      handlingCost
    )
  }
}

/**
 * eBay Policy Data生成
 */
function generateEbayPolicyData(
  shippingPerItem: number,
  additionalShipping: number,
  handling: number
) {
  return {
    shippingOptions: [
      {
        optionType: 'INTERNATIONAL',
        costType: 'FLAT_RATE',
        shippingServices: [
          {
            shippingCost: {
              value: shippingPerItem.toFixed(2),
              currency: 'USD'
            },
            additionalShippingCost: {
              value: additionalShipping.toFixed(2),
              currency: 'USD'
            },
            shippingServiceCode: 'JP_StandardInt',
            buyerResponsibleForShipping: false
          }
        ]
      }
    ],
    // Handlingは設定しない（$0なので）
    globalShipping: false,
    pickupDropOff: false
  }
}

/**
 * 重量別・方式別の推奨送料設定
 */
export function getRecommendedShippingAllIn(
  weightKg: number,
  pricingBasis: 'DDP' | 'DDU'
): ShippingAllInResult {
  let baseShipping: number
  let ddpProxy: number
  let packaging: number
  let processing: number

  // 重量別の基本送料
  if (weightKg <= 2) {
    baseShipping = 25
    packaging = 3
    processing = 2
  } else if (weightKg <= 5) {
    baseShipping = 45
    packaging = 5
    processing = 3
  } else if (weightKg <= 10) {
    baseShipping = 65
    packaging = 8
    processing = 5
  } else {
    baseShipping = 95
    packaging = 10
    processing = 7
  }

  // DDP代行手数料
  if (pricingBasis === 'DDP') {
    ddpProxy = 5 // DDP代行コスト
  } else {
    ddpProxy = 0 // DDUは不要
  }

  return calculateAllInShipping({
    baseShippingUSD: baseShipping,
    ddpProxyCostUSD: ddpProxy,
    packagingCostUSD: packaging,
    processingCostUSD: processing
  })
}

/**
 * 複数購入時の顧客支払い計算
 */
export function calculateCustomerPayment(
  itemPrice: number,
  shippingPerItem: number,
  quantity: number
): {
  itemTotal: number
  shippingTotal: number
  handlingTotal: number
  grandTotal: number
  perItemBreakdown: string
} {
  const itemTotal = itemPrice * quantity
  const shippingTotal = shippingPerItem * quantity
  const handlingTotal = 0 // 使わない
  const grandTotal = itemTotal + shippingTotal + handlingTotal

  return {
    itemTotal,
    shippingTotal,
    handlingTotal,
    grandTotal,
    perItemBreakdown: `商品$${itemPrice} + 送料$${shippingPerItem} = $${itemPrice + shippingPerItem}/個`
  }
}

/**
 * 商品説明用のテキスト生成
 */
export function generateShippingDescriptionForListing(
  shippingPerItem: number,
  breakdown: {
    baseShipping: number
    ddpProxy: number
    packaging: number
    processing: number
  }
): string {
  return `
📦 Shipping Cost: $${shippingPerItem.toFixed(2)} per item

This shipping cost includes:
- International Shipping: $${breakdown.baseShipping.toFixed(2)}
- DDP Service (Duty & Tax Prepaid): $${breakdown.ddpProxy.toFixed(2)}
- Packaging Materials: $${breakdown.packaging.toFixed(2)}
- Processing Fee: $${breakdown.processing.toFixed(2)}

✅ No additional customs fees at delivery!
✅ Multiple items? Same shipping cost per item!

🌍 Ships from Japan via CPass/DHL/FedEx
📅 Delivery: 5-10 business days
`.trim()
}
