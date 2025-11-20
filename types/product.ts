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
 * バリエーション・セット品関連型
 */

// バリエーションタイプ
export type VariationType = 'Parent' | 'Child' | 'Single';

// Grouping Boxのアイテム
export interface GroupingItem {
  id: string;
  sku: string;
  title: string;
  image?: string;
  quantity: number;
  ddp_cost_usd: number;
  stock_quantity?: number;
  size_cm?: {
    length: number;
    width: number;
    height: number;
  };
  weight_g?: number;
}

// バリエーション属性
export interface VariationAttribute {
  name: string;  // 例: "Color", "Size"
  value: string; // 例: "Red", "Large"
}

// セット品の構成品
export interface BundleComposition {
  child_sku: string;
  child_title: string;
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
}

// listing_dataのバリエーション拡張
export interface VariationListingData {
  // 親SKU用
  min_ddp_cost_usd?: number;           // 最低DDPコスト（統一Item Price）
  variation_attributes?: string[];     // バリエーション属性名（例: ["Color", "Size"]）
  variations?: VariationChild[];       // 子SKU情報

  // 子SKU用
  variation_sku?: string;              // バリエーションSKU
  actual_ddp_cost_usd?: number;        // 本来のDDPコスト
  shipping_surcharge_usd?: number;     // USA向け送料加算額
  attributes?: VariationAttribute[];   // このバリエーションの属性値

  // セット品用
  components?: BundleComposition[];    // 構成品情報
  total_component_cost?: number;       // 構成品の合計コスト
}

// 子SKU情報（親SKUのlisting_data.variationsに格納）
export interface VariationChild {
  variation_sku: string;
  attributes: VariationAttribute[];
  actual_ddp_cost_usd: number;
  shipping_surcharge_usd: number;
  stock_quantity: number;
  image_url?: string;
}

// バリエーション対応カテゴリ
export interface EbayVariationCategory {
  id: string;
  category_id: number;
  category_name: string;
  category_path?: string;
  default_attributes: string[];        // 推奨属性名
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
 * バリエーション/セット品 API リクエスト/レスポンス型
 */

export interface CreateVariationRequest {
  selectedItems: GroupingItem[];
  parentSkuName: string;
  attributes: { [key: string]: string };  // 属性定義
  pricingStrategy: 'min_ddp';              // 最低価格ベース戦略
}

export interface CreateVariationResponse {
  success: boolean;
  parentSku?: string;
  minPrice?: number;
  children?: VariationChild[];
  warnings?: string[];
  error?: string;
}

export interface CreateBundleRequest {
  selectedItems: GroupingItem[];
  bundleSkuName: string;
  bundleTitle: string;
}

export interface CreateBundleResponse {
  success: boolean;
  bundleSku?: string;
  totalCost?: number;
  maxStock?: number;
  components?: BundleComposition[];
  error?: string;
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
