// リサーチ関連の型定義

export type ResearchStatus = 'NEW' | 'SCORED' | 'AI_QUEUED' | 'AI_COMPLETED';

export type SupplierType = 'amazon_jp' | 'rakuten' | 'yahoo_shopping' | 'mercari' | 'other';

export type SearchMethod = 'product_name' | 'model_number' | 'image_search' | 'database_match';

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';

export interface SupplierCandidate {
  id?: string;

  // 紐付け情報
  product_id?: string;
  ebay_item_id?: string;
  sku?: string;

  // 商品情報
  product_name: string;
  product_model?: string;

  // 仕入れ先情報
  candidate_price_jpy: number;
  estimated_domestic_shipping_jpy: number;
  total_cost_jpy?: number; // 自動計算される

  supplier_url: string;
  supplier_name?: string;
  supplier_type?: SupplierType;

  // AI解析情報
  confidence_score?: number; // 0.0-1.0
  search_method?: SearchMethod;
  ai_model_used?: string;

  // 在庫・価格情報
  stock_status?: StockStatus;
  price_checked_at?: string;

  // メタデータ
  notes?: Record<string, any>;
  created_at?: string;
  updated_at?: string;

  is_primary_candidate?: boolean;
}

export interface ResearchResult {
  search_keyword: string;
  ebay_item_id: string;
  title: string;
  price_usd: number;
  sold_count: number;
  category_id?: string;
  category_name?: string;
  condition?: string;
  seller_username?: string;
  image_url?: string;
  view_item_url?: string;

  // SellerMirror情報
  lowest_price_usd?: number;
  average_price_usd?: number;
  competitor_count?: number;
  estimated_weight_g?: number;

  // 利益計算結果
  profit_margin_at_lowest?: number;
  profit_amount_at_lowest_usd?: number;
  profit_amount_at_lowest_jpy?: number;
  recommended_cost_jpy?: number;

  // データ管理フラグ（新規追加）
  research_status?: ResearchStatus;
  last_research_date?: string;
  ai_cost_status?: boolean;
  provisional_score?: number;
  final_score?: number;

  // AI解析関連
  ai_supplier_candidate_id?: string;
  ai_analyzed_at?: string;

  // スコア詳細
  score_details?: ScoreDetails;

  // その他
  item_specifics?: any;
  listing_type?: string;
  location_country?: string;
  location_city?: string;
  shipping_cost_usd?: number;
  created_at?: string;
}

export interface ScoreDetails {
  // カテゴリスコア（0-1000点）
  profit_score?: number;
  competition_score?: number;
  future_score?: number;
  trend_score?: number;
  scarcity_score?: number;
  reliability_score?: number;

  // サブスコア
  default_profit_score?: number;
  lowest_profit_score?: number;
  gemini_score?: number;

  // 計算過程
  weighted_sum?: number;
  random_value?: number;
  final_score?: number;

  // その他のスコア
  market_research_score?: number;
  jp_seller_score?: number;
  min_price_bonus?: number;
  price_competitiveness_score?: number;
  recent_sales_score?: number;
  jp_market_scarcity_score?: number;
  profit_multiplier?: number;
  penalty_multiplier?: number;
  image_score?: number;
  size_score?: number;
  html_score?: number;
  eu_score?: number;
  hts_score?: number;
  master_key_score?: number;
  sm_score?: number;
}

export interface AISupplierSearchRequest {
  ebay_item_ids?: string[];
  product_ids?: string[];
  search_params?: {
    product_name: string;
    product_model?: string;
    image_url?: string;
    price_range_jpy?: {
      min?: number;
      max?: number;
    };
  };
}

export interface AISupplierSearchResult {
  success: boolean;
  data?: SupplierCandidate[];
  error?: string;
  processed_count?: number;
}
