/**
 * スコア計算ロジック v3 - 将来性スコア(F)と日本人セラー競合(C2)対応
 * 
 * 重要: データ欠損に対して安全な設計
 * - データがない場合 → 0点（加点も減点もしない）
 * - データがある場合 → 適切に評価
 */

import { ScoreSettings, ScoreDetails, ProductMaster } from './types';

/**
 * P1: 純利益スコア（スケール調整版）
 */
function calculateProfitScore(
  product: ProductMaster,
  settings: ScoreSettings
): number {
  const profit = (product.price_jpy || 0) - (product.purchase_price_jpy || 0);
  const baseScore = (profit / settings.score_profit_per_1000_jpy) * 10;
  return Math.max(0, baseScore);
}

/**
 * C1: 飽和度ペナルティ（対数処理版）
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
      const linearPart = 20 * (basePenalty * 0.3);
      const logPart = Math.log10(competitors - 19) * (basePenalty * 0.3) * 5;
      return linearPart + logPart;
    }
  } else {
    // 中古: 厳格だが上限あり
    if (competitors <= 20) {
      return competitors * basePenalty;
    } else {
      const linearPart = 20 * basePenalty;
      const logPart = Math.log10(competitors - 19) * basePenalty * 5;
      const total = linearPart + logPart;
      return Math.max(total, -3000); // キャップ
    }
  }
}

/**
 * C2: 日本人セラー競合スコア（新規）
 * 
 * ロジック:
 * - データなし → 0点
 * - 日本人セラー少ない（0-2件） → +100点（独占的なチャンス）
 * - 日本人セラー普通（3-5件） → 0点
 * - 日本人セラー多い（6件以上） → -70点/件（価格競争リスク）
 */
function calculateJpSellerScore(
  product: ProductMaster,
  settings: ScoreSettings
): number {
  // データがない場合は0点
  if (product.sm_jp_sellers === null || product.sm_jp_sellers === undefined) {
    return 0;
  }

  const jpSellers = product.sm_jp_sellers;
  
  // 日本人セラーが極めて少ない（独占的チャンス）
  if (jpSellers <= 2) {
    return 100;
  }
  
  // 普通の競合レベル
  if (jpSellers <= 5) {
    return 0;
  }
  
  // 価格競争が激しい
  return (jpSellers - 5) * settings.score_jp_seller_penalty * 0.7;
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
 * F1: 発売後期間ブースト（新規）
 * 
 * ロジック:
 * - データなし → 0点
 * - 発売後3ヶ月以内 → +200点
 * - 発売後6ヶ月以内 → +100点
 * - それ以降 → 0点
 */
function calculateReleaseBoost(
  product: ProductMaster,
  settings: ScoreSettings
): number {
  // 発売日データがない場合は0点
  if (!product.release_date) return 0;

  const releaseDate = new Date(product.release_date);
  const now = new Date();
  const monthsSinceRelease = 
    (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

  if (monthsSinceRelease < 0) {
    // 未発売（予約商品）
    return settings.score_future_release_boost * 1.5;
  } else if (monthsSinceRelease <= 3) {
    // 発売後3ヶ月以内
    return settings.score_future_release_boost;
  } else if (monthsSinceRelease <= 6) {
    // 発売後6ヶ月以内
    return settings.score_future_release_boost * 0.5;
  }
  
  return 0;
}

/**
 * F2: 予約・高騰可能性ブースト（新規）
 * 
 * ロジック:
 * - キーワード検出 → +150点
 * - 定価との乖離が大きい → +100点
 * - データなし → 0点
 */
function calculatePremiumBoost(
  product: ProductMaster,
  settings: ScoreSettings
): number {
  let score = 0;

  // 予約・プレミアキーワード検出
  const premiumKeywords = [
    '予約', 'プレオーダー', '予約受付中', 'pre-order',
    '品薄', '入手困難', 'プレミア', 'premium',
    '限定生産', '数量限定'
  ];

  const title = (product.title || '') + (product.title_en || '');
  for (const keyword of premiumKeywords) {
    if (title.toLowerCase().includes(keyword.toLowerCase())) {
      score += settings.score_future_premium_boost;
      break;
    }
  }

  // 定価との乖離チェック（プレミア化の兆候）
  if (product.msrp_jpy && product.purchase_price_jpy) {
    const premiumRatio = product.purchase_price_jpy / product.msrp_jpy;
    
    // 仕入価格が定価の1.3倍以上ならプレミア化している
    if (premiumRatio >= 1.3) {
      score += settings.score_future_premium_boost * 0.7;
    }
  }

  return score;
}

/**
 * F3: 廃盤品ライフサイクル（新規）
 * 
 * ロジック:
 * - データなし → 既存のS1スコアに統合
 * - 廃盤後1年以内 → +200点（プレミア化ピーク）
 * - 廃盤後3年以内 → +100点
 * - それ以降 → +50点（安定在庫）
 */
function calculateDiscontinuedLifecycle(
  product: ProductMaster,
  settings: ScoreSettings
): number {
  // 廃盤判定日データがない場合は0点
  if (!product.discontinued_at) return 0;

  const discontinuedDate = new Date(product.discontinued_at);
  const now = new Date();
  const yearsSinceDiscontinued = 
    (now.getTime() - discontinuedDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

  if (yearsSinceDiscontinued <= 1) {
    // 廃盤後1年以内 - プレミア化のピーク
    return 200;
  } else if (yearsSinceDiscontinued <= 3) {
    // 廃盤後3年以内
    return 100;
  } else {
    // 長期安定在庫
    return 50;
  }
}

/**
 * F: 将来性スコア（統合）
 */
function calculateFutureScore(
  product: ProductMaster,
  settings: ScoreSettings
): number {
  const F1 = calculateReleaseBoost(product, settings);
  const F2 = calculatePremiumBoost(product, settings);
  const F3 = calculateDiscontinuedLifecycle(product, settings);
  
  return F1 + F2 + F3;
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
    '廃盤', 'ディスコン', 'デッドストック', '生産終了',
  ];
  const collectorKeywords = [
    '限定', 'レア', 'コレクター', 'limited', 'rare', 'collector',
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
  const profit = (product.price_jpy || 0) - (product.purchase_price_jpy || 0);
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
  const profit = (product.price_jpy || 0) - (product.purchase_price_jpy || 0);

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
 * 最終スコア計算（v3 - 将来性・日本人セラー対応）
 */
export function calculateFinalScore(
  product: ProductMaster,
  settings: ScoreSettings
): { score: number; details: ScoreDetails } {
  // 各カテゴリスコアの計算
  const P1 = calculateProfitScore(product, settings);
  const C1 = calculateCompetitionScore(product, settings);
  const C2 = calculateJpSellerScore(product, settings);
  const C5 = calculateMinPriceBonus(product, settings);
  const F = calculateFutureScore(product, settings);
  const T1 = calculateTrendScore(product, settings);
  const S1 = calculateScarcityScore(product, settings);
  const R1 = calculateReliabilityScore(product, settings);

  // 重み付け合計
  const weightedSum =
    P1 * (settings.weight_profit / 100) +
    (C1 + C2 + C5) * (settings.weight_competition / 100) +
    F * (settings.weight_future / 100) +
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
    jp_seller_score: C2,
    min_price_bonus: C5,
    future_score: F,
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
