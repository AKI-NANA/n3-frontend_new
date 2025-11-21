/**
 * Etsy API型定義
 * Etsy Open API v3対応
 */

/**
 * OAuth認証情報
 */
export interface EtsyAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

/**
 * アクセストークン
 */
export interface EtsyTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * ショップ情報
 */
export interface EtsyShop {
  shop_id: number;
  shop_name: string;
  title: string;
  announcement?: string;
  currency_code: string;
  is_vacation: boolean;
  vacation_message?: string;
  sale_message?: string;
  digital_sale_message?: string;
  listing_active_count: number;
  digital_listing_count: number;
  user_id: number;
  url: string;
}

/**
 * リスティング情報
 */
export interface EtsyListing {
  listing_id: number;
  user_id: number;
  shop_id: number;
  title: string;
  description: string;
  state: 'active' | 'inactive' | 'draft' | 'sold_out' | 'expired';
  creation_timestamp: number;
  ending_timestamp?: number;
  original_creation_timestamp: number;
  last_modified_timestamp: number;
  price: {
    amount: number;
    divisor: number;
    currency_code: string;
  };
  quantity: number;
  sku?: string[];
  tags: string[];
  taxonomy_id: number;

  // 作成者情報
  who_made: 'i_did' | 'collective' | 'someone_else';
  when_made: 'made_to_order' | '2020_2024' | '2010_2019' | '2000_2009' | '1990s' | 'before_1990';
  is_supply: boolean;

  // 配送情報
  processing_min: number;
  processing_max: number;
  shipping_profile_id?: number;

  // その他
  materials?: string[];
  shop_section_id?: number;
  item_weight?: number;
  item_weight_unit?: 'oz' | 'lb' | 'g' | 'kg';
  item_length?: number;
  item_width?: number;
  item_height?: number;
  item_dimensions_unit?: 'in' | 'ft' | 'mm' | 'cm' | 'm';
  is_personalizable?: boolean;
  personalization_is_required?: boolean;
  personalization_char_count_max?: number;
  personalization_instructions?: string;
  production_partner_ids?: number[];
  image_ids?: number[];
  video_ids?: number[];
  is_customizable?: boolean;
  should_auto_renew?: boolean;
  is_taxable?: boolean;
  type?: 'physical' | 'download' | 'both';
}

/**
 * リスティング作成リクエスト
 */
export interface CreateListingRequest {
  quantity: number;
  title: string;
  description: string;
  price: number;
  who_made: 'i_did' | 'collective' | 'someone_else';
  when_made: string;
  taxonomy_id: number;
  shipping_profile_id?: number;
  return_policy_id?: number;
  materials?: string[];
  shop_section_id?: number;
  processing_min: number;
  processing_max: number;
  tags?: string[];
  styles?: string[];
  item_weight?: number;
  item_length?: number;
  item_width?: number;
  item_height?: number;
  item_weight_unit?: 'oz' | 'lb' | 'g' | 'kg';
  item_dimensions_unit?: 'in' | 'ft' | 'mm' | 'cm' | 'm';
  is_personalizable?: boolean;
  personalization_is_required?: boolean;
  personalization_char_count_max?: number;
  personalization_instructions?: string;
  production_partner_ids?: number[];
  image_ids?: number[];
  is_supply: boolean;
  is_customizable?: boolean;
  should_auto_renew?: boolean;
  is_taxable?: boolean;
  type?: 'physical' | 'download' | 'both';
}

/**
 * リスティング画像
 */
export interface EtsyListingImage {
  listing_image_id: number;
  listing_id: number;
  hex_code?: string;
  red?: number;
  green?: number;
  blue?: number;
  hue?: number;
  saturation?: number;
  brightness?: number;
  is_black_and_white?: boolean;
  creation_tsz: number;
  rank: number;
  url_75x75: string;
  url_170x135: string;
  url_570xN: string;
  url_fullxfull: string;
  full_height?: number;
  full_width?: number;
}

/**
 * 配送プロファイル
 */
export interface EtsyShippingProfile {
  shipping_profile_id: number;
  title: string;
  user_id: number;
  min_processing_days: number;
  max_processing_days: number;
  processing_days_display_label?: string;
  origin_country_iso: string;
  origin_postal_code?: string;
  profile_type: 'manual' | 'calculated';
  domestic_handling_fee?: number;
  international_handling_fee?: number;
}

/**
 * タクソノミー（カテゴリ）
 */
export interface EtsyTaxonomy {
  id: number;
  level: number;
  name: string;
  parent_id?: number;
  children: EtsyTaxonomy[];
}

/**
 * 在庫情報
 */
export interface EtsyInventory {
  products: EtsyProduct[];
  price_on_property?: number[];
  quantity_on_property?: number[];
  sku_on_property?: number[];
}

export interface EtsyProduct {
  product_id: number;
  sku: string;
  is_deleted: boolean;
  offerings: EtsyOffering[];
  property_values: EtsyPropertyValue[];
}

export interface EtsyOffering {
  offering_id: number;
  price: {
    amount: number;
    divisor: number;
    currency_code: string;
  };
  quantity: number;
  is_enabled: boolean;
  is_deleted: boolean;
}

export interface EtsyPropertyValue {
  property_id: number;
  property_name: string;
  scale_id?: number;
  scale_name?: string;
  value_ids: number[];
  values: string[];
}

/**
 * API応答
 */
export interface EtsyApiResponse<T> {
  count: number;
  results: T[];
}

export interface EtsyApiError {
  error: string;
  error_msg?: string;
}
