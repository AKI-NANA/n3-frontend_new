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

  // ========================================
  // ハイブリッド無在庫戦略対応フィールド
  // ========================================

  // P-4戦略: 刈り取り分析スコア
  arbitrage_score?: number; // 0-100のスコア（Keepa、AI、終売ステータスなどから算出）

  // 在庫管理: 物理在庫数
  physical_inventory_count?: number; // 自社倉庫内の物理在庫数

  // 多販路ステータス追跡
  amazon_jp_listing_id?: string | null; // Amazon JPでの出品ID
  yahoo_jp_listing_id?: string | null; // Yahoo!ショッピングでの出品ID
  mercari_c2c_listing_id?: string | null; // メルカリC2Cでの出品ID
  qoo10_listing_id?: string | null; // Qoo10での出品ID（将来拡張用）

  // 仕入れ先管理
  supplier_source_url?: string | null; // 仕入れ先URL（自動発注用）

  // 刈り取り管理ステータス（ハイブリッド対応）
  arbitrage_status?:
    | 'in_research'          // 調査中（スコアリング段階）
    | 'tracked'              // 追跡中（価格監視中）
    | 'initial_purchased'    // 初期ロット発注済み（検品待ち）
    | 'awaiting_inspection'  // 検品待ち
    | 'ready_to_list'        // 出品準備完了（在庫あり）
    | 'listed_on_multi'      // 多販路出品済み
    | 'repeat_order_placed'; // リピート発注済み

  // Keepaデータ連携（P-4戦略用）
  keepa_data?: {
    current_price?: number;
    avg_price_30d?: number;
    avg_price_90d?: number;
    sales_rank?: number;
    sales_rank_drops_30d?: number; // 30日間のランキング変動回数（売れ行き指標）
    buy_box_price?: number;
    is_out_of_stock?: boolean;
    last_updated?: string;
  };

  // AI分析結果（P-4戦略用）
  ai_assessment?: {
    profit_potential?: 'very_high' | 'high' | 'medium' | 'low';
    risk_level?: 'low' | 'medium' | 'high';
    recommendation?: string;
    confidence_score?: number;
  };

  // 終売・廃盤ステータス（P-4戦略用）
  discontinuation_status?: {
    is_discontinued?: boolean;
    manufacturer_status?: 'active' | 'discontinued' | 'unknown';
    last_restocked_date?: string;
  };

  // メタデータ
  createdAt?: string;
  updatedAt?: string;
  lastEditedBy?: string;
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
