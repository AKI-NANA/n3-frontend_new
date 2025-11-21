/**
 * 多販路変換エンジン - プラットフォーム別設定
 * 各プラットフォームの詳細な設定とルール
 */

import type { PlatformConfig, Platform } from './types';

// プラットフォーム別設定マップ
export const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  ebay: {
    name: 'ebay',
    displayName: 'eBay',
    primaryLanguage: 'en',
    currency: 'USD',
    maxImages: 12,
    imageRequirements: {
      minWidth: 500,
      minHeight: 500,
      maxWidth: 9000,
      maxHeight: 9000,
      maxFileSizeMB: 12,
      supportedFormats: ['jpg', 'jpeg', 'png'],
    },
    feeStructure: {
      type: 'percentage',
      baseFeePercent: 12.9,
      paymentProcessingFee: 2.9,
    },
    shippingOptions: [],
    requiredFields: ['title', 'description', 'price', 'category', 'images'],
  },

  shopee: {
    name: 'shopee',
    displayName: 'Shopee',
    primaryLanguage: 'en',
    currency: 'SGD',
    maxImages: 10,
    imageRequirements: {
      minWidth: 800,
      minHeight: 800,
      aspectRatio: '1:1',
      maxFileSizeMB: 5,
      supportedFormats: ['jpg', 'jpeg', 'png'],
    },
    feeStructure: {
      type: 'percentage',
      baseFeePercent: 5.0,
      paymentProcessingFee: 2.0,
    },
    shippingOptions: [],
    requiredFields: ['title', 'description', 'price', 'stock', 'images', 'weight'],
  },

  amazon_jp: {
    name: 'amazon_jp',
    displayName: 'Amazon Japan',
    primaryLanguage: 'ja',
    currency: 'JPY',
    maxImages: 9,
    imageRequirements: {
      minWidth: 1000,
      minHeight: 1000,
      maxWidth: 10000,
      maxHeight: 10000,
      maxFileSizeMB: 10,
      supportedFormats: ['jpg', 'jpeg', 'png', 'gif'],
    },
    feeStructure: {
      type: 'tiered',
      baseFeePercent: 8.0,
      categoryFees: {
        electronics: 8.0,
        apparel: 10.0,
        home: 15.0,
      },
    },
    shippingOptions: [],
    requiredFields: ['title', 'jan_code', 'brand', 'price', 'images'],
  },

  amazon_us: {
    name: 'amazon_us',
    displayName: 'Amazon US',
    primaryLanguage: 'en',
    currency: 'USD',
    maxImages: 9,
    imageRequirements: {
      minWidth: 1000,
      minHeight: 1000,
      maxWidth: 10000,
      maxHeight: 10000,
      maxFileSizeMB: 10,
      supportedFormats: ['jpg', 'jpeg', 'png', 'gif'],
    },
    feeStructure: {
      type: 'tiered',
      baseFeePercent: 15.0,
      categoryFees: {
        electronics: 8.0,
        apparel: 17.0,
        home: 15.0,
      },
    },
    shippingOptions: [],
    requiredFields: ['title', 'upc', 'brand', 'price', 'images', 'fulfillment_method'],
  },

  amazon_au: {
    name: 'amazon_au',
    displayName: 'Amazon Australia',
    primaryLanguage: 'en',
    currency: 'AUD',
    maxImages: 9,
    imageRequirements: {
      minWidth: 1000,
      minHeight: 1000,
      maxWidth: 10000,
      maxHeight: 10000,
      maxFileSizeMB: 10,
      supportedFormats: ['jpg', 'jpeg', 'png', 'gif'],
    },
    feeStructure: {
      type: 'tiered',
      baseFeePercent: 15.0,
      categoryFees: {
        electronics: 8.0,
        apparel: 17.0,
        home: 15.0,
      },
    },
    shippingOptions: [],
    requiredFields: ['title', 'asin', 'brand', 'price', 'images', 'fulfillment_method'],
  },

  coupang: {
    name: 'coupang',
    displayName: 'Coupang (쿠팡)',
    primaryLanguage: 'ko',
    currency: 'KRW',
    maxImages: 20,
    imageRequirements: {
      minWidth: 800,
      minHeight: 800,
      maxWidth: 5000,
      maxHeight: 5000,
      maxFileSizeMB: 10,
      supportedFormats: ['jpg', 'jpeg', 'png'],
    },
    feeStructure: {
      type: 'percentage',
      baseFeePercent: 11.0,
      categoryFees: {
        fashion: 15.0,
        beauty: 12.0,
        electronics: 8.0,
      },
    },
    shippingOptions: [],
    requiredFields: [
      'title_ko',
      'description_ko',
      'price',
      'item_id',
      'category',
      'images',
      'brand',
      'origin_country',
    ],
  },

  qoo10: {
    name: 'qoo10',
    displayName: 'Qoo10',
    primaryLanguage: 'en',
    currency: 'SGD',
    maxImages: 15,
    imageRequirements: {
      minWidth: 500,
      minHeight: 500,
      maxWidth: 5000,
      maxHeight: 5000,
      maxFileSizeMB: 5,
      supportedFormats: ['jpg', 'jpeg', 'png', 'gif'],
    },
    feeStructure: {
      type: 'percentage',
      baseFeePercent: 10.0,
      paymentProcessingFee: 2.0,
    },
    shippingOptions: [],
    requiredFields: [
      'title',
      'description',
      'price',
      'sale_price',
      'category',
      'images',
      'shipping_method',
    ],
  },

  shopify: {
    name: 'shopify',
    displayName: 'Shopify',
    primaryLanguage: 'en',
    currency: 'USD',
    maxImages: 25,
    imageRequirements: {
      minWidth: 800,
      minHeight: 800,
      maxFileSizeMB: 20,
      supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    },
    feeStructure: {
      type: 'percentage',
      baseFeePercent: 2.9,
      paymentProcessingFee: 0.3,
    },
    shippingOptions: [],
    requiredFields: ['title', 'description', 'price', 'sku', 'images'],
  },

  mercari: {
    name: 'mercari',
    displayName: 'メルカリ',
    primaryLanguage: 'ja',
    currency: 'JPY',
    maxImages: 10,
    imageRequirements: {
      minWidth: 500,
      minHeight: 500,
      maxFileSizeMB: 5,
      supportedFormats: ['jpg', 'jpeg', 'png'],
    },
    feeStructure: {
      type: 'percentage',
      baseFeePercent: 10.0,
    },
    shippingOptions: [],
    requiredFields: ['title', 'description', 'price', 'category', 'condition', 'images'],
  },
};

/**
 * プラットフォーム設定を取得
 */
export function getPlatformConfig(platform: Platform): PlatformConfig {
  return PLATFORM_CONFIGS[platform];
}

/**
 * プラットフォームの主要言語を取得
 */
export function getPrimaryLanguage(platform: Platform): string {
  return PLATFORM_CONFIGS[platform].primaryLanguage;
}

/**
 * プラットフォームの通貨を取得
 */
export function getPrimaryCurrency(platform: Platform): string {
  return PLATFORM_CONFIGS[platform].currency;
}

/**
 * プラットフォームの最大画像枚数を取得
 */
export function getMaxImages(platform: Platform): number {
  return PLATFORM_CONFIGS[platform].maxImages;
}

/**
 * プラットフォームの必須フィールドを取得
 */
export function getRequiredFields(platform: Platform): string[] {
  return PLATFORM_CONFIGS[platform].requiredFields;
}

/**
 * 全プラットフォームのリストを取得
 */
export function getAllPlatforms(): Platform[] {
  return Object.keys(PLATFORM_CONFIGS) as Platform[];
}
