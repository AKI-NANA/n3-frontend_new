/**
 * スコア計算ロジック v8.1 - 2種類の利益を評価
 * デフォルト利益 + 最安値対応利益の両方を考慮
 */

import { ScoreSettings, ScoreDetails, ProductMaster } from './types';

/**
 * スコア計算（v8.1: デフォルト利益 + 最安値対応利益）
 */
export function calculateFinalScore(
  product: ProductMaster,
  settings: ScoreSettings
): { score: number; details: ScoreDetails } {
  
  // 各カテゴリの生スコア（0-100）
  let profitScore = 0;
  let competitionScore = 0;
  let futureScore = 0;
  let trendScore = 0;
  let scarcityScore = 0;
  let reliabilityScore = 0;
  
  // 中間計算用
  let defaultProfitScore = 0;      // デフォルト価格での利益
  let lowestProfitScore = 0;       // 最安値対応の利益
  let profitAmountScore = 0;
  let profitMarginScore = 0;
  let categoryBonus = 0;
  let geminiBonus = 0;
  
  // =============================================
  // 1. 利益スコア（デフォルト + 最安値の両方を評価）
  // =============================================
  
  // 1-A. デフォルト価格での利益（メイン: 70%）
  const defaultProfitUsd = product.profit_amount_usd || 0;
  const defaultProfitMargin = product.profit_margin || 0;
  
  if (defaultProfitUsd > 0) {
    // $5-100の範囲を対数スケールで0-100点にマッピング
    profitAmountScore = Math.min(100, 
      20 + (Math.log(Math.max(defaultProfitUsd, 5)) - Math.log(5)) / (Math.log(100) - Math.log(5)) * 80
    );
  }
  
  if (defaultProfitMargin > 0) {
    // 0-50%の範囲を0-100点に
    profitMarginScore = Math.min(100, defaultProfitMargin * 2);
  }
  
  // デフォルト利益スコア = 額70% + 率30%
  defaultProfitScore = (profitAmountScore * 0.7) + (profitMarginScore * 0.3);
  
  // 1-B. 最安値対応の利益（競争力指標: 30%）
  const lowestProfitUsd = product.sm_profit_amount_usd || 0;
  const lowestProfitMargin = product.sm_profit_margin || 0;
  
  if (lowestProfitUsd >= 0) {
    // 最安値でも利益が出る = 100点
    lowestProfitScore = 100;
  } else if (lowestProfitUsd >= -10) {
    // -$10以内の赤字 = 許容範囲 = 70点
    lowestProfitScore = 70 + (lowestProfitUsd / 10) * 30;
  } else if (lowestProfitUsd >= -50) {
    // -$10〜-$50の赤字 = やや厳しい = 40-70点
    lowestProfitScore = 40 + ((lowestProfitUsd + 50) / 40) * 30;
  } else if (lowestProfitUsd >= -100) {
    // -$50〜-$100の赤字 = 厳しい = 10-40点
    lowestProfitScore = 10 + ((lowestProfitUsd + 100) / 50) * 30;
  } else {
    // -$100以上の赤字 = 非常に厳しい = 0-10点
    lowestProfitScore = Math.max(0, 10 + (lowestProfitUsd + 100) / 50);
  }
  
  // 統合利益スコア = デフォルト70% + 最安値対応30%
  profitScore = (defaultProfitScore * 0.7) + (lowestProfitScore * 0.3);
  
  // =============================================
  // 2. 競合スコア（連続値）
  // =============================================
  const competitorCount = product.sm_competitor_count || product.sm_competitors || 0;
  competitionScore = Math.max(0, 100 - competitorCount);
  
  // 最安値競争力のボーナス
  if (product.sm_lowest_price && product.sm_lowest_price > 0 && 
      product.ddp_price_usd && product.ddp_price_usd > 0) {
    const priceRatio = product.ddp_price_usd / product.sm_lowest_price;
    
    if (priceRatio <= 0.8) {
      competitionScore = Math.min(100, competitionScore + 30);
    } else if (priceRatio <= 1.2) {
      competitionScore = Math.min(100, competitionScore + (1.2 - priceRatio) / 0.4 * 30);
    }
  }
  
  // =============================================
  // 3. 将来性スコア
  // =============================================
  if (product.discontinued_at) {
    const discontinuedDate = new Date(product.discontinued_at);
    const monthsSince = (Date.now() - discontinuedDate.getTime()) / (30 * 24 * 60 * 60 * 1000);
    futureScore = Math.max(60, 100 - monthsSince / 12 * 20);
  } else if (product.release_date) {
    const releaseDate = new Date(product.release_date);
    const yearsSince = (Date.now() - releaseDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
    futureScore = Math.min(70, 30 + yearsSince * 10);
  } else {
    futureScore = 30;
  }
  
  // Geminiの供給トレンドを加味
  try {
    const supplyTrend = product.scraped_data?.market_research?.c_supply_trend;
    if (supplyTrend === 'decreasing') {
      futureScore = Math.min(100, futureScore + 15);
    }
  } catch (e) {
    // ignore
  }
  
  // =============================================
  // 4. トレンドスコア（売れ行き - 連続値）
  // =============================================
  const salesCount = product.sm_sales_count || product.research_sold_count || 0;
  if (salesCount > 0) {
    trendScore = Math.min(100, (Math.log(Math.max(salesCount, 1)) / Math.log(50)) * 100);
  }
  
  // =============================================
  // 5. 希少性スコア（連続値）
  // =============================================
  try {
    const jpSupply = product.scraped_data?.market_research?.c_supply_japan;
    if (typeof jpSupply === 'number' && jpSupply > 0) {
      scarcityScore = Math.max(0, 100 - (Math.log(jpSupply) / Math.log(1000)) * 100);
    }
  } catch (e) {
    scarcityScore = 0;
  }
  
  // =============================================
  // 6. 実績スコア
  // =============================================
  if (product.sm_analyzed_at) {
    reliabilityScore = 50;
    
    // デフォルト利益率でボーナス（最安値ではなく）
    if (defaultProfitMargin > 15) {
      reliabilityScore = Math.min(100, reliabilityScore + 50);
    } else if (defaultProfitMargin > 5) {
      reliabilityScore = Math.min(100, reliabilityScore + 30);
    }
  }
  
  // Geminiのコミュニティスコアを加味
  try {
    const fCommunity = product.scraped_data?.market_research?.f_community_score || 0;
    geminiBonus = (fCommunity / 10.0) * 20;
    reliabilityScore = Math.min(100, reliabilityScore + geminiBonus);
  } catch (e) {
    // ignore
  }
  
  // =============================================
  // 重み付け計算
  // =============================================
  const weightedSum = 
    (profitScore * settings.weight_profit / 100.0) +
    (competitionScore * settings.weight_competition / 100.0) +
    (futureScore * settings.weight_future / 100.0) +
    (trendScore * settings.weight_trend / 100.0) +
    (scarcityScore * settings.weight_scarcity / 100.0) +
    (reliabilityScore * settings.weight_reliability / 100.0);
  
  // =============================================
  // 唯一無二を保証する乱数（0.0000-0.9999）
  // =============================================
  const idString = String(product.id || '');
  const hashCode = idString.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  const randomValue = (Math.abs(hashCode) % 10000) / 10000.0; // 4桁に拡張
  
  // 最終スコア（小数点4桁）
  const finalScore = Math.min(100.9999, weightedSum + randomValue);
  
  const details: ScoreDetails = {
    profit_score: Math.round(profitScore * 100) / 100,
    competition_score: Math.round(competitionScore * 100) / 100,
    future_score: Math.round(futureScore * 100) / 100,
    trend_score: Math.round(trendScore * 100) / 100,
    scarcity_score: Math.round(scarcityScore * 100) / 100,
    reliability_score: Math.round(reliabilityScore * 100) / 100,
    
    // 🆕 詳細内訳
    default_profit_score: Math.round(defaultProfitScore * 100) / 100,
    lowest_profit_score: Math.round(lowestProfitScore * 100) / 100,
    
    weighted_sum: Math.round(weightedSum * 10000) / 10000,
    random_value: Math.round(randomValue * 10000) / 10000,
    final_score: Math.round(finalScore * 10000) / 10000,
    
    // 旧システムとの互換性
    market_research_score: 0,
    jp_seller_score: 0,
    min_price_bonus: 0,
    price_competitiveness_score: 0,
    recent_sales_score: 0,
    jp_market_scarcity_score: 0,
    profit_multiplier: 1,
    penalty_multiplier: 1,
    
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
