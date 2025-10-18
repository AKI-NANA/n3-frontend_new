/**
 * リサーチスコアリングエンジン
 * 
 * Gemini統合戦略:
 * - 既存のDDP計算エンジン（usa-price-calculator-v2.ts）の結果を統合
 * - HTS Section 301リスク、トランプ相互関税リスクを自動評価
 * - 仕入先可用性、在庫状況をスコアに反映
 * 
 * スコア範囲: 0-100
 */

import { calculateUsaPriceV2 } from '@/lib/ebay-pricing/usa-price-calculator-v2'

// スコアリング重み設定
export interface ScoringWeights {
  profitRate: number      // 利益率 (0-100) - デフォルト: 30
  salesVolume: number     // 売上数 (0-100) - デフォルト: 20
  competition: number     // 競合状況 (0-100) - デフォルト: 15
  riskLevel: number       // リスクレベル (0-100) - デフォルト: 25
  trendScore: number      // トレンドスコア (0-100) - デフォルト: 10
}

// デフォルト重み（合計100）
export const DEFAULT_WEIGHTS: ScoringWeights = {
  profitRate: 30,
  salesVolume: 20,
  competition: 15,
  riskLevel: 25,
  trendScore: 10,
}

// プリセット
export const SCORING_PRESETS = {
  conservative: {
    name: '保守的',
    description: 'リスク回避を最重視',
    weights: { profitRate: 25, salesVolume: 15, competition: 10, riskLevel: 40, trendScore: 10 }
  },
  balanced: {
    name: 'バランス',
    description: '全要素を均等に評価',
    weights: { profitRate: 30, salesVolume: 20, competition: 15, riskLevel: 25, trendScore: 10 }
  },
  aggressive: {
    name: '積極的',
    description: '高利益を最重視',
    weights: { profitRate: 45, salesVolume: 25, competition: 10, riskLevel: 10, trendScore: 10 }
  },
  trend_focused: {
    name: 'トレンド重視',
    description: '流行商品を優先',
    weights: { profitRate: 20, salesVolume: 30, competition: 10, riskLevel: 15, trendScore: 25 }
  }
}

// リスク要因
export interface RiskFactors {
  section301Risk: boolean      // Section 301 追加関税対象
  trumpTariffRisk: boolean     // トランプ相互関税リスク
  counterfeitRisk: boolean     // 偽物リスク
  marketVolatility: boolean    // 市場変動リスク
  regulatoryRisk: boolean      // 規制リスク
  supplierRisk: boolean        // 仕入先リスク
  competitionRisk: boolean     // 競合リスク
}

// スコア付き商品
export interface ScoredProduct {
  // 基本情報
  id: string
  ebayItemId: string
  title: string
  titleJP: string
  price: number
  soldCount: number
  
  // スコア情報
  totalScore: number           // 総合スコア (0-100)
  rank: number                 // ランキング
  scoreBreakdown: {
    profitRateScore: number
    salesVolumeScore: number
    competitionScore: number
    riskScore: number
    trendScore: number
  }
  
  // 利益計算結果（DDP計算エンジンから）
  profitCalculation?: {
    netProfit: number
    profitRate: number
    roi: number
    ddpTotal: number
    tariffAmount: number
  }
  
  // リスク評価
  riskFactors: RiskFactors
  riskLevel: 'low' | 'medium' | 'high'
  
  // 仕入先情報
  supplierMatches: Array<{
    source: string
    price: number
    availability: boolean
    matchScore: number
  }>
  
  // メタデータ
  calculatedAt: Date
  researchId: string
}

/**
 * 商品スコアを計算
 */
export async function calculateProductScore(
  product: any,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  supplierMatches: any[] = []
): Promise<ScoredProduct> {
  
  // 1. 利益率スコア計算（DDP計算エンジンを使用）
  const profitRateScore = await calculateProfitRateScore(product, supplierMatches)
  
  // 2. 売上数スコア計算
  const salesVolumeScore = calculateSalesVolumeScore(product.soldCount)
  
  // 3. 競合スコア計算
  const competitionScore = calculateCompetitionScore(product.competitorCount)
  
  // 4. リスクスコア計算（Gemini統合戦略）
  const { riskScore, riskFactors, riskLevel } = await calculateRiskScore(product)
  
  // 5. トレンドスコア計算
  const trendScore = calculateTrendScore(product)
  
  // 総合スコア計算（重み付け平均）
  const totalScore = (
    (profitRateScore * weights.profitRate +
     salesVolumeScore * weights.salesVolume +
     competitionScore * weights.competition +
     riskScore * weights.riskLevel +
     trendScore * weights.trendScore) / 100
  )
  
  return {
    id: product.id,
    ebayItemId: product.ebayItemId || '',
    title: product.title,
    titleJP: product.titleJP || product.title,
    price: product.price,
    soldCount: product.soldCount,
    totalScore: Math.round(totalScore * 100) / 100,
    rank: 0, // ソート後に設定
    scoreBreakdown: {
      profitRateScore,
      salesVolumeScore,
      competitionScore,
      riskScore,
      trendScore
    },
    profitCalculation: product.profitCalculation,
    riskFactors,
    riskLevel,
    supplierMatches: supplierMatches.map(s => ({
      source: s.name || s.source,
      price: s.price,
      availability: s.available,
      matchScore: s.matchScore || 100
    })),
    calculatedAt: new Date(),
    researchId: product.researchId || ''
  }
}

/**
 * 利益率スコア計算（DDP計算統合）
 * 
 * Gemini戦略: calculateUsaPriceV2を呼び出して実際のDDP利益率を使用
 */
async function calculateProfitRateScore(
  product: any, 
  supplierMatches: any[]
): Promise<number> {
  
  // 仕入先がある場合、最安値で計算
  if (supplierMatches.length > 0) {
    const lowestSupplier = supplierMatches
      .filter(s => s.available)
      .sort((a, b) => a.price - b.price)[0]
    
    if (lowestSupplier) {
      try {
        // DDP計算エンジンを使用
        const ddpResult = await calculateUsaPriceV2({
          costJPY: lowestSupplier.price,
          weight_kg: product.weight || 1.0,
          hsCode: product.hsCode || '8517.62.00',
          originCountry: product.originCountry || 'CN',
          targetProductPriceRatio: 0.7,
          exchangeRate: 150
        })
        
        if (ddpResult.success && ddpResult.profitMargin_NoRefund) {
          product.profitCalculation = {
            netProfit: ddpResult.profitUSD_NoRefund,
            profitRate: ddpResult.profitMargin_NoRefund,
            roi: (ddpResult.profitUSD_NoRefund / ddpResult.costUSD) * 100,
            ddpTotal: ddpResult.ddpTotal,
            tariffAmount: ddpResult.tariffAmount
          }
          
          const profitRate = ddpResult.profitMargin_NoRefund
          
          // スコア変換（0-100）
          // 利益率30%以上 → 100点
          // 利益率20% → 70点
          // 利益率10% → 40点
          // 利益率0% → 0点
          if (profitRate >= 30) return 100
          if (profitRate >= 20) return 70 + ((profitRate - 20) / 10) * 30
          if (profitRate >= 10) return 40 + ((profitRate - 10) / 10) * 30
          return (profitRate / 10) * 40
        }
      } catch (error) {
        console.error('DDP計算エラー:', error)
      }
    }
  }
  
  // フォールバック: 簡易計算
  const simpleProfitRate = ((product.price - product.japanPrice) / product.japanPrice) * 100
  
  if (simpleProfitRate >= 30) return 100
  if (simpleProfitRate >= 20) return 70 + ((simpleProfitRate - 20) / 10) * 30
  if (simpleProfitRate >= 10) return 40 + ((simpleProfitRate - 10) / 10) * 30
  return Math.max(0, (simpleProfitRate / 10) * 40)
}

/**
 * 売上数スコア計算
 */
function calculateSalesVolumeScore(soldCount: number): number {
  // 売上100件以上 → 100点
  // 売上50件 → 70点
  // 売上10件 → 40点
  // 売上1件 → 10点
  
  if (soldCount >= 100) return 100
  if (soldCount >= 50) return 70 + ((soldCount - 50) / 50) * 30
  if (soldCount >= 10) return 40 + ((soldCount - 10) / 40) * 30
  return 10 + ((soldCount - 1) / 9) * 30
}

/**
 * 競合スコア計算
 */
function calculateCompetitionScore(competitorCount: number): number {
  // 競合が少ないほど高スコア
  // 競合5件以下 → 100点
  // 競合10件 → 80点
  // 競合20件 → 60点
  // 競合50件以上 → 30点
  
  if (competitorCount <= 5) return 100
  if (competitorCount <= 10) return 80 + ((10 - competitorCount) / 5) * 20
  if (competitorCount <= 20) return 60 + ((20 - competitorCount) / 10) * 20
  if (competitorCount <= 50) return 30 + ((50 - competitorCount) / 30) * 30
  return 30
}

/**
 * リスクスコア計算（Gemini統合戦略）
 * 
 * 重要: HTS Section 301リスク、トランプ相互関税を評価
 */
async function calculateRiskScore(product: any): Promise<{
  riskScore: number
  riskFactors: RiskFactors
  riskLevel: 'low' | 'medium' | 'high'
}> {
  
  const riskFactors: RiskFactors = {
    section301Risk: false,
    trumpTariffRisk: false,
    counterfeitRisk: false,
    marketVolatility: false,
    regulatoryRisk: false,
    supplierRisk: false,
    competitionRisk: false
  }
  
  let riskPoints = 0 // リスクポイント（高いほど危険）
  
  // 1. Section 301リスク（中国原産）
  if (product.originCountry === 'CN') {
    riskFactors.section301Risk = true
    riskPoints += 25
  }
  
  // 2. トランプ相互関税リスク（特定国）
  const trumpTariffCountries = ['CN', 'MX', 'CA', 'EU']
  if (trumpTariffCountries.includes(product.originCountry)) {
    riskFactors.trumpTariffRisk = true
    riskPoints += 20
  }
  
  // 3. 偽物リスク（高額ブランド品）
  const brandKeywords = ['rolex', 'louis vuitton', 'gucci', 'apple', 'nike']
  if (brandKeywords.some(k => product.title.toLowerCase().includes(k))) {
    riskFactors.counterfeitRisk = true
    riskPoints += 15
  }
  
  // 4. 市場変動リスク（価格変動が大きい）
  if (product.price > 1000) {
    riskFactors.marketVolatility = true
    riskPoints += 10
  }
  
  // 5. 規制リスク（特定カテゴリ）
  const regulatedCategories = ['health', 'medical', 'food', 'drug']
  if (regulatedCategories.some(c => product.category?.toLowerCase().includes(c))) {
    riskFactors.regulatoryRisk = true
    riskPoints += 20
  }
  
  // 6. 仕入先リスク（仕入先が見つからない）
  if (!product.suppliers || product.suppliers.length === 0) {
    riskFactors.supplierRisk = true
    riskPoints += 30
  }
  
  // 7. 競合リスク（激戦市場）
  if (product.competitorCount > 50) {
    riskFactors.competitionRisk = true
    riskPoints += 15
  }
  
  // リスクレベル判定
  let riskLevel: 'low' | 'medium' | 'high'
  if (riskPoints <= 30) riskLevel = 'low'
  else if (riskPoints <= 60) riskLevel = 'medium'
  else riskLevel = 'high'
  
  // リスクスコア（リスクが低いほど高スコア）
  const riskScore = Math.max(0, 100 - riskPoints)
  
  return { riskScore, riskFactors, riskLevel }
}

/**
 * トレンドスコア計算
 */
function calculateTrendScore(product: any): number {
  // 簡易実装：直近の売上増加率を評価
  // 実際はトレンドAPIや過去データとの比較が必要
  
  const recentSales = product.soldCount || 0
  const avgSales = 20 // 仮の平均値
  
  if (recentSales > avgSales * 2) return 100
  if (recentSales > avgSales * 1.5) return 80
  if (recentSales > avgSales) return 60
  return 40
}

/**
 * 複数商品を一括スコアリング
 */
export async function scoreProducts(
  products: any[],
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  supplierMatchesMap: Map<string, any[]> = new Map()
): Promise<ScoredProduct[]> {
  
  const scoredProducts: ScoredProduct[] = []
  
  for (const product of products) {
    const supplierMatches = supplierMatchesMap.get(product.id) || []
    const scored = await calculateProductScore(product, weights, supplierMatches)
    scoredProducts.push(scored)
  }
  
  // スコア順にソート
  scoredProducts.sort((a, b) => b.totalScore - a.totalScore)
  
  // ランク付け
  scoredProducts.forEach((product, index) => {
    product.rank = index + 1
  })
  
  return scoredProducts
}

/**
 * スコアによるフィルタリング
 */
export function filterByScore(
  products: ScoredProduct[],
  minScore: number,
  maxScore: number = 100
): ScoredProduct[] {
  return products.filter(p => p.totalScore >= minScore && p.totalScore <= maxScore)
}

/**
 * リスクレベルによるフィルタリング
 */
export function filterByRisk(
  products: ScoredProduct[],
  riskLevels: Array<'low' | 'medium' | 'high'>
): ScoredProduct[] {
  return products.filter(p => riskLevels.includes(p.riskLevel))
}
