/**
 * Etsy マッパー
 * マスターデータをEtsy APIフォーマットに変換
 */

import { CreateListingRequest } from '../../etsy/types';

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
  hs_code_final?: string;

  // Etsy固有フィールド（オプション）
  etsy?: {
    who_made?: 'i_did' | 'collective' | 'someone_else';
    when_made?: string;
    is_supply?: boolean;
    taxonomy_id?: number;
    tags?: string[];
    materials?: string[];
    processing_min?: number;
    processing_max?: number;
    shipping_profile_id?: number;
  };
}

/**
 * Etsyマッピング入力
 */
export interface EtsyMappingInput {
  masterListing: MasterListingData;
  shopId: number;
  targetCurrency?: 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';
}

/**
 * Etsyカテゴリマッピング
 * 商品タイトルやHSコードからEtsy taxonomy_idを推測
 */
export function mapToEtsyTaxonomy(
  title: string,
  hsCode?: string
): number {
  const titleLower = title.toLowerCase();

  // ポケモンカード
  if (titleLower.includes('pokemon') || titleLower.includes('ポケモン')) {
    return 1068; // Collectibles > Trading Cards
  }

  // トレーディングカード全般
  if (
    titleLower.includes('card') ||
    titleLower.includes('tcg') ||
    titleLower.includes('カード')
  ) {
    return 1068; // Collectibles > Trading Cards
  }

  // おもちゃ・ゲーム
  if (titleLower.includes('toy') || titleLower.includes('game')) {
    return 1063; // Toys & Games
  }

  // 本・雑誌
  if (titleLower.includes('book') || titleLower.includes('magazine')) {
    return 891; // Books, Movies & Music > Books
  }

  // ビンテージ品
  if (
    titleLower.includes('vintage') ||
    titleLower.includes('antique') ||
    titleLower.includes('retro')
  ) {
    return 69150467; // Vintage
  }

  // HSコードベースの判定
  if (hsCode) {
    if (hsCode.startsWith('9503')) {
      return 1063; // Toys & Games
    }
    if (hsCode.startsWith('4901')) {
      return 891; // Books
    }
  }

  // デフォルト: Collectibles
  return 1063; // Toys & Games (最も汎用的)
}

/**
 * Etsy用タグ生成
 * タイトルから自動的にタグを生成（最大13個）
 */
export function generateEtsyTags(title: string): string[] {
  const tags: string[] = [];
  const titleLower = title.toLowerCase();

  // 一般的なキーワード抽出
  const keywords = [
    'pokemon',
    'trading card',
    'collectible',
    'vintage',
    'rare',
    'japanese',
    'tcg',
    'game',
    'toy',
    'gift',
    'collection',
  ];

  keywords.forEach((keyword) => {
    if (titleLower.includes(keyword) && tags.length < 13) {
      tags.push(keyword);
    }
  });

  // 日本からの商品を示すタグ
  if (tags.length < 13) {
    tags.push('from japan', 'japanese import');
  }

  return tags.slice(0, 13); // Etsyの制限は13個
}

/**
 * 説明文からHTMLを除去してプレーンテキスト化
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // HTMLタグを削除
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * 処理時間の計算（日本からの国際配送）
 */
export function calculateProcessingDays(originCountry: string): {
  min: number;
  max: number;
} {
  if (originCountry === 'JP') {
    return { min: 7, max: 14 }; // 国際配送: 7-14日
  }

  return { min: 3, max: 5 }; // 国内: 3-5日
}

/**
 * 重量からitem_weightとitem_weight_unitを計算
 */
export function convertWeight(weightG: number): {
  weight: number;
  unit: 'oz' | 'lb' | 'g' | 'kg';
} {
  // 1kg以上の場合はkg単位
  if (weightG >= 1000) {
    return {
      weight: parseFloat((weightG / 1000).toFixed(2)),
      unit: 'kg',
    };
  }

  // それ以外はg単位
  return {
    weight: weightG,
    unit: 'g',
  };
}

/**
 * マスターデータをEtsy CreateListingRequestに変換
 */
export function mapToEtsyListing(
  input: EtsyMappingInput
): CreateListingRequest {
  const { masterListing, shopId } = input;
  const { etsy } = masterListing;

  // タイトル（最大140文字）
  const title = masterListing.title.slice(0, 140);

  // 説明文（プレーンテキスト）
  const description = stripHtml(masterListing.description_html);

  // 価格（USD基準）
  const price = masterListing.final_price_usd;

  // タクソノミーID
  const taxonomy_id =
    etsy?.taxonomy_id ||
    mapToEtsyTaxonomy(masterListing.title, masterListing.hs_code_final);

  // タグ
  const tags = etsy?.tags || generateEtsyTags(masterListing.title);

  // 処理時間
  const processingDays = calculateProcessingDays(masterListing.origin_country);
  const processing_min = etsy?.processing_min || processingDays.min;
  const processing_max = etsy?.processing_max || processingDays.max;

  // 重量
  const { weight, unit } = convertWeight(masterListing.weight_g);

  // マッピング結果
  const listing: CreateListingRequest = {
    quantity: masterListing.inventory_count,
    title,
    description,
    price,
    who_made: etsy?.who_made || 'someone_else',
    when_made: etsy?.when_made || '2020_2024',
    taxonomy_id,
    tags,
    materials: etsy?.materials,
    processing_min,
    processing_max,
    item_weight: weight,
    item_weight_unit: unit,
    is_supply: etsy?.is_supply || false,
    should_auto_renew: true, // 自動更新を有効化
    is_taxable: true,
    type: 'physical',
  };

  // オプション：配送プロファイルID
  if (etsy?.shipping_profile_id) {
    listing.shipping_profile_id = etsy.shipping_profile_id;
  }

  return listing;
}

/**
 * 手数料計算
 * Etsyの手数料構造：
 * - リスティング手数料: $0.20 per listing
 * - 取引手数料: 6.5% of sale price
 * - 決済処理手数料: 3% + $0.25
 * - オフサイト広告費（該当する場合）: 12-15%
 */
export function calculateEtsyFees(salePrice: number): {
  listingFee: number;
  transactionFee: number;
  paymentProcessingFee: number;
  totalFees: number;
  netRevenue: number;
} {
  const listingFee = 0.2; // $0.20
  const transactionFee = salePrice * 0.065; // 6.5%
  const paymentProcessingFee = salePrice * 0.03 + 0.25; // 3% + $0.25

  const totalFees = listingFee + transactionFee + paymentProcessingFee;
  const netRevenue = salePrice - totalFees;

  return {
    listingFee,
    transactionFee,
    paymentProcessingFee,
    totalFees,
    netRevenue,
  };
}

/**
 * 利益計算
 */
export function calculateEtsyProfit(
  salePrice: number,
  costPrice: number,
  shippingCost: number
): {
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  fees: ReturnType<typeof calculateEtsyFees>;
} {
  const fees = calculateEtsyFees(salePrice);
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
  mapToEtsyListing,
  mapToEtsyTaxonomy,
  generateEtsyTags,
  stripHtml,
  calculateProcessingDays,
  convertWeight,
  calculateEtsyFees,
  calculateEtsyProfit,
};
