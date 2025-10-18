/**
 * マーケットプレイス型定義
 * NAGANO-3モーダルシステム用
 */

export type MarketplaceType = 
  | 'ebay'
  | 'mercari'
  | 'rakuma'
  | 'yahoo'
  | 'amazon';

export interface Marketplace {
  id: MarketplaceType;
  name: string;
  displayName: string;
  icon?: string;
  color: string;
  enabled: boolean;
  config?: MarketplaceConfig;
}

export interface MarketplaceConfig {
  apiKey?: string;
  apiSecret?: string;
  sellerId?: string;
  storeId?: string;
  siteId?: string;
  defaultShippingDays?: number;
  defaultReturnPolicy?: string;
  customFields?: Record<string, any>;
}

export interface MarketplaceListingData {
  marketplace: MarketplaceType;
  listingId: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  condition: string;
  images: string[];
  category?: string;
  status: 'draft' | 'active' | 'paused' | 'ended' | 'sold';
  
  // マーケットプレイス固有フィールド
  ebayData?: EbayListingData;
  mercariData?: MercariListingData;
  rakumaData?: RakumaListingData;
  yahooData?: YahooListingData;
  amazonData?: AmazonListingData;
}

/**
 * eBay固有データ
 */
export interface EbayListingData {
  itemId?: string;
  format: 'auction' | 'fixedPrice' | 'storeInventory';
  duration: number;
  startPrice?: number;
  reservePrice?: number;
  buyItNowPrice?: number;
  location: string;
  shippingType: 'calculated' | 'flat' | 'freight' | 'free';
  returnsAccepted: boolean;
  returnPeriod?: number;
}

/**
 * メルカリ固有データ
 */
export interface MercariListingData {
  itemId?: string;
  brand?: string;
  size?: string;
  shippingPayer: 'seller' | 'buyer';
  shippingMethod: string;
  shippingOrigin: string;
  shippingDays: number;
}

/**
 * ラクマ固有データ
 */
export interface RakumaListingData {
  itemId?: string;
  brand?: string;
  size?: string;
  shippingPayer: 'seller' | 'buyer';
  shippingMethod: string;
  shippingDays: number;
}

/**
 * Yahoo!オークション固有データ
 */
export interface YahooListingData {
  auctionId?: string;
  format: 'auction' | 'fixedPrice';
  startPrice?: number;
  buyoutPrice?: number;
  duration: number;
  autoExtension: boolean;
  immediateShipping: boolean;
}

/**
 * Amazon固有データ
 */
export interface AmazonListingData {
  asin?: string;
  sku: string;
  fulfillmentChannel: 'FBA' | 'FBM';
  condition: 'new' | 'used' | 'refurbished';
  conditionNote?: string;
  handlingTime?: number;
}

/**
 * マーケットプレイス選択状態
 */
export interface MarketplaceSelection {
  selected: MarketplaceType[];
  primary?: MarketplaceType;
  data: Record<MarketplaceType, Partial<MarketplaceListingData>>;
}

/**
 * マーケットプレイス設定
 */
export const MARKETPLACE_CONFIGS: Record<MarketplaceType, Marketplace> = {
  ebay: {
    id: 'ebay',
    name: 'ebay',
    displayName: 'eBay',
    color: '#E53238',
    enabled: true,
  },
  mercari: {
    id: 'mercari',
    name: 'mercari',
    displayName: 'メルカリ',
    color: '#FF0211',
    enabled: true,
  },
  rakuma: {
    id: 'rakuma',
    name: 'rakuma',
    displayName: 'ラクマ',
    color: '#BF0000',
    enabled: true,
  },
  yahoo: {
    id: 'yahoo',
    name: 'yahoo',
    displayName: 'Yahoo!オークション',
    color: '#FF0033',
    enabled: true,
  },
  amazon: {
    id: 'amazon',
    name: 'amazon',
    displayName: 'Amazon',
    color: '#FF9900',
    enabled: true,
  },
};

/**
 * マーケットプレイス検証
 */
export interface MarketplaceValidation {
  marketplace: MarketplaceType;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MarketplaceValidationResult {
  isValid: boolean;
  validations: MarketplaceValidation[];
}
