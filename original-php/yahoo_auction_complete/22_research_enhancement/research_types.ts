// types/research.ts - リサーチツール型定義

export type SearchType = 'product' | 'seller' | 'reverse' | 'ai';
export type DisplayMode = 'grid' | 'table';
export type RiskLevel = 'low' | 'medium' | 'high';

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
  sold_quantity: number;
  watch_count: number;
  listing_type: string;
  condition: string;
  seller_username: string;
  seller_country: string;
  seller_feedback_score: number;
  seller_positive_percentage: number;
  primary_image_url: string;
  image_urls: string[];
  item_url: string;
  profit_rate: number;
  estimated_japan_cost: number;
  risk_level: RiskLevel;
  risk_score: number;
  ai_analysis?: AIAnalysis;
  search_query: string;
  search_date: string;
  created_at: string;
  updated_at: string;
}

export interface AIAnalysis {
  sellingReasons: string[];
  marketTrend: string;
  riskFactors: string[];
  recommendations: string[];
}

export interface SearchFilters {
  keywords?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  minProfitRate?: number;
  riskLevel?: RiskLevel;
  sortBy?: 'search_date' | 'profit_rate' | 'sold_quantity' | 'current_price';
}

export interface SupplierResult {
  id: string;
  product_id: string;
  product_source: 'ebay' | 'amazon';
  supplier_type: 'amazon_jp' | 'rakuten' | 'mercari' | 'yahoo_auction' | 'other';
  supplier_name: string;
  supplier_url: string;
  product_title: string;
  product_price: number;
  original_price?: number;
  discount_rate?: number;
  availability_status: string;
  shipping_cost: number;
  delivery_days?: number;
  seller_rating?: number;
  seller_review_count?: number;
  reliability_score: number;
  profit_potential: number;
  notes?: string;
  discovered_method: 'api' | 'web_paste' | 'manual';
  discovered_at: string;
  created_at: string;
}

export interface AmazonProduct {
  id: string;
  asin: string;
  title: string;
  amazon_price: number;
  amazon_url: string;
  brand?: string;
  category?: string;
  availability_status: string;
  rating?: number;
  review_count?: number;
  primary_image_url: string;
  image_urls: string[];
  ebay_search_completed: boolean;
  ebay_min_price?: number;
  ebay_max_price?: number;
  ebay_avg_price?: number;
  ebay_listing_count: number;
  ebay_similar_items?: any[];
  estimated_profit?: number;
  profit_margin?: number;
  is_profitable: boolean;
  profit_analysis?: any;
  research_status: 'pending' | 'analyzed' | 'listed';
  researched_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SearchHistory {
  id: string;
  user_id: string;
  search_type: SearchType;
  search_query: string;
  search_params: Record<string, any>;
  results_count: number;
  results_snapshot?: any;
  created_at: string;
}

export interface UserNote {
  id: string;
  user_id: string;
  product_id: string;
  product_source: 'ebay' | 'amazon';
  note_text: string;
  tags: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}
