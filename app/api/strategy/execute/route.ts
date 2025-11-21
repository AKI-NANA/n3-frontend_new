/**
 * 出品戦略エンジンAPI
 *
 * POST /api/strategy/execute
 *
 * Phase 2: 戦略決定の頭脳を完成させる
 * 既存の /lib/listing/ListingStrategyEngine.ts のロジックを活用
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { determineListingStrategy } from '@/lib/listing/ListingStrategyEngine';
import type {
  MarketplaceCandidate,
  UserStrategySettings,
  MarketplaceBoostSettings,
  SKUMasterData,
  ListingData,
} from '@/lib/listing/types';
import type { Platform } from '@/lib/multichannel/types';

/**
 * DBからユーザー戦略設定をロード
 */
async function loadUserStrategySettings(
  supabase: ReturnType<typeof createClient>
): Promise<UserStrategySettings> {
  const { data: rules, error } = await supabase
    .from('user_strategy_rules')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (error) {
    console.error('[StrategyAPI] Failed to load user strategy rules:', error);
  }

  const settings: UserStrategySettings = {
    categoryRestrictions: [],
    accountSpecialization: [],
    priceRangeRestrictions: [],
    minScoreRestrictions: [],
  };

  if (!rules || rules.length === 0) {
    return settings;
  }

  for (const rule of rules) {
    switch (rule.rule_type) {
      case 'category_restriction':
        settings.categoryRestrictions.push({
          category: rule.category || '',
          allowedPlatforms: rule.allowed_platforms || [],
          blockedPlatforms: rule.blocked_platforms || [],
        });
        break;

      case 'account_specialization':
        if (rule.platform && rule.account_id) {
          settings.accountSpecialization.push({
            accountId: rule.account_id,
            platform: rule.platform,
            allowedCategories: rule.allowed_categories || [],
          });
        }
        break;

      case 'price_range':
        if (rule.platform) {
          settings.priceRangeRestrictions.push({
            platform: rule.platform,
            accountId: rule.account_id,
            minPrice: rule.min_price,
            maxPrice: rule.max_price,
          });
        }
        break;

      case 'min_score':
        if (rule.platform) {
          settings.minScoreRestrictions.push({
            platform: rule.platform,
            accountId: rule.account_id,
            minGlobalScore: rule.min_global_score || 0,
          });
        }
        break;
    }
  }

  return settings;
}

/**
 * DBからブースト設定をロード
 */
async function loadBoostSettings(
  supabase: ReturnType<typeof createClient>
): Promise<MarketplaceBoostSettings[]> {
  // まず mall_performance_boosts テーブルから取得
  const { data: boosts, error: boostError } = await supabase
    .from('mall_performance_boosts')
    .select('*')
    .eq('is_active', true);

  if (!boostError && boosts && boosts.length > 0) {
    return boosts.map((boost: any) => ({
      platform: boost.platform,
      accountId: boost.account_id,
      category: boost.category,
      performanceBoost: boost.performance_boost || 1.0,
      competitionBoost: boost.competition_boost || 1.0,
      categoryFitBoost: boost.category_fit_boost || 1.0,
    }));
  }

  // fallback: marketplace_settings から取得
  const { data: settings, error: settingsError } = await supabase
    .from('marketplace_settings')
    .select('*')
    .eq('is_active', true);

  if (settingsError || !settings) {
    console.error('[StrategyAPI] Failed to load boost settings:', settingsError);
    return [];
  }

  return settings.map((setting: any) => ({
    platform: setting.platform,
    accountId: setting.account_id,
    category: undefined,
    performanceBoost: setting.performance_boost || 1.0,
    competitionBoost: setting.competition_boost || 1.0,
    categoryFitBoost: setting.category_fit_boost || 1.0,
  }));
}

/**
 * 全候補（モール×アカウント）を取得
 */
async function loadAllCandidates(
  supabase: ReturnType<typeof createClient>
): Promise<MarketplaceCandidate[]> {
  const { data: settings, error } = await supabase
    .from('marketplace_settings')
    .select('*')
    .eq('is_active', true);

  if (error || !settings) {
    console.error('[StrategyAPI] Failed to load marketplace settings:', error);
    return [];
  }

  return settings.map((setting: any) => ({
    platform: setting.platform as Platform,
    accountId: setting.account_id || 'default',
    accountName: `${setting.platform}_${setting.account_id || 'default'}`,
    country: setting.country_code || 'US',
  }));
}

/**
 * 既存の出品データを取得
 */
async function loadExistingListings(
  supabase: ReturnType<typeof createClient>,
  sku: string
): Promise<ListingData[]> {
  const { data: listings, error } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('sku', sku);

  if (error) {
    console.error(`[StrategyAPI] Failed to load existing listings for ${sku}:`, error);
    return [];
  }

  return (
    listings?.map((listing: any) => ({
      id: listing.id,
      products_master_id: listing.products_master_id,
      account_id: listing.account_id,
      platform: listing.platform,
      status: listing.status,
      listed_at: listing.listed_at ? new Date(listing.listed_at) : undefined,
    })) || []
  );
}

/**
 * POST /api/strategy/execute
 *
 * 出品戦略を決定し、DBに記録する
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { candidates, forceUpdate = false, minGlobalScore = -10000 } = body;

    const supabase = createClient();

    console.log('[StrategyAPI] Starting strategy execution batch');

    // 1. SKUリストを取得（candidates指定 or execution_status='pending'）
    let query = supabase
      .from('products_master')
      .select('*')
      .gte('stock_quantity', 1);

    if (candidates && Array.isArray(candidates) && candidates.length > 0) {
      query = query.in('sku', candidates);
    } else {
      // candidatesが指定されていない場合、pendingステータスのみ
      query = query.eq('execution_status', 'pending');
    }

    const { data: products, error: productsError } = await query;

    if (productsError) {
      throw new Error(`Failed to load products: ${productsError.message}`);
    }

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: true,
        message: '処理対象の商品がありません',
        results: [],
      });
    }

    console.log(`[StrategyAPI] Found ${products.length} products to process`);

    // 2. 共通設定をロード
    const userSettings = await loadUserStrategySettings(supabase);
    const boostSettings = await loadBoostSettings(supabase);
    const allCandidates = await loadAllCandidates(supabase);

    console.log(`[StrategyAPI] Loaded ${allCandidates.length} marketplace candidates`);

    // 3. 各SKUに対して戦略決定を実行
    const results = [];

    for (const product of products) {
      const skuMasterData: SKUMasterData = {
        id: product.id,
        sku: product.sku,
        category: product.category || '',
        condition: product.condition || 'New',
        hts_code: product.hts_code,
        price_jpy: product.price_jpy || 0,
        stock_quantity: product.stock_quantity || 0,
        global_score: product.global_score || 0,
      };

      // 既存の出品データを取得
      const existingListings = await loadExistingListings(supabase, product.sku);

      // 戦略決定を実行
      const strategyResult = determineListingStrategy(
        skuMasterData,
        allCandidates,
        existingListings,
        userSettings,
        boostSettings,
        minGlobalScore
      );

      // 4. strategy_decisions に保存
      const { error: insertError } = await supabase.from('strategy_decisions').insert({
        sku: product.sku,
        products_master_id: product.id,
        recommended_platform: strategyResult.finalDecision.targetPlatform,
        recommended_account_id: strategyResult.finalDecision.targetAccountId,
        final_score: strategyResult.scoredCandidates[0]?.finalScore || 0,
        layer1_passed_count: strategyResult.systemConstraints.filter(
          (r) => r.filterResult.passed
        ).length,
        layer2_passed_count: strategyResult.userStrategyFiltered.filter(
          (r) => r.filterResult.passed
        ).length,
        layer3_candidates_count: strategyResult.scoredCandidates.length,
        decision_reason: strategyResult.finalDecision.reason,
        should_list: strategyResult.finalDecision.shouldList,
        all_candidates: strategyResult.allCandidates,
        system_constraints_results: strategyResult.systemConstraints,
        user_strategy_results: strategyResult.userStrategyFiltered,
        scored_candidates: strategyResult.scoredCandidates,
      });

      if (insertError) {
        console.error(`[StrategyAPI] Failed to insert strategy decision for ${product.sku}:`, insertError);
      }

      // 5. products_master のステータスを更新
      if (strategyResult.finalDecision.shouldList) {
        const { error: updateError } = await supabase
          .from('products_master')
          .update({ execution_status: 'strategy_determined' })
          .eq('sku', product.sku);

        if (updateError) {
          console.error(`[StrategyAPI] Failed to update execution_status for ${product.sku}:`, updateError);
        }

        // 6. marketplace_listings にドラフトエントリを作成
        if (strategyResult.recommendedCandidate) {
          const { error: listingError } = await supabase
            .from('marketplace_listings')
            .upsert(
              {
                sku: product.sku,
                products_master_id: product.id,
                platform: strategyResult.recommendedCandidate.platform,
                account_id: strategyResult.recommendedCandidate.accountId,
                account_name: strategyResult.recommendedCandidate.accountName,
                country_code: strategyResult.recommendedCandidate.country,
                status: 'draft',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'sku,platform,account_id' }
            );

          if (listingError) {
            console.error(`[StrategyAPI] Failed to create marketplace listing for ${product.sku}:`, listingError);
          }
        }
      } else {
        // 出品不可の場合は listing_failed に設定
        await supabase
          .from('products_master')
          .update({ execution_status: 'listing_failed' })
          .eq('sku', product.sku);
      }

      results.push(strategyResult);
    }

    console.log('[StrategyAPI] Strategy execution batch complete');

    // 統計情報
    const stats = {
      total: results.length,
      shouldList: results.filter((r) => r.finalDecision.shouldList).length,
      shouldNotList: results.filter((r) => !r.finalDecision.shouldList).length,
      avgFinalScore:
        results.reduce((sum, r) => sum + (r.scoredCandidates[0]?.finalScore || 0), 0) /
        results.length,
    };

    return NextResponse.json({
      success: true,
      results,
      stats,
      message: `${stats.shouldList}件の商品が戦略決定済みに更新されました`,
    });
  } catch (error) {
    console.error('[StrategyAPI] Unexpected error:', error);
    return NextResponse.json(
      {
        error: '戦略決定でエラーが発生しました',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/strategy/execute
 *
 * 実行キューの状況を確認
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // execution_status 別の商品数を取得
    const { data: statusCounts, error } = await supabase.rpc(
      'count_products_by_execution_status'
    );

    if (error) {
      // rpc関数が存在しない場合は手動で集計
      const { data: allProducts } = await supabase
        .from('products_master')
        .select('execution_status');

      const counts: Record<string, number> = {};
      allProducts?.forEach((p: any) => {
        counts[p.execution_status] = (counts[p.execution_status] || 0) + 1;
      });

      return NextResponse.json({
        stats: counts,
      });
    }

    return NextResponse.json({
      stats: statusCounts,
    });
  } catch (error) {
    console.error('[StrategyAPI] Error getting stats:', error);
    return NextResponse.json(
      {
        error: 'Failed to get execution queue stats',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
