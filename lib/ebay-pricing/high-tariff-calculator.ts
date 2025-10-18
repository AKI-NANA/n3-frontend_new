/**
 * 中国製品の高関税に対応した価格計算
 * 
 * 反復計算が収束しない問題を解決
 */

export function calculatePriceWithHighTariff(params: {
  costUSD: number
  baseShipping: number
  totalShipping: number
  targetMarginDecimal: number
  ddpRate: number  // 例: 1.138 (113.8%)
  variableRate: number  // FVF + Payoneer + etc.
  insertionFee: number
}): number {
  const { costUSD, baseShipping, totalShipping, targetMarginDecimal, ddpRate, variableRate, insertionFee } = params

  // DDP Service Fee
  const DDP_SERVICE_FEE = 15
  const mpfRate = 0.003464

  /*
   * 数式:
   * P = 商品価格
   * S = 送料
   * 
   * 利益率 = (P + S - コスト - DDP - 変動費 - 固定費) / (P + S)
   * 
   * DDP = P × ddpRate + P × mpfRate + DDP_SERVICE_FEE
   * 変動費 = (P + S) × variableRate
   * 固定費 = costUSD + baseShipping + insertionFee
   * 
   * 解くと:
   * P = (M×S + S×V + 固定費 + DDP_SERVICE_FEE) / (1 - ddpRate - mpfRate - V - M)
   */

  const S = totalShipping
  const M = targetMarginDecimal
  const V = variableRate
  const D = ddpRate + mpfRate
  const fixedCost = costUSD + baseShipping + insertionFee

  const numerator = M * S + S * V + fixedCost + DDP_SERVICE_FEE
  const denominator = 1 - D - V - M

  console.log('📐 高関税計算:', {
    ddpRate: `${(ddpRate * 100).toFixed(1)}%`,
    mpfRate: `${(mpfRate * 100).toFixed(2)}%`,
    totalDDP: `${(D * 100).toFixed(2)}%`,
    variableRate: `${(V * 100).toFixed(2)}%`,
    targetMargin: `${(M * 100).toFixed(1)}%`,
    denominator: denominator.toFixed(4)
  })

  // 分母が負またはゼロに近い場合はエラー
  if (denominator <= 0.01) {
    const totalFixedRate = D + V + M
    const maxAchievableMargin = 1 - D - V - 0.01  // 最低1%の余裕を残す
    
    console.error('❌ 計算不可能: 目標利益率が高すぎます')
    console.error(`分母: ${denominator.toFixed(4)}`)
    console.error(`DDP: ${(D*100).toFixed(1)}% + 変動費: ${(V*100).toFixed(1)}% + 目標: ${(M*100).toFixed(1)}% = ${(totalFixedRate*100).toFixed(1)}%`)
    console.error(`達成可能な最大利益率: ${(maxAchievableMargin*100).toFixed(1)}%`)
    
    const error = new Error(
      `目標利益率${(M*100).toFixed(1)}%は達成不可能です。` +
      `DDP費用${(D*100).toFixed(1)}%と変動費${(V*100).toFixed(1)}%の合計が高すぎます。`
    )
    // 🆕 エラーに追加情報を付与
    ;(error as any).maxAchievableMargin = maxAchievableMargin
    ;(error as any).ddpRate = D
    ;(error as any).variableRate = V
    throw error
  }

  const productPrice = numerator / denominator

  return productPrice
}
