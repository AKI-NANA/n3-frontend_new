/**
 * 多販路出品戦略管理システム - コアエンジン
 *
 * 商品、モール、アカウントの制約と戦略的スコアに基づき、
 * 最適な出品先を自動決定するエンジン
 */

import { createClient } from '@/lib/supabase/server';
import {
  Platform,
  ListingCandidate,
  ListingDecision,
  Layer1Result,
  Layer2Result,
  Layer3Result,
  StrategyRule,
  SalesHistory,
  ScoreMultipliers,
  StrategyEngineConfig,
} from '@/types/strategy';
import {
  getAllPlatforms,
  checkPlatformConstraints,
} from '@/lib/pricing/constants/PlatformConstraints';

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: StrategyEngineConfig = {
  min_priority_score: -10000,
  min_stock_quantity: 1,
  sales_history_days: 30,
  default_M_performance: 1.0,
  default_M_competition: 1.0,
  default_M_category_fit: 1.0,
};

/**
 * メイン関数：最適な出品先を決定
 */
export async function determineOptimalListing(
  skuId: string,
  config: Partial<StrategyEngineConfig> = {}
): Promise<ListingDecision> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    const supabase = await createClient();

    // 商品データを取得
    const { data: product, error: productError } = await supabase
      .from('products_master')
      .select('*')
      .eq('id', skuId)
      .single();

    if (productError || !product) {
      return {
        sku: skuId,
        recommended_platform: null,
        recommended_account_id: null,
        strategy_score: null,
        all_candidates: [],
        decision_timestamp: new Date().toISOString(),
        status: 'ERROR',
        message: '商品が見つかりません',
      };
    }

    // レイヤー1: システム制約チェック
    const layer1Result = await executeLayer1(product, finalConfig);

    if (layer1Result.candidates.filter((c) => !c.is_excluded).length === 0) {
      return {
        sku: product.sku,
        recommended_platform: null,
        recommended_account_id: null,
        strategy_score: null,
        all_candidates: layer1Result.candidates,
        decision_timestamp: new Date().toISOString(),
        status: 'NO_CANDIDATES',
        message: 'すべての出品候補がシステム制約で除外されました',
      };
    }

    // レイヤー2: ユーザー戦略フィルタリング
    const layer2Result = await executeLayer2(
      product,
      layer1Result.candidates.filter((c) => !c.is_excluded)
    );

    if (layer2Result.candidates.filter((c) => !c.is_excluded).length === 0) {
      return {
        sku: product.sku,
        recommended_platform: null,
        recommended_account_id: null,
        strategy_score: null,
        all_candidates: [...layer1Result.candidates, ...layer2Result.candidates],
        decision_timestamp: new Date().toISOString(),
        status: 'NO_CANDIDATES',
        message: 'すべての出品候補が戦略ルールで除外されました',
      };
    }

    // レイヤー3: スコア評価と優先順位付け
    const layer3Result = await executeLayer3(
      product,
      layer2Result.candidates.filter((c) => !c.is_excluded),
      finalConfig
    );

    if (!layer3Result.top_recommendation) {
      return {
        sku: product.sku,
        recommended_platform: null,
        recommended_account_id: null,
        strategy_score: null,
        all_candidates: layer3Result.ranked_candidates,
        decision_timestamp: new Date().toISOString(),
        status: 'NO_CANDIDATES',
        message: '最適な出品先を決定できませんでした',
      };
    }

    // 成功: 最適な出品先を決定
    return {
      sku: product.sku,
      recommended_platform: layer3Result.top_recommendation.platform,
      recommended_account_id: layer3Result.top_recommendation.account_id,
      strategy_score: layer3Result.top_recommendation.strategy_score || null,
      all_candidates: layer3Result.ranked_candidates,
      decision_timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      message: `最適な出品先: ${layer3Result.top_recommendation.platform} (アカウント: ${layer3Result.top_recommendation.account_id})`,
    };
  } catch (error) {
    console.error('❌ ListingStrategyEngine Error:', error);
    return {
      sku: skuId,
      recommended_platform: null,
      recommended_account_id: null,
      strategy_score: null,
      all_candidates: [],
      decision_timestamp: new Date().toISOString(),
      status: 'ERROR',
      message: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

/**
 * レイヤー1: システム制約チェック
 * - アカウント重複禁止（排他的ロック）
 * - モール規約・条件
 * - 在庫/スコア
 */
async function executeLayer1(
  product: any,
  config: StrategyEngineConfig
): Promise<Layer1Result> {
  const supabase = await createClient();
  const allPlatforms = getAllPlatforms();
  const candidates: ListingCandidate[] = [];
  const exclusionSummary: Record<string, number> = {};

  // 全プラットフォーム×アカウントの組み合わせを生成
  // TODO: 実際にはアカウントマスターテーブルから取得
  const accountMap: Record<Platform, number[]> = {
    amazon: [1, 2],
    ebay: [3, 4, 5],
    mercari: [6],
    yahoo: [7],
    rakuten: [8],
    shopee: [9, 10],
    walmart: [11],
  };

  for (const platform of allPlatforms) {
    const accountIds = accountMap[platform] || [];

    for (const accountId of accountIds) {
      const candidate: ListingCandidate = {
        platform,
        account_id: accountId,
        is_excluded: false,
        exclusion_reason: undefined,
        strategy_score: undefined,
      };

      // チェック1: 在庫数
      if (!product.stock_quantity || product.stock_quantity < config.min_stock_quantity) {
        candidate.is_excluded = true;
        candidate.exclusion_reason = '在庫不足';
        exclusionSummary['在庫不足'] = (exclusionSummary['在庫不足'] || 0) + 1;
        candidates.push(candidate);
        continue;
      }

      // チェック2: 優先度スコア
      if (
        product.priority_score !== null &&
        product.priority_score < config.min_priority_score
      ) {
        candidate.is_excluded = true;
        candidate.exclusion_reason = '優先度スコアが低すぎる';
        exclusionSummary['優先度スコア低'] = (exclusionSummary['優先度スコア低'] || 0) + 1;
        candidates.push(candidate);
        continue;
      }

      // チェック3: 同一プラットフォームで既に出品中かチェック
      const { data: existingListings } = await supabase
        .from('listing_data')
        .select('platform, account_id, status')
        .eq('sku', product.sku)
        .eq('status', '出品中');

      if (existingListings && existingListings.length > 0) {
        const sameplatformListing = existingListings.find(
          (listing: any) => listing.platform === platform
        );

        if (samePlatformListing) {
          candidate.is_excluded = true;
          candidate.exclusion_reason = `${platform}の他アカウント（ID: ${samePlatformListing.account_id}）で出品中`;
          exclusionSummary['重複出品'] = (exclusionSummary['重複出品'] || 0) + 1;
          candidates.push(candidate);
          continue;
        }
      }

      // チェック4: モール規約チェック
      const priceJpy = product.price_jpy || product.optimal_price || 0;
      const constraintCheck = checkPlatformConstraints(
        platform,
        product.category_name || '',
        product.condition || 'New',
        priceJpy
      );

      if (!constraintCheck.allowed) {
        candidate.is_excluded = true;
        candidate.exclusion_reason = constraintCheck.reason;
        exclusionSummary['モール規約違反'] = (exclusionSummary['モール規約違反'] || 0) + 1;
        candidates.push(candidate);
        continue;
      }

      // レイヤー1を通過
      candidates.push(candidate);
    }
  }

  return {
    candidates,
    excluded_count: candidates.filter((c) => c.is_excluded).length,
    exclusion_summary: exclusionSummary,
  };
}

/**
 * レイヤー2: ユーザー戦略フィルタリング
 * - カテゴリー・モール限定
 * - アカウント別専門化
 * - 価格帯による制限
 */
async function executeLayer2(
  product: any,
  candidates: ListingCandidate[]
): Promise<Layer2Result> {
  const supabase = await createClient();

  // StrategyRulesテーブルからアクティブなルールを取得
  const { data: rules, error } = await supabase
    .from('strategy_rules')
    .select('*')
    .order('rule_id', { ascending: true });

  if (error || !rules || rules.length === 0) {
    // ルールがない場合はそのまま返す
    return {
      candidates,
      excluded_count: 0,
      applied_rules: [],
    };
  }

  const updatedCandidates = candidates.map((candidate) => ({ ...candidate }));
  const appliedRules: StrategyRule[] = [];

  for (const rule of rules as StrategyRule[]) {
    for (const candidate of updatedCandidates) {
      if (candidate.is_excluded) continue; // 既に除外済みならスキップ

      // ルール適用判定
      const shouldApply =
        (!rule.platform_key || rule.platform_key === candidate.platform) &&
        (!rule.account_id || rule.account_id === candidate.account_id) &&
        (!rule.target_category ||
          product.category_name?.toLowerCase().includes(rule.target_category.toLowerCase()));

      if (!shouldApply) continue;

      // ルールタイプ別の処理
      switch (rule.rule_type) {
        case 'BLACKLIST':
          candidate.is_excluded = true;
          candidate.exclusion_reason = `ブラックリストルール: ${rule.rule_name}`;
          appliedRules.push(rule);
          break;

        case 'WHITELIST':
          // ホワイトリストは逆ロジック（他の候補を除外）
          // 実装は複雑になるため、ここでは簡易的に処理
          break;

        case 'PRICE_MIN':
          if (rule.min_price_jpy !== null && product.price_jpy < rule.min_price_jpy) {
            candidate.is_excluded = true;
            candidate.exclusion_reason = `最低価格ルール: ¥${product.price_jpy} < ¥${rule.min_price_jpy}`;
            appliedRules.push(rule);
          }
          break;

        case 'PRICE_MAX':
          if (rule.max_price_jpy !== null && product.price_jpy > rule.max_price_jpy) {
            candidate.is_excluded = true;
            candidate.exclusion_reason = `最高価格ルール: ¥${product.price_jpy} > ¥${rule.max_price_jpy}`;
            appliedRules.push(rule);
          }
          break;

        case 'CATEGORY_ACCOUNT_SPECIFIC':
          // カテゴリー専門化ルール
          // このルールが適用される場合、指定されたアカウント以外を除外
          if (rule.account_id && candidate.account_id !== rule.account_id) {
            candidate.is_excluded = true;
            candidate.exclusion_reason = `カテゴリー専門化ルール: アカウント ${rule.account_id} 専用`;
            appliedRules.push(rule);
          }
          break;
      }
    }
  }

  return {
    candidates: updatedCandidates,
    excluded_count: updatedCandidates.filter((c) => c.is_excluded).length,
    applied_rules: appliedRules,
  };
}

/**
 * レイヤー3: スコア評価と優先順位付け
 * - グローバルスコア × 乗数
 * - 実績ブースト、競合ブースト、カテゴリー適合ブースト
 */
async function executeLayer3(
  product: any,
  candidates: ListingCandidate[],
  config: StrategyEngineConfig
): Promise<Layer3Result> {
  const supabase = await createClient();
  const globalScore = product.priority_score || 0;

  // 各候補のスコアを計算
  const scoredCandidates: ListingCandidate[] = [];

  for (const candidate of candidates) {
    // 乗数を計算
    const multipliers = await calculateMultipliers(
      candidate.platform,
      candidate.account_id,
      product,
      config
    );

    // 最終スコア = グローバルスコア × 総合乗数
    const finalScore = globalScore * multipliers.M_total;

    scoredCandidates.push({
      ...candidate,
      strategy_score: Math.round(finalScore),
    });
  }

  // スコア降順でソート
  scoredCandidates.sort((a, b) => (b.strategy_score || 0) - (a.strategy_score || 0));

  return {
    ranked_candidates: scoredCandidates,
    top_recommendation: scoredCandidates.length > 0 ? scoredCandidates[0] : null,
  };
}

/**
 * モール別乗数を計算
 */
async function calculateMultipliers(
  platform: Platform,
  accountId: number,
  product: any,
  config: StrategyEngineConfig
): Promise<ScoreMultipliers> {
  const supabase = await createClient();

  // 1. 実績ブースト (M_performance)
  const M_performance = await calculatePerformanceMultiplier(
    platform,
    accountId,
    config.sales_history_days
  );

  // 2. 競合ブースト (M_competition)
  const M_competition = await calculateCompetitionMultiplier(platform);

  // 3. カテゴリー適合ブースト (M_category_fit)
  const M_category_fit = await calculateCategoryFitMultiplier(
    platform,
    accountId,
    product.category_name
  );

  // 総合乗数
  const M_total = M_performance * M_competition * M_category_fit;

  return {
    M_performance,
    M_competition,
    M_category_fit,
    M_total,
  };
}

/**
 * 実績ブースト計算
 * 過去30日間の平均利益率と販売日数から算出
 */
async function calculatePerformanceMultiplier(
  platform: Platform,
  accountId: number,
  historyDays: number
): Promise<number> {
  const supabase = await createClient();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - historyDays);

  const { data: salesHistory } = await supabase
    .from('sales_history')
    .select('profit_margin, days_to_sell')
    .eq('platform', platform)
    .eq('account_id', accountId)
    .gte('sale_date', cutoffDate.toISOString());

  if (!salesHistory || salesHistory.length === 0) {
    return 1.0; // デフォルト
  }

  // 平均利益率と平均販売日数を計算
  const avgProfitMargin =
    salesHistory.reduce((sum: number, record: any) => sum + (record.profit_margin || 0), 0) /
    salesHistory.length;
  const avgDaysToSell =
    salesHistory.reduce((sum: number, record: any) => sum + (record.days_to_sell || 0), 0) /
    salesHistory.length;

  // 利益率が高く、販売日数が短いほど高いブースト
  // 利益率 30%以上 & 販売日数 7日以内 → 1.50
  // 利益率 20%以上 & 販売日数 14日以内 → 1.30
  // 利益率 10%以上 & 販売日数 30日以内 → 1.10
  // それ以外 → 1.00
  if (avgProfitMargin >= 0.3 && avgDaysToSell <= 7) {
    return 1.5;
  } else if (avgProfitMargin >= 0.2 && avgDaysToSell <= 14) {
    return 1.3;
  } else if (avgProfitMargin >= 0.1 && avgDaysToSell <= 30) {
    return 1.1;
  } else {
    return 1.0;
  }
}

/**
 * 競合ブースト計算
 * 競合データから算出（モック実装）
 */
async function calculateCompetitionMultiplier(platform: Platform): Promise<number> {
  // TODO: 実際の競合データテーブルから取得
  // 現在はモック実装
  const competitionMap: Record<Platform, number> = {
    amazon: 1.0, // 競争激しい
    ebay: 1.15, // やや緩い
    mercari: 1.1,
    yahoo: 1.2, // レアアイテムで有利
    rakuten: 1.05,
    shopee: 1.1,
    walmart: 1.0,
  };

  return competitionMap[platform] || 1.0;
}

/**
 * カテゴリー適合ブースト計算
 * StrategyRulesのM_factorを取得
 */
async function calculateCategoryFitMultiplier(
  platform: Platform,
  accountId: number,
  category: string
): Promise<number> {
  const supabase = await createClient();

  const { data: rule } = await supabase
    .from('strategy_rules')
    .select('M_factor')
    .eq('platform_key', platform)
    .eq('account_id', accountId)
    .eq('target_category', category)
    .single();

  if (rule && rule.M_factor) {
    return rule.M_factor;
  }

  return 1.0; // デフォルト
}
