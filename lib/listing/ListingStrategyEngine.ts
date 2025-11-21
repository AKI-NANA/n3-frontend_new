/**
 * 多販路出品戦略エンジン
 * 商品マスタデータに基づき、最適な出品先を決定する中枢エンジン
 */

import type { Platform } from '@/lib/multichannel/types';
import type {
  SKUMasterData,
  ListingData,
  MarketplaceCandidate,
  FilterResult,
  SystemConstraintResult,
  UserStrategyResult,
  ScoringResult,
  ListingStrategyResult,
  UserStrategySettings,
  MarketplaceBoostSettings,
} from './types';
import { checkPlatformRules } from './platformRules';

// ===========================================
// レイヤー1: システム制約と出品可否判定
// ===========================================

/**
 * アカウント重複チェック（排他的ロック）
 * 同じSKUが既に同一モールの別アカウントに出品されている場合、
 * そのモール内の他のすべてのアカウントを除外する
 *
 * @param sku - SKU
 * @param candidate - チェック対象の候補
 * @param existingListings - 既存の出品データ
 * @returns フィルタ結果
 */
function checkDuplicateAccount(
  sku: string,
  candidate: MarketplaceCandidate,
  existingListings: ListingData[]
): FilterResult {
  // 同じプラットフォームで既に出品されているか
  const existingOnSamePlatform = existingListings.filter(
    (listing) =>
      listing.platform === candidate.platform &&
      listing.status !== 'delisted' // 削除済みは除外
  );

  if (existingOnSamePlatform.length > 0) {
    const existingAccountIds = existingOnSamePlatform
      .map((l) => l.account_id)
      .join(', ');

    return {
      passed: false,
      reason: `${candidate.platform}では既にアカウント ${existingAccountIds} で出品済み（排他的ロック）`,
      layer: 1,
    };
  }

  return { passed: true, layer: 1 };
}

/**
 * モール規約・条件チェック
 * @param product - 商品データ
 * @param candidate - チェック対象の候補
 * @returns フィルタ結果
 */
function checkPlatformRulesFilter(
  product: SKUMasterData,
  candidate: MarketplaceCandidate
): FilterResult {
  const ruleCheck = checkPlatformRules(
    candidate.platform,
    product.category,
    product.condition,
    product.hts_code
  );

  if (!ruleCheck.allowed) {
    return {
      passed: false,
      reason: ruleCheck.reason || 'モール規約違反',
      layer: 1,
    };
  }

  return { passed: true, layer: 1 };
}

/**
 * 在庫/スコアチェック
 * @param product - 商品データ
 * @param minGlobalScore - 最低グローバルスコア（デフォルト: -10000）
 * @returns フィルタ結果
 */
function checkStockAndScore(
  product: SKUMasterData,
  minGlobalScore: number = -10000
): FilterResult {
  // 在庫チェック
  if (product.stock_quantity <= 0) {
    return {
      passed: false,
      reason: '在庫数がゼロ',
      layer: 1,
    };
  }

  // スコアチェック
  const globalScore = product.global_score || 0;
  if (globalScore < minGlobalScore) {
    return {
      passed: false,
      reason: `グローバルスコア (${globalScore}) が最低ライン (${minGlobalScore}) を下回っている`,
      layer: 1,
    };
  }

  return { passed: true, layer: 1 };
}

/**
 * レイヤー1: システム制約チェック（全候補に対して実行）
 * @param product - 商品データ
 * @param candidates - 出品候補リスト
 * @param existingListings - 既存の出品データ
 * @param minGlobalScore - 最低グローバルスコア
 * @returns システム制約チェック結果
 */
export function applySystemConstraints(
  product: SKUMasterData,
  candidates: MarketplaceCandidate[],
  existingListings: ListingData[],
  minGlobalScore: number = -10000
): SystemConstraintResult[] {
  const results: SystemConstraintResult[] = [];

  // 在庫/スコアは全候補共通でチェック
  const stockAndScoreCheck = checkStockAndScore(product, minGlobalScore);

  for (const candidate of candidates) {
    // アカウント重複チェック
    const duplicateCheck = checkDuplicateAccount(
      product.sku,
      candidate,
      existingListings
    );

    // モール規約チェック
    const rulesCheck = checkPlatformRulesFilter(product, candidate);

    // 最終判定（すべてのチェックがpassedの場合のみ通過）
    const overallPassed =
      duplicateCheck.passed && rulesCheck.passed && stockAndScoreCheck.passed;

    const reason = [
      !duplicateCheck.passed && duplicateCheck.reason,
      !rulesCheck.passed && rulesCheck.reason,
      !stockAndScoreCheck.passed && stockAndScoreCheck.reason,
    ]
      .filter(Boolean)
      .join('; ');

    results.push({
      candidate,
      filterResult: {
        passed: overallPassed,
        reason: overallPassed ? undefined : reason,
        layer: 1,
      },
      checks: {
        duplicateAccount: duplicateCheck,
        platformRules: rulesCheck,
        stockAndScore: stockAndScoreCheck,
      },
    });
  }

  return results;
}

// ===========================================
// レイヤー2: ユーザー戦略的フィルタリング
// ===========================================

/**
 * カテゴリー・モール限定チェック
 * @param product - 商品データ
 * @param candidate - 候補
 * @param settings - ユーザー戦略設定
 * @returns フィルタ結果
 */
function checkCategoryRestriction(
  product: SKUMasterData,
  candidate: MarketplaceCandidate,
  settings: UserStrategySettings
): FilterResult {
  const restriction = settings.categoryRestrictions.find(
    (r) => r.category.toLowerCase() === product.category.toLowerCase()
  );

  if (!restriction) {
    return { passed: true, layer: 2 }; // 制限なし
  }

  // ホワイトリストチェック
  if (restriction.allowedPlatforms && restriction.allowedPlatforms.length > 0) {
    if (!restriction.allowedPlatforms.includes(candidate.platform)) {
      return {
        passed: false,
        reason: `カテゴリ「${product.category}」は ${restriction.allowedPlatforms.join(', ')} のみ出品可能`,
        layer: 2,
      };
    }
  }

  // ブラックリストチェック
  if (restriction.blockedPlatforms && restriction.blockedPlatforms.length > 0) {
    if (restriction.blockedPlatforms.includes(candidate.platform)) {
      return {
        passed: false,
        reason: `カテゴリ「${product.category}」は ${candidate.platform} への出品が禁止されています`,
        layer: 2,
      };
    }
  }

  return { passed: true, layer: 2 };
}

/**
 * アカウント専門化チェック
 * @param product - 商品データ
 * @param candidate - 候補
 * @param settings - ユーザー戦略設定
 * @returns フィルタ結果
 */
function checkAccountSpecialization(
  product: SKUMasterData,
  candidate: MarketplaceCandidate,
  settings: UserStrategySettings
): FilterResult {
  const specialization = settings.accountSpecialization.find(
    (spec) =>
      spec.accountId === candidate.accountId && spec.platform === candidate.platform
  );

  if (!specialization) {
    return { passed: true, layer: 2 }; // 専門化設定なし
  }

  // 許可されたカテゴリに含まれているか
  if (!specialization.allowedCategories.includes(product.category)) {
    return {
      passed: false,
      reason: `アカウント ${candidate.accountId} は「${specialization.allowedCategories.join(', ')}」のみ出品可能`,
      layer: 2,
    };
  }

  return { passed: true, layer: 2 };
}

/**
 * 価格帯制限チェック
 * @param product - 商品データ
 * @param candidate - 候補
 * @param settings - ユーザー戦略設定
 * @returns フィルタ結果
 */
function checkPriceRange(
  product: SKUMasterData,
  candidate: MarketplaceCandidate,
  settings: UserStrategySettings
): FilterResult {
  const priceRestriction = settings.priceRangeRestrictions.find(
    (r) =>
      r.platform === candidate.platform &&
      (r.accountId === undefined || r.accountId === candidate.accountId)
  );

  if (!priceRestriction) {
    return { passed: true, layer: 2 }; // 制限なし
  }

  const priceJpy = product.price_jpy;

  // 最低価格チェック
  if (priceRestriction.minPrice && priceJpy < priceRestriction.minPrice) {
    return {
      passed: false,
      reason: `価格（¥${priceJpy}）が ${candidate.platform} の最低価格（¥${priceRestriction.minPrice}）を下回っています`,
      layer: 2,
    };
  }

  // 最高価格チェック
  if (priceRestriction.maxPrice && priceJpy > priceRestriction.maxPrice) {
    return {
      passed: false,
      reason: `価格（¥${priceJpy}）が ${candidate.platform} の最高価格（¥${priceRestriction.maxPrice}）を上回っています`,
      layer: 2,
    };
  }

  return { passed: true, layer: 2 };
}

/**
 * レイヤー2: ユーザー戦略的フィルタリング
 * @param product - 商品データ
 * @param passedCandidates - レイヤー1を通過した候補
 * @param settings - ユーザー戦略設定
 * @returns ユーザー戦略フィルタリング結果
 */
export function applyUserStrategy(
  product: SKUMasterData,
  passedCandidates: MarketplaceCandidate[],
  settings: UserStrategySettings
): UserStrategyResult[] {
  const results: UserStrategyResult[] = [];

  for (const candidate of passedCandidates) {
    const categoryCheck = checkCategoryRestriction(product, candidate, settings);
    const specializationCheck = checkAccountSpecialization(
      product,
      candidate,
      settings
    );
    const priceCheck = checkPriceRange(product, candidate, settings);

    const overallPassed =
      categoryCheck.passed && specializationCheck.passed && priceCheck.passed;

    const reason = [
      !categoryCheck.passed && categoryCheck.reason,
      !specializationCheck.passed && specializationCheck.reason,
      !priceCheck.passed && priceCheck.reason,
    ]
      .filter(Boolean)
      .join('; ');

    results.push({
      candidate,
      filterResult: {
        passed: overallPassed,
        reason: overallPassed ? undefined : reason,
        layer: 2,
      },
      checks: {
        categoryRestriction: categoryCheck,
        accountSpecialization: specializationCheck,
        priceRange: priceCheck,
      },
    });
  }

  return results;
}

// ===========================================
// レイヤー3: モール別スコア評価と優先順位付け
// ===========================================

/**
 * モール別スコアの計算
 * U_i,Mall = U_i × M_Mall
 *
 * @param globalScore - グローバルスコア (U_i)
 * @param candidate - 候補
 * @param product - 商品データ
 * @param boostSettings - ブースト設定
 * @returns スコアリング結果
 */
export function calculateMarketplaceScore(
  globalScore: number,
  candidate: MarketplaceCandidate,
  product: SKUMasterData,
  boostSettings: MarketplaceBoostSettings[]
): ScoringResult {
  // デフォルトブースト値
  let performanceBoost = 1.0;
  let competitionBoost = 1.0;
  let categoryFitBoost = 1.0;

  // 該当するブースト設定を検索
  const platformBoost = boostSettings.find(
    (b) =>
      b.platform === candidate.platform &&
      (b.accountId === undefined || b.accountId === candidate.accountId) &&
      (b.category === undefined || b.category === product.category)
  );

  if (platformBoost) {
    performanceBoost = platformBoost.performanceBoost;
    competitionBoost = platformBoost.competitionBoost;
    categoryFitBoost = platformBoost.categoryFitBoost;
  }

  // ブースト乗数の計算（積）
  const boostMultiplier = performanceBoost * competitionBoost * categoryFitBoost;

  // 最終スコア
  const finalScore = globalScore * boostMultiplier;

  return {
    candidate,
    globalScore,
    boostMultiplier,
    finalScore,
    breakdown: {
      performanceBoost,
      competitionBoost,
      categoryFitBoost,
    },
  };
}

/**
 * レイヤー3: スコアリングと優先順位付け
 * @param product - 商品データ
 * @param passedCandidates - レイヤー2を通過した候補
 * @param boostSettings - ブースト設定
 * @returns スコアリング結果（finalScoreの降順でソート）
 */
export function scoreAndRankCandidates(
  product: SKUMasterData,
  passedCandidates: MarketplaceCandidate[],
  boostSettings: MarketplaceBoostSettings[]
): ScoringResult[] {
  const globalScore = product.global_score || 0;

  const scoredResults = passedCandidates.map((candidate) =>
    calculateMarketplaceScore(globalScore, candidate, product, boostSettings)
  );

  // finalScoreの降順でソート
  return scoredResults.sort((a, b) => b.finalScore - a.finalScore);
}

// ===========================================
// 統合: 最終的な出品戦略決定
// ===========================================

/**
 * 出品戦略エンジン（メイン関数）
 * 3つのレイヤー処理を統合し、最適な出品先を決定
 *
 * @param product - 商品データ
 * @param allCandidates - すべての候補（モール/アカウント）
 * @param existingListings - 既存の出品データ
 * @param userSettings - ユーザー戦略設定
 * @param boostSettings - ブースト設定
 * @param minGlobalScore - 最低グローバルスコア
 * @returns 出品戦略決定結果
 */
export function determineListingStrategy(
  product: SKUMasterData,
  allCandidates: MarketplaceCandidate[],
  existingListings: ListingData[],
  userSettings: UserStrategySettings,
  boostSettings: MarketplaceBoostSettings[],
  minGlobalScore: number = -10000
): ListingStrategyResult {
  console.log(
    `[ListingStrategyEngine] SKU ${product.sku} の出品戦略を決定開始...`
  );

  // レイヤー1: システム制約チェック
  const layer1Results = applySystemConstraints(
    product,
    allCandidates,
    existingListings,
    minGlobalScore
  );

  const layer1Passed = layer1Results
    .filter((r) => r.filterResult.passed)
    .map((r) => r.candidate);

  console.log(
    `[Layer1] ${layer1Passed.length}/${allCandidates.length} 候補がシステム制約を通過`
  );

  // レイヤー2: ユーザー戦略フィルタリング
  const layer2Results = applyUserStrategy(product, layer1Passed, userSettings);

  const layer2Passed = layer2Results
    .filter((r) => r.filterResult.passed)
    .map((r) => r.candidate);

  console.log(
    `[Layer2] ${layer2Passed.length}/${layer1Passed.length} 候補がユーザー戦略を通過`
  );

  // レイヤー3: スコアリングと優先順位付け
  const scoredCandidates = scoreAndRankCandidates(
    product,
    layer2Passed,
    boostSettings
  );

  console.log(
    `[Layer3] ${scoredCandidates.length} 候補をスコアリング完了`
  );

  // 最終決定
  const topCandidate = scoredCandidates.length > 0 ? scoredCandidates[0] : null;

  const finalDecision = {
    shouldList: topCandidate !== null,
    targetPlatform: topCandidate?.candidate.platform,
    targetAccountId: topCandidate?.candidate.accountId,
    reason: topCandidate
      ? `最適候補: ${topCandidate.candidate.platform} (${topCandidate.candidate.accountId}) - スコア: ${topCandidate.finalScore.toFixed(2)}`
      : '出品可能な候補が見つかりませんでした',
  };

  console.log(`[Final] ${finalDecision.reason}`);

  return {
    sku: product.sku,
    productId: product.id,
    recommendedCandidate: topCandidate?.candidate || null,
    allCandidates,
    systemConstraints: layer1Results,
    userStrategyFiltered: layer2Results,
    scoredCandidates,
    finalDecision,
  };
}
