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
