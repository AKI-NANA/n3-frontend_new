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

  // === 新しいバックエンド機能 (B-1, B-2, B-3) のためのフィールド ===
  // B-1: 商品データ取得と重複排除エンジン
  external_url?: string; // 外部サイトURL (Primary Key)
  asin_sku?: string | null; // 外部サイトのASIN または SKU (Fallback Key)
  ranking?: number | null; // 商品ランキング
  sales_count?: number | null; // 販売数 (Ebay Sold数など)
  release_date?: string | null; // 発売日
  is_duplicate?: boolean; // 重複フラグ
  status?: '取得完了' | '優先度決定済' | '承認待' | string; // データ処理ステータス

  // B-2: AI処理優先度決定ロジック
  priority_score?: number | null; // 優先度スコア (0〜1000)

  // B-3: 在庫・価格追従システム (回転率対策)
  reference_urls?: ReferenceUrl[]; // 複数の参照URL（仕入先候補）
  median_price?: number | null; // 参照URL群の価格中央値
  current_stock_count?: number | null; // 現在の在庫数
  last_check_time?: string | null; // 最終チェック時刻
  check_frequency?: '通常' | '高頻度' | string; // 在庫チェック間隔

  // 多販路出品戦略システム (Strategy Engine)
  recommended_platform?: string | null; // 推奨プラットフォーム
  recommended_account_id?: number | null; // 推奨アカウントID
  strategy_score?: number | null; // 戦略スコア
  strategy_decision_data?: any; // JSONB: 全候補と除外理由

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
 * 在庫・価格追従システム用の参照URL型
 */
export interface ReferenceUrl {
  url: string;
  price: number;
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
