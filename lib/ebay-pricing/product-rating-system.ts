// lib/ebay-pricing/product-rating-system.ts
/**
 * 商品評価システム（改訂版）
 * - コンディション別の利益率基準
 * - S/A/B/C/Dランク判定（重みづけスコア付き）
 * - 出品可否は別途ZONE別損失チェックで判定
 */

export type ProductCondition = 'new' | 'used' | 'refurbished'
export type ProductRating = 'S' | 'A' | 'B' | 'C' | 'D'

export interface RatingCriteria {
  condition: ProductCondition
  standardMargin: number
  sRankThreshold: number
  aRankThreshold: number
  minProfitAmount: number
}

export interface ProductRatingInput {
  condition: ProductCondition
  profitJPY_NoRefund: number
  profitJPY_WithRefund: number
  profitMargin_NoRefund: number
  profitMargin_WithRefund: number
  costJPY: number
}

export interface ProductRatingResult {
  rating: ProductRating
  score: number // 重みづけスコア（0-100）リサーチツール用
  color: string
  icon: string
  label: string
  reason: string
  warnings: string[]
  recommendations: string[]
  details: {
    standardMargin: number
    actualMargin: number
    marginDiff: number
    profitWithRefund: number
    meetsStandard: boolean
  }
}

/**
 * コンディション別の評価基準
 */
export function getRatingCriteria(condition: ProductCondition): RatingCriteria {
  switch (condition) {
    case 'new':
      return {
        condition: 'new',
        standardMargin: 0.10,
        sRankThreshold: 0.18,
        aRankThreshold: 0.13,
        minProfitAmount: 3000
      }
    case 'used':
      return {
        condition: 'used',
        standardMargin: 0.20,
        sRankThreshold: 0.30,
        aRankThreshold: 0.23,
        minProfitAmount: 3000
      }
    case 'refurbished':
      return {
        condition: 'refurbished',
        standardMargin: 0.15,
        sRankThreshold: 0.23,
        aRankThreshold: 0.18,
        minProfitAmount: 3000
      }
  }
}

/**
 * 商品評価（重みづけスコア付き）
 */
export function rateProduct(input: ProductRatingInput): ProductRatingResult {
  const criteria = getRatingCriteria(input.condition)
  const warnings: string[] = []
  const recommendations: string[] = []

  const finalProfit = input.profitJPY_WithRefund
  const finalMargin = input.profitMargin_WithRefund
  const marginDiff = finalMargin - criteria.standardMargin

  let rating: ProductRating
  let score: number
  let reason: string

  // S判定：利益率が大幅に基準を上回る（スコア100）
  if (finalMargin >= criteria.sRankThreshold) {
    rating = 'S'
    score = 100
    reason = `最優良：標準利益率を${(marginDiff * 100).toFixed(1)}%大幅に上回る`
    recommendations.push('🌟 非常に良好な利益率です。優先的に出品推奨')
  }
  // A判定：利益率が基準を上回る（スコア80）
  else if (finalMargin >= criteria.aRankThreshold) {
    rating = 'A'
    score = 80
    reason = `優良：標準利益率を${(marginDiff * 100).toFixed(1)}%上回る`
    recommendations.push('✅ 良好な利益率です。積極的に出品推奨')
  }
  // B判定：標準利益率を満たす（スコア60）
  else if (finalMargin >= criteria.standardMargin) {
    rating = 'B'
    score = 60
    reason = `標準利益率${(criteria.standardMargin * 100).toFixed(0)}%を満たす（${(finalMargin * 100).toFixed(1)}%）`
  }
  // C判定：中古で利益率20%未満 かつ 利益額¥3,000以下（還付なし基準）（スコア40）
  else if (
    input.condition === 'used' &&
    input.profitMargin_NoRefund < 0.20 &&
    input.profitJPY_NoRefund <= 3000
  ) {
    rating = 'C'
    score = 40
    reason = '中古品で利益率20%未満かつ利益額¥3,000以下'
    warnings.push('⚠️ 要注意：利益率と利益額が両方低め')
    recommendations.push('可能であれば商品価格を10-15%上げることを推奨')
  }
  // D判定：消費税還付込みでも利益¥3,000未満（スコア10）
  else if (finalProfit < criteria.minProfitAmount) {
    rating = 'D'
    score = 10
    reason = `消費税還付込みでも利益が¥${criteria.minProfitAmount.toLocaleString()}未満（¥${Math.round(finalProfit).toLocaleString()}）`
    warnings.push('⚠️ 低利益：リサーチツールでの優先度が低くなります')
    recommendations.push('仕入値を下げるか、商品価格を上げることを推奨')
  }
  // その他：標準を下回るが利益は出る（スコア50）
  else {
    rating = 'B'
    score = 50
    reason = `利益額¥${Math.round(finalProfit).toLocaleString()}で基準をクリア`
    warnings.push(`利益率が標準${(criteria.standardMargin * 100).toFixed(0)}%を下回る（${(finalMargin * 100).toFixed(1)}%）`)
    recommendations.push('利益率改善のため、コスト削減または価格見直しを検討')
  }

  // 新品特有の警告
  if (input.condition === 'new' && finalMargin < 0.10 && finalProfit < 5000) {
    warnings.push('⚠️ 新品で利益率10%未満かつ利益額が¥5,000未満：利益額が小さいため厳しい')
  }

  // 消費税還付の効果
  const refundEffect = input.profitJPY_WithRefund - input.profitJPY_NoRefund
  if (refundEffect > 0) {
    recommendations.push(`💰 消費税還付で+¥${Math.round(refundEffect).toLocaleString()}の利益改善`)
  }

  const ratingConfig = getRatingConfig(rating)

  return {
    rating,
    score,
    color: ratingConfig.color,
    icon: ratingConfig.icon,
    label: ratingConfig.label,
    reason,
    warnings,
    recommendations,
    details: {
      standardMargin: criteria.standardMargin,
      actualMargin: finalMargin,
      marginDiff,
      profitWithRefund: finalProfit,
      meetsStandard: finalMargin >= criteria.standardMargin
    }
  }
}

function getRatingConfig(rating: ProductRating) {
  switch (rating) {
    case 'S':
      return {
        color: 'text-purple-600 bg-purple-50 border-purple-300',
        icon: '🌟',
        label: 'Sランク（最優良）'
      }
    case 'A':
      return {
        color: 'text-blue-600 bg-blue-50 border-blue-300',
        icon: '⭐',
        label: 'Aランク（優良）'
      }
    case 'B':
      return {
        color: 'text-green-600 bg-green-50 border-green-300',
        icon: '✅',
        label: 'Bランク（標準）'
      }
    case 'C':
      return {
        color: 'text-orange-600 bg-orange-50 border-orange-300',
        icon: '⚠️',
        label: 'Cランク（要注意）'
      }
    case 'D':
      return {
        color: 'text-red-600 bg-red-50 border-red-300',
        icon: '📉',
        label: 'Dランク（低利益）'
      }
  }
}

/**
 * ZONE別損失チェック
 */
export interface ZoneProfitCheck {
  zoneCode: string
  zoneName: string
  profitJPY: number
  profitMargin: number
  hasProfit: boolean
}

export interface MultiZoneProfitCheckResult {
  allZonesProfit: boolean // 全ZONEで利益が出ているか
  canList: boolean // 出品可否
  zoneResults: ZoneProfitCheck[]
  unprofitableZones: string[] // 損失が出るZONE
  reason: string
}

/**
 * 全ZONE で損失チェック
 */
export function checkAllZones(zoneResults: Array<{
  zoneCode: string
  zoneName: string
  profitJPY: number
  profitMargin: number
}>): MultiZoneProfitCheckResult {
  const zoneChecks: ZoneProfitCheck[] = zoneResults.map(z => ({
    zoneCode: z.zoneCode,
    zoneName: z.zoneName,
    profitJPY: z.profitJPY,
    profitMargin: z.profitMargin,
    hasProfit: z.profitJPY > 0 // 0円より大きければOK
  }))

  const unprofitableZones = zoneChecks
    .filter(z => !z.hasProfit)
    .map(z => z.zoneName)

  const allZonesProfit = unprofitableZones.length === 0
  const canList = allZonesProfit

  let reason = ''
  if (canList) {
    reason = '✅ 全ZONEで利益が出ており、出品可能です'
  } else {
    reason = `❌ 以下のZONEで損失が出るため出品不可: ${unprofitableZones.join(', ')}`
  }

  return {
    allZonesProfit,
    canList,
    zoneResults: zoneChecks,
    unprofitableZones,
    reason
  }
}

/**
 * DDP/DDU比較（評価ランクのみ）
 */
export function compareRatings(
  ddpInput: ProductRatingInput,
  dduInput: ProductRatingInput
): {
  ddpRating: ProductRatingResult
  dduRating: ProductRatingResult
  recommendation: string
  preferredMode: 'DDP' | 'DDU' | 'BOTH'
} {
  const ddpRating = rateProduct(ddpInput)
  const dduRating = rateProduct(dduInput)

  const ddpRank = ['S', 'A', 'B', 'C', 'D'].indexOf(ddpRating.rating)
  const dduRank = ['S', 'A', 'B', 'C', 'D'].indexOf(dduRating.rating)

  let recommendation: string
  let preferredMode: 'DDP' | 'DDU' | 'BOTH'

  if (ddpRank < dduRank) {
    recommendation = `✅ DDP推奨（${ddpRating.label} vs ${dduRating.label}）`
    preferredMode = 'DDP'
  } else if (dduRank < ddpRank) {
    recommendation = `✅ DDU推奨（${dduRating.label} vs ${ddpRating.label}）`
    preferredMode = 'DDU'
  } else {
    recommendation = `✅ DDP/DDU両方同等（${ddpRating.label}）。好みで選択可`
    preferredMode = 'BOTH'
  }

  return {
    ddpRating,
    dduRating,
    recommendation,
    preferredMode
  }
}

/**
 * バッチ処理用サマリー
 */
export function generateRatingSummary(ratings: ProductRatingResult[]) {
  const byRating: Record<ProductRating, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 }
  let totalMargin = 0
  let totalProfit = 0
  let totalScore = 0

  ratings.forEach(r => {
    byRating[r.rating]++
    totalMargin += r.details.actualMargin
    totalProfit += r.details.profitWithRefund
    totalScore += r.score
  })

  return {
    total: ratings.length,
    byRating,
    averageMargin: totalMargin / ratings.length,
    averageScore: totalScore / ratings.length,
    totalProfit
  }
}
