/**
 * プラットフォーム別利益計算ロジック
 * 各プラットフォームの手数料・送料を考慮した最適価格を算出
 */

import type { Platform, Currency, PricingInput, PricingResult } from '@/lib/multichannel/types';
import { getPlatformConfig } from '@/lib/multichannel/platformConfigs';
import { getDutyRate } from './constants/HTS_DUTY_TABLE';
import { getFeeInfo, calculateFee } from './constants/CATEGORY_FEE_TABLE';

// 為替レート（デフォルト値、実際は外部APIから取得すべき）
const DEFAULT_EXCHANGE_RATES: Record<Currency, number> = {
  JPY: 1,
  USD: 150,
  AUD: 100,
  KRW: 0.11,
  SGD: 110,
};

// 配送方法別の料金テーブル（重量ベース、グラム）
interface ShippingRate {
  maxWeight: number;
  cost: number;
}

// プラットフォーム別配送料金
const SHIPPING_RATES: Record<Platform, Record<string, ShippingRate[]>> = {
  amazon_us: {
    FBA: [
      { maxWeight: 100, cost: 3.22 },
      { maxWeight: 200, cost: 3.4 },
      { maxWeight: 500, cost: 4.75 },
      { maxWeight: 1000, cost: 5.97 },
      { maxWeight: 2000, cost: 7.83 },
      { maxWeight: Infinity, cost: 10.0 },
    ],
    FBM: [
      { maxWeight: 500, cost: 8.0 },
      { maxWeight: 1000, cost: 12.0 },
      { maxWeight: 2000, cost: 18.0 },
      { maxWeight: Infinity, cost: 25.0 },
    ],
  },
  amazon_au: {
    FBA: [
      { maxWeight: 100, cost: 4.5 },
      { maxWeight: 200, cost: 4.8 },
      { maxWeight: 500, cost: 6.2 },
      { maxWeight: 1000, cost: 7.8 },
      { maxWeight: 2000, cost: 10.5 },
      { maxWeight: Infinity, cost: 14.0 },
    ],
    FBM: [
      { maxWeight: 500, cost: 10.0 },
      { maxWeight: 1000, cost: 15.0 },
      { maxWeight: 2000, cost: 22.0 },
      { maxWeight: Infinity, cost: 30.0 },
    ],
  },
  amazon_jp: {
    FBA: [
      { maxWeight: 100, cost: 500 },
      { maxWeight: 200, cost: 550 },
      { maxWeight: 500, cost: 700 },
      { maxWeight: 1000, cost: 900 },
      { maxWeight: 2000, cost: 1200 },
      { maxWeight: Infinity, cost: 1500 },
    ],
    FBM: [
      { maxWeight: 500, cost: 1000 },
      { maxWeight: 1000, cost: 1500 },
      { maxWeight: 2000, cost: 2200 },
      { maxWeight: Infinity, cost: 3000 },
    ],
  },
  coupang: {
    'Coupang Wing': [
      { maxWeight: 500, cost: 3000 },
      { maxWeight: 1000, cost: 3500 },
      { maxWeight: 2000, cost: 4500 },
      { maxWeight: 5000, cost: 6000 },
      { maxWeight: Infinity, cost: 8000 },
    ],
    Rocket: [
      { maxWeight: 500, cost: 2500 },
      { maxWeight: 1000, cost: 3000 },
      { maxWeight: 2000, cost: 4000 },
      { maxWeight: Infinity, cost: 5500 },
    ],
  },
  qoo10: {
    Qxpress: [
      { maxWeight: 500, cost: 3.5 },
      { maxWeight: 1000, cost: 5.0 },
      { maxWeight: 2000, cost: 7.5 },
      { maxWeight: Infinity, cost: 12.0 },
    ],
    Standard: [
      { maxWeight: 500, cost: 5.0 },
      { maxWeight: 1000, cost: 7.0 },
      { maxWeight: 2000, cost: 10.0 },
      { maxWeight: Infinity, cost: 15.0 },
    ],
  },
  ebay: {
    Standard: [
      { maxWeight: 500, cost: 8.0 },
      { maxWeight: 1000, cost: 12.0 },
      { maxWeight: 2000, cost: 18.0 },
      { maxWeight: Infinity, cost: 25.0 },
    ],
  },
  shopee: {
    SLS: [
      { maxWeight: 500, cost: 2.5 },
      { maxWeight: 1000, cost: 3.5 },
      { maxWeight: 2000, cost: 5.0 },
      { maxWeight: Infinity, cost: 8.0 },
    ],
    Standard: [
      { maxWeight: 500, cost: 4.0 },
      { maxWeight: 1000, cost: 6.0 },
      { maxWeight: 2000, cost: 9.0 },
      { maxWeight: Infinity, cost: 12.0 },
    ],
  },
  shopify: {
    Standard: [
      { maxWeight: 500, cost: 8.0 },
      { maxWeight: 1000, cost: 12.0 },
      { maxWeight: 2000, cost: 18.0 },
      { maxWeight: Infinity, cost: 25.0 },
    ],
  },
  mercari: {
    Mercari: [
      { maxWeight: 100, cost: 200 },
      { maxWeight: 250, cost: 230 },
      { maxWeight: 500, cost: 380 },
      { maxWeight: 1000, cost: 700 },
      { maxWeight: 2000, cost: 1000 },
      { maxWeight: Infinity, cost: 1500 },
    ],
  },
};

/**
 * 配送料を計算
 */
function calculateShippingCost(
  platform: Platform,
  weightG: number,
  shippingMethod?: string
): number {
  const platformRates = SHIPPING_RATES[platform];
  if (!platformRates) {
    console.warn(`[PlatformPricing] ${platform} の配送料金テーブルが見つかりません`);
    return 0;
  }

  // 配送方法を決定（指定がない場合はデフォルト）
  const method = shippingMethod || Object.keys(platformRates)[0];
  const rates = platformRates[method];

  if (!rates) {
    console.warn(
      `[PlatformPricing] ${platform} の配送方法 ${method} が見つかりません`
    );
    return 0;
  }

  // 重量に基づいて料金を検索
  for (const rate of rates) {
    if (weightG <= rate.maxWeight) {
      return rate.cost;
    }
  }

  return rates[rates.length - 1].cost;
}

/**
 * プラットフォーム手数料を計算
 */
function calculatePlatformFee(
  platform: Platform,
  price: number,
  category?: string
): number {
  const config = getPlatformConfig(platform);
  const feeStructure = config.feeStructure;

  let feePercent = feeStructure.baseFeePercent || 0;

  // カテゴリ別手数料がある場合
  if (feeStructure.categoryFees && category) {
    feePercent = feeStructure.categoryFees[category] || feePercent;
  }

  return (price * feePercent) / 100;
}

/**
 * 決済手数料を計算
 */
function calculatePaymentFee(platform: Platform, price: number): number {
  const config = getPlatformConfig(platform);
  const paymentFeePercent = config.feeStructure.paymentProcessingFee || 0;
  return (price * paymentFeePercent) / 100;
}

/**
 * 為替レートを取得
 */
function getExchangeRate(fromCurrency: Currency, toCurrency: Currency): number {
  if (fromCurrency === toCurrency) {
    return 1;
  }

  // JPY基準で計算
  const fromRate = DEFAULT_EXCHANGE_RATES[fromCurrency];
  const toRate = DEFAULT_EXCHANGE_RATES[toCurrency];

  return toRate / fromRate;
}

/**
 * プラットフォーム別の最適価格を計算
 * @param input - 価格計算入力データ
 * @param minProfitMargin - 最低利益率（%）デフォルト20%
 * @returns 価格計算結果
 */
export async function calculatePlatformPrice(
  input: PricingInput,
  minProfitMargin: number = 20
): Promise<PricingResult> {
  const { costJpy, weightG, platform, targetCountry, shippingMethod, category } = input;

  const config = getPlatformConfig(platform);
  const targetCurrency = config.currency;

  // 1. 為替レートを取得
  const exchangeRate = getExchangeRate('JPY', targetCurrency);

  // 2. 仕入れコストを対象通貨に変換
  const baseProductCost = costJpy / exchangeRate;

  // 3. 配送コストを計算（対象通貨）
  const shippingCostInTargetCurrency = calculateShippingCost(
    platform,
    weightG,
    shippingMethod
  );

  // 4. 初期価格を設定（コスト + 配送料 + 最低利益率）
  let sellingPrice = baseProductCost + shippingCostInTargetCurrency;
  sellingPrice = sellingPrice / (1 - minProfitMargin / 100);

  // 5. プラットフォーム手数料を計算
  const platformFee = calculatePlatformFee(platform, sellingPrice, category);

  // 6. 決済手数料を計算
  const paymentFee = calculatePaymentFee(platform, sellingPrice);

  // 7. 総費用
  const totalCost = baseProductCost + shippingCostInTargetCurrency + platformFee + paymentFee;

  // 8. 損益分岐点
  const breakEvenPrice = totalCost;

  // 9. 最低利益を確保する価格を再計算
  const minPriceWithProfit = totalCost / (1 - minProfitMargin / 100);

  if (sellingPrice < minPriceWithProfit) {
    sellingPrice = minPriceWithProfit;
  }

  // 10. 最終的な利益と利益率を計算
  const profit = sellingPrice - totalCost;
  const profitMargin = (profit / sellingPrice) * 100;

  // 11. 警告チェック
  const warnings: string[] = [];
  if (profitMargin < minProfitMargin) {
    warnings.push(
      `利益率が目標（${minProfitMargin}%）を下回っています: ${profitMargin.toFixed(1)}%`
    );
  }
  if (sellingPrice < breakEvenPrice) {
    warnings.push('価格が損益分岐点を下回っています');
  }

  const result: PricingResult = {
    platform,
    currency: targetCurrency,
    sellingPrice: Math.round(sellingPrice * 100) / 100,
    costBreakdown: {
      baseProductCost: Math.round(baseProductCost * 100) / 100,
      shippingCost: Math.round(shippingCostInTargetCurrency * 100) / 100,
      platformFee: Math.round(platformFee * 100) / 100,
      paymentFee: Math.round(paymentFee * 100) / 100,
      exchangeRate: Math.round(exchangeRate * 100) / 100,
    },
    profit: Math.round(profit * 100) / 100,
    profitMargin: Math.round(profitMargin * 10) / 10,
    breakEvenPrice: Math.round(breakEvenPrice * 100) / 100,
    warnings,
  };

  console.log(`[PlatformPricing] ${platform} の価格計算:`, {
    sellingPrice: result.sellingPrice,
    currency: targetCurrency,
    profit: result.profit,
    profitMargin: result.profitMargin,
    warnings: warnings.length,
  });

  return result;
}

/**
 * 複数プラットフォームの価格を一括計算
 */
export async function calculateMultiPlatformPrices(
  inputs: PricingInput[],
  minProfitMargin: number = 20
): Promise<PricingResult[]> {
  const results: PricingResult[] = [];

  for (const input of inputs) {
    const result = await calculatePlatformPrice(input, minProfitMargin);
    results.push(result);
  }

  console.log(`[PlatformPricing] ${results.length} プラットフォームの価格を計算しました`);

  return results;
}

/**
 * 最も利益率が高いプラットフォームを取得
 */
export function getBestPlatformByProfit(results: PricingResult[]): PricingResult | null {
  if (results.length === 0) return null;

  return results.reduce((best, current) => {
    return current.profitMargin > best.profitMargin ? current : best;
  });
}

/**
 * 利益率でソート（降順）
 */
export function sortByProfitMargin(results: PricingResult[]): PricingResult[] {
  return [...results].sort((a, b) => b.profitMargin - a.profitMargin);
}

// ========================================
// 🆕 精緻化された利益計算ロジック
// ========================================

/**
 * DDP (Delivery Duty Paid) コストのうち、関税部分を計算する
 * @param htsCode - 確定したHSコード（例: "9504.40"）
 * @param priceJPY - 商品価格（円）
 * @param targetCountry - ターゲット国（例: "US", "AU"）
 * @returns 関税コスト（円）
 */
export function calculateDuty(
  htsCode: string,
  priceJPY: number,
  targetCountry: string
): number {
  const dutyRate = getDutyRate(htsCode, targetCountry);
  const dutyCost = priceJPY * dutyRate;

  console.log(
    `[Duty] HSコード: ${htsCode}, 国: ${targetCountry}, 関税率: ${(dutyRate * 100).toFixed(2)}%, 関税額: ¥${dutyCost.toFixed(0)}`
  );

  return dutyCost;
}

/**
 * モール別・カテゴリ別の販売手数料を計算する（精緻化版）
 * @param platform - ターゲットプラットフォーム（例: "Amazon", "eBay"）
 * @param targetCountry - ターゲット国（例: "US", "JP"）
 * @param category - SKUマスターから取得した最終カテゴリ
 * @param finalPriceInTargetCurrency - 最終販売価格（ターゲット通貨）
 * @returns 販売手数料（ターゲット通貨）
 */
export function calculatePlatformFeeEnhanced(
  platform: string,
  targetCountry: string,
  category: string,
  finalPriceInTargetCurrency: number
): number {
  const feeInfo = getFeeInfo(platform, targetCountry, category);
  const fee = calculateFee(feeInfo, finalPriceInTargetCurrency);

  console.log(
    `[Fee] ${platform} ${targetCountry} - ${category}: ${(feeInfo.rate * 100).toFixed(2)}%${feeInfo.fixedFee ? ` + ${feeInfo.fixedFee}` : ''} = ${fee.toFixed(2)}`
  );

  return fee;
}

/**
 * 国コードの標準化（Platform → 国コード変換）
 * @param platform - プラットフォーム名
 * @param targetCountry - ユーザー指定の国（オプション）
 * @returns 標準化された国コード
 */
function normalizeCountryCode(platform: Platform, targetCountry?: string): string {
  if (targetCountry) {
    return targetCountry.toUpperCase();
  }

  // プラットフォームから国を推測
  const platformCountryMap: Record<string, string> = {
    amazon_us: 'US',
    amazon_au: 'AU',
    amazon_jp: 'JP',
    ebay: 'US', // デフォルトUS
    coupang: 'KR',
    qoo10: 'SG',
    shopee: 'SG',
    mercari: 'JP',
    shopify: 'US', // デフォルト
  };

  return platformCountryMap[platform] || 'US';
}

/**
 * 詳細なコスト内訳を含む拡張型PricingResult
 */
export interface EnhancedPricingResult extends PricingResult {
  costBreakdown: {
    baseProductCost: number;
    shippingCost: number;
    dutyCost: number; // 🆕 関税
    platformFee: number;
    paymentFee: number;
    exchangeRate: number;
  };
  htsCode?: string; // 使用したHSコード
  category?: string; // 使用したカテゴリ
}

/**
 * 最適価格計算（精緻化版）
 * 以下の順序でコストを積み上げて最終販売価格を決定：
 * 1. 原価/仕入値（products_master.price_jpy）
 * 2. 国際送料
 * 3. 関税コスト（HSコード基準）
 * 4. プラットフォーム手数料（カテゴリ基準）
 * 5. 決済手数料
 * 6. 最低利益保証
 *
 * @param input - 価格計算入力（htsCodeとcategoryを含む）
 * @param minProfitMargin - 最低利益率（%）
 * @returns 詳細なコスト内訳を含む価格計算結果
 */
export async function calculateOptimalPrice(
  input: PricingInput & { htsCode?: string },
  minProfitMargin: number = 20
): Promise<EnhancedPricingResult> {
  const { costJpy, weightG, platform, targetCountry, category, htsCode } = input;

  const config = getPlatformConfig(platform);
  const targetCurrency = config.currency;
  const countryCode = normalizeCountryCode(platform, targetCountry);

  // 1. 為替レートを取得
  const exchangeRate = getExchangeRate('JPY', targetCurrency);

  // 2. 原価をターゲット通貨に変換
  const baseProductCost = costJpy / exchangeRate;

  // 3. 国際送料を計算（ターゲット通貨）
  const shippingMethod = input.shippingMethod || Object.keys(SHIPPING_RATES[platform] || {})[0];
  const shippingCostInTargetCurrency = calculateShippingCost(
    platform,
    weightG,
    shippingMethod
  );

  // 4. 関税コストを計算（円建て → ターゲット通貨に変換）
  let dutyCostInTargetCurrency = 0;
  if (htsCode && countryCode !== 'JP') {
    const dutyCostJPY = calculateDuty(htsCode, costJpy, countryCode);
    dutyCostInTargetCurrency = dutyCostJPY / exchangeRate;
  }

  // 5. 仮の販売価格を設定（コスト + 送料 + 関税 + 最低利益率）
  let sellingPrice =
    (baseProductCost + shippingCostInTargetCurrency + dutyCostInTargetCurrency) /
    (1 - minProfitMargin / 100);

  // 6. プラットフォーム手数料を計算
  const platformFee = calculatePlatformFeeEnhanced(
    platform,
    countryCode,
    category || 'DEFAULT',
    sellingPrice
  );

  // 7. 決済手数料を計算
  const paymentFeePercent = config.feeStructure.paymentProcessingFee || 0;
  const paymentFee = (sellingPrice * paymentFeePercent) / 100;

  // 8. 総コストを再計算
  const totalCost =
    baseProductCost +
    shippingCostInTargetCurrency +
    dutyCostInTargetCurrency +
    platformFee +
    paymentFee;

  // 9. 損益分岐点
  const breakEvenPrice = totalCost;

  // 10. 最低利益を確保する価格を再計算
  const minPriceWithProfit = totalCost / (1 - minProfitMargin / 100);

  if (sellingPrice < minPriceWithProfit) {
    sellingPrice = minPriceWithProfit;
  }

  // 11. 最終的な利益と利益率を計算
  const profit = sellingPrice - totalCost;
  const profitMargin = (profit / sellingPrice) * 100;

  // 12. 警告チェック
  const warnings: string[] = [];
  if (profitMargin < minProfitMargin) {
    warnings.push(
      `利益率が目標（${minProfitMargin}%）を下回っています: ${profitMargin.toFixed(1)}%`
    );
  }
  if (sellingPrice < breakEvenPrice) {
    warnings.push('価格が損益分岐点を下回っています');
  }
  if (!htsCode) {
    warnings.push('HSコードが未設定のため、関税計算をスキップしました');
  }

  const result: EnhancedPricingResult = {
    platform,
    currency: targetCurrency,
    sellingPrice: Math.round(sellingPrice * 100) / 100,
    costBreakdown: {
      baseProductCost: Math.round(baseProductCost * 100) / 100,
      shippingCost: Math.round(shippingCostInTargetCurrency * 100) / 100,
      dutyCost: Math.round(dutyCostInTargetCurrency * 100) / 100,
      platformFee: Math.round(platformFee * 100) / 100,
      paymentFee: Math.round(paymentFee * 100) / 100,
      exchangeRate: Math.round(exchangeRate * 100) / 100,
    },
    profit: Math.round(profit * 100) / 100,
    profitMargin: Math.round(profitMargin * 10) / 10,
    breakEvenPrice: Math.round(breakEvenPrice * 100) / 100,
    warnings,
    htsCode,
    category,
  };

  console.log(`[OptimalPrice] ${platform} の詳細計算:`, {
    sellingPrice: result.sellingPrice,
    currency: targetCurrency,
    profit: result.profit,
    profitMargin: result.profitMargin,
    dutyCost: result.costBreakdown.dutyCost,
    platformFee: result.costBreakdown.platformFee,
    warnings: warnings.length,
  });

  return result;
}
