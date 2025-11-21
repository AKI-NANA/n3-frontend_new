/**
 * Catawiki マッパー
 * マスターデータをCatawiki APIフォーマットに変換
 * Phase 8専用オークションツール機能を含む
 */

import { CreateLotRequest } from '../../catawiki/types';

/**
 * マスターリスティングデータ
 */
export interface MasterListingData {
  title: string;
  description_html: string;
  cost_price_jpy: number; // 仕入れ原価（JPY）
  final_price_eur?: number; // 販売価格（EUR）、未設定の場合は自動計算
  inventory_count: number;
  image_urls: string[];
  origin_country: string;
  weight_g: number;
  hs_code_final?: string;

  // Catawiki固有フィールド（オプション）
  catawiki?: {
    category_id?: string;
    condition?: 'new' | 'as_new' | 'very_good' | 'good' | 'fair' | 'poor';
    authenticity_status?: 'uncertified' | 'certified';
    request_expertise?: boolean;
    provenance?: string;
    literature?: string;
    exhibited?: string;
  };
}

/**
 * Catawikiマッピング入力
 */
export interface CatawikiMappingInput {
  masterListing: MasterListingData;
  targetCurrency?: 'EUR' | 'USD' | 'GBP';
  targetProfitMargin?: number; // 目標利益率（0.25 = 25%）
  exchangeRates?: {
    JPY_TO_EUR: number;
    JPY_TO_USD: number;
    JPY_TO_GBP: number;
  };
}

/**
 * デフォルト為替レート
 */
const DEFAULT_EXCHANGE_RATES = {
  JPY_TO_EUR: 0.0062, // 1 JPY = 0.0062 EUR
  JPY_TO_USD: 0.0067, // 1 JPY = 0.0067 USD
  JPY_TO_GBP: 0.0053, // 1 JPY = 0.0053 GBP
};

/**
 * Catawikiカテゴリマッピング
 * 商品タイトルやHSコードからCatawikiカテゴリIDを推測
 */
export function mapToCatawikiCategory(
  title: string,
  hsCode?: string
): string {
  const titleLower = title.toLowerCase();

  // ポケモンカード・トレーディングカード
  if (
    titleLower.includes('pokemon') ||
    titleLower.includes('trading card') ||
    titleLower.includes('tcg') ||
    titleLower.includes('カード')
  ) {
    return 'trading-cards'; // Trading Cards
  }

  // コレクティブル
  if (titleLower.includes('collectible') || titleLower.includes('collectables')) {
    return 'collectables';
  }

  // おもちゃ
  if (titleLower.includes('toy') || titleLower.includes('figure')) {
    return 'toys';
  }

  // 時計
  if (titleLower.includes('watch') || titleLower.includes('clock')) {
    return 'watches';
  }

  // 美術品
  if (titleLower.includes('art') || titleLower.includes('painting')) {
    return 'art';
  }

  // アンティーク
  if (titleLower.includes('antique') || titleLower.includes('vintage')) {
    return 'antiques';
  }

  // 本・雑誌
  if (titleLower.includes('book') || titleLower.includes('magazine')) {
    return 'books-magazines';
  }

  // HSコードベースの判定
  if (hsCode) {
    if (hsCode.startsWith('9503')) {
      return 'toys';
    }
    if (hsCode.startsWith('4901')) {
      return 'books-magazines';
    }
  }

  // デフォルト: Collectables
  return 'collectables';
}

/**
 * Reserve Price（最低落札価格）自動計算
 * Phase 1の利益保証ロジックを活用
 */
export function calculateReservePrice(
  costPriceJPY: number,
  targetProfitMargin: number,
  categoryCommissionRate: number,
  exchangeRate: number,
  shippingCostJPY: number = 2000
): {
  reservePriceEUR: number;
  startingPriceEUR: number;
  estimatedValueMin: number;
  estimatedValueMax: number;
} {
  // 総原価（JPY）
  const totalCostJPY = costPriceJPY + shippingCostJPY;

  // 総原価をEURに変換
  const totalCostEUR = totalCostJPY * exchangeRate;

  // 手数料を考慮した最低落札価格
  // Reserve Price = Total Cost / (1 - Commission Rate - Target Profit Margin)
  const reservePriceEUR =
    totalCostEUR / (1 - categoryCommissionRate - targetProfitMargin);

  // 開始価格は最低落札価格の70%に設定（入札を促進）
  const startingPriceEUR = reservePriceEUR * 0.7;

  // 推定価値の範囲
  const estimatedValueMin = reservePriceEUR * 0.95;
  const estimatedValueMax = reservePriceEUR * 1.3;

  return {
    reservePriceEUR: Math.ceil(reservePriceEUR * 100) / 100,
    startingPriceEUR: Math.ceil(startingPriceEUR * 100) / 100,
    estimatedValueMin: Math.ceil(estimatedValueMin * 100) / 100,
    estimatedValueMax: Math.ceil(estimatedValueMax * 100) / 100,
  };
}

/**
 * 条件説明の生成
 */
export function generateConditionDescription(
  condition: 'new' | 'as_new' | 'very_good' | 'good' | 'fair' | 'poor',
  originCountry: string
): string {
  const descriptions: Record<string, string> = {
    new: 'Brand new, never used. Original packaging intact.',
    as_new: 'Like new, minimal signs of use. Excellent condition.',
    very_good: 'Very good condition with minimal wear. Fully functional.',
    good: 'Good condition with some signs of use. Fully functional.',
    fair: 'Fair condition with visible wear. Still functional.',
    poor: 'Poor condition with significant wear. May have defects.',
  };

  let description = descriptions[condition] || descriptions.good;

  if (originCountry === 'JP') {
    description += ' Item ships from Japan.';
  }

  return description;
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
 * マスターデータをCatawiki CreateLotRequestに変換
 */
export function mapToCatawikiLot(
  input: CatawikiMappingInput
): CreateLotRequest {
  const { masterListing, targetCurrency = 'EUR', targetProfitMargin = 0.25 } = input;
  const { catawiki } = masterListing;

  // 為替レート
  const exchangeRates = input.exchangeRates || DEFAULT_EXCHANGE_RATES;
  const exchangeRate = exchangeRates.JPY_TO_EUR;

  // タイトル（最大200文字）
  const title = masterListing.title.slice(0, 200);

  // 説明文（プレーンテキストに変換）
  const description = stripHtml(masterListing.description_html);

  // カテゴリID
  const category_id =
    catawiki?.category_id ||
    mapToCatawikiCategory(masterListing.title, masterListing.hs_code_final);

  // 手数料率（カテゴリによって異なる、デフォルト9%）
  const categoryCommissionRate = 0.09;

  // Reserve Price自動計算
  const pricing = calculateReservePrice(
    masterListing.cost_price_jpy,
    targetProfitMargin,
    categoryCommissionRate,
    exchangeRate
  );

  // 条件
  const condition = catawiki?.condition || 'very_good';
  const condition_description = generateConditionDescription(
    condition,
    masterListing.origin_country
  );

  // マッピング結果
  const lot: CreateLotRequest = {
    title,
    description,
    category_id,
    starting_price: pricing.startingPriceEUR,
    reserve_price: pricing.reservePriceEUR,
    estimated_value: {
      min: pricing.estimatedValueMin,
      max: pricing.estimatedValueMax,
    },
    condition,
    condition_description,
    authenticity_status: catawiki?.authenticity_status || 'uncertified',
    request_expertise: catawiki?.request_expertise || false,
    shipping_method: 'DDP', // Delivered Duty Paid（関税込み）
    shipping_from: {
      country: masterListing.origin_country,
      city: masterListing.origin_country === 'JP' ? 'Tokyo' : undefined,
    },
    ships_to: ['*'], // 全世界配送
    currency: targetCurrency,
  };

  // オプション：来歴情報
  if (catawiki?.provenance) {
    lot.provenance = catawiki.provenance;
  }

  // オプション：文献情報
  if (catawiki?.literature) {
    lot.literature = catawiki.literature;
  }

  // オプション：展示歴
  if (catawiki?.exhibited) {
    lot.exhibited = catawiki.exhibited;
  }

  return lot;
}

/**
 * 手数料計算
 * Catawikiの手数料構造：
 * - 販売手数料: 8-12%（カテゴリによる）
 * - VAT: 21%（ヨーロッパ）
 * - 決済処理手数料なし（Catawikiが負担）
 */
export function calculateCatawikiFees(
  salePrice: number,
  categoryCommissionRate: number = 0.09,
  includeVAT: boolean = true
): {
  commissionFee: number;
  vatAmount: number;
  totalFees: number;
  netRevenue: number;
} {
  const commissionFee = salePrice * categoryCommissionRate;
  const vatAmount = includeVAT ? commissionFee * 0.21 : 0; // 21% VAT
  const totalFees = commissionFee + vatAmount;
  const netRevenue = salePrice - totalFees;

  return {
    commissionFee,
    vatAmount,
    totalFees,
    netRevenue,
  };
}

/**
 * 利益計算
 */
export function calculateCatawikiProfit(
  salePriceEUR: number,
  costPriceJPY: number,
  shippingCostJPY: number,
  exchangeRate: number,
  categoryCommissionRate: number = 0.09
): {
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  fees: ReturnType<typeof calculateCatawikiFees>;
} {
  const fees = calculateCatawikiFees(salePriceEUR, categoryCommissionRate);
  const totalCostEUR = (costPriceJPY + shippingCostJPY) * exchangeRate;

  const grossProfit = salePriceEUR - totalCostEUR;
  const netProfit = fees.netRevenue - totalCostEUR;
  const profitMargin = (netProfit / salePriceEUR) * 100;

  return {
    grossProfit,
    netProfit,
    profitMargin,
    fees,
  };
}

/**
 * 鑑定リクエストの自動提出判定
 * 高額商品（500EUR以上）は自動的に鑑定をリクエスト
 */
export function shouldRequestExpertise(
  estimatedValueEUR: number,
  category: string,
  threshold: number = 500
): boolean {
  // 高額商品は常に鑑定をリクエスト
  if (estimatedValueEUR >= threshold) {
    return true;
  }

  // 特定カテゴリは鑑定が必須
  const expertiseRequiredCategories = [
    'art',
    'watches',
    'jewelry',
    'antiques',
    'coins',
    'stamps',
  ];

  if (expertiseRequiredCategories.includes(category)) {
    return true;
  }

  return false;
}

export default {
  mapToCatawikiLot,
  mapToCatawikiCategory,
  calculateReservePrice,
  generateConditionDescription,
  stripHtml,
  calculateCatawikiFees,
  calculateCatawikiProfit,
  shouldRequestExpertise,
};
