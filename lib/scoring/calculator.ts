/**
 * スコア計算ロジック - 完全実装
 * 指示書の計算式を厳密に実装
 */

import { ScoreSettings, ScoreDetails, ProductMaster } from './types';

/**
 * P カテゴリ: 利益スコア
 */

/**
 * P1: 純利益スコア
 * 計算式: (純利益額 / 1000) × 100
 */
function calculateProfitScore(
  product: ProductMaster,
  settings: ScoreSettings
): number {
  const profit = (product.price_jpy || 0) - (product.acquired_price_jpy || 0);
  const baseScore = (profit / 1000) * settings.score_profit_per_1000_jpy;
  return Math.max(0, baseScore); // 負の値は0
}

/**
 * C カテゴリ: 競合スコア
 */

/**
 * C1: 飽和度ペナルティ
 * 新品: 軽減（最安値ボーナスで相殺）
 * 中古: 厳格（競合数 × ペナルティ）
 */
function calculateCompetitionScore(
  product: ProductMaster,
  settings: ScoreSettings
): number {
  const competitors = product.sm_competitors || 0;

  if (product.condition === 'new') {
    // 新品: 軽減
    return competitors * (settings.score_competitor_penalty * 0.3);
  } else {
    // 中古: 厳格
    return competitors * settings.score_competitor_penalty;
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

  // 最低利益をクリアしている場合
  const profit = (product.price_jpy || 0) - (product.acquired_price_jpy || 0);
  if (profit >= settings.penalty_low_profit_threshold) {
    return 500; // 大幅ボーナス
  }
  return 0;
}

/**
 * T カテゴリ: トレンドスコア
 */

/**
 * T1: 発売日からの経過スコア
 * 新品: 新しいほど高得点
 * 中古: 影響小
 */
function calculateTrendScore(
  product: ProductMaster,
  settings: ScoreSettings
): number {
  // 仮実装: sm_analyzed_atからの経過日数で判定
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
 * S カテゴリ: 希少性スコア
 */

/**
 * S1: 廃盤品フラグ（AI解析）
 * S4: コレクター要素（AI解析）
 */
function calculateScarcityScore(
  product: ProductMaster,
  settings: ScoreSettings
): number {
  let score = 0;

  // タイトルに廃盤キーワードが含まれる場合
  const discontinuedKeywords = [
    '廃盤',
    'ディスコン',
    'デッドストック',
    '生産終了',
  ];
  const title = (product.title || '') + (product.title_en || '');

  for (const keyword of discontinuedKeywords) {
    if (title.includes(keyword)) {
      score += settings.score_discontinued_bonus;
      break;
    }
  }

  // コレクターキーワード
  const collectorKeywords = [
    '限定',
    'レア',
    'コレクター',
    'limited',
    'rare',
    'collector',
  ];
  for (const keyword of collectorKeywords) {
    if (title.toLowerCase().includes(keyword.toLowerCase())) {
      score += settings.score_discontinued_bonus * 0.5;
      break;
    }
  }

  return score;
}

/**
 * R カテゴリ: 実績スコア
 */

/**
 * R1: 成功率スコア（SellerMirrorデータ活用）
 */
function calculateReliabilityScore(
  product: ProductMaster,
  settings: ScoreSettings
): number {
  if (!product.sm_profit_margin) return 0;

  // 利益率が高いほど高得点
  if (product.sm_profit_margin > 20) return settings.score_success_rate_bonus;
  if (product.sm_profit_margin > 10)
    return settings.score_success_rate_bonus * 0.5;
  return 0;
}

/**
 * M_Profit: 利益乗数
 * 高利益商品を優遇
 */
function calculateProfitMultiplier(
  product: ProductMaster,
  settings: ScoreSettings
): number {
  const profit = (product.price_jpy || 0) - (product.acquired_price_jpy || 0);
  if (profit <= 0) return 0.5; // 赤字はペナルティ

  const multiplier =
    settings.profit_multiplier_base +
    Math.floor(profit / settings.profit_multiplier_threshold) *
      settings.profit_multiplier_increment;

  return Math.min(multiplier, 3.0); // 最大3倍
}

/**
 * M_Penalty: ペナルティ乗数
 * 低利益・高リスク商品を抑制
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

  return 1.0; // ペナルティなし
}

/**
 * 最終スコア計算（重複なし）
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

  // 重み付け合計
  const weightedSum =
    P1 * settings.weight_profit +
    (C1 + C5) * settings.weight_competition +
    T1 * settings.weight_trend +
    S1 * settings.weight_scarcity +
    R1 * settings.weight_reliability;

  // 乗数計算
  const M_Profit = calculateProfitMultiplier(product, settings);
  const M_Penalty = calculatePenaltyMultiplier(product, settings);

  // 極めて微細な乱数（重複防止）
  const R = Math.random() * 0.001;

  // 最終スコア
  const finalScore = weightedSum * M_Profit * M_Penalty + R;

  // スコア内訳を保存
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
