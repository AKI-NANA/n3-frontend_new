/**
 * Facebook Marketplace マッパー
 * マスターデータをFacebook Marketplace APIフォーマットに変換
 */

import { CreateProductRequest } from '../../facebook-marketplace/types';

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
  gtin?: string;
  brand?: string;
  hs_code_final?: string;

  // Facebook Marketplace固有フィールド（オプション）
  facebook?: {
    category?: string;
    condition?: 'new' | 'refurbished' | 'used';
    checkout_url?: string;
    custom_labels?: string[];
  };
}

/**
 * Facebook Marketplaceマッピング入力
 */
export interface FacebookMarketplaceMappingInput {
  masterListing: MasterListingData;
  shopUrl?: string;
  targetCurrency?: 'USD';
}

/**
 * Facebook Marketplaceカテゴリマッピング
 */
export function mapToFacebookCategory(
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
    return 'Toys & Games > Games & Puzzles > Card Games';
  }

  // おもちゃ
  if (titleLower.includes('toy') || titleLower.includes('figure')) {
    return 'Toys & Games > Toys';
  }

  // ゲーム
  if (titleLower.includes('game') || titleLower.includes('video game')) {
    return 'Electronics > Video Games';
  }

  // 本
  if (titleLower.includes('book') || titleLower.includes('magazine')) {
    return 'Books & Magazines';
  }

  // コレクティブル
  if (titleLower.includes('collectible') || titleLower.includes('vintage')) {
    return 'Collectibles';
  }

  // HSコードベースの判定
  if (hsCode) {
    if (hsCode.startsWith('9503')) {
      return 'Toys & Games > Toys';
    }
    if (hsCode.startsWith('4901')) {
      return 'Books & Magazines';
    }
  }

  // デフォルト: Toys & Games
  return 'Toys & Games';
}

/**
 * HTMLをプレーンテキストに変換（Facebook Marketplaceは簡易HTMLのみサポート）
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
 * 配送重量の変換（gからlbへ）
 */
export function convertWeightToLbs(weightG: number): {
  value: number;
  unit: 'lb';
} {
  const weightLbs = weightG / 453.592; // 1 lb = 453.592 g

  return {
    value: parseFloat(weightLbs.toFixed(2)),
    unit: 'lb',
  };
}

/**
 * 在庫状態の判定
 */
export function getAvailability(inventoryCount: number): 'in stock' | 'out of stock' | 'preorder' {
  if (inventoryCount > 0) {
    return 'in stock';
  } else if (inventoryCount === 0) {
    return 'out of stock';
  } else {
    return 'preorder';
  }
}

/**
 * Retailer IDの生成（SKUベース）
 */
export function generateRetailerId(
  sku?: string,
  productId?: number
): string {
  if (sku) {
    return sku;
  }

  if (productId) {
    return `FB-${productId}`;
  }

  return `FB-${Date.now()}`;
}

/**
 * チェックアウトURLの生成
 */
export function generateCheckoutUrl(
  shopUrl: string,
  retailerId: string
): string {
  return `${shopUrl}/products/${retailerId}`;
}

/**
 * マスターデータをFacebook Marketplace CreateProductRequestに変換
 */
export function mapToFacebookProduct(
  input: FacebookMarketplaceMappingInput
): CreateProductRequest {
  const { masterListing, shopUrl, targetCurrency = 'USD' } = input;
  const { facebook } = masterListing;

  // タイトル（最大150文字）
  const name = masterListing.title.slice(0, 150);

  // 説明文（最大5000文字）
  const description = stripHtml(masterListing.description_html).slice(0, 5000);

  // 価格
  const price = masterListing.final_price_usd;

  // カテゴリ
  const category =
    facebook?.category ||
    mapToFacebookCategory(masterListing.title, masterListing.hs_code_final);

  // 在庫状態
  const availability = getAvailability(masterListing.inventory_count);

  // 配送重量
  const weight = convertWeightToLbs(masterListing.weight_g);

  // Retailer ID
  const retailer_id = generateRetailerId(masterListing.sku);

  // メイン画像とその他の画像
  const [image_url, ...additional_image_urls] = masterListing.image_urls;

  // チェックアウトURL
  const checkout_url = facebook?.checkout_url || (shopUrl
    ? generateCheckoutUrl(shopUrl, retailer_id)
    : undefined);

  // マッピング結果
  const product: CreateProductRequest = {
    name,
    description,
    price,
    currency: targetCurrency,
    availability,
    condition: facebook?.condition || 'new',
    image_url,
    additional_image_urls: additional_image_urls.slice(0, 9), // 最大10枚（メイン含む）
    category,
    brand: masterListing.brand,
    retailer_id,
    gtin: masterListing.gtin,
    inventory: masterListing.inventory_count,
    shipping_weight_value: weight.value,
    shipping_weight_unit: weight.unit,
    checkout_url,
    visibility: 'published',
  };

  return product;
}

/**
 * 手数料計算
 * Facebook Marketplaceの手数料構造：
 * - 販売手数料: 5%（最低$0.40）
 * - 決済処理手数料: $0.40 per shipment
 */
export function calculateFacebookFees(salePrice: number): {
  sellingFee: number;
  paymentProcessingFee: number;
  totalFees: number;
  netRevenue: number;
} {
  const sellingFee = Math.max(salePrice * 0.05, 0.4); // 5%、最低$0.40
  const paymentProcessingFee = 0.4; // $0.40 per shipment

  const totalFees = sellingFee + paymentProcessingFee;
  const netRevenue = salePrice - totalFees;

  return {
    sellingFee,
    paymentProcessingFee,
    totalFees,
    netRevenue,
  };
}

/**
 * 利益計算
 */
export function calculateFacebookProfit(
  salePrice: number,
  costPrice: number,
  shippingCost: number
): {
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  fees: ReturnType<typeof calculateFacebookFees>;
} {
  const fees = calculateFacebookFees(salePrice);
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

/**
 * 日本からの配送設定チェック
 * 国際配送の必須項目を検証（要件8-6に対応）
 */
export function validateInternationalShipping(
  product: CreateProductRequest,
  originCountry: string
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 日本からの配送の場合
  if (originCountry === 'JP') {
    // 配送重量が設定されているか
    if (!product.shipping_weight_value || product.shipping_weight_value <= 0) {
      errors.push('配送重量が設定されていません。国際配送には必須です。');
    }

    // GTINまたはMPNが設定されているか（推奨）
    if (!product.gtin && !product.mpn) {
      warnings.push('GTINまたはMPNの設定を推奨します。商品の識別が容易になります。');
    }

    // 説明文に配送情報が含まれているか
    if (!product.description.includes('Japan') && !product.description.includes('日本')) {
      warnings.push('説明文に「日本からの配送」であることを明記することを推奨します。');
    }

    // 画像が十分にあるか
    const totalImages = 1 + (product.additional_image_urls?.length || 0);
    if (totalImages < 3) {
      warnings.push('国際取引では、商品画像を3枚以上設定することを推奨します。');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export default {
  mapToFacebookProduct,
  mapToFacebookCategory,
  stripHtml,
  convertWeightToLbs,
  getAvailability,
  generateRetailerId,
  generateCheckoutUrl,
  calculateFacebookFees,
  calculateFacebookProfit,
  validateInternationalShipping,
};
