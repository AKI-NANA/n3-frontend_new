// ====================================================================
// 価格再計算エンジン - 型定義
// ====================================================================

/**
 * 価格ルールの型
 */
export interface PricingRule {
  id: string;
  name: string;
  description?: string;
  type: 'follow_lowest' | 'seasonal' | 'competitor' | 'offer_strategy' | 'minimum_profit' | 'region_category';
  enabled: boolean;
  priority: number;
  conditions: PricingRuleConditions;
  actions: PricingRuleActions;
}

/**
 * ルール適用条件
 */
export interface PricingRuleConditions {
  marketplace?: string[];
  category?: string[];
  min_profit_margin?: number;
  max_price_jpy?: number;
  min_stock?: number;
  min_profit_usd?: number;
}

/**
 * ルールアクション
 */
export interface PricingRuleActions {
  adjust_type?: 'percentage' | 'fixed_amount' | 'match_lowest';
  adjust_value?: number;
  apply_to?: 'ebay_price' | 'source_price';
  min_profit_usd?: number;
  max_adjust_percent?: number;
  enforce_minimum?: boolean;
  stop_if_below?: boolean;
}

/**
 * 価格変動入力データ
 */
export interface PriceChangeInput {
  product_id: number;
  ebay_listing_id?: string;
  
  // 変動情報
  change_type: 'source_price' | 'competitor_price' | 'auto_adjust' | 'manual_adjust' | 'seasonal_adjust';
  trigger_type: 'inventory_monitoring' | 'pricing_rule' | 'manual' | 'cron';
  
  // 価格データ
  old_source_price_jpy: number;
  new_source_price_jpy: number;
  
  // 既存のeBay価格
  current_ebay_price_usd?: number;
  
  // 商品データ
  product_data?: {
    weight_g?: number;
    length_cm?: number;
    width_cm?: number;
    height_cm?: number;
    category?: string;
    shipping_policy_id?: string;
  };
  
  // 適用するルール（オプション）
  apply_rule_id?: string;
}

/**
 * 価格計算結果
 */
export interface PriceCalculationResult {
  // 仕入れ価格
  source_price_jpy: number;
  source_price_usd: number;
  
  // 配送コスト
  shipping_cost_jpy: number;
  shipping_cost_usd: number;
  
  // 手数料
  ebay_fee_usd: number;
  paypal_fee_usd: number;
  
  // 販売価格
  ebay_price_usd: number;
  
  // 利益
  profit_usd: number;
  profit_margin: number;
  
  // 為替レート
  exchange_rate: number;
  
  // 配送ポリシー
  recommended_shipping_policy_id?: string;
  shipping_policy_changed: boolean;
}

/**
 * ルール適用結果
 */
export interface RuleApplicationResult {
  applied_rule?: PricingRule;
  adjusted_price_usd: number;
  adjustment_reason: string;
  stopped_by_minimum: boolean;
}

/**
 * 価格変動データ（完全版）
 */
export interface PriceChangeData {
  id?: string;
  product_id: number;
  ebay_listing_id?: string;
  
  // 変動情報
  change_type: string;
  trigger_type: string;
  
  // 価格データ（仕入れ価格）
  old_source_price_jpy: number;
  new_source_price_jpy: number;
  source_price_diff: number;
  
  // 価格データ（eBay販売価格）
  old_ebay_price_usd: number;
  new_ebay_price_usd: number;
  ebay_price_diff: number;
  
  // 利益計算
  old_profit_usd: number;
  new_profit_usd: number;
  profit_diff: number;
  
  old_profit_margin: number;
  new_profit_margin: number;
  
  // 適用ルール
  applied_rule_id?: string;
  applied_rule_name?: string;
  
  // 配送ポリシー変更
  shipping_policy_changed: boolean;
  old_shipping_policy_id?: string;
  new_shipping_policy_id?: string;
  
  // ステータス
  status: 'pending' | 'approved' | 'applied' | 'rejected';
  auto_applied: boolean;
  
  // エラー情報
  error_message?: string;
}

/**
 * 商品マスタデータ（必要な部分のみ）
 */
export interface ProductMasterData {
  id: number;
  sku?: string;
  title?: string;
  
  // 価格関連
  acquired_price_jpy?: number;
  calculated_ebay_price_usd?: number;
  
  // サイズ・重量
  weight_g?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  
  // カテゴリ
  ebay_category_id?: string;
  
  // 配送
  shipping_policy_id?: string;
  
  // 価格戦略
  pricing_rules_enabled?: boolean;
  active_pricing_rule_id?: string;
  min_profit_usd?: number;
  max_price_adjust_percent?: number;
}

/**
 * 統合変動データ
 */
export interface UnifiedChangeData {
  id?: string;
  product_id: number;
  ebay_listing_id?: string;
  
  // 変動カテゴリ
  change_category: 'inventory' | 'price' | 'both' | 'page_error';
  
  // 在庫変動データ
  inventory_change?: {
    old_stock?: number;
    new_stock?: number;
    available?: boolean;
    page_exists?: boolean;
    page_status?: string;
  };
  
  // 価格変動データ
  price_change?: {
    old_price_jpy?: number;
    new_price_jpy?: number;
    price_diff_jpy?: number;
    recalculated_ebay_price_usd?: number;
    profit_impact?: number;
  };
  
  // 処理ステータス
  status: 'pending' | 'approved' | 'applied' | 'rejected' | 'auto_applied';
  auto_applied: boolean;
  
  // リンク
  inventory_change_id?: string;
  price_change_id?: string;
  
  // エラー情報
  error_message?: string;
}

/**
 * 価格再計算オプション
 */
export interface RecalculationOptions {
  // ルールを適用するか
  apply_rules?: boolean;
  
  // 最低利益を強制するか
  enforce_minimum_profit?: boolean;
  
  // 自動適用するか
  auto_apply?: boolean;
  
  // 配送ポリシーを再評価するか
  reevaluate_shipping?: boolean;
  
  // 為替レート（指定しない場合は最新を取得）
  exchange_rate?: number;
}
