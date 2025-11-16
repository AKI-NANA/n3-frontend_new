/**
 * スコア計算ロジック v2 - 改善版
 * 重み (Wk) が主導権を持つようにスケール調整
 */

import { ScoreSettings, ScoreDetails, ProductMaster } from './types';

/**
 * P1: 純利益スコア（スケール調整版）
 * 旧: (純利益額 / 1000) × 100点
 * 新: (純利益額 / score_profit_per_1000_jpy) × 10点
 * 
 * 理由: 100点が高すぎて重み Wk を無効化していたため、10点単位にスケールダウン
 */
function calculateProfitScore(
  product: ProductMaster,
  settings: ScoreSettings
): number {
  const profit = (product.price_jpy || 0) - (product.acquired_price_jpy || 0);
  
  // 新しいスケール: ×10点（従来の1/10）
  const baseScore = (profit / settings.score_profit_per_1000_jpy) * 10;
  
  return Math.max(0, baseScore);
}

/**
 * C1: 飽和度ペナルティ（対数処理版）
 * 
 * 改善点: 競合数が20件を超えた場合、減点の傾きを緩やかにする
 * 新品: 軽減（最安値ボーナスで相殺）
 * 中古: 厳格だが上限あり
 */
function calculateCompetitionScore(
  product: ProductMaster,
  settings: ScoreSettings
): number {
  const competitors = product.sm_competitors || 0;
  
  if (competitors === 0) return 0;

  const basePenalty = settings.score_competitor_penalty;
  
  if (product.condition === 'new') {
    // 新品: 軽減（30%）
    if (competitors <= 20) {
      return competitors * (basePenalty * 0.3);
    } else {
      // 20件超は対数処理で緩やか
      const linearPart = 20 * (basePenalty * 0.3);
      const logPart = Math.log10(competitors - 19) * (basePenalty * 0.3) * 5;
      return linearPart + logPart;
    }
  } else {
    // 中古: 厳格だが上限あり
    if (competitors <= 20) {
      return competitors * basePenalty;
    } else {
      // 20件超は対数処理
      const linearPart = 20 * basePenalty;
      const logPart = Math.log10(competitors - 19) * basePenalty * 5;
      const total = linearPart + logPart;
      
      // 最大減点値にキャップ（-3000点）
      return Math.max(total, -3000);
    }
  }
}

/**
 * C5: 最安値競争力ボーナス（新品のみ）
 */
function calculateMinPriceBonus(
  product: ProductMaster,
  settings: ScoreSettings
): number {
  if (product.condition !== 'new') return 0;

  const profit = (product.price_jpy || 0) - (product.acquired_price_jpy || 0);
  if (profit >= settings.penalty_low_profit_threshold) {
    return 500;
  }
  return 0;
}

/**
 * T1: 発売日からの経過スコア（分析鮮度）
 */
function calculateTrendScore(
  product: ProductMaster,
  settings: ScoreSettings
): number {
  if (!product.sm_analyzed_at) return 0;

  const daysSinceAnalysis = Math.floor(
    (Date.now() - new Date(product.sm_analyzed_at).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  // 分析が新しいほど高得点
  if (daysSinceAnalysis <= 7) return settings.score_trend_boost;
  if (daysSinceAnalysis <= 30) return settings.score_trend_boost * 0.5;
  return 0;
}

/**
 * S1: 希少性スコア（廃盤品・限定品）
 */
function calculateScarcityScore(
  product: ProductMaster,
  settings: ScoreSettings
): number {
  let score = 0;

  const discontinuedKeywords = [
    '廃盤',
    'ディスコン',
    'デッドストック',
    '生産終了',
  ];
  const collectorKeywords = [
    '限定',
    'レア',
    'コレクター',
    'limited',
    'rare',
    'collector',
  ];

  const title = (product.title || '') + (product.title_en || '');

  // 廃盤キーワード
  for (const keyword of discontinuedKeywords) {
    if (title.includes(keyword)) {
      score += settings.score_discontinued_bonus;
      break;
    }
  }

  // コレクターキーワード
  for (const keyword of collectorKeywords) {
    if (title.toLowerCase().includes(keyword.toLowerCase())) {
      score += settings.score_discontinued_bonus * 0.5;
      break;
    }
  }

  return score;
}

/**
 * R1: 実績スコア（SellerMirrorデータ活用）
 */
function calculateReliabilityScore(
  product: ProductMaster,
  settings: ScoreSettings
): number {
  if (!product.sm_profit_margin) return 0;

  if (product.sm_profit_margin > 20) return settings.score_success_rate_bonus;
  if (product.sm_profit_margin > 10)
    return settings.score_success_rate_bonus * 0.5;
  return 0;
}

/**
 * M_Profit: 利益乗数
 */
function calculateProfitMultiplier(
  product: ProductMaster,
  settings: ScoreSettings
): number {
  const profit = (product.price_jpy || 0) - (product.acquired_price_jpy || 0);
  if (profit <= 0) return 0.5;

  const multiplier =
    settings.profit_multiplier_base +
    Math.floor(profit / settings.profit_multiplier_threshold) *
      settings.profit_multiplier_increment;

  return Math.min(multiplier, 3.0);
}

/**
 * M_Penalty: ペナルティ乗数
 */
function calculatePenaltyMultiplier(
  product: ProductMaster,
  settings: ScoreSettings
): number {
  const profit = (product.price_jpy || 0) - (product.acquired_price_jpy || 0);

  // 低利益商品
  if (profit < settings.penalty_low_profit_threshold) {
    return settings.penalty_multiplier;
  }

  // 高競合（10件以上）
  if (product.sm_competitors && product.sm_competitors > 10) {
    return 0.8;
  }

  return 1.0;
}

/**
 * 最終スコア計算（改善版）
 */
export function calculateFinalScore(
  product: ProductMaster,
  settings: ScoreSettings
): { score: number; details: ScoreDetails } {
  // 各カテゴリスコアの計算
  const P1 = calculateProfitScore(product, settings);
  const C1 = calculateCompetitionScore(product, settings);
  const C5 = calculateMinPriceBonus(product, settings);
  const T1 = calculateTrendScore(product, settings);
  const S1 = calculateScarcityScore(product, settings);
  const R1 = calculateReliabilityScore(product, settings);

  // 重み付け合計（これで重みが主導権を持つ）
  const weightedSum =
    P1 * (settings.weight_profit / 100) +
    (C1 + C5) * (settings.weight_competition / 100) +
    T1 * (settings.weight_trend / 100) +
    S1 * (settings.weight_scarcity / 100) +
    R1 * (settings.weight_reliability / 100);

  // 乗数計算
  const M_Profit = calculateProfitMultiplier(product, settings);
  const M_Penalty = calculatePenaltyMultiplier(product, settings);

  // 極めて微細な乱数（重複防止）
  const R = Math.random() * 0.001;

  // 最終スコア
  const finalScore = weightedSum * M_Profit * M_Penalty + R;

  const details: ScoreDetails = {
    profit_score: P1,
    competition_score: C1,
    min_price_bonus: C5,
    trend_score: T1,
    scarcity_score: S1,
    reliability_score: R1,
    weighted_sum: weightedSum,
    profit_multiplier: M_Profit,
    penalty_multiplier: M_Penalty,
    random_value: R,
    final_score: finalScore,
  };

  return {
    score: Math.round(finalScore),
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
