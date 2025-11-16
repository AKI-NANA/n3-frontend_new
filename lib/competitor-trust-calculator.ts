/**
 * 競合信頼度プレミアム計算
 * eBayセラーの評価に基づいて価格プレミアムを算出
 */

export interface SellerInfo {
  username: string
  feedbackScore: number
  positivePercentage: number
}

export interface TrustPremium {
  trustScore: number // 0-100
  premiumPercent: number // 0-10%
  adjustedPrice: number
  reason: string
}

/**
 * セラー信頼度スコアを計算
 */
export function calculateTrustScore(seller: SellerInfo): number {
  let score = 0

  // Feedback Score評価 (最大40点)
  if (seller.feedbackScore >= 10000) score += 40
  else if (seller.feedbackScore >= 5000) score += 30
  else if (seller.feedbackScore >= 1000) score += 20
  else if (seller.feedbackScore >= 500) score += 10
  else if (seller.feedbackScore >= 100) score += 5

  // Positive % 評価 (最大60点)
  if (seller.positivePercentage >= 99.5) score += 60
  else if (seller.positivePercentage >= 99.0) score += 50
  else if (seller.positivePercentage >= 98.5) score += 40
  else if (seller.positivePercentage >= 98.0) score += 30
  else if (seller.positivePercentage >= 97.0) score += 20
  else if (seller.positivePercentage >= 95.0) score += 10

  return Math.min(score, 100)
}

/**
 * 信頼度プレミアムを計算
 */
export function calculateTrustPremium(
  seller: SellerInfo,
  basePrice: number
): TrustPremium {
  const trustScore = calculateTrustScore(seller)
  
  // 信頼度スコアから0-10%のプレミアムを計算
  const premiumPercent = (trustScore / 100) * 10

  const adjustedPrice = basePrice * (1 + premiumPercent / 100)

  // 理由を生成
  let reason = ''
  if (trustScore >= 80) {
    reason = '高信頼セラー（評価数・評価率とも高水準）'
  } else if (trustScore >= 60) {
    reason = '信頼できるセラー（良好な評価）'
  } else if (trustScore >= 40) {
    reason = '標準的なセラー'
  } else {
    reason = '評価が限定的なセラー'
  }

  return {
    trustScore,
    premiumPercent,
    adjustedPrice,
    reason
  }
}

/**
 * 複数の競合商品から最安値を計算（信頼度調整後）
 */
export function findLowestPriceWithTrust(
  competitors: Array<{ price: number; seller: SellerInfo }>
): {
  lowestPrice: number
  lowestAdjustedPrice: number
  bestCompetitor: { price: number; seller: SellerInfo; premium: TrustPremium }
} {
  const withPremiums = competitors.map(comp => ({
    ...comp,
    premium: calculateTrustPremium(comp.seller, comp.price)
  }))

  // 調整後価格でソート
  withPremiums.sort((a, b) => a.premium.adjustedPrice - b.premium.adjustedPrice)

  const best = withPremiums[0]

  return {
    lowestPrice: Math.min(...competitors.map(c => c.price)),
    lowestAdjustedPrice: best.premium.adjustedPrice,
    bestCompetitor: best
  }
}
