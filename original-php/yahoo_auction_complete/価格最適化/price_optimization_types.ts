// ===============================================
// 価格最適化システム - TypeScript型定義
// lib/types/price-optimization.ts
// ===============================================

// ========== 基本型 ==========

export type CurrencyCode = 'USD' | 'GBP' | 'EUR' | 'AUD' | 'CAD' | 'JPY';
export type CountryCode = 'US' | 'UK' | 'DE' | 'AU' | 'CA' | 'FR' | 'IT' | 'ES';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertType = 'red_risk' | 'cost_change' | 'competitor_alert' | 'api_error';

export type QueueStatus = 
  | 'pending_approval' 
  | 'approved' 
  | 'rejected' 
  | 'applied' 
  | 'failed' 
  | 'expired';

export type TriggerType = 
  | 'cost_change' 
  | 'competitor' 
  | 'manual' 
  | 'batch' 
  | 'scheduled';

export type ChangeSource = 'manual' | 'import' | 'webhook' | 'api';

export type AdjustmentFrequency = 'hourly' | 'daily' | 'weekly' | 'manual';

// ========== データベーステーブル型 ==========

export interface CostChangeHistory {
  id: number;
  item_id: string;
  sku?: string;
  old_cost: number;
  new_cost: number;
  cost_difference: number;
  cost_change_percent?: number;
  change_reason?: string;
  change_source: ChangeSource;
  affected_price?: number;
  margin_impact?: number;
  requires_price_adjustment: boolean;
  changed_by?: string;
  changed_at: string;
  processed: boolean;
  processed_at?: string;
}

export interface CompetitorPrice {
  id: number;
  item_id: string;
  country_code: CountryCode;
  ebay_site_id: number;
  lowest_price: number;
  average_price?: number;
  median_price?: number;
  highest_price?: number;
  currency: CurrencyCode;
  listings_count: number;
  search_keywords?: string;
  category_id?: number;
  condition_filter?: string;
  fetched_at: string;
  expires_at?: string;
  data_quality_score: number;
}

export interface AutoPricingSetting {
  id: number;
  item_id: string;
  sku?: string;
  min_margin_percent: number;
  min_profit_amount?: number;
  allow_loss: boolean;
  max_loss_percent: number;
  auto_tracking_enabled: boolean;
  target_competitor_ratio: number;
  max_price_decrease_percent: number;
  max_price_increase_percent: number;
  target_countries: CountryCode[];
  min_allowed_price?: number;
  max_allowed_price?: number;
  adjustment_frequency: AdjustmentFrequency;
  last_adjusted_at?: string;
  next_adjustment_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PriceAdjustmentQueue {
  id: number;
  item_id: string;
  ebay_item_id?: string;
  current_price: number;
  proposed_price: number;
  price_difference: number;
  price_change_percent?: number;
  adjustment_reason?: string;
  trigger_type: TriggerType;
  trigger_id?: number;
  expected_margin?: number;
  expected_profit?: number;
  current_margin?: number;
  current_profit?: number;
  is_red_risk: boolean;
  risk_level: RiskLevel;
  risk_reasons?: string[];
  status: QueueStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  applied_at?: string;
  ebay_api_response?: any;
  error_message?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface PriceUpdateHistory {
  id: number;
  item_id: string;
  ebay_item_id?: string;
  adjustment_queue_id?: number;
  old_price: number;
  new_price: number;
  price_change: number;
  price_change_percent?: number;
  change_reason?: string;
  trigger_type?: TriggerType;
  ebay_api_call_id?: string;
  ebay_response?: any;
  api_call_duration_ms?: number;
  success: boolean;
  error_message?: string;
  error_code?: string;
  updated_by?: string;
  created_at: string;
}

export interface EbayMugCountry {
  id: number;
  country_code: CountryCode;
  country_name: string;
  ebay_site_id: number;
  ebay_global_id: string;
  currency_code: CurrencyCode;
  api_endpoint?: string;
  finding_api_url?: string;
  trading_api_url?: string;
  is_active: boolean;
  supports_finding_api: boolean;
  supports_trading_api: boolean;
  daily_api_limit: number;
  hourly_api_limit: number;
  created_at: string;
  updated_at: string;
}

export interface PriceOptimizationRule {
  id: number;
  rule_name: string;
  rule_type: 'global' | 'category' | 'item' | 'condition';
  category_id?: number;
  item_id?: string;
  condition_type?: string;
  price_range_min?: number;
  price_range_max?: number;
  target_margin_percent?: number;
  competitor_price_ratio: number;
  max_adjustment_percent: number;
  min_margin_percent: number;
  min_profit_amount?: number;
  max_loss_percent: number;
  priority: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SystemAlert {
  id: number;
  alert_type: AlertType;
  severity: AlertSeverity;
  item_id?: string;
  related_table?: string;
  related_id?: number;
  title: string;
  message: string;
  data?: any;
  status: 'unread' | 'read' | 'acknowledged' | 'resolved';
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
  expires_at: string;
}

// ========== ビュー型 ==========

export interface PendingPriceAdjustment {
  id: number;
  item_id: string;
  current_price: number;
  proposed_price: number;
  price_difference: number;
  price_change_percent?: number;
  adjustment_reason?: string;
  expected_margin?: number;
  is_red_risk: boolean;
  risk_level: RiskLevel;
  status: QueueStatus;
  created_at: string;
  product_name?: string;
  sku?: string;
  current_stock?: number;
  min_margin_percent?: number;
  auto_tracking_enabled?: boolean;
}

export interface LatestCompetitorPrice {
  item_id: string;
  country_code: CountryCode;
  lowest_price: number;
  average_price?: number;
  currency: CurrencyCode;
  listings_count: number;
  fetched_at: string;
}

// ========== API リクエスト/レスポンス型 ==========

export interface RecalculatePriceRequest {
  item_id: string;
  new_cost?: number;
  trigger: TriggerType;
}

export interface RecalculatePriceResponse {
  success: boolean;
  data: {
    item_id: string;
    current_price: number;
    current_margin: number;
    new_required_price: number;
    new_expected_margin: number;
    min_safe_price: number;
    adjustment_recommended: boolean;
  };
}

export interface FetchCompetitorPricesRequest {
  item_id: string;
  keywords: string;
  countries: CountryCode[];
  category_id?: number;
  condition?: string;
}

export interface FetchCompetitorPricesResponse {
  success: boolean;
  data: {
    item_id: string;
    prices: Array<{
      country: CountryCode;
      lowest_price: number;
      average_price: number;
      currency: CurrencyCode;
      listings_count: number;
    }>;
    fetched_at: string;
  };
}

export interface ApprovePriceAdjustmentRequest {
  adjustment_ids: number[];
  approved_by: string;
  apply_immediately: boolean;
}

export interface ApprovePriceAdjustmentResponse {
  success: boolean;
  data: {
    approved_count: number;
    applied_count: number;
    failed_count: number;
    results: Array<{
      adjustment_id: number;
      item_id: string;
      success: boolean;
      new_price?: number;
      error?: string;
    }>;
  };
}

export interface UpdateEbayPriceRequest {
  ebay_item_id: string;
  new_price: number;
}

export interface UpdateEbayPriceResponse {
  success: boolean;
  data: {
    ebay_item_id: string;
    old_price: number;
    new_price: number;
    updated_at: string;
    ebay_response: any;
  };
}

// ========== ロジック用の型 ==========

export interface RedRiskCheck {
  isRedRisk: boolean;
  reasons: string[];
  canAdjust: boolean;
  minSafePrice: number;
}

export interface PriceProposal {
  proposedPrice: number;
  expectedMargin: number;
  expectedProfit: number;
  isRedRisk: boolean;
  adjustmentReason: string;
  competitorComparison?: {
    lowestCompetitorPrice: number;
    priceDifference: number;
    isPricingCompetitive: boolean;
  };
}

export interface MarginCalculation {
  totalCost: number;
  sellingPrice: number;
  grossProfit: number;
  marginPercent: number;
  profitAmount: number;
  meetsMinMargin: boolean;
  meetsMinProfit: boolean;
}

// ========== 統計・ダッシュボード型 ==========

export interface PricingStatistics {
  totalItems: number;
  autoPricingEnabled: number;
  pendingAdjustments: number;
  redRiskItems: number;
  averageMargin: number;
  totalProfit: number;
  successRate: number;
  lastUpdated: string;
}

export interface CompetitorAnalysis {
  item_id: string;
  ourPrice: number;
  competitorPrices: {
    [key in CountryCode]?: {
      lowest: number;
      average: number;
      difference: number;
      isCompetitive: boolean;
    };
  };
  recommendation: {
    suggestedPrice: number;
    expectedMargin: number;
    reason: string;
  };
}

// ========== フィルター・検索型 ==========

export interface PriceAdjustmentFilters {
  status?: QueueStatus[];
  risk_level?: RiskLevel[];
  trigger_type?: TriggerType[];
  date_from?: string;
  date_to?: string;
  item_id?: string;
  is_red_risk?: boolean;
  min_price_change?: number;
  max_price_change?: number;
}

export interface CompetitorPriceFilters {
  country_code?: CountryCode[];
  date_from?: string;
  date_to?: string;
  min_listings?: number;
  item_id?: string;
}

// ========== エラー型 ==========

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// ========== eBay API型 ==========

export interface EbayFindingApiResponse {
  ack: string;
  searchResult: {
    count: number;
    item: Array<{
      itemId: string;
      title: string;
      sellingStatus: {
        currentPrice: {
          value: number;
          currencyId: CurrencyCode;
        };
      };
      condition?: {
        conditionDisplayName: string;
      };
    }>;
  };
}

export interface EbayTradingApiResponse {
  Ack: string;
  Timestamp: string;
  ItemID?: string;
  Errors?: Array<{
    ErrorCode: string;
    ShortMessage: string;
    LongMessage: string;
  }>;
}

// ========== Webhook型 ==========

export interface CostChangeWebhookPayload {
  event: 'cost.updated';
  timestamp: string;
  data: {
    item_id: string;
    sku?: string;
    old_cost: number;
    new_cost: number;
    currency: CurrencyCode;
    changed_by: string;
    change_reason?: string;
  };
}

// ========== ヘルパー型 ==========

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  field: string;
  order: SortOrder;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  pagination?: Pagination;
  timestamp: string;
}

// ========== ユーティリティ型 ==========

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;