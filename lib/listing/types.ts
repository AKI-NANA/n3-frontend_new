/**
 * 多販路出品戦略エンジン - 型定義
 */

import type { Platform } from '@/lib/multichannel/types';

/**
 * SKUマスターデータ（簡易版）
 */
export interface SKUMasterData {
  id: number;
  sku: string;
  category: string;
  condition: 'New' | 'Used' | 'Refurbished';
  hts_code?: string;
  price_jpy: number;
  stock_quantity: number;
  global_score?: number; // Uiスコア
  [key: string]: any;
}

/**
 * 出品データ（listing_data）
 */
export interface ListingData {
  id: number;
  products_master_id: number;
  account_id: string;
  platform: Platform;
  status: 'draft' | 'listed' | 'sold' | 'delisted';
  listed_at?: Date;
  [key: string]: any;
}

/**
 * モール/アカウント候補
 */
export interface MarketplaceCandidate {
  platform: Platform;
  accountId: string;
  accountName: string;
  country: string;
}

/**
 * フィルタリング結果
 */
export interface FilterResult {
  passed: boolean;
  reason?: string; // 除外理由
  layer: 1 | 2 | 3; // どのレイヤーで除外されたか
}

/**
 * レイヤー1: システム制約チェック結果
 */
export interface SystemConstraintResult {
  candidate: MarketplaceCandidate;
  filterResult: FilterResult;
  checks: {
    duplicateAccount: FilterResult;
    platformRules: FilterResult;
    stockAndScore: FilterResult;
  };
}

/**
 * レイヤー2: ユーザー戦略フィルタリング結果
 */
export interface UserStrategyResult {
  candidate: MarketplaceCandidate;
  filterResult: FilterResult;
  checks: {
    categoryRestriction: FilterResult;
    accountSpecialization: FilterResult;
    priceRange: FilterResult;
  };
}

/**
 * レイヤー3: スコアリング結果
 */
export interface ScoringResult {
  candidate: MarketplaceCandidate;
  globalScore: number; // Ui
  boostMultiplier: number; // M_Mall
  finalScore: number; // U_i,Mall = Ui × M_Mall
  breakdown: {
    performanceBoost: number;
    competitionBoost: number;
    categoryFitBoost: number;
  };
}

/**
 * 最終的な出品戦略決定結果
 */
export interface ListingStrategyResult {
  sku: string;
  productId: number;
  recommendedCandidate: MarketplaceCandidate | null;
  allCandidates: MarketplaceCandidate[];
  systemConstraints: SystemConstraintResult[];
  userStrategyFiltered: UserStrategyResult[];
  scoredCandidates: ScoringResult[];
  finalDecision: {
    shouldList: boolean;
    targetPlatform?: Platform;
    targetAccountId?: string;
    reason: string;
  };
}

/**
 * ユーザー戦略設定
 */
export interface UserStrategySettings {
  // カテゴリー・モール限定
  categoryRestrictions: {
    category: string;
    allowedPlatforms?: Platform[]; // ホワイトリスト
    blockedPlatforms?: Platform[]; // ブラックリスト
  }[];

  // アカウント別専門化
  accountSpecialization: {
    accountId: string;
    platform: Platform;
    allowedCategories: string[];
  }[];

  // 価格帯制限
  priceRangeRestrictions: {
    platform: Platform;
    accountId?: string;
    minPrice?: number; // 最低価格（円）
    maxPrice?: number; // 最高価格（円）
  }[];

  // 最低スコア設定
  minScoreRestrictions: {
    platform: Platform;
    accountId?: string;
    minGlobalScore: number; // 最低Uiスコア
  }[];
}

/**
 * モール別ブースト設定
 */
export interface MarketplaceBoostSettings {
  platform: Platform;
  accountId?: string;
  category?: string;
  performanceBoost: number; // 実績ブースト (1.0 = 基準)
  competitionBoost: number; // 競合の質ブースト
  categoryFitBoost: number; // カテゴリ適合ブースト
}

/**
 * モール規約ルール
 */
export interface PlatformRule {
  platform: Platform;
  ruleType: 'category_restriction' | 'condition_restriction' | 'hts_restriction';
  conditions: {
    category?: string[];
    condition?: ('New' | 'Used' | 'Refurbished')[];
    htsCode?: string[];
  };
  action: 'allow' | 'block';
  description: string;
}
