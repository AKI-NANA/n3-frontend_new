/**
 * Bonanza マッパー
 * マスターデータをBonanza APIフォーマットに変換
 */

import { CreateItemRequest } from '../../bonanza/types';

/**
 * マスターリスティングデータ
 */
export interface MasterListingData {
  title: string;
  description_html: string;
  final_price_usd: number;
  inventory_count: number;
  image_urls: string[];
  origin_country: string;
  weight_g: number;
  sku?: string;
  upc?: string;
  hs_code_final?: string;

  // Bonanza固有フィールド（オプション）
  bonanza?: {
    category_id?: string;
    condition?: 'new' | 'used' | 'refurbished';
    listing_format?: 'fixed_price' | 'auction';
    shipping_profile_id?: string;
    returns_accepted?: boolean;
    return_period?: number;
    item_specifics?: Record<string, string>;
  };
}

/**
 * Bonanzaマッピング入力
 */
export interface BonanzaMappingInput {
  masterListing: MasterListingData;
  targetCurrency?: 'USD';
}

/**
 * Bonanzaカテゴリマッピング
 * 商品タイトルやHSコードからBonanzaカテゴリIDを推測
 */
export function mapToBonanzaCategory(
  title: string,
  hsCode?: string
): string {
  const titleLower = title.toLowerCase();

  // トレーディングカード
  if (
    titleLower.includes('pokemon') ||
    titleLower.includes('trading card') ||
    titleLower.includes('tcg') ||
    titleLower.includes('カード')
  ) {
    return '3482'; // Toys & Hobbies > Games > Trading Card Games
  }

  // おもちゃ
  if (titleLower.includes('toy') || titleLower.includes('figure')) {
    return '220'; // Toys & Hobbies
  }

  // ゲーム
  if (titleLower.includes('game') || titleLower.includes('video game')) {
    return '139973'; // Video Games & Consoles
  }

  // 本
  if (titleLower.includes('book') || titleLower.includes('magazine')) {
    return '267'; // Books
  }

  // コレクティブル
  if (titleLower.includes('collectible') || titleLower.includes('vintage')) {
    return '1'; // Collectibles
  }

  // HSコードベースの判定
  if (hsCode) {
    if (hsCode.startsWith('9503')) {
      return '220'; // Toys & Hobbies
    }
    if (hsCode.startsWith('4901')) {
      return '267'; // Books
    }
  }

  // デフォルト: Collectibles
  return '1';
}

/**
 * HTMLをプレーンテキストに変換
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * 配送コストの計算（重量ベース、USD）
 */
export function calculateShippingCost(weightG: number, originCountry: string): number {
  // 日本からの国際配送の場合
  if (originCountry === 'JP') {
    if (weightG <= 100) return 8.0;
    if (weightG <= 250) return 12.0;
    if (weightG <= 500) return 16.0;
    if (weightG <= 1000) return 25.0;
    if (weightG <= 2000) return 40.0;
    return 60.0;
  }

  // 国内配送（米国内）
  if (weightG <= 500) return 5.0;
  if (weightG <= 1000) return 8.0;
  if (weightG <= 2000) return 12.0;
  return 20.0;
}

/**
 * 処理時間の計算（日本からの国際配送）
 */
export function calculateHandlingTime(originCountry: string): number {
  if (originCountry === 'JP') {
    return 5; // 国際配送: 5日
  }

  return 3; // 国内: 3日
}

/**
 * アイテム固有属性（Item Specifics）の生成
 */
export function generateItemSpecifics(
  title: string,
  originCountry: string
): Record<string, string> {
  const specifics: Record<string, string> = {
    'Country/Region of Manufacture': originCountry === 'JP' ? 'Japan' : 'United States',
  };

  const titleLower = title.toLowerCase();

  // ポケモンカードの場合
  if (titleLower.includes('pokemon')) {
    specifics['Type'] = 'Pokémon Individual Cards';
    specifics['Game'] = 'Pokémon TCG';
    specifics['Language'] = titleLower.includes('japanese') ? 'Japanese' : 'English';
  }

  // トレーディングカード全般
  if (titleLower.includes('trading card') || titleLower.includes('tcg')) {
    specifics['Type'] = 'Trading Card';
  }

  // コンディション
  if (titleLower.includes('new')) {
    specifics['Condition'] = 'New';
  } else if (titleLower.includes('mint')) {
    specifics['Condition'] = 'Near Mint or better';
  }

  return specifics;
}

/**
 * マスターデータをBonanza CreateItemRequestに変換
 */
export function mapToBonanzaItem(
  input: BonanzaMappingInput
): CreateItemRequest {
  const { masterListing } = input;
  const { bonanza } = masterListing;

  // タイトル（最大80文字）
  const title = masterListing.title.slice(0, 80);

  // 説明文
  const description = masterListing.description_html;

  // 価格（USD）
  const price = masterListing.final_price_usd;

  // カテゴリID
  const category_id =
    bonanza?.category_id ||
    mapToBonanzaCategory(masterListing.title, masterListing.hs_code_final);

  // 配送コスト
  const shipping_cost = calculateShippingCost(
    masterListing.weight_g,
    masterListing.origin_country
  );

  // 処理時間
  const handling_time = calculateHandlingTime(masterListing.origin_country);

  // アイテム固有属性
  const item_specifics =
    bonanza?.item_specifics ||
    generateItemSpecifics(masterListing.title, masterListing.origin_country);

  // マッピング結果
  const item: CreateItemRequest = {
    title,
    description,
    price,
    quantity: masterListing.inventory_count,
    category_id,
    condition: bonanza?.condition || 'new',
    sku: masterListing.sku,
    upc: masterListing.upc,
    image_urls: masterListing.image_urls,
    shipping_cost,
    handling_time,
    returns_accepted: bonanza?.returns_accepted !== false,
    return_period: bonanza?.return_period || 30,
    return_policy: 'Items can be returned within 30 days for a full refund.',
    payment_methods: ['PayPal', 'CreditCard'],
    listing_format: bonanza?.listing_format || 'fixed_price',
    item_specifics,
  };

  // オプション：配送プロファイルID
  if (bonanza?.shipping_profile_id) {
    item.shipping_profile_id = bonanza.shipping_profile_id;
  }

  return item;
}

/**
 * 手数料計算
 * Bonanzaの手数料構造：
 * - 最終価格手数料: 3.5% (非常に低い)
 * - 決済処理手数料: PayPal 2.9% + $0.30
 */
export function calculateBonanzaFees(salePrice: number): {
  finalValueFee: number;
  paymentProcessingFee: number;
  totalFees: number;
  netRevenue: number;
} {
  const finalValueFee = salePrice * 0.035; // 3.5%
  const paymentProcessingFee = salePrice * 0.029 + 0.3; // PayPal: 2.9% + $0.30

  const totalFees = finalValueFee + paymentProcessingFee;
  const netRevenue = salePrice - totalFees;

  return {
    finalValueFee,
    paymentProcessingFee,
    totalFees,
    netRevenue,
  };
}

/**
 * 利益計算
 */
export function calculateBonanzaProfit(
  salePrice: number,
  costPrice: number,
  shippingCost: number
): {
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  fees: ReturnType<typeof calculateBonanzaFees>;
} {
  const fees = calculateBonanzaFees(salePrice);
  const totalCost = costPrice + shippingCost;

  const grossProfit = salePrice - totalCost;
  const netProfit = fees.netRevenue - totalCost;
  const profitMargin = (netProfit / salePrice) * 100;

  return {
    grossProfit,
    netProfit,
    profitMargin,
    fees,
  };
}

export default {
  mapToBonanzaItem,
  mapToBonanzaCategory,
  stripHtml,
  calculateShippingCost,
  calculateHandlingTime,
  generateItemSpecifics,
  calculateBonanzaFees,
  calculateBonanzaProfit,
};
