// lib/ebay-pricing/handling-optimizer.ts
/**
 * Handling Fee 最適化モジュール
 * 
 * eBayの制約（送料の20%または$50のいずれか小さい方）内で
 * DDP手数料を送料とHandling Feeに最適配分する
 */

export interface HandlingOptimizationParams {
  actualShipping: number      // 実送料
  ddpFees: number             // DDP手数料（関税・MPF・HMF・eBay DDP）
  maxHandlingPercentage: number  // デフォルト 0.20 (20%)
  maxHandlingAbsolute: number    // デフォルト $50
}

export interface HandlingOptimizationResult {
  displayShipping: number     // 表示送料
  handling: number            // Handling Fee
  totalToCustomer: number     // 顧客支払い総額（送料+Handling）
  ddpRecovered: number        // DDP手数料回収額
  ddpShortfall: number        // DDP手数料不足額
  isFullyRecovered: boolean   // 完全回収できたか
  strategy: string            // 採用した戦略
}

/**
 * 送料とHandling Feeの最適配分
 */
export function optimizeShippingAndHandling(
  params: HandlingOptimizationParams
): HandlingOptimizationResult {
  const {
    actualShipping,
    ddpFees,
    maxHandlingPercentage = 0.20,
    maxHandlingAbsolute = 50.00,
  } = params

  // DDP手数料が0の場合（DDUモード）
  if (ddpFees === 0) {
    return {
      displayShipping: actualShipping,
      handling: 2.00,  // DDUの場合は最小限のHandling
      totalToCustomer: actualShipping + 2.00,
      ddpRecovered: 0,
      ddpShortfall: 0,
      isFullyRecovered: true,
      strategy: 'DDU (minimal handling)',
    }
  }

  // 戦略1: まずHandling Feeの上限を計算
  const maxHandling = Math.min(
    actualShipping * maxHandlingPercentage,
    maxHandlingAbsolute
  )

  // 戦略2: DDP手数料を送料とHandlingに配分
  
  // オプションA: Handlingを最大限活用
  const handlingA = Math.min(ddpFees, maxHandling)
  const shippingA = actualShipping + (ddpFees - handlingA)
  const recoveredA = handlingA + (ddpFees - handlingA)
  
  // オプションB: 送料を実費の150%以内に抑える（顧客体験重視）
  const maxReasonableShipping = actualShipping * 1.50
  const shippingB = Math.min(actualShipping + ddpFees, maxReasonableShipping)
  const handlingB = Math.min(
    Math.max(0, actualShipping + ddpFees - shippingB),
    maxHandling
  )
  const recoveredB = (shippingB - actualShipping) + handlingB

  // オプションC: バランス型（送料130%, 残りHandling）
  const shippingC = actualShipping * 1.30
  const remainingC = Math.max(0, actualShipping + ddpFees - shippingC)
  const handlingC = Math.min(remainingC, maxHandling)
  const recoveredC = (shippingC - actualShipping) + handlingC

  // 最適な戦略を選択（回収額が最大のもの）
  const options = [
    { shipping: shippingA, handling: handlingA, recovered: recoveredA, strategy: 'Max Handling' },
    { shipping: shippingB, handling: handlingB, recovered: recoveredB, strategy: 'Customer-friendly' },
    { shipping: shippingC, handling: handlingC, recovered: recoveredC, strategy: 'Balanced' },
  ]

  const best = options.reduce((prev, curr) => 
    curr.recovered > prev.recovered ? curr : prev
  )

  return {
    displayShipping: best.shipping,
    handling: best.handling,
    totalToCustomer: best.shipping + best.handling,
    ddpRecovered: best.recovered,
    ddpShortfall: Math.max(0, ddpFees - best.recovered),
    isFullyRecovered: best.recovered >= ddpFees,
    strategy: best.strategy,
  }
}

/**
 * DDP手数料が回収可能かチェック
 */
export function canRecoverDDPFees(
  actualShipping: number,
  ddpFees: number,
  maxHandlingPercentage = 0.20,
  maxHandlingAbsolute = 50.00
): boolean {
  const maxHandling = Math.min(
    actualShipping * maxHandlingPercentage,
    maxHandlingAbsolute
  )
  
  // 送料を実費の200%まで許容した場合
  const maxRecoverable = (actualShipping * 2.00 - actualShipping) + maxHandling
  
  return ddpFees <= maxRecoverable
}

/**
 * 送料比率チェック（顧客体験）
 */
export function checkShippingRatio(
  displayShipping: number,
  productPrice: number
): {
  ratio: number
  status: 'excellent' | 'good' | 'acceptable' | 'high' | 'too_high'
  message: string
} {
  const ratio = (displayShipping / productPrice) * 100

  if (ratio < 10) {
    return { ratio, status: 'excellent', message: '送料比率が理想的です' }
  } else if (ratio < 20) {
    return { ratio, status: 'good', message: '送料比率が良好です' }
  } else if (ratio < 30) {
    return { ratio, status: 'acceptable', message: '送料比率は許容範囲です' }
  } else if (ratio < 50) {
    return { ratio, status: 'high', message: '送料比率が高めです' }
  } else {
    return { ratio, status: 'too_high', message: '⚠️ 送料比率が高すぎます' }
  }
}
