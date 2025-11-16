/**
 * 価格戦略システムの型定義
 * Phase 3 & 4: デフォルト設定と個別商品戦略
 */

// 価格戦略タイプ
export type PricingStrategyType = 
  | 'follow_lowest'      // 最安値追従（最低利益確保）
  | 'price_difference'   // 基準価格からの差分維持
  | 'minimum_profit'     // 最低利益確保のみ
  | 'seasonal'           // 季節戦略（将来用）
  | 'none'               // 戦略なし（手動管理）

// 在庫切れ時のアクション
export type OutOfStockAction = 
  | 'set_zero'           // 在庫を0に設定
  | 'pause_listing'      // 出品を一時停止
  | 'end_listing'        // 出品を終了
  | 'notify_only'        // 通知のみ（自動変更なし）

// 戦略パラメータ
export interface StrategyParams {
  // 最低利益額（USD）
  min_profit_usd?: number
  
  // 価格調整率（%）
  price_adjust_percent?: number
  
  // 競合追従を有効にするか
  follow_competitor?: boolean
  
  // 最大調整幅（%）
  max_adjust_percent?: number
  
  // 基準価格からの差分（USD）- price_difference戦略用
  price_difference_usd?: number
  
  // 最安値より上に適用するか - price_difference戦略用
  apply_above_lowest?: boolean
}

// デフォルト設定
export interface PricingDefaults {
  id: string
  setting_name: string                      // 'global_default'
  enabled: boolean
  priority: number
  strategy_type: PricingStrategyType
  strategy_params: StrategyParams
  out_of_stock_action: OutOfStockAction
  default_check_frequency: string           // '1day', '12hours', '6hours', etc.
  enable_price_monitoring: boolean
  enable_inventory_monitoring: boolean
  notify_on_price_change: boolean
  notify_on_out_of_stock: boolean
  notification_email?: string
  created_at: string
  updated_at: string
  created_by?: string
  description?: string
}

// 商品の有効な価格戦略（ビューから取得）
export interface ProductPricingStrategy {
  product_id: number
  sku: string
  title: string
  effective_strategy: PricingStrategyType
  effective_params: StrategyParams
  effective_out_of_stock_action: OutOfStockAction
  effective_check_frequency: string
  strategy_source: 'default' | 'custom'
  use_default_pricing: boolean
  use_default_inventory: boolean
  pricing_overridden_at?: string
  pricing_overridden_by?: string
  pricing_strategy_notes?: string
}

// APIレスポンス型
export interface PricingDefaultsResponse {
  success: boolean
  data?: PricingDefaults
  error?: string
}

export interface ProductPricingStrategyResponse {
  success: boolean
  data?: ProductPricingStrategy
  error?: string
}

// フォーム用の型（バリデーション前）
export interface PricingDefaultsFormData {
  strategy_type: PricingStrategyType
  min_profit_usd: string
  price_adjust_percent: string
  follow_competitor: boolean
  max_adjust_percent: string
  price_difference_usd: string
  apply_above_lowest: boolean
  out_of_stock_action: OutOfStockAction
  default_check_frequency: string
  enable_price_monitoring: boolean
  enable_inventory_monitoring: boolean
  notify_on_price_change: boolean
  notify_on_out_of_stock: boolean
  notification_email: string
}

// 価格戦略の表示名マッピング
export const STRATEGY_TYPE_LABELS: Record<PricingStrategyType, string> = {
  follow_lowest: '最安値追従（最低利益確保）',
  price_difference: '基準価格からの差分維持',
  minimum_profit: '最低利益確保のみ',
  seasonal: '季節戦略',
  none: '戦略なし（手動管理）'
}

// 在庫切れアクションの表示名マッピング
export const OUT_OF_STOCK_ACTION_LABELS: Record<OutOfStockAction, string> = {
  set_zero: '在庫を0に設定',
  pause_listing: '出品を一時停止',
  end_listing: '出品を終了',
  notify_only: '通知のみ（自動変更なし）'
}

// 監視頻度の選択肢
export const CHECK_FREQUENCY_OPTIONS = [
  { value: '1hour', label: '1時間ごと' },
  { value: '6hours', label: '6時間ごと' },
  { value: '12hours', label: '12時間ごと' },
  { value: '1day', label: '1日1回' },
  { value: '3days', label: '3日1回' },
  { value: '1week', label: '1週間1回' },
  { value: 'manual', label: '手動のみ' }
]
