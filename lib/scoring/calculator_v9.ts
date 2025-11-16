/**
 * スコア計算ロジック v9 - 10万点満点版
 */

import { ScoreSettings, ScoreDetails, ProductMaster } from './types';

export function calculateFinalScore(
  product: ProductMaster,
  settings: ScoreSettings
): { score: number; details: ScoreDetails } {
  
  let profitScore = 0;
  let competitionScore = 0;
  let futureScore = 0;
  let trendScore = 0;
  let scarcityScore = 0;
  let reliabilityScore = 0;
  
  let defaultProfitScore = 0;
  let lowestProfitScore = 0;
  let profitAmountScore = 0;
  let profitMarginScore = 0;
  let geminiScore = 0;
  
  // 1. 利益スコア
  const defaultProfitUsd = product.profit_amount_usd || 0;
  const defaultProfitMargin = product.profit_margin || 0;
  
  if (defaultProfitUsd > 0) {
    profitAmountScore = Math.min(1000, 
      200 + (Math.log(Math.max(defaultProfitUsd, 5)) - Math.log(5)) / (Math.log(100) - Math.log(5)) * 800
    );
  }
  
  if (defaultProfitMargin > 0) {
    profitMarginScore = Math.min(1000, defaultProfitMargin * 20);
  }
  
  defaultProfitScore = (profitAmountScore * 0.7) + (profitMarginScore * 0.3);
  
  const lowestProfitUsd = product.sm_profit_amount_usd || 0;
  
  if (lowestProfitUsd >= 0) {
    lowestProfitScore = 1000;
  } else if (lowestProfitUsd >= -10) {
    lowestProfitScore = 700 + (lowestProfitUsd / 10) * 300;
  } else if (lowestProfitUsd >= -50) {
    lowestProfitScore = 400 + ((lowestProfitUsd + 50) / 40) * 300;
  } else if (lowestProfitUsd >= -100) {
    lowestProfitScore = 100 + ((lowestProfitUsd + 100) / 50) * 300;
  } else {
    lowestProfitScore = Math.max(0, 100 + (lowestProfitUsd + 100) / 50);
  }
  
  profitScore = (defaultProfitScore * 0.7) + (lowestProfitScore * 0.3);
  
  // 2. 競合スコア
  const competitorCount = product.sm_competitor_count || product.sm_competitors || 0;
  competitionScore = Math.max(0, 1000 - competitorCount * 10);
  
  if (product.sm_lowest_price && product.sm_lowest_price > 0 && 
      product.ddp_price_usd && product.ddp_price_usd > 0) {
    const priceRatio = product.ddp_price_usd / product.sm_lowest_price;
    
    if (priceRatio <= 0.8) {
      competitionScore = Math.min(1000, competitionScore + 300);
    } else if (priceRatio <= 1.2) {
      competitionScore = Math.min(1000, competitionScore + (1.2 - priceRatio) / 0.4 * 300);
    }
  }
  
  // 3. 将来性
  if (product.discontinued_at) {
    const discontinuedDate = new Date(product.discontinued_at);
    const monthsSince = (Date.now() - discontinuedDate.getTime()) / (30 * 24 * 60 * 60 * 1000);
    futureScore = Math.max(600, 1000 - monthsSince / 12 * 200);
  } else if (product.release_date) {
    const releaseDate = new Date(product.release_date);
    const yearsSince = (Date.now() - releaseDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
    futureScore = Math.min(700, 300 + yearsSince * 100);
  } else {
    futureScore = 300;
  }
  
  try {
    const supplyTrend = product.scraped_data?.market_research?.c_supply_trend;
    if (supplyTrend === 'decreasing') {
      futureScore = Math.min(1000, futureScore + 150);
    }
  } catch (e) {}
  
  // 4. トレンド
  const salesCount = product.sm_sales_count || product.research_sold_count || 0;
  if (salesCount > 0) {
    trendScore = Math.min(1000, (Math.log(Math.max(salesCount, 1)) / Math.log(50)) * 1000);
  }
  
  // 5. 希少性
  try {
    const jpSupply = product.scraped_data?.market_research?.c_supply_japan;
    if (typeof jpSupply === 'number' && jpSupply > 0) {
      scarcityScore = Math.max(0, 1000 - (Math.log(jpSupply) / Math.log(1000)) * 1000);
    }
  } catch (e) {}
  
  // 6. 実績（Gemini統合）
  if (product.sm_analyzed_at) {
    reliabilityScore = 500;
    
    if (defaultProfitMargin > 15) {
      reliabilityScore = Math.min(1000, reliabilityScore + 500);
    } else if (defaultProfitMargin > 5) {
      reliabilityScore = Math.min(1000, reliabilityScore + 300);
    }
  }
  
  try {
    const fCommunity = product.scraped_data?.market_research?.f_community_score;
    
    if (typeof fCommunity === 'number') {
      geminiScore = (fCommunity / 10.0) * 200;
    } else {
      const competitionFactor = Math.min(100, (1000 - competitorCount * 10) / 10);
      const salesFactor = Math.min(100, salesCount * 10);
      geminiScore = (competitionFactor + salesFactor) / 2;
    }
    
    reliabilityScore = Math.min(1000, reliabilityScore + geminiScore);
  } catch (e) {
    const estimatedGemini = Math.min(100, (competitionScore / 10 + trendScore / 10) / 2);
    reliabilityScore = Math.min(1000, reliabilityScore + estimatedGemini);
  }
  
  // 重み付け
  const weightedSum = 
    (profitScore * settings.weight_profit / 100.0) * 100 +
    (competitionScore * settings.weight_competition / 100.0) * 100 +
    (futureScore * settings.weight_future / 100.0) * 100 +
    (trendScore * settings.weight_trend / 100.0) * 100 +
    (scarcityScore * settings.weight_scarcity / 100.0) * 100 +
    (reliabilityScore * settings.weight_reliability / 100.0) * 100;
  
  // 乱数
  const idString = String(product.id || '');
  const hashCode = idString.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  const randomValue = Math.abs(hashCode) % 1000;
  
  const finalScore = Math.min(100999, Math.round(weightedSum) + randomValue);
  
  const details: ScoreDetails = {
    profit_score: Math.round(profitScore),
    competition_score: Math.round(competitionScore),
    future_score: Math.round(futureScore),
    trend_score: Math.round(trendScore),
    scarcity_score: Math.round(scarcityScore),
    reliability_score: Math.round(reliabilityScore),
    default_profit_score: Math.round(defaultProfitScore),
    lowest_profit_score: Math.round(lowestProfitScore),
    gemini_score: Math.round(geminiScore),
    weighted_sum: Math.round(weightedSum),
    random_value: randomValue,
    final_score: finalScore,
    market_research_score: 0,
    jp_seller_score: 0,
    min_price_bonus: 0,
    price_competitiveness_score: 0,
    recent_sales_score: 0,
    jp_market_scarcity_score: 0,
    profit_multiplier: 1,
    penalty_multiplier: 1,
    image_score: 0,
    size_score: 0,
    html_score: 0,
    eu_score: 0,
    hts_score: 0,
    master_key_score: 0,
    sm_score: 0,
  };
  
  return { score: finalScore, details };
}

export function calculateBulkScores(
  products: ProductMaster[],
  settings: ScoreSettings
): Array<{ id: string; sku: string; score: number; details: ScoreDetails }> {
  return products.map((product) => {
    const { score, details } = calculateFinalScore(product, settings);
    return { id: product.id, sku: product.sku, score, details };
  });
}
