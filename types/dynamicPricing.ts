/**
 * ダイナミックプライシングエンジンの型定義
 *
 * I. 価格調整・競争戦略 (Dynamic Pricing)
 * II. 在庫・サプライチェーン管理
 * III. パフォーマンス最適化・スコアリングシステム
 */

// ===========================
// I. 価格調整・競争戦略
// ===========================

/**
 * パフォーマンススコア（A-Eランク）
 */
export type PerformanceScore = 'A' | 'B' | 'C' | 'D' | 'E'

/**
 * 価格戦略タイプの拡張
 */
export type DynamicPricingStrategyType =
  | 'follow_lowest_with_min_profit'    // ルール1: 最安値追従（最低利益確保）
  | 'seasonal_adjustment'              // ルール3: 時期・季節による自動変動
  | 'regional_category_adjustment'     // ルール4: 地域・カテゴリ別の一時調整
  | 'initial_boost_gradual_increase'   // ルール5: 初期販売ブーストと段階的値上げ
  | 'price_difference_tracking'        // ルール6: 基準価格からの差分調整
  | 'competition_based_increase'       // ルール7: 競争環境による価格上昇
  | 'watcher_based_offer_strategy'     // ルール11: オファー獲得戦略（ウォッチャー連動）
  | 'competitor_trust_premium'         // その他10: 競合セラーの信頼度に基づく価格プレミアム

/**
 * ルール1: 最安値追従（最低利益確保）の設定
 */
export interface FollowLowestWithMinProfitConfig {
  strategy_type: 'follow_lowest_with_min_profit'
  min_profit_amount_usd: number        // 最低利益額（USD）- 赤字回避の最終ストッパー
  enable_stopper: boolean               // 最低利益ストッパーを有効化
  check_frequency_hours: number         // 価格チェック頻度（時間）
}

/**
 * ルール3: 時期・季節による自動変動の設定
 */
export interface SeasonalAdjustmentConfig {
  strategy_type: 'seasonal_adjustment'
  product_category: string              // 商品カテゴリ（例: winter_clothing, event_items）
  adjustment_schedule: SeasonalPriceSchedule[]  // 季節ごとの価格調整スケジュール
  enabled: boolean
}

export interface SeasonalPriceSchedule {
  start_date: string                    // 開始日（MM-DD形式）
  end_date: string                      // 終了日（MM-DD形式）
  price_adjust_percent: number          // 価格調整率（±%）
  description: string                   // スケジュールの説明
}

/**
 * ルール4: 地域・カテゴリ別の一時調整の設定
 */
export interface RegionalCategoryAdjustmentConfig {
  strategy_type: 'regional_category_adjustment'
  target_country?: string               // 対象国（ISO 3166-1 alpha-2）
  target_category?: string              // 対象カテゴリ
  adjust_percent: number                // 調整率（±%）
  start_date: string                    // 開始日
  end_date: string                      // 終了日
  reason: string                        // 調整理由（例: セール期間）
}

/**
 * ルール5: 初期販売ブーストと段階的値上げの設定
 */
export interface InitialBoostConfig {
  strategy_type: 'initial_boost_gradual_increase'
  initial_min_profit_usd: number        // 初期最低利益額
  disable_stopper_initially: boolean    // 初期はストッパーを解除
  sold_count_thresholds: SoldCountThreshold[]  // 販売数に応じた価格調整
}

export interface SoldCountThreshold {
  sold_count: number                    // 販売数しきい値
  price_increase_percent: number        // 価格上昇率（%）
  description: string
}

/**
 * ルール6: 基準価格からの差分調整の設定
 */
export interface PriceDifferenceTrackingConfig {
  strategy_type: 'price_difference_tracking'
  price_difference_usd: number          // 最安値からの差分（±USD）
  apply_above_lowest: boolean           // 最安値より上に適用するか
  auto_follow: boolean                  // 差分を維持したまま自動追従
}

/**
 * ルール7: 競争環境による価格上昇の設定
 */
export interface CompetitionBasedIncreaseConfig {
  strategy_type: 'competition_based_increase'
  low_inventory_threshold: number       // 低在庫しきい値（市場全体）
  low_seller_threshold: number          // 低セラー数しきい値
  price_increase_percent: number        // 価格上昇率（%）
  max_price_usd?: number                // 最高価格（上限）
}

/**
 * ルール11: オファー獲得戦略（ウォッチャー連動）の設定
 */
export interface WatcherBasedOfferConfig {
  strategy_type: 'watcher_based_offer_strategy'
  watcher_count_thresholds: WatcherThreshold[]  // ウォッチャー数に応じた価格調整
  offer_margin_percent: number          // オファー用の利益幅（%）
}

export interface WatcherThreshold {
  watcher_count: number                 // ウォッチャー数しきい値
  price_increase_percent: number        // 価格上昇率（%）
  description: string
}

/**
 * その他10: 競合セラーの信頼度に基づく価格プレミアム設定
 */
export interface CompetitorTrustPremiumConfig {
  strategy_type: 'competitor_trust_premium'
  min_competitor_rating_diff: number    // 競合との評価差の最小値
  premium_percent: number               // プレミアム率（%）
  enabled: boolean
}

/**
 * 統合価格戦略設定（すべてのルールを統合）
 */
export type DynamicPricingConfig =
  | FollowLowestWithMinProfitConfig
  | SeasonalAdjustmentConfig
  | RegionalCategoryAdjustmentConfig
  | InitialBoostConfig
  | PriceDifferenceTrackingConfig
  | CompetitionBasedIncreaseConfig
  | WatcherBasedOfferConfig
  | CompetitorTrustPremiumConfig

// ===========================
// II. 在庫・サプライチェーン管理
// ===========================

/**
 * ルール8: 在庫切れ時の自動停止アクション
 */
export type OutOfStockAutoAction =
  | 'set_inventory_zero'    // 在庫を0に更新
  | 'pause_listing'         // 出品を一時停止
  | 'end_listing'           // 出品を終了
  | 'notify_only'           // 通知のみ

/**
 * ルール9: 複数仕入れ元の設定
 */
export interface SupplierConfig {
  supplier_id: string
  supplier_name: string
  priority: number                      // 優先順位（1が最優先）
  base_cost_usd: number                 // 基本原価（USD）
  shipping_cost_usd: number             // 送料（USD）
  lead_time_days: number                // リードタイム（日数）
  is_active: boolean
  stock_check_url?: string              // 在庫確認URL（HTML解析用）
  html_selector?: string                // 在庫数を示すHTMLセレクター
}

/**
 * ルール14: HTML解析エラーの記録
 */
export interface HtmlParseError {
  error_id: string
  supplier_id: string
  product_id: string
  sku: string
  error_type: 'selector_not_found' | 'html_structure_changed' | 'network_error' | 'parsing_failed'
  error_message: string
  error_details?: string
  html_snapshot?: string                // エラー発生時のHTML（デバッグ用）
  occurred_at: string
  resolved: boolean
  resolved_at?: string
  resolved_by?: string
}

/**
 * サプライチェーン監視の状態
 */
export interface SupplyChainStatus {
  product_id: string
  sku: string
  active_supplier: SupplierConfig
  backup_suppliers: SupplierConfig[]
  current_stock_level: number
  last_checked_at: string
  next_check_at: string
  has_errors: boolean
  recent_errors: HtmlParseError[]
}

// ===========================
// III. パフォーマンス最適化・スコアリングシステム
// ===========================

/**
 * ルール15: パフォーマンススコアの計算要因
 */
export interface PerformanceScoreFactors {
  market_inventory_count: number        // 市場在庫数
  view_count: number                    // ビュー数
  watcher_count: number                 // ウォッチャー数
  days_listed: number                   // 滞留期間（日数）
  profit_margin_percent: number         // 利益率（%）
  sold_count: number                    // 販売数
  conversion_rate: number               // 転換率（%）
}

/**
 * スコア計算の重み設定
 */
export interface ScoringWeights {
  market_inventory_weight: number       // 市場在庫数の重み（デフォルト: 0.2）
  view_count_weight: number             // ビュー数の重み（デフォルト: 0.15）
  watcher_count_weight: number          // ウォッチャー数の重み（デフォルト: 0.2）
  days_listed_weight: number            // 滞留期間の重み（デフォルト: -0.15）負の重み
  profit_margin_weight: number          // 利益率の重み（デフォルト: 0.2）
  sold_count_weight: number             // 販売数の重み（デフォルト: 0.1）
}

/**
 * スコア計算結果
 */
export interface PerformanceScoreResult {
  product_id: string
  sku: string
  score: PerformanceScore               // A-Eランク
  score_value: number                   // 数値スコア（0-100）
  factors: PerformanceScoreFactors
  calculated_at: string
  expires_at: string                    // スコアの有効期限
}

/**
 * ルール2: スコア変動における出品の停止（アカウント健全性連動）
 */
export interface AccountHealthScore {
  account_id: string
  marketplace: string                   // eBay, Amazon, etc.
  health_score: number                  // 0-100
  feedback_score: number
  warning_count: number
  policy_violation_count: number
  last_updated_at: string
}

/**
 * ルール12: スコア低下時の出品入替の設定
 */
export interface ListingRotationConfig {
  enabled: boolean
  low_score_threshold: PerformanceScore // このスコア以下で入替候補
  listing_limit: number                 // 出品上限数
  auto_rotate: boolean                  // 自動入替を有効化
  rotation_check_frequency_hours: number
}

/**
 * ルール13: 滞留商品の優先度低下の設定
 */
export interface StagnantProductConfig {
  max_days_listed: number               // 滞留日数の上限
  min_view_count: number                // 最小ビュー数
  min_watcher_count: number             // 最小ウォッチャー数
  auto_deprioritize: boolean            // 自動で優先度を下げる
}

// ===========================
// データベーステーブル型定義
// ===========================

/**
 * Pricing_Strategy_Master テーブル
 */
export interface PricingStrategyMaster {
  id: string
  strategy_name: string
  strategy_type: DynamicPricingStrategyType
  strategy_config: DynamicPricingConfig  // JSONB
  is_default: boolean
  priority: number
  enabled: boolean
  applies_to_category?: string
  applies_to_sku_pattern?: string
  created_at: string
  updated_at: string
  created_by?: string
  description?: string
}

/**
 * products_master テーブルの拡張フィールド
 */
export interface ProductDynamicPricingFields {
  performance_score?: PerformanceScore  // パフォーマンススコア（A-E）
  performance_score_value?: number      // 数値スコア（0-100）
  strategy_id?: string                  // FK to Pricing_Strategy_Master
  custom_strategy_config?: DynamicPricingConfig  // 個別商品の戦略設定（JSONB）
  score_calculated_at?: string
  price_last_adjusted_at?: string
  active_supplier_id?: string
  watcher_count?: number
  view_count?: number
  sold_count?: number
  days_listed?: number
}

/**
 * Supply_Chain_Monitoring テーブル
 */
export interface SupplyChainMonitoring {
  id: string
  product_id: string
  sku: string
  supplier_id: string
  stock_level: number
  last_checked_at: string
  next_check_at: string
  check_status: 'success' | 'error' | 'pending'
  error_id?: string                     // FK to Html_Parse_Errors
  created_at: string
  updated_at: string
}

/**
 * Html_Parse_Errors テーブル
 */
export interface HtmlParseErrorRecord extends HtmlParseError {
  id: string
  created_at: string
  updated_at: string
}

/**
 * Performance_Score_History テーブル（スコア履歴）
 */
export interface PerformanceScoreHistory {
  id: string
  product_id: string
  sku: string
  score: PerformanceScore
  score_value: number
  factors: PerformanceScoreFactors      // JSONB
  calculated_at: string
}

/**
 * Price_Adjustment_Log テーブル（価格調整履歴）
 */
export interface PriceAdjustmentLog {
  id: string
  product_id: string
  sku: string
  old_price_usd: number
  new_price_usd: number
  adjustment_reason: string
  strategy_type: DynamicPricingStrategyType
  strategy_config: DynamicPricingConfig  // JSONB
  adjusted_by: 'system' | 'manual'
  adjusted_at: string
  marketplace?: string
}

// ===========================
// API レスポンス型
// ===========================

export interface DynamicPricingResponse {
  success: boolean
  data?: {
    new_price_usd: number
    old_price_usd: number
    adjustment_reason: string
    strategy_applied: DynamicPricingStrategyType
  }
  error?: string
}

export interface PerformanceScoreResponse {
  success: boolean
  data?: PerformanceScoreResult
  error?: string
}

export interface SupplyChainStatusResponse {
  success: boolean
  data?: SupplyChainStatus
  error?: string
}

export interface HtmlParseErrorResponse {
  success: boolean
  data?: HtmlParseError[]
  error?: string
}
