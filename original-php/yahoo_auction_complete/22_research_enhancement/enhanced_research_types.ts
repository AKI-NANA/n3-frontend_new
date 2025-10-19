// types/research.ts - リサーチツール型定義（AI分析対応版）

export type SearchType = 'product' | 'seller' | 'reverse' | 'ai';
export type DisplayMode = 'grid' | 'table';
export type RiskLevel = 'low' | 'medium' | 'high';

// 🔥 AI分析結果
export interface AIAnalysis {
  // HSコード・原産国
  hs_code: string;
  hs_description?: string;
  hs_confidence?: number;
  origin_country: string;
  origin_source?: 'item_specifics' | 'brand_mapping' | 'ai_detected' | 'default_cn';
  origin_reasoning?: string;
  origin_confidence?: number;

  // サイズ・重量推測
  estimated_length_cm?: number;
  estimated_width_cm?: number;
  estimated_height_cm?: number;
  estimated_weight_kg?: number;
  size_confidence?: number;
  size_source?: string;

  // リスク判定
  is_hazardous: boolean;
  hazard_type?: 'lithium_battery' | 'flammable' | 'liquid' | 'powder';
  hazard_keywords_matched?: string[];
  
  is_prohibited: boolean;
  prohibited_reason?: string;
  prohibited_keywords_matched?: string[];
  
  air_shippable: boolean;
  air_restriction_reason?: string;
  
  vero_risk: 'low' | 'medium' | 'high';
  vero_brand_matched?: string;
  
  patent_troll_risk: 'low' | 'medium' | 'high';
  patent_category_matched?: string;

  // AI分析（フリーテキスト）
  sellingReasons?: string[];
  marketTrend?: string;
  riskFactors?: string[];
  recommendations?: string[];
  
  // メタ情報
  ai_model?: string;
  analyzed_at?: string;
  notes?: string;
}

// 商品データ（拡張版）
export interface ResearchProduct {
  id: string;
  ebay_item_id: string;
  title: string;
  title_jp?: string;
  category_id: string;
  category_name: string;
  current_price: number;
  currency: string;
  shipping_cost: number;
  
  // Shopping API追加データ
  sold_quantity?: number;
  watch_count?: number;
  hit_count?: number;
  quantity_available?: number;
  description?: string;
  picture_urls?: string[];
  item_specifics?: Record<string, string | string[]>;
  return_policy?: ReturnPolicy;
  shipping_info?: ShippingInfo;
  
  listing_type: string;
  condition: string;
  seller_username: string;
  seller_country: string;
  seller_feedback_score: number;
  seller_positive_percentage: number;
  primary_image_url: string;
  image_urls: string[];
  item_url: string;
  
  // 利益計算結果
  profit_rate?: number;
  estimated_japan_cost?: number;
  profit_amount?: number;
  total_cost?: number;
  
  // リスク評価
  risk_level?: RiskLevel;
  risk_score?: number;
  
  // 🔥 AI分析結果
  ai_analysis?: AIAnalysis;
  
  // セラーミラー連携
  is_exported_to_seller_mirror?: boolean;
  exported_at?: string;
  
  // メタ情報
  search_query: string;
  search_date: string;
  created_at: string;
  updated_at: string;
}

// 返品ポリシー
export interface ReturnPolicy {
  returns_accepted: string;
  returns_within: string;
  refund_option: string;
  shipping_cost_paid_by: string;
}

// 配送情報
export interface ShippingInfo {
  shipping_cost: number;
  shipping_type: string;
  expedited_shipping: boolean;
  handling_time?: string;
}

// セラー情報（拡張版）
export interface SellerProfile {
  username: string;
  user_id?: string;
  registration_date?: string;
  
  // 評価情報
  feedback_score: number;
  positive_feedback_percentage: number;
  feedback_rating_star?: string;
  unique_positive_count?: number;
  unique_negative_count?: number;
  
  // ビジネス情報
  business_type?: string;
  top_rated_seller: boolean;
  store_name?: string;
  store_url?: string;
  
  // 分析情報
  total_researched_items?: number;
  average_item_score?: number;
}

// 検索フィルター
export interface SearchFilters {
  keywords?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  minProfitRate?: number;
  riskLevel?: RiskLevel;
  sortBy?: 'search_date' | 'profit_rate' | 'sold_quantity' | 'current_price';
  
  // 🔥 AI分析フィルター
  hasAIAnalysis?: boolean;
  isHazardous?: boolean;
  veroRisk?: 'low' | 'medium' | 'high';
  airShippable?: boolean;
}

// 仕入れ先候補
export interface SupplierCandidate {
  id: string;
  ebay_item_id: string;
  supplier_type: 'amazon_jp' | 'rakuten' | 'yahoo_shopping' | 'mercari';
  supplier_name?: string;
  product_url: string;
  product_price: number;
  shipping_cost: number;
  total_cost: number;
  is_best_price: boolean;
  availability?: string;
  found_by_ai: boolean;
  search_keywords?: string[];
  created_at: string;
}

// 利益計算結果
export interface ProfitCalculation {
  id: string;
  ebay_item_id: string;
  stage: 'stage1_estimated' | 'stage2_actual';
  
  // パラメータ
  ebay_price: number;
  japan_cost: number;
  hs_code: string;
  
  // サイズ・重量
  length_cm: number;
  width_cm: number;
  height_cm: number;
  weight_kg: number;
  is_estimated: boolean;
  
  // 結果
  fees_breakdown: Record<string, number>;
  total_cost: number;
  profit: number;
  profit_rate: number;
  is_profitable: boolean;
  
  created_at: string;
}

// リサーチサマリー
export interface ResearchSummary {
  total_products: number;
  ai_analyzed: number;
  hazardous_count: number;
  prohibited_count: number;
  vero_high_count: number;
  patent_high_count: number;
  origin_cn_count: number;
  average_profit_rate?: number;
  profitable_count?: number;
  timestamp: string;
}

// 検索履歴
export interface SearchHistory {
  id: string;
  user_id: string;
  search_type: SearchType;
  search_query: string;
  search_params: Record<string, any>;
  results_count: number;
  results_snapshot?: ResearchProduct[];
  created_at: string;
}
