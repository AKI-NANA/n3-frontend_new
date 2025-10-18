// lib/ebay-pricing/multi-quantity-shipping-calculator.ts
/**
 * 複数購入時の送料計算
 * 
 * 原則：送料は同額請求（割引なし）
 * 理由：DDP計算・eBay手数料・実費送料のバランスを保つため
 */

export interface MultiQuantityShippingParams {
  quantity: number
  baseShippingUSD: number // 1個分の基本送料
  additionalShippingUSD: number // 2個目以降の送料（実費ベース）
  handlingFeeUSD: number
  itemPriceUSD: number
  tariffRate: number
  fvfRate: number
}

export interface MultiQuantityShippingResult {
  quantity: number
  displayShipping: number // 表示送料
  actualShipping: number // 実費送料
  totalRevenue: number // 総売上
  totalCost: number // 総コスト
  profit: number // 利益
  profitMargin: number // 利益率
  breakdown: {
    itemRevenue: number
    shippingRevenue: number
    handlingRevenue: number
    itemCost: number
    shippingCost: number
    tariffCost: number
    fvfCost: number
  }
}

/**
 * パターンA: 送料同額請求（推奨）
 * 
 * メリット：
 * - 計算がシンプル
 * - 赤字リスクなし
 * - DDP計算が正確
 * 
 * デメリット：
 * - 顧客が割高に感じる可能性
 */
export function calculateSameShipping(
  params: MultiQuantityShippingParams
): MultiQuantityShippingResult {
  const {
    quantity,
    baseShippingUSD,
    handlingFeeUSD,
    itemPriceUSD,
    tariffRate,
    fvfRate
  } = params

  // 送料を毎回同額請求
  const displayShippingPerItem = baseShippingUSD
  const totalDisplayShipping = displayShippingPerItem * quantity

  // 実費送料（1個目 + 2個目以降の増分）
  const actualShippingCost = 
    baseShippingUSD + // 1個目
    (params.additionalShippingUSD * (quantity - 1)) // 2個目以降

  // 売上計算
  const itemRevenue = itemPriceUSD * quantity
  const shippingRevenue = totalDisplayShipping
  const handlingRevenue = handlingFeeUSD * quantity
  const totalRevenue = itemRevenue + shippingRevenue + handlingRevenue

  // CIF価格（関税計算用）
  const cifPrice = itemRevenue + actualShippingCost

  // 関税
  const tariffCost = cifPrice * tariffRate

  // eBay手数料
  const fvfCost = totalRevenue * fvfRate

  // コスト計算
  const itemCost = itemPriceUSD * quantity * 0.5 // 仕入原価を仮定
  const totalCost = itemCost + actualShippingCost + tariffCost + fvfCost

  // 利益
  const profit = totalRevenue - totalCost
  const profitMargin = profit / totalRevenue

  return {
    quantity,
    displayShipping: totalDisplayShipping,
    actualShipping: actualShippingCost,
    totalRevenue,
    totalCost,
    profit,
    profitMargin,
    breakdown: {
      itemRevenue,
      shippingRevenue,
      handlingRevenue,
      itemCost,
      shippingCost: actualShippingCost,
      tariffCost,
      fvfCost
    }
  }
}

/**
 * パターンB: 実費ベース請求
 * 
 * メリット：
 * - 顧客に優しい
 * - 実費に近い
 * 
 * デメリット：
 * - DDP計算が複雑
 * - 赤字リスクあり
 */
export function calculateCostBasedShipping(
  params: MultiQuantityShippingParams
): MultiQuantityShippingResult {
  const {
    quantity,
    baseShippingUSD,
    additionalShippingUSD,
    handlingFeeUSD,
    itemPriceUSD,
    tariffRate,
    fvfRate
  } = params

  // 実費ベースで請求
  const displayShippingFirst = baseShippingUSD
  const displayShippingAdditional = additionalShippingUSD
  const totalDisplayShipping = 
    displayShippingFirst + 
    (displayShippingAdditional * (quantity - 1))

  // 実費送料
  const actualShippingCost = 
    baseShippingUSD + 
    (additionalShippingUSD * (quantity - 1))

  // 売上計算
  const itemRevenue = itemPriceUSD * quantity
  const shippingRevenue = totalDisplayShipping
  const handlingRevenue = handlingFeeUSD * quantity
  const totalRevenue = itemRevenue + shippingRevenue + handlingRevenue

  // CIF価格
  const cifPrice = itemRevenue + actualShippingCost

  // 関税
  const tariffCost = cifPrice * tariffRate

  // eBay手数料
  const fvfCost = totalRevenue * fvfRate

  // コスト
  const itemCost = itemPriceUSD * quantity * 0.5
  const totalCost = itemCost + actualShippingCost + tariffCost + fvfCost

  // 利益
  const profit = totalRevenue - totalCost
  const profitMargin = profit / totalRevenue

  return {
    quantity,
    displayShipping: totalDisplayShipping,
    actualShipping: actualShippingCost,
    totalRevenue,
    totalCost,
    profit,
    profitMargin,
    breakdown: {
      itemRevenue,
      shippingRevenue,
      handlingRevenue,
      itemCost,
      shippingCost: actualShippingCost,
      tariffCost,
      fvfCost
    }
  }
}

/**
 * 推奨設定を判定
 */
export function getRecommendedShippingPolicy(
  params: MultiQuantityShippingParams
): {
  policy: 'SAME_SHIPPING' | 'COST_BASED'
  reason: string
  sameShippingResult: MultiQuantityShippingResult
  costBasedResult: MultiQuantityShippingResult
} {
  const sameResult = calculateSameShipping(params)
  const costResult = calculateCostBasedShipping(params)

  // 利益差を比較
  const profitDiff = sameResult.profit - costResult.profit

  let policy: 'SAME_SHIPPING' | 'COST_BASED'
  let reason: string

  if (profitDiff > 5) {
    policy = 'SAME_SHIPPING'
    reason = `送料同額請求が推奨（利益差: $${profitDiff.toFixed(2)}）`
  } else if (costResult.profit < 0) {
    policy = 'SAME_SHIPPING'
    reason = '実費ベースだと赤字になるため、送料同額請求を推奨'
  } else {
    policy = 'COST_BASED'
    reason = '実費ベースでも利益が出るため、顧客に優しい設定が可能'
  }

  return {
    policy,
    reason,
    sameShippingResult: sameResult,
    costBasedResult: costResult
  }
}

/**
 * eBay配送ポリシー設定用のデータ生成
 */
export function generateEbayShippingPolicyData(
  policyName: string,
  baseShippingUSD: number,
  additionalShippingUSD: number,
  useSameShipping: boolean = true // デフォルトは同額請求
) {
  return {
    name: policyName,
    description: useSameShipping 
      ? '送料同額請求（Combined Shipping: 割引なし）'
      : '実費ベース請求（2個目以降割引）',
    freightShipping: false,
    localPickup: false,
    shippingOptions: [
      {
        optionType: 'DOMESTIC', // USA国内（実際は国際配送だがeBay側の設定）
        costType: 'FLAT_RATE',
        shippingServices: [
          {
            sortOrder: 1,
            shippingCost: {
              value: baseShippingUSD.toFixed(2),
              currency: 'USD'
            },
            additionalShippingCost: useSameShipping 
              ? {
                  value: baseShippingUSD.toFixed(2), // 同額
                  currency: 'USD'
                }
              : {
                  value: additionalShippingUSD.toFixed(2), // 実費
                  currency: 'USD'
                },
            shippingServiceCode: 'ShippingMethodStandard',
            buyerResponsibleForShipping: false,
            buyerResponsibleForPickup: false
          }
        ]
      }
    ]
  }
}
