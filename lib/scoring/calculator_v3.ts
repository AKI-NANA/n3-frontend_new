/**
 * スコア計算ロジック v5 - 実際のDBカラムに対応
 * 
 * 市場調査データなしでも公平に評価
 */

import { ScoreSettings, ScoreDetails, ProductMaster } from './types';

/**
 * 画像枚数を取得
 */
function getImageCount(product: ProductMaster): number {
  if (product.images && Array.isArray(product.images)) {
    return product.images.length;
  }
  if (product.image_urls && Array.isArray(product.image_urls)) {
    return product.image_urls.length;
  }
  if (product.primary_image_url) {
    return 1;
  }
  return 0;
}

/**
 * スコア計算（実際のDBカラムに対応版）
 */
export function calculateFinalScore(
  product: ProductMaster,
  settings: ScoreSettings
): { score: number; details: ScoreDetails } {
  let rawScore = 0;
  
  // =============================================
  // A. 競争力（30点）
  // =============================================
  
  // 1. 競合の少なさ（15点）
  let competitionScore = 0;
  const competitorCount = product.sm_competitor_count || product.sm_competitors || 0;
  if (competitorCount === 0) competitionScore = 15;
  else if (competitorCount <= 5) competitionScore = 12;
  else if (competitorCount <= 20) competitionScore = 8;
  else if (competitorCount <= 50) competitionScore = 3;
  rawScore += competitionScore;
  
  // 2. 最安値競争力（15点）
  let priceCompetitivenessScore = 0;
  if (product.sm_lowest_price && product.ddp_price_usd) {
    if (product.ddp_price_usd < product.sm_lowest_price) {
      priceCompetitivenessScore = 15; // 最安値を取れる
    } else if (product.ddp_price_usd <= product.sm_lowest_price * 1.1) {
      priceCompetitivenessScore = 10; // 最安値の110%以内
    } else if (product.ddp_price_usd <= product.sm_lowest_price * 1.2) {
      priceCompetitivenessScore = 5;  // 最安値の120%以内
    }
  }
  rawScore += priceCompetitivenessScore;
  
  // =============================================
  // B. 実績と将来性（30点）
  // =============================================
  
  // 3. eBay売れ行き実績（20点）
  let recentSalesScore = 0;
  const recentSales = product.sm_sales_count || product.research_sold_count || 0;
  if (recentSales >= 10) recentSalesScore = 20;
  else if (recentSales >= 5) recentSalesScore = 15;
  else if (recentSales >= 2) recentSalesScore = 10;
  else if (recentSales >= 1) recentSalesScore = 5;
  rawScore += recentSalesScore;
  
  // 4. 廃盤・希少性（10点）
  let scarcityScore = 0;
  if (product.discontinued_at) {
    scarcityScore = 10;
  } else if (product.release_date) {
    const releaseDate = new Date(product.release_date);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    if (releaseDate < twoYearsAgo) {
      scarcityScore = 5;
    }
  }
  rawScore += scarcityScore;
  
  // =============================================
  // C. 利益額（30点）
  // =============================================
  
  // 5. 絶対利益額（30点） - 最重要
  let profitScore = 0;
  const profitAmount = product.sm_profit_amount_usd || product.profit_amount_usd || 0;
  if (profitAmount >= 50) profitScore = 30;
  else if (profitAmount >= 30) profitScore = 25;
  else if (profitAmount >= 20) profitScore = 20;
  else if (profitAmount >= 15) profitScore = 15;
  else if (profitAmount >= 10) profitScore = 10;
  else if (profitAmount >= 5) profitScore = 5;
  rawScore += profitScore;
  
  // =============================================
  // D. 日本市場の希少性（10点）
  // =============================================
  
  // 6. 日本市場の供給量（10点）
  let jpMarketScarcityScore = 0;
  try {
    const jpSupply = product.scraped_data?.market_research?.c_supply_japan;
    if (typeof jpSupply === 'number') {
      if (jpSupply <= 10) jpMarketScarcityScore = 10;
      else if (jpSupply <= 50) jpMarketScarcityScore = 7;
      else if (jpSupply <= 200) jpMarketScarcityScore = 4;
      else if (jpSupply <= 500) jpMarketScarcityScore = 1;
    }
  } catch (e) {
    jpMarketScarcityScore = 0;
  }
  rawScore += jpMarketScarcityScore;
  
  // 最終スコアは100点でキャップ
  const finalScore = Math.min(100, rawScore);
  
  const details: ScoreDetails = {
    // 新スコアシステム
    competition_score: competitionScore,
    price_competitiveness_score: priceCompetitivenessScore,
    recent_sales_score: recentSalesScore,
    scarcity_score: scarcityScore,
    profit_score: profitScore,
    jp_market_scarcity_score: jpMarketScarcityScore,
    
    // 旧システムとの互換性
    market_research_score: 0,
    jp_seller_score: 0,
    min_price_bonus: priceCompetitivenessScore,
    future_score: scarcityScore,
    trend_score: recentSalesScore,
    reliability_score: profitScore,
    weighted_sum: rawScore,
    profit_multiplier: 1,
    penalty_multiplier: 1,
    random_value: 0,
    final_score: finalScore,
    
    // 削除された項目
    image_score: 0,
    size_score: 0,
    html_score: 0,
    eu_score: 0,
    hts_score: 0,
    master_key_score: 0,
    sm_score: 0,
  };
  
  return {
    score: finalScore,
    details,
  };
}

/**
 * 複数商品のスコア計算
 */
export function calculateBulkScores(
  products: ProductMaster[],
  settings: ScoreSettings
): Array<{ id: string; sku: string; score: number; details: ScoreDetails }> {
  return products.map((product) => {
    const { score, details } = calculateFinalScore(product, settings);
    return {
      id: product.id,
      sku: product.sku,
      score,
      details,
    };
  });
}
