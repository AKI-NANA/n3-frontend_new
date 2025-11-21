/**
 * 無在庫輸入スコアリングエンジン
 *
 * Amazon JP/eBay JP ハイブリッド無在庫輸入システム
 *
 * スコアリング戦略:
 * - 利益率計算（仕入れ元価格、国際送料、FBA手数料を考慮）
 * - 納期遅延リスクスコア（リードタイムに基づく）
 * - 信頼性ボーナス（Amazon US/EU優先、AliExpressは限定的）
 * - 出品可否決定（スコアが閾値を超えたら無在庫出品を許可）
 *
 * スコア範囲: 0-100
 */

import { Product } from '@/types/product'

// スコアリング設定
export interface DropshipScoringConfig {
  exchangeRate: number              // 為替レート (デフォルト: 150 JPY/USD)
  internationalShipping: number     // 国際送料 (USD, デフォルト: 15)
  fbaFeeRate: number                // FBA手数料率 (デフォルト: 0.15)
  listingThreshold: number          // 出品許可スコア閾値 (デフォルト: 60)
  maxLeadTimeDays: number           // 許容最大リードタイム (デフォルト: 14日)
}

// デフォルト設定
export const DEFAULT_DROPSHIP_CONFIG: DropshipScoringConfig = {
  exchangeRate: 150,
  internationalShipping: 15,
  fbaFeeRate: 0.15,
  listingThreshold: 60,
  maxLeadTimeDays: 14,
}

// スコアリング結果
export interface DropshipScore {
  totalScore: number                // 総合スコア (0-100)
  profitScore: number               // 利益スコア
  leadTimeScore: number             // 納期スコア
  reliabilityScore: number          // 信頼性スコア

  // 利益計算詳細
  profitAnalysis: {
    sellingPriceJP: number          // 販売価格 (JPY)
    supplierPriceUSD: number        // 仕入れ価格 (USD)
    supplierPriceJPY: number        // 仕入れ価格 (JPY)
    internationalShipping: number   // 国際送料 (USD)
    fbaFee: number                  // FBA手数料 (JPY)
    netProfit: number               // 純利益 (JPY)
    profitMargin: number            // 利益率 (%)
  }

  // リスク評価
  riskFactors: {
    leadTimeExceeded: boolean       // リードタイム超過
    lowProfitMargin: boolean        // 低利益率
    unreliableSupplier: boolean     // 信頼性の低い仕入れ元
  }

  // 出品推奨
  shouldList: boolean               // 出品すべきか
  listingPriority: 'high' | 'medium' | 'low'  // 出品優先度

  calculatedAt: Date
}

/**
 * 無在庫輸入スコアを計算
 */
export function calculateDropshipScore(
  product: Product,
  config: DropshipScoringConfig = DEFAULT_DROPSHIP_CONFIG
): DropshipScore {

  // 1. 利益計算とスコア
  const profitAnalysis = calculateProfitAnalysis(product, config)
  const profitScore = calculateProfitScore(profitAnalysis.profitMargin)

  // 2. 納期スコア計算
  const { leadTimeScore, leadTimeExceeded } = calculateLeadTimeScore(
    product.estimated_lead_time_days || 0,
    config.maxLeadTimeDays
  )

  // 3. 信頼性スコア計算
  const { reliabilityScore, unreliableSupplier } = calculateReliabilityScore(
    product.potential_supplier
  )

  // 4. 総合スコア計算（重み付け平均）
  // 利益: 50%, 納期: 30%, 信頼性: 20%
  const totalScore = Math.round(
    profitScore * 0.5 +
    leadTimeScore * 0.3 +
    reliabilityScore * 0.2
  )

  // 5. リスク評価
  const riskFactors = {
    leadTimeExceeded,
    lowProfitMargin: profitAnalysis.profitMargin < 15,
    unreliableSupplier,
  }

  // 6. 出品推奨判定
  const shouldList = totalScore >= config.listingThreshold
  const listingPriority = determineListingPriority(totalScore)

  return {
    totalScore,
    profitScore,
    leadTimeScore,
    reliabilityScore,
    profitAnalysis,
    riskFactors,
    shouldList,
    listingPriority,
    calculatedAt: new Date(),
  }
}

/**
 * 利益計算
 */
function calculateProfitAnalysis(
  product: Product,
  config: DropshipScoringConfig
): DropshipScore['profitAnalysis'] {

  const sellingPriceJP = product.price || 0
  const supplierPriceUSD = product.supplier_current_price || 0
  const supplierPriceJPY = supplierPriceUSD * config.exchangeRate
  const internationalShipping = config.internationalShipping
  const fbaFee = sellingPriceJP * config.fbaFeeRate

  // 総コスト (JPY)
  const totalCostJPY = supplierPriceJPY + (internationalShipping * config.exchangeRate) + fbaFee

  // 純利益 (JPY)
  const netProfit = sellingPriceJP - totalCostJPY

  // 利益率 (%)
  const profitMargin = sellingPriceJP > 0 ? (netProfit / sellingPriceJP) * 100 : 0

  return {
    sellingPriceJP,
    supplierPriceUSD,
    supplierPriceJPY,
    internationalShipping,
    fbaFee,
    netProfit,
    profitMargin,
  }
}

/**
 * 利益率をスコアに変換
 *
 * 利益率30%以上 → 100点
 * 利益率20% → 70点
 * 利益率15% → 50点
 * 利益率10% → 30点
 * 利益率0%以下 → 0点
 */
function calculateProfitScore(profitMargin: number): number {
  if (profitMargin >= 30) return 100
  if (profitMargin >= 20) return 70 + ((profitMargin - 20) / 10) * 30
  if (profitMargin >= 15) return 50 + ((profitMargin - 15) / 5) * 20
  if (profitMargin >= 10) return 30 + ((profitMargin - 10) / 5) * 20
  if (profitMargin > 0) return (profitMargin / 10) * 30
  return 0
}

/**
 * 納期スコア計算
 *
 * リードタイムが短いほど高スコア
 * maxLeadTimeDaysを超えると大幅減点
 */
function calculateLeadTimeScore(
  estimatedLeadTimeDays: number,
  maxLeadTimeDays: number
): { leadTimeScore: number; leadTimeExceeded: boolean } {

  const leadTimeExceeded = estimatedLeadTimeDays > maxLeadTimeDays

  // リードタイムが0（未設定）の場合は中間スコア
  if (estimatedLeadTimeDays === 0) {
    return { leadTimeScore: 50, leadTimeExceeded: false }
  }

  // リードタイムスコア
  // 7日以内 → 100点
  // 14日以内 → 70点
  // 21日以内 → 40点
  // 30日以内 → 20点
  // 30日超過 → 0点
  let leadTimeScore = 0

  if (estimatedLeadTimeDays <= 7) {
    leadTimeScore = 100
  } else if (estimatedLeadTimeDays <= 14) {
    leadTimeScore = 70 + ((14 - estimatedLeadTimeDays) / 7) * 30
  } else if (estimatedLeadTimeDays <= 21) {
    leadTimeScore = 40 + ((21 - estimatedLeadTimeDays) / 7) * 30
  } else if (estimatedLeadTimeDays <= 30) {
    leadTimeScore = 20 + ((30 - estimatedLeadTimeDays) / 9) * 20
  } else {
    leadTimeScore = 0
  }

  // リードタイム超過の場合、スコアを減点
  if (leadTimeExceeded) {
    leadTimeScore = Math.max(0, leadTimeScore - 20)
  }

  return { leadTimeScore: Math.round(leadTimeScore), leadTimeExceeded }
}

/**
 * 信頼性スコア計算
 *
 * Amazon US/EU → 100点（高信頼性）
 * AliExpress → 60点（限定的利用）
 * 未設定 → 30点
 */
function calculateReliabilityScore(
  supplier: Product['potential_supplier']
): { reliabilityScore: number; unreliableSupplier: boolean } {

  let reliabilityScore = 30
  let unreliableSupplier = true

  if (supplier === 'Amazon_US' || supplier === 'Amazon_EU') {
    reliabilityScore = 100
    unreliableSupplier = false
  } else if (supplier === 'AliExpress') {
    reliabilityScore = 60
    unreliableSupplier = false
  }

  return { reliabilityScore, unreliableSupplier }
}

/**
 * 出品優先度を決定
 */
function determineListingPriority(totalScore: number): 'high' | 'medium' | 'low' {
  if (totalScore >= 80) return 'high'
  if (totalScore >= 60) return 'medium'
  return 'low'
}

/**
 * 複数商品を一括スコアリング
 */
export function scoreDropshipProducts(
  products: Product[],
  config: DropshipScoringConfig = DEFAULT_DROPSHIP_CONFIG
): Array<Product & { dropshipScore: DropshipScore }> {

  const scoredProducts = products.map(product => ({
    ...product,
    dropshipScore: calculateDropshipScore(product, config),
  }))

  // スコア順にソート
  scoredProducts.sort((a, b) => b.dropshipScore.totalScore - a.dropshipScore.totalScore)

  return scoredProducts
}

/**
 * 出品候補商品をフィルタリング
 */
export function filterListingCandidates(
  products: Product[],
  config: DropshipScoringConfig = DEFAULT_DROPSHIP_CONFIG
): Product[] {

  return products.filter(product => {
    const score = calculateDropshipScore(product, config)
    return score.shouldList
  })
}

/**
 * 価格改定が必要な商品を検出
 *
 * 仕入れ元の価格が変動した場合、利益率を維持できるよう
 * 販売価格の改定が必要かどうかを判定
 */
export function detectPriceUpdateNeeded(
  product: Product,
  newSupplierPrice: number,
  config: DropshipScoringConfig = DEFAULT_DROPSHIP_CONFIG
): {
  needsUpdate: boolean
  currentScore: DropshipScore
  newScore: DropshipScore
  recommendedPrice: number
} {

  const currentScore = calculateDropshipScore(product, config)

  // 新しい仕入れ価格でスコアを再計算
  const productWithNewPrice = {
    ...product,
    supplier_current_price: newSupplierPrice,
  }
  const newScore = calculateDropshipScore(productWithNewPrice, config)

  // 利益率が15%を下回る場合、価格改定が必要
  const needsUpdate = newScore.profitAnalysis.profitMargin < 15

  // 推奨販売価格を計算（利益率20%を確保）
  const targetProfitMargin = 0.2
  const supplierPriceJPY = newSupplierPrice * config.exchangeRate
  const internationalShipping = config.internationalShipping * config.exchangeRate
  const recommendedPrice = (supplierPriceJPY + internationalShipping) / (1 - config.fbaFeeRate - targetProfitMargin)

  return {
    needsUpdate,
    currentScore,
    newScore,
    recommendedPrice: Math.round(recommendedPrice),
  }
}
