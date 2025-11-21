/**
 * Facebook Marketplace API型定義
 * Facebook Graph API v18.0対応
 */

/**
 * Facebook認証情報
 */
export interface FacebookAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  scopes: string[];
}

/**
 * アクセストークン
 */
export interface FacebookTokens {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * ショップ情報
 */
export interface FacebookShop {
  id: string;
  name: string;
  description?: string;
  website_url?: string;
  email?: string;
  currency: string;
  is_published: boolean;
}

/**
 * 商品情報
 */
export interface FacebookProduct {
  id: string;
  name: string;
  description: string;
  availability: 'in stock' | 'out of stock' | 'preorder';
  condition: 'new' | 'refurbished' | 'used';
  price: number;
  currency: string;

  // 画像
  image_url: string;
  additional_image_urls?: string[];

  // カテゴリ
  category: string;
  brand?: string;

  // SKU
  retailer_id?: string;
  gtin?: string;
  mpn?: string;

  // 在庫
  inventory: number;

  // 配送
  shipping_weight_value?: number;
  shipping_weight_unit?: 'lb' | 'oz' | 'g' | 'kg';

  // URL
  url?: string;
  checkout_url?: string;

  // カスタムラベル
  custom_label_0?: string;
  custom_label_1?: string;
  custom_label_2?: string;
  custom_label_3?: string;
  custom_label_4?: string;

  // ステータス
  visibility: 'staging' | 'published';
  commerce_insights?: {
    impressions: number;
    clicks: number;
    conversion: number;
  };
}

/**
 * 商品作成リクエスト
 */
export interface CreateProductRequest {
  name: string;
  description: string;
  availability: 'in stock' | 'out of stock' | 'preorder';
  condition: 'new' | 'refurbished' | 'used';
  price: number;
  currency: string;
  image_url: string;
  additional_image_urls?: string[];
  category: string;
  brand?: string;
  retailer_id?: string;
  gtin?: string;
  mpn?: string;
  inventory?: number;
  shipping_weight_value?: number;
  shipping_weight_unit?: 'lb' | 'oz' | 'g' | 'kg';
  url?: string;
  checkout_url?: string;
  visibility?: 'staging' | 'published';
}

/**
 * カテゴリ情報
 */
export interface FacebookCategory {
  id: string;
  name: string;
  parent_id?: string;
  subcategories?: FacebookCategory[];
}

/**
 * 注文情報
 */
export interface FacebookOrder {
  id: string;
  order_status: {
    state: 'CREATED' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  };
  created: string;
  last_updated: string;

  // 購入者情報
  buyer_info: {
    name: string;
    email: string;
  };

  // 配送先
  ship_to: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };

  // 商品
  items: {
    id: string;
    product_id: string;
    quantity: number;
    price_per_unit: number;
    tax_details?: {
      estimated_tax: number;
    };
  }[];

  // 金額
  estimated_payment_details: {
    subtotal: number;
    tax: number;
    shipping: number;
    total_amount: number;
  };
}

/**
 * カタログ情報
 */
export interface FacebookCatalog {
  id: string;
  name: string;
  business_id: string;
  product_count: number;
  vertical: 'commerce' | 'destinations' | 'flights' | 'home_listings' | 'hotels' | 'vehicles';
}

/**
 * 商品フィード
 */
export interface FacebookProductFeed {
  id: string;
  name: string;
  file_url?: string;
  schedule?: {
    interval: 'DAILY' | 'HOURLY' | 'WEEKLY';
    url: string;
  };
  latest_upload?: {
    id: string;
    url: string;
    start_time: string;
    end_time?: string;
    num_products_uploaded: number;
    num_products_detected: number;
  };
}

/**
 * 商品セット
 */
export interface FacebookProductSet {
  id: string;
  name: string;
  filter: string;
  product_count?: number;
}

/**
 * インサイト情報
 */
export interface FacebookInsights {
  date_start: string;
  date_stop: string;
  product_id?: string;
  impressions: number;
  clicks: number;
  actions: number;
  reach: number;
  spend?: number;
}

/**
 * API応答
 */
export interface FacebookApiResponse<T> {
  data?: T;
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
    previous?: string;
  };
  error?: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}
