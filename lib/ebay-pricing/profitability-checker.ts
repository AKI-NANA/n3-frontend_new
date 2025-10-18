// lib/ebay-pricing/profitability-checker.ts
/**
 * 出品可否判定ロジック
 * - 仕入値に応じた最低利益額を設定
 * - 利益率と利益額の両方を考慮
 */

export interface ProfitabilityCheckParams {
  costJPY: number
  profitJPY: number
  profitMargin: number
  resultDDP?: any
  resultDDU?: any
}

export interface ProfitabilityResult {
  canList: boolean
  reason: string
  details: {
    minProfitRequired: number
    actualProfit: number
    minMarginRequired: number
    actualMargin: number
    passed: {
      profitAmount: boolean
      profitMargin: boolean
    }
  }
  recommendation?: string
}

/**
 * 仕入値に応じた最低利益額を計算
 */
export function getMinProfitAmount(costJPY: number): number {
  if (costJPY < 5000) {
    return 1500 // ¥1,500以上
  } else if (costJPY < 10000) {
    return 2000 // ¥2,000以上
  } else if (costJPY < 20000) {
    return 3000 // ¥3,000以上
  } else if (costJPY < 50000) {
    return Math.max(3000, costJPY * 0.15) // ¥3,000以上または仕入値の15%
  } else {
    return Math.max(5000, costJPY * 0.12) // ¥5,000以上または仕入値の12%
  }
}

/**
 * 仕入値に応じた最低利益率を計算
 */
export function getMinProfitMargin(costJPY: number): number {
  if (costJPY < 10000) {
    return 0.08 // 8%以上
  } else if (costJPY < 30000) {
    return 0.10 // 10%以上
  } else {
    return 0.12 // 12%以上
  }
}

/**
 * 出品可否を判定
 * 
 * 判定基準:
 * 1. 利益額が最低基準を満たす OR
 * 2. 利益率が最低基準を満たす
 * 
 * → どちらか一方でも満たせば出品可能
 */
export function checkProfitability(params: ProfitabilityCheckParams): ProfitabilityResult {
  const { costJPY, profitJPY, profitMargin } = params

  // 最低基準を取得
  const minProfitRequired = getMinProfitAmount(costJPY)
  const minMarginRequired = getMinProfitMargin(costJPY)

  // 判定
  const profitAmountPass = profitJPY >= minProfitRequired
  const profitMarginPass = profitMargin >= minMarginRequired

  const canList = profitAmountPass || profitMarginPass

  // 理由を生成
  let reason = ''
  let recommendation = ''

  if (canList) {
    if (profitAmountPass && profitMarginPass) {
      reason = '✅ 利益額・利益率ともに基準を満たしています'
    } else if (profitAmountPass) {
      reason = '✅ 利益額が基準を満たしています（利益率は低め）'
      recommendation = '利益率を上げるため、送料や手数料を見直すことを推奨'
    } else {
      reason = '✅ 利益率が基準を満たしています（利益額は低め）'
      recommendation = '利益額を増やすため、商品価格を上げることを推奨'
    }
  } else {
    reason = '❌ 利益額・利益率ともに基準を満たしていません'
    recommendation = '仕入値が高すぎるか、送料・手数料が高すぎます。出品不可'
  }

  return {
    canList,
    reason,
    details: {
      minProfitRequired,
      actualProfit: profitJPY,
      minMarginRequired,
      actualMargin: profitMargin,
      passed: {
        profitAmount: profitAmountPass,
        profitMargin: profitMarginPass
      }
    },
    recommendation: recommendation || undefined
  }
}

/**
 * DDP/DDU両方の結果から総合判定
 */
export function checkBothModes(params: {
  costJPY: number
  resultDDP: any
  resultDDU: any
}): {
  ddpCheck: ProfitabilityResult
  dduCheck: ProfitabilityResult
  overallCanList: boolean
  recommendation: string
} {
  const { costJPY, resultDDP, resultDDU } = params

  const ddpCheck = checkProfitability({
    costJPY,
    profitJPY: resultDDP.profitJPY_NoRefund || 0,
    profitMargin: resultDDP.profitMargin_NoRefund || 0
  })

  const dduCheck = checkProfitability({
    costJPY,
    profitJPY: resultDDU.profitJPY_NoRefund || 0,
    profitMargin: resultDDU.profitMargin_NoRefund || 0
  })

  // 両方NGなら出品不可
  const overallCanList = ddpCheck.canList || dduCheck.canList

  let recommendation = ''
  if (overallCanList) {
    if (ddpCheck.canList && dduCheck.canList) {
      recommendation = 'DDP/DDU両方で出品可能。利益が高い方を推奨'
    } else if (ddpCheck.canList) {
      recommendation = 'DDPのみ出品可能。USA市場に特化'
    } else {
      recommendation = 'DDUのみ出品可能。USA以外の市場に特化'
    }
  } else {
    recommendation = 'DDP/DDU両方とも利益不足。出品不可'
  }

  return {
    ddpCheck,
    dduCheck,
    overallCanList,
    recommendation
  }
}
