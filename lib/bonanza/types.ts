/**
 * Bonanza API型定義
 */

/**
 * 認証情報
 */
export interface BonanzaAuthConfig {
  apiKey: string;
  certName: string;
  devId: string;
  token?: string;
}

/**
 * ブース（ストア）情報
 */
export interface BonanzaBooth {
  booth_id: string;
  booth_name: string;
  booth_url: string;
  seller_username: string;
  booth_description?: string;
  total_items: number;
  booth_category?: string;
}

/**
 * アイテム情報
 */
export interface BonanzaItem {
  item_id: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  category_id: string;
  condition: 'new' | 'used' | 'refurbished';
  sku?: string;
  upc?: string;
  isbn?: string;

  // 画像
  image_urls: string[];
  primary_image_url?: string;

  // 配送
  shipping_profile_id?: string;
  shipping_cost?: number;
  handling_time?: number; // days

  // 返品ポリシー
  returns_accepted: boolean;
  return_period?: number; // days
  return_policy?: string;

  // 決済方法
  payment_methods: string[];

  // ステータス
  status: 'active' | 'inactive' | 'sold' | 'deleted';
  listing_format: 'fixed_price' | 'auction';

  // オークション関連（auction形式の場合）
  auction_duration?: number; // days
  starting_price?: number;
  reserve_price?: number;
  buy_it_now_price?: number;

  // タイムスタンプ
  created_at: string;
  updated_at: string;
  ended_at?: string;

  // その他
  item_specifics?: Record<string, string>;
  booth_id?: string;
}

/**
 * アイテム作成リクエスト
 */
export interface CreateItemRequest {
  title: string;
  description: string;
  price: number;
  quantity: number;
  category_id: string;
  condition?: 'new' | 'used' | 'refurbished';
  sku?: string;
  upc?: string;
  isbn?: string;
  image_urls?: string[];
  shipping_profile_id?: string;
  shipping_cost?: number;
  handling_time?: number;
  returns_accepted?: boolean;
  return_period?: number;
  return_policy?: string;
  payment_methods?: string[];
  listing_format?: 'fixed_price' | 'auction';
  auction_duration?: number;
  starting_price?: number;
  reserve_price?: number;
  buy_it_now_price?: number;
  item_specifics?: Record<string, string>;
}

/**
 * カテゴリ情報
 */
export interface BonanzaCategory {
  category_id: string;
  category_name: string;
  parent_id?: string;
  level: number;
  leaf_category: boolean;
}

/**
 * 配送プロファイル
 */
export interface BonanzaShippingProfile {
  profile_id: string;
  profile_name: string;
  domestic_service: {
    service_name: string;
    cost: number;
    additional_cost?: number;
  };
  international_service?: {
    service_name: string;
    cost: number;
    additional_cost?: number;
    ships_to: string[];
  };
  handling_time: number;
  free_shipping?: boolean;
}

/**
 * 在庫情報
 */
export interface BonanzaInventory {
  item_id: string;
  sku: string;
  quantity: number;
  quantity_sold: number;
  quantity_available: number;
  last_updated: string;
}

/**
 * 注文情報
 */
export interface BonanzaOrder {
  order_id: string;
  buyer_username: string;
  buyer_email: string;
  items: {
    item_id: string;
    title: string;
    price: number;
    quantity: number;
  }[];
  subtotal: number;
  shipping_cost: number;
  tax: number;
  total: number;
  payment_status: 'pending' | 'paid' | 'refunded';
  shipping_status: 'not_shipped' | 'shipped' | 'delivered';
  order_date: string;
  shipping_address: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

/**
 * API応答
 */
export interface BonanzaApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  pagination?: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}
