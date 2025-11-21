/**
 * 多販路変換エンジン - 型定義
 * 全プラットフォーム共通の型定義とインターフェース
 */

// サポートされているプラットフォーム
export type Platform =
  | 'ebay'
  | 'shopee'
  | 'amazon_jp'
  | 'amazon_us'
  | 'amazon_au'
  | 'coupang'
  | 'qoo10'
  | 'shopify'
  | 'mercari';

// 対応言語
export type Language = 'ja' | 'en' | 'ko' | 'zh';

// 対応通貨
export type Currency = 'JPY' | 'USD' | 'AUD' | 'KRW' | 'SGD';

// プラットフォーム別設定
export interface PlatformConfig {
  name: string;
  displayName: string;
  primaryLanguage: Language;
  currency: Currency;
  maxImages: number;
  imageRequirements: ImageRequirements;
  feeStructure: FeeStructure;
  shippingOptions: ShippingOption[];
  requiredFields: string[];
}

// 画像要件
export interface ImageRequirements {
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: string; // e.g., "1:1", "4:3"
  maxFileSizeMB: number;
  supportedFormats: string[];
}

// 手数料構造
export interface FeeStructure {
  type: 'percentage' | 'fixed' | 'tiered';
  baseFeePercent?: number;
  fixedFeeCents?: number;
  categoryFees?: Record<string, number>;
  paymentProcessingFee?: number;
}

// 配送オプション
export interface ShippingOption {
  id: string;
  name: string;
  carrier?: string;
  estimatedDays: string;
  trackingAvailable: boolean;
  calculateCost: (weight: number, destination: string) => number;
}

// 商品変換入力データ
export interface ProductTransformInput {
  sku: string;
  targetPlatform: Platform;
  targetCountry: string;
  sourceData: SourceProductData;
}

// ソース商品データ（products_master から）
export interface SourceProductData {
  id: number;
  sku: string;
  title_ja?: string;
  title_en?: string;
  description_ja?: string;
  description_en?: string;
  price_jpy: number;
  stock_quantity: number;
  gallery_images?: string[];
  weight_g?: number;
  dimensions?: {
    length_cm?: number;
    width_cm?: number;
    height_cm?: number;
  };
  category?: string;
  brand?: string;
  origin_country?: string;
  jan_code?: string;
  asin?: string;
  [key: string]: any;
}

// 変換後の商品データ
export interface TransformedProductData {
  platform: Platform;
  title: string;
  description: string;
  price: number;
  currency: Currency;
  images: string[];
  sku: string;
  stockQuantity: number;
  category?: string;
  platformSpecific: Record<string, any>;
  warnings: string[];
}

// 価格計算入力
export interface PricingInput {
  costJpy: number;
  weightG: number;
  platform: Platform;
  targetCountry: string;
  shippingMethod?: string;
  category?: string;
}

// 価格計算結果
export interface PricingResult {
  platform: Platform;
  currency: Currency;
  sellingPrice: number;
  costBreakdown: {
    baseProductCost: number;
    shippingCost: number;
    platformFee: number;
    paymentFee: number;
    exchangeRate: number;
  };
  profit: number;
  profitMargin: number;
  breakEvenPrice: number;
  warnings: string[];
}

// CSV生成オプション
export interface CSVExportOptions {
  platform: Platform;
  products: TransformedProductData[];
  includeHeaders: boolean;
  encoding?: 'utf-8' | 'shift-jis';
}

// API連携準備データ
export interface APIReadyData {
  platform: Platform;
  productData: TransformedProductData;
  apiEndpoint?: string;
  authRequired: boolean;
  validationStatus: 'pending' | 'valid' | 'invalid';
  validationErrors?: string[];
}
