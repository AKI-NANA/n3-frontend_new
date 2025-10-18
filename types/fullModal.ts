/**
 * 完全機能版モーダル用の拡張型定義
 */

import type { Product, ProductImage } from './product';
import type { MarketplaceType } from './marketplace';

/**
 * ツール実行結果
 */
export interface ToolResults {
  category: CategoryToolResult | null;
  filter: FilterToolResult | null;
  profit: ProfitToolResult | null;
  sellermirror: SellerMirrorToolResult | null;
}

export interface CategoryToolResult {
  category_id: string;
  category_name: string;
  confidence: number;
  recommendations: string[];
}

export interface FilterToolResult {
  status: 'pass' | 'warning' | 'error';
  passed: number;
  warnings: number;
  errors: number;
  details: Array<{
    type: 'pass' | 'warning' | 'error';
    message: string;
  }>;
}

export interface ProfitToolResult {
  cost: {
    purchase_price: number;
    domestic_shipping: number;
    handling_fee: number;
    total_cost: number;
  };
  revenue: {
    selling_price_usd: number;
    selling_price_jpy: number;
    ebay_fee: number;
    paypal_fee: number;
    international_shipping: number;
  };
  net_profit: number;
  profit_margin: number;
  recommended_price: number;
  exchange_rate: number;
}

export interface SellerMirrorToolResult {
  competitors_found: number;
  price_range: {
    min: number;
    max: number;
    avg: number;
  };
  top_competitors: Array<{
    seller: string;
    price: number;
    feedback: number;
    sales: number;
  }>;
  recommended_price: number;
  market_demand: 'high' | 'medium' | 'low';
}

/**
 * 処理ステップ状態
 */
export interface ProcessStep {
  id: string;
  label: string;
  status: 'waiting' | 'processing' | 'complete' | 'error';
}

/**
 * ツールステータス
 */
export interface ToolStatus {
  name: string;
  icon: string;
  status: 'complete' | 'partial' | 'missing' | 'processing';
  value: string | number;
  indicator: string;
}

/**
 * マーケットプレイス固有データ
 */
export interface MarketplaceFieldData {
  ebay?: EbayFieldData;
  shopee?: ShopeeFieldData;
  'amazon-global'?: AmazonFieldData;
  'amazon-jp'?: AmazonFieldData;
  coupang?: CoupangFieldData;
  shopify?: ShopifyFieldData;
}

export interface EbayFieldData {
  title: string;
  price: number;
  category: string;
  condition: string;
  best_offer_enabled: boolean;
  min_offer?: number;
  auto_accept?: number;
  quantity: number;
  ad_rate: number;
  shipping_policy: string;
}

export interface ShopeeFieldData {
  title: string;
  price: number;
  category: string;
  condition: string;
}

export interface AmazonFieldData {
  title: string;
  price: number;
  category: string;
  condition: string;
  fulfillment: 'FBA' | 'FBM';
}

export interface CoupangFieldData {
  title: string;
  price: number;
  category: string;
}

export interface ShopifyFieldData {
  title: string;
  price: number;
  category: string;
}

/**
 * 必須項目チェック
 */
export interface RequirementItem {
  label: string;
  completed: boolean;
}

/**
 * 検証結果
 */
export interface ValidationResult {
  status: 'pass' | 'warning' | 'error';
  message: string;
}

/**
 * 出品サマリー
 */
export interface ListingSummary {
  marketplace: MarketplaceType;
  title: string;
  price: string;
  selected_images: number;
  condition: string;
  sku: string;
}

/**
 * フルモーダル状態
 */
export interface FullModalState {
  // 基本情報
  productData: Product | null;
  currentMarketplace: MarketplaceType;
  
  // ツール結果
  toolResults: ToolResults;
  
  // 画像選択
  selectedImages: number[];
  
  // マーケットプレイス別データ
  marketplaceData: MarketplaceFieldData;
  
  // HTML編集
  htmlContent: string;
  
  // ステップ管理
  processSteps: ProcessStep[];
  
  // UI状態
  activeTab: string;
  loading: boolean;
  error: string | null;
  isDirty: boolean;
  
  // タイムスタンプ
  processingStartTime: number;
}
