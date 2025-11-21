/**
 * 商品データ型定義
 * NAGANO-3モーダルシステム用
 */

export interface Product {
  id: string;
  asin: string;
  sku: string;
  master_key?: string; // Master Key追加
  title: string;
  description?: string;
  price: number;
  cost?: number;
  profit?: number;
  
  // HTS分類情報（学習システム用）
  category_name?: string | null;
  brand_name?: string | null;
  material?: string | null;
  hts_code?: string | null;
  origin_country?: string | null;
  
  // HTS自動判定結果
  suggested_category?: string;
  suggested_brand?: string;
  suggested_material?: string;
  suggested_hts?: string;
  hts_score?: number;
  hts_confidence?: 'very_high' | 'high' | 'medium' | 'low' | 'uncertain';
  hts_source?: 'learning' | 'category_master' | 'brand_master' | 'material_pattern' | 'official';
  origin_country_hint?: string;
  
  // 確認状態
  hts_needs_review?: boolean;
  hts_is_approved?: boolean;
  
  // 画像データ
  images: ProductImage[];
  selectedImages: string[];
  
  // カテゴリ情報
  category?: Category;
  
  // 在庫情報
  stock?: StockInfo;
  
  // マーケットプレイス情報
  marketplace?: MarketplaceData;
  
  // メタデータ
  createdAt?: string;
  updatedAt?: string;
  lastEditedBy?: string;

  // ===== Amazon刈り取り自動化システム =====

  // スコアリングと分析
  arbitrage_score?: number | null;
  keepa_data?: KeepaData | null;
  ai_arbitrage_assessment?: AiArbitrageAssessment | null;

  // 刈り取り管理と自動化
  arbitrage_status?: ArbitrageStatus;
  purchase_account_id?: string | null;
  amazon_order_id?: string | null;

  // グローバルFBA完結型（Phase 1: US/JP）
  target_country?: 'US' | 'JP' | null;
  optimal_sales_channel?: string | null;
  fba_shipment_plan_id?: string | null;
  fba_label_pdf_url?: string | null;
  physical_inventory_count?: number;
  initial_purchased_quantity?: number;

  // P-4戦略用データ（市場枯渇予見）
  final_production_status?: 'discontinued' | 'seasonal_end' | 'regular_stock' | null;
  keepa_ranking_avg_90d?: number | null;
  amazon_inventory_status?: 'in_stock' | 'out_of_stock' | 'high_price' | null;
  multi_market_inventory?: MultiMarketInventory | null;
  hold_recommendation?: boolean;
}

// ===== Amazon刈り取り関連の型定義 =====

export type ArbitrageStatus =
  | 'in_research'           // リサーチ中
  | 'tracked'               // トラッキング中（Keepa監視）
  | 'purchased'             // 購入完了（配送中）
  | 'awaiting_inspection'   // 検品待ち
  | 'ready_to_list'         // 出品準備完了
  | 'listed';               // 出品済み

export interface KeepaData {
  price_history?: Array<{ timestamp: number; price: number }>;
  rank_history?: Array<{ timestamp: number; rank: number }>;
  buy_box_history?: Array<{ timestamp: number; price: number; seller: string }>;
  price_drop_detected?: boolean;
  price_drop_ratio?: number;
  average_price_90d?: number;
  current_price?: number;
  last_updated?: string;
}

export interface AiArbitrageAssessment {
  potential: 'high' | 'medium' | 'low';
  risk: 'high' | 'medium' | 'low';
  reason: string;
  risk_reason?: string;
  strategy?: 'P-1' | 'P-2' | 'P-3' | 'P-4';  // P-1: 一時的下落、P-4: 市場枯渇予見
  recommended_action?: 'auto_purchase' | 'manual_review' | 'pass';
}

export interface MultiMarketInventory {
  rakuten?: {
    price: number;
    inventory: number;
    url?: string;
  };
  yahoo?: {
    price: number;
    inventory: number;
    url?: string;
  };
  mercari?: {
    price: number;
    inventory: number;
    url?: string;
  };
  amazon_jp?: {
    price: number;
    inventory: number;
    url?: string;
  };
}

export interface ProductImage {
  id: string;
  url: string;
  thumbnail?: string;
  isMain: boolean;
  order: number;
  alt?: string;
  selected?: boolean;
}

export interface Category {
  id: string;
  name: string;
  path: string[];
  confidence?: number;
  suggestedBy?: 'ai' | 'manual' | 'rule';
}

export interface StockInfo {
  available: number;
  reserved: number;
  incoming?: number;
  location?: string;
  lastUpdated?: string;
}

export interface MarketplaceData {
  id: string;
  name: string;
  listingId?: string;
  status: 'draft' | 'active' | 'paused' | 'ended';
  listedPrice?: number;
  fees?: MarketplaceFees;
}

export interface MarketplaceFees {
  commission: number;
  shipping?: number;
  other?: number;
  total: number;
}

/**
 * API リクエスト/レスポンス型
 */

export interface GetProductRequest {
  id?: string;
  asin?: string;
  sku?: string;
}

export interface GetProductResponse {
  success: boolean;
  data?: Product;
  error?: string;
  message?: string;
}

export interface UpdateProductRequest {
  id: string;
  updates: Partial<Product>;
}

export interface UpdateProductResponse {
  success: boolean;
  data?: Product;
  error?: string;
  message?: string;
}

export interface SaveImagesRequest {
  productId: string;
  images: string[];
  marketplace?: string;
}

export interface SaveImagesResponse {
  success: boolean;
  savedCount?: number;
  error?: string;
  message?: string;
}

/**
 * モーダル状態型
 */

export interface ProductModalState {
  isOpen: boolean;
  mode: 'view' | 'edit' | 'create';
  product: Product | null;
  loading: boolean;
  error: string | null;
  isDirty: boolean;
}

export interface ProductModalActions {
  open: (productId: string, mode?: 'view' | 'edit') => Promise<void>;
  close: () => void;
  save: () => Promise<void>;
  reset: () => void;
  updateField: (field: keyof Product, value: any) => void;
}

/**
 * HTS学習システム型
 */

export interface HtsSearchResult {
  hts_code: string;
  score: number;
  confidence: 'very_high' | 'high' | 'medium' | 'low' | 'uncertain';
  source: 'learning' | 'category_master' | 'brand_master' | 'material_pattern' | 'official';
  description: string;
  general_rate?: string;
  origin_country_hint?: string;
}

export interface HtsSearchRequest {
  title_ja?: string;
  category?: string;
  brand?: string;
  material?: string;
  keywords?: string;
}

export interface HtsSearchResponse {
  success: boolean;
  data?: {
    candidates: HtsSearchResult[];
    count: number;
    autoSelected?: {
      hts_code: string;
      confidence: string;
      score: number;
    };
  };
  error?: string;
}

export interface HtsLearningRecord {
  product_title: string;
  category: string;
  brand: string;
  material: string;
  hts_code: string;
  origin_country: string;
  keywords: string;
  score: number;
}
