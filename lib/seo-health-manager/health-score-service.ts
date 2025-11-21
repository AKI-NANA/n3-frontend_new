// ============================================
// Phase 7: 健全性スコア計算サービス
// 機能7-4対応
// ============================================

import {
  ListingHealthScore,
  HealthScoreCalculateRequest,
  HealthScoreCalculateResponse,
  HealthScoreResult,
} from './types';

/**
 * リスティング健全性スコアの計算
 * 90日間の販売実績を基にスコア（0-100）を算出
 */
export function calculateHealthScore(data: {
  days_since_last_sale: number;
  total_views_90d: number;
  total_sales_90d: number;
  conversion_rate_90d: number;
  avg_daily_views: number;
  search_appearance_rate: number;
  click_through_rate: number;
  watch_count: number;
}): {
  health_score: number;
  is_dead_listing: boolean;
  recommended_action: 'keep' | 'revise' | 'end';
  breakdown: Record<string, number>;
} {
  let score = 0;
  const breakdown: Record<string, number> = {};

  // 1. 最終販売からの経過日数（30点満点）
  const daysSinceLastSaleScore = calculateDaysSinceLastSaleScore(data.days_since_last_sale);
  score += daysSinceLastSaleScore;
  breakdown['days_since_last_sale'] = daysSinceLastSaleScore;

  // 2. コンバージョン率（25点満点）
  const conversionScore = calculateConversionScore(data.conversion_rate_90d);
  score += conversionScore;
  breakdown['conversion_rate'] = conversionScore;

  // 3. 閲覧数（20点満点）
  const viewsScore = calculateViewsScore(data.avg_daily_views);
  score += viewsScore;
  breakdown['views'] = viewsScore;

  // 4. 検索表示率（15点満点）
  const searchScore = calculateSearchScore(data.search_appearance_rate);
  score += searchScore;
  breakdown['search_appearance'] = searchScore;

  // 5. クリック率（10点満点）
  const ctrScore = calculateCTRScore(data.click_through_rate);
  score += ctrScore;
  breakdown['click_through_rate'] = ctrScore;

  // 死に筋判定
  const isDeadListing = score < 30 || (data.days_since_last_sale > 90 && data.total_sales_90d === 0);

  // 推奨アクション
  let recommendedAction: 'keep' | 'revise' | 'end' = 'keep';
  if (score < 30) {
    recommendedAction = 'end';
  } else if (score < 60) {
    recommendedAction = 'revise';
  }

  return {
    health_score: Math.round(score),
    is_dead_listing: isDeadListing,
    recommended_action: recommendedAction,
    breakdown,
  };
}

/**
 * 最終販売からの経過日数スコア（30点満点）
 */
function calculateDaysSinceLastSaleScore(days: number): number {
  if (days <= 7) return 30;
  if (days <= 14) return 25;
  if (days <= 30) return 20;
  if (days <= 60) return 10;
  if (days <= 90) return 5;
  return 0; // 90日以上販売なし
}

/**
 * コンバージョン率スコア（25点満点）
 */
function calculateConversionScore(conversionRate: number): number {
  if (conversionRate >= 5.0) return 25;
  if (conversionRate >= 3.0) return 20;
  if (conversionRate >= 2.0) return 15;
  if (conversionRate >= 1.0) return 10;
  if (conversionRate >= 0.5) return 5;
  return 0;
}

/**
 * 閲覧数スコア（20点満点）
 */
function calculateViewsScore(avgDailyViews: number): number {
  if (avgDailyViews >= 50) return 20;
  if (avgDailyViews >= 30) return 15;
  if (avgDailyViews >= 10) return 10;
  if (avgDailyViews >= 5) return 5;
  return 0;
}

/**
 * 検索表示率スコア（15点満点）
 */
function calculateSearchScore(searchAppearanceRate: number): number {
  if (searchAppearanceRate >= 80) return 15;
  if (searchAppearanceRate >= 60) return 12;
  if (searchAppearanceRate >= 40) return 8;
  if (searchAppearanceRate >= 20) return 4;
  return 0;
}

/**
 * クリック率スコア（10点満点）
 */
function calculateCTRScore(clickThroughRate: number): number {
  if (clickThroughRate >= 5.0) return 10;
  if (clickThroughRate >= 3.0) return 8;
  if (clickThroughRate >= 2.0) return 6;
  if (clickThroughRate >= 1.0) return 4;
  return 0;
}

/**
 * 死に筋リスティングの理由を特定
 */
export function identifyDeadListingReason(
  score: number,
  data: {
    days_since_last_sale: number;
    total_views_90d: number;
    total_sales_90d: number;
    conversion_rate_90d: number;
    avg_daily_views: number;
  }
): string {
  const reasons: string[] = [];

  if (data.days_since_last_sale > 90) {
    reasons.push('90日間販売実績なし');
  }

  if (data.total_sales_90d === 0) {
    reasons.push('過去90日間の販売数ゼロ');
  }

  if (data.conversion_rate_90d < 0.5) {
    reasons.push(`コンバージョン率極低（${data.conversion_rate_90d.toFixed(2)}%）`);
  }

  if (data.avg_daily_views < 2) {
    reasons.push('閲覧数低迷（1日平均2未満）');
  }

  if (reasons.length === 0) {
    reasons.push('総合的な健全性スコア低下');
  }

  return reasons.join('、');
}

/**
 * 一括健全性スコア計算
 * 複数商品のスコアを一括で計算
 */
export async function calculateBatchHealthScores(
  request: HealthScoreCalculateRequest
): Promise<HealthScoreCalculateResponse> {
  // 実際の実装では、Supabaseから商品データと販売実績を取得
  // ここではモック実装
  const results: HealthScoreResult[] = [];
  let deadListingsDetected = 0;

  // モックデータ（実際にはDBから取得）
  const mockProducts = [
    {
      product_id: 'PROD-001',
      days_since_last_sale: 95,
      total_views_90d: 120,
      total_sales_90d: 0,
      conversion_rate_90d: 0.0,
      avg_daily_views: 1.3,
      search_appearance_rate: 15,
      click_through_rate: 0.8,
      watch_count: 2,
    },
    {
      product_id: 'PROD-002',
      days_since_last_sale: 45,
      total_views_90d: 850,
      total_sales_90d: 8,
      conversion_rate_90d: 0.9,
      avg_daily_views: 9.4,
      search_appearance_rate: 42,
      click_through_rate: 1.5,
      watch_count: 12,
    },
  ];

  for (const product of mockProducts) {
    const scoreResult = calculateHealthScore(product);
    results.push({
      product_id: product.product_id,
      health_score: scoreResult.health_score,
      is_dead_listing: scoreResult.is_dead_listing,
      recommended_action: scoreResult.recommended_action,
      details: {
        days_since_last_sale: product.days_since_last_sale,
        total_views_90d: product.total_views_90d,
        total_sales_90d: product.total_sales_90d,
        conversion_rate_90d: product.conversion_rate_90d,
      },
    });

    if (scoreResult.is_dead_listing) {
      deadListingsDetected++;
    }
  }

  return {
    success: true,
    updated: results.length,
    dead_listings_detected: deadListingsDetected,
    results,
  };
}

/**
 * 自動終了推奨リストの生成
 * ダッシュボードとBulkApprovalUIで使用
 */
export function generateAutoEndRecommendations(
  healthScores: ListingHealthScore[],
  threshold: number = 30
): {
  product_id: string;
  health_score: number;
  reason: string;
  days_since_last_sale: number;
}[] {
  return healthScores
    .filter(score => score.health_score < threshold || score.is_dead_listing)
    .map(score => ({
      product_id: score.product_id,
      health_score: score.health_score,
      reason: score.dead_listing_reason || '健全性スコア低下',
      days_since_last_sale: score.days_since_last_sale,
    }))
    .sort((a, b) => a.health_score - b.health_score); // スコアが低い順
}

/**
 * SEOアラートの生成
 * IntegratedDashboard_V1.jsxとの連携用
 */
export function generateSeoHealthAlerts(
  healthScores: ListingHealthScore[],
  auctionAnchors: any[]
): Array<{
  type: 'auction_no_bids' | 'inventory_lost' | 'low_health_score';
  severity: 'High' | 'Medium' | 'Low';
  message: string;
  product_id: string;
}> {
  const alerts: any[] = [];

  // 健全性スコア低下アラート
  const lowScoreListings = healthScores.filter(s => s.health_score < 30);
  if (lowScoreListings.length > 0) {
    alerts.push({
      type: 'low_health_score',
      severity: 'Medium',
      message: `📉 ${lowScoreListings.length}件のリスティングが健全性スコア30以下（死に筋）。自動終了を推奨します。`,
      product_id: lowScoreListings[0].product_id,
    });
  }

  // オークション入札なしアラート（モック実装）
  const noBidAuctions = auctionAnchors.filter(a => a.current_bid_count === 0 && a.auction_status === 'ended_no_bids');
  if (noBidAuctions.length > 0) {
    alerts.push({
      type: 'auction_no_bids',
      severity: 'Medium',
      message: `🎯 ${noBidAuctions.length}件のオークションが入札なしで終了。自動で定額出品への切り替えを推奨します。`,
      product_id: noBidAuctions[0].product_id,
    });
  }

  return alerts;
}
