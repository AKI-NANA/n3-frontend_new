/**
 * スコア計算への仕入れ原価統合ロジック
 * AI特定の仕入れ先候補データをスコア計算に反映
 */

import { SupplierCandidate, CostDataForScoring } from '@/types/supplier';
import { ProductMaster, ScoreDetails, ScoreSettings } from './types';
import { calculateFinalScore } from './calculator_v9';

/**
 * 仕入れ原価データの取得
 */
export function getCostDataForScoring(
  product: ProductMaster,
  bestSupplier?: SupplierCandidate
): CostDataForScoring {
  // 既存の確定原価があるか
  const hasActualCost = !!product.actual_cost_jpy && product.actual_cost_jpy > 0;

  if (hasActualCost) {
    // 確定原価を使用
    return {
      has_actual_cost: true,
      actual_cost_jpy: product.actual_cost_jpy!,
      cost_confidence: 1.0, // 100%信頼度
      domestic_shipping_jpy: 0, // 既に含まれている前提
      total_cost_jpy: product.actual_cost_jpy!,
    };
  }

  // AI特定の候補原価を使用
  if (bestSupplier) {
    return {
      has_actual_cost: false,
      ai_candidate_cost_jpy: bestSupplier.candidate_price_jpy,
      cost_confidence: bestSupplier.confidence_score,
      domestic_shipping_jpy: bestSupplier.estimated_domestic_shipping_jpy,
      total_cost_jpy: bestSupplier.total_cost_jpy,
    };
  }

  // どちらもない場合は、既存の価格データをフォールバック
  return {
    has_actual_cost: false,
    cost_confidence: 0.3, // 低信頼度
    domestic_shipping_jpy: 0,
    total_cost_jpy: product.price_jpy || 0,
  };
}

/**
 * AI仕入れ原価を使った商品データの作成
 * スコア計算用に、仮原価を反映した商品データを生成
 */
export function createProductWithSupplierCost(
  product: ProductMaster,
  costData: CostDataForScoring,
  exchangeRateJpyToUsd: number = 0.0067 // デフォルト: 1円 = 0.0067ドル（約150円/ドル）
): ProductMaster {
  // 仕入れ原価が確定している場合は、元の商品データをそのまま返す
  if (costData.has_actual_cost) {
    return product;
  }

  // AI特定の仮原価を使用して、利益を再計算
  const totalCostJpy = costData.total_cost_jpy;
  const totalCostUsd = totalCostJpy * exchangeRateJpyToUsd;

  // eBay販売価格（既存のDDP価格を使用）
  const sellingPriceUsd = product.ddp_price_usd || product.ddu_price_usd || 0;

  // 再計算された利益
  const newProfitUsd = sellingPriceUsd - totalCostUsd;
  const newProfitMargin =
    sellingPriceUsd > 0 ? (newProfitUsd / sellingPriceUsd) * 100 : 0;

  // 新しい商品データを作成（既存データをコピーし、利益情報を上書き）
  return {
    ...product,
    actual_cost_jpy: totalCostJpy,
    profit_amount_usd: newProfitUsd,
    profit_margin: newProfitMargin,
  };
}

/**
 * 信頼度ペナルティ乗数の計算
 * 仕入れ先特定の信頼度が低い場合、スコアにペナルティを適用
 */
export function calculateConfidencePenalty(
  costData: CostDataForScoring
): number {
  if (costData.has_actual_cost) {
    return 1.0; // ペナルティなし
  }

  const confidence = costData.cost_confidence || 0.5;

  // 信頼度に応じたペナルティ
  // 信頼度1.0 → ペナルティなし (1.0)
  // 信頼度0.6 → 5%ペナルティ (0.95)
  // 信頼度0.3 → 20%ペナルティ (0.8)

  if (confidence >= 0.8) {
    return 1.0;
  } else if (confidence >= 0.6) {
    return 0.95;
  } else if (confidence >= 0.4) {
    return 0.9;
  } else {
    return 0.8;
  }
}

/**
 * 仕入れ原価を統合したスコア計算（暫定版）
 * 仕入れ先が未確定の商品に対して、既知データのみで暫定スコアを計算
 */
export function calculateProvisionalScore(
  product: ProductMaster,
  settings: ScoreSettings
): { score: number; details: ScoreDetails } {
  // 仕入れ原価が未確定の場合、利益スコアを低めに見積もる
  const adjustedProduct: ProductMaster = {
    ...product,
    profit_amount_usd: product.profit_amount_usd || 0,
    profit_margin: product.profit_margin || 0,
  };

  const { score, details } = calculateFinalScore(adjustedProduct, settings);

  // 暫定スコアには「未確定」マークとして、わずかにペナルティを適用
  const provisionalScore = Math.round(score * 0.95);

  return {
    score: provisionalScore,
    details: {
      ...details,
      penalty_multiplier: 0.95, // 暫定スコアのペナルティ
    },
  };
}

/**
 * 仕入れ原価を統合したスコア計算（最終版）
 * AI特定の仕入れ先データを使用して、最終スコアを計算
 */
export function calculateFinalScoreWithSupplier(
  product: ProductMaster,
  bestSupplier: SupplierCandidate | undefined,
  settings: ScoreSettings,
  exchangeRateJpyToUsd: number = 0.0067
): { score: number; details: ScoreDetails } {
  // 仕入れ原価データを取得
  const costData = getCostDataForScoring(product, bestSupplier);

  // 仕入れ原価を反映した商品データを作成
  const productWithCost = createProductWithSupplierCost(
    product,
    costData,
    exchangeRateJpyToUsd
  );

  // 基本スコアを計算
  const { score, details } = calculateFinalScore(productWithCost, settings);

  // 信頼度ペナルティを計算
  const confidencePenalty = calculateConfidencePenalty(costData);

  // 最終スコア = 基本スコア × 信頼度ペナルティ
  const finalScore = Math.round(score * confidencePenalty);

  return {
    score: finalScore,
    details: {
      ...details,
      penalty_multiplier: confidencePenalty,
    },
  };
}

/**
 * バッチ処理：暫定スコア計算
 */
export function calculateBulkProvisionalScores(
  products: ProductMaster[],
  settings: ScoreSettings
): Array<{
  id: string;
  sku: string;
  provisional_score: number;
  details: ScoreDetails;
}> {
  return products.map((product) => {
    const { score, details } = calculateProvisionalScore(product, settings);
    return {
      id: product.id,
      sku: product.sku,
      provisional_score: score,
      details,
    };
  });
}

/**
 * バッチ処理：最終スコア計算（仕入れ先統合）
 */
export function calculateBulkFinalScoresWithSuppliers(
  productsWithSuppliers: Array<{
    product: ProductMaster;
    bestSupplier?: SupplierCandidate;
  }>,
  settings: ScoreSettings,
  exchangeRateJpyToUsd: number = 0.0067
): Array<{
  id: string;
  sku: string;
  final_score: number;
  details: ScoreDetails;
}> {
  return productsWithSuppliers.map(({ product, bestSupplier }) => {
    const { score, details } = calculateFinalScoreWithSupplier(
      product,
      bestSupplier,
      settings,
      exchangeRateJpyToUsd
    );
    return {
      id: product.id,
      sku: product.sku,
      final_score: score,
      details,
    };
  });
}

/**
 * スコア差分の計算
 * 暫定スコアと最終スコアの差を計算し、仕入れ先特定の効果を可視化
 */
export function calculateScoreDelta(
  provisionalScore: number,
  finalScore: number
): {
  delta: number;
  deltaPercent: number;
  impact: 'positive' | 'negative' | 'neutral';
} {
  const delta = finalScore - provisionalScore;
  const deltaPercent =
    provisionalScore > 0 ? (delta / provisionalScore) * 100 : 0;

  let impact: 'positive' | 'negative' | 'neutral';
  if (delta > 100) {
    impact = 'positive';
  } else if (delta < -100) {
    impact = 'negative';
  } else {
    impact = 'neutral';
  }

  return {
    delta,
    deltaPercent,
    impact,
  };
}
