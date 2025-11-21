/**
 * バリエーション型定義
 * 多販路対応の親SKU・子SKU構造
 */

import { Platform } from './strategy';

/**
 * バリエーションタイプ
 */
export type VariationType = 'Single' | 'Parent' | 'Child' | 'Set';

/**
 * バリエーション属性（サイズ、色など）
 */
export interface VariationAttribute {
  name: string; // 'Color', 'Size', etc.
  value: string; // 'Red', 'Large', etc.
}

/**
 * 子SKU情報
 */
export interface ChildSku {
  sku: string;
  parent_sku?: string;
  attributes: VariationAttribute[]; // [{ name: 'Color', value: 'Red' }]
  price: number;
  quantity: number;
  images?: string[];
  ean?: string;
  condition?: string;
}

/**
 * 親SKU情報
 */
export interface ParentSku {
  sku: string;
  title: string;
  description?: string;
  category_id?: string;
  children: ChildSku[];
  main_image?: string;
  variation_attributes: string[]; // ['Color', 'Size']
}

/**
 * プラットフォーム別バリエーション変換結果
 */
export interface PlatformVariationData {
  platform: Platform;
  data: EbayVariationData | AmazonVariationData | ShopeeVariationData | any;
}

/**
 * eBay バリエーション構造
 * (Trading API Variations format)
 */
export interface EbayVariationData {
  title: string;
  description: string;
  category_id: string;
  pictures: string[];
  variations: {
    variation_specifics: Array<{
      name: string;
      value: string;
    }>;
    start_price: number;
    quantity: number;
    sku: string;
  }[];
  variation_specifics_set: Array<{
    name: string;
    values: string[];
  }>;
}

/**
 * Amazon バリエーション構造
 * (SP-API Listings format)
 */
export interface AmazonVariationData {
  parent_sku: string;
  product_type: string;
  attributes: {
    item_name: Array<{
      value: string;
      language_tag?: string;
      marketplace_id?: string;
    }>;
    variation_theme?: Array<{
      value: string;
    }>;
  };
  children: Array<{
    sku: string;
    attributes: {
      [key: string]: Array<{
        value: string;
        marketplace_id?: string;
      }>;
    };
    offers: Array<{
      marketplace_id: string;
      our_price: Array<{
        schedule: Array<{
          value_with_tax: number;
        }>;
      }>;
      quantity_available?: number;
    }>;
  }>;
}

/**
 * Shopee バリエーション構造
 * (特殊: バリエーション画像が必須)
 */
export interface ShopeeVariationData {
  item_name: string;
  description: string;
  category_id: number;
  images: string[];
  tier_variation: Array<{
    name: string;
    option_list: Array<{
      option: string;
      image?: {
        image_id: string;
      };
    }>;
  }>;
  variation: Array<{
    tier_index: number[];
    price: number;
    stock: number;
    variation_sku: string;
  }>;
}

/**
 * バリエーション変換エラー
 */
export interface VariationConversionError {
  code: string;
  message: string;
  missing_fields?: string[];
  platform: Platform;
}
