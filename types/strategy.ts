/**
 * 多販路出品戦略管理システム - 型定義
 */

/**
 * プラットフォーム（モール）の種類
 */
export type Platform = 'amazon' | 'ebay' | 'mercari' | 'yahoo' | 'rakuten' | 'shopee' | 'walmart';

/**
 * 戦略ルールの種類
 */
export type RuleType =
  | 'WHITELIST'              // ホワイトリスト（許可リスト）
  | 'BLACKLIST'              // ブラックリスト（禁止リスト）
  | 'PRICE_MIN'              // 最低価格制限
  | 'PRICE_MAX'              // 最高価格制限
  | 'CATEGORY_ACCOUNT_SPECIFIC'; // カテゴリー別アカウント専門化

/**
 * StrategyRules テーブルの型定義
 */
export interface StrategyRule {
  rule_id: number;
  rule_name: string;
  rule_type: RuleType;
  platform_key: Platform | null;
  account_id: number | null;
  target_category: string | null;
  min_price_jpy: number | null;
  max_price_jpy: number | null;
  M_factor: number; // モールブースト乗数（デフォルト: 1.00）
  created_at?: string;
  updated_at?: string;
}

/**
 * 出品候補（モール×アカウントの組み合わせ）
 */
export interface ListingCandidate {
  platform: Platform;
  account_id: number;
  account_name?: string;
  is_excluded: boolean; // レイヤー1, 2で除外されたか
  exclusion_reason?: string; // 除外理由
  strategy_score?: number; // レイヤー3で計算されるスコア
}

/**
 * 出品戦略決定の結果
 */
export interface ListingDecision {
  sku: string;
  recommended_platform: Platform | null;
  recommended_account_id: number | null;
  strategy_score: number | null;
  all_candidates: ListingCandidate[];
  decision_timestamp: string;
  status: 'SUCCESS' | 'NO_CANDIDATES' | 'ERROR';
  message: string;
}

/**
 * プラットフォーム制約の定義
 */
export interface PlatformConstraint {
  platform: Platform;
  allowed_categories: string[] | null; // null = 全カテゴリー許可
  blocked_categories: string[] | null;
  allowed_conditions: string[] | null; // 例: ['New', 'Like New']
  blocked_conditions: string[] | null;
  min_price_jpy: number | null;
  max_price_jpy: number | null;
  requires_approval: boolean; // 特定の審査が必要か
}

/**
 * レイヤー1: システム制約チェックの結果
 */
export interface Layer1Result {
  candidates: ListingCandidate[];
  excluded_count: number;
  exclusion_summary: Record<string, number>; // 理由別の除外数
}

/**
 * レイヤー2: ユーザー戦略フィルタリングの結果
 */
export interface Layer2Result {
  candidates: ListingCandidate[];
  excluded_count: number;
  applied_rules: StrategyRule[];
}

/**
 * レイヤー3: スコア評価の結果
 */
export interface Layer3Result {
  ranked_candidates: ListingCandidate[];
  top_recommendation: ListingCandidate | null;
}

/**
 * 販売履歴（実績データ）
 */
export interface SalesHistory {
  id: number;
  platform: Platform;
  account_id: number;
  sku: string;
  sale_date: string;
  profit_margin: number; // 利益率
  days_to_sell: number; // 販売までの日数
  created_at: string;
}

/**
 * モール別スコア計算用の乗数
 */
export interface ScoreMultipliers {
  M_performance: number; // 実績ブースト (1.00 ~ 1.50)
  M_competition: number; // 競合ブースト (1.00 ~ 1.20)
  M_category_fit: number; // カテゴリー適合ブースト (StrategyRule.M_factor)
  M_total: number; // 総合乗数
}

/**
 * 戦略エンジンの設定
 */
export interface StrategyEngineConfig {
  min_priority_score: number; // 最低優先度スコア（デフォルト: -10000）
  min_stock_quantity: number; // 最低在庫数（デフォルト: 1）
  sales_history_days: number; // 実績データの参照期間（デフォルト: 30日）
  default_M_performance: number; // デフォルト実績ブースト（デフォルト: 1.00）
  default_M_competition: number; // デフォルト競合ブースト（デフォルト: 1.00）
  default_M_category_fit: number; // デフォルトカテゴリー適合ブースト（デフォルト: 1.00）
}
