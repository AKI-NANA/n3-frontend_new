// ====================================================================
// 価格計算ロジック
// ====================================================================

import { PriceCalculationResult, ProductMasterData } from './types';

/**
 * 為替レートを取得
 * TODO: 実際のAPIまたはデータベースから取得
 */
export async function getExchangeRate(): Promise<number> {
  // 暫定: 固定レート（実装時は動的に取得）
  return 150.0;
}

/**
 * 配送コストを計算
 * @param weight_g 重量（グラム）
 * @param dimensions 寸法（cm）
 * @returns 配送コスト（円）
 */
export function calculateShippingCost(
  weight_g?: number,
  dimensions?: { length_cm?: number; width_cm?: number; height_cm?: number }
): number {
  if (!weight_g) {
    // デフォルト: 500g想定
    return 1200;
  }

  // 重量ベースの配送料（簡易版）
  if (weight_g <= 100) return 800;
  if (weight_g <= 500) return 1200;
  if (weight_g <= 1000) return 1500;
  if (weight_g <= 2000) return 2000;
  return 3000;
}

/**
 * eBay手数料を計算
 * @param price_usd 販売価格（USD）
 * @returns 手数料（USD）
 */
export function calculateEbayFee(price_usd: number): number {
  // eBay最終値手数料: 13.25%
  return price_usd * 0.1325;
}

/**
 * PayPal手数料を計算
 * @param price_usd 販売価格（USD）
 * @returns 手数料（USD）
 */
export function calculatePaypalFee(price_usd: number): number {
  // PayPal手数料: 3.9% + $0.30
  return price_usd * 0.039 + 0.3;
}

/**
 * 推奨配送ポリシーIDを決定
 * @param weight_g 重量（グラム）
 * @param price_usd 販売価格（USD）
 * @returns 配送ポリシーID
 */
export function getRecommendedShippingPolicy(
  weight_g?: number,
  price_usd?: number
): string {
  // TODO: 実際の配送ポリシーIDに置き換える
  if (!weight_g) return 'default_policy';
  
  if (weight_g <= 100) return 'light_package_policy';
  if (weight_g <= 500) return 'standard_policy';
  if (weight_g <= 2000) return 'heavy_policy';
  return 'extra_heavy_policy';
}

/**
 * 価格を計算（完全版）
 * @param source_price_jpy 仕入れ価格（円）
 * @param product_data 商品データ
 * @param exchange_rate 為替レート（オプション）
 * @param target_margin 目標利益率（オプション、デフォルト20%）
 * @returns 価格計算結果
 */
export async function calculatePrice(
  source_price_jpy: number,
  product_data?: ProductMasterData,
  exchange_rate?: number,
  target_margin: number = 20
): Promise<PriceCalculationResult> {
  // 1. 為替レート取得
  const rate = exchange_rate || (await getExchangeRate());

  // 2. 配送コスト計算
  const shipping_cost_jpy = calculateShippingCost(
    product_data?.weight_g,
    {
      length_cm: product_data?.length_cm,
      width_cm: product_data?.width_cm,
      height_cm: product_data?.height_cm,
    }
  );

  // 3. 総コスト（円）
  const total_cost_jpy = source_price_jpy + shipping_cost_jpy;

  // 4. 総コスト（USD）
  const total_cost_usd = total_cost_jpy / rate;

  // 5. 目標利益率から販売価格を逆算
  // 販売価格 = 総コスト / (1 - 利益率 - 手数料率)
  // 手数料率 = eBay(13.25%) + PayPal(3.9%) = 17.15%
  const fee_rate = 0.1325 + 0.039;
  const target_margin_decimal = target_margin / 100;
  
  let ebay_price_usd = total_cost_usd / (1 - target_margin_decimal - fee_rate);
  
  // PayPal固定手数料を考慮
  ebay_price_usd = (total_cost_usd + 0.3) / (1 - target_margin_decimal - fee_rate);

  // 6. 手数料計算
  const ebay_fee_usd = calculateEbayFee(ebay_price_usd);
  const paypal_fee_usd = calculatePaypalFee(ebay_price_usd);

  // 7. 利益計算
  const profit_usd = ebay_price_usd - total_cost_usd - ebay_fee_usd - paypal_fee_usd;
  const profit_margin = (profit_usd / ebay_price_usd) * 100;

  // 8. 配送ポリシー決定
  const recommended_shipping_policy_id = getRecommendedShippingPolicy(
    product_data?.weight_g,
    ebay_price_usd
  );
  const shipping_policy_changed = 
    product_data?.shipping_policy_id !== undefined &&
    product_data.shipping_policy_id !== recommended_shipping_policy_id;

  return {
    source_price_jpy,
    source_price_usd: source_price_jpy / rate,
    shipping_cost_jpy,
    shipping_cost_usd: shipping_cost_jpy / rate,
    ebay_fee_usd,
    paypal_fee_usd,
    ebay_price_usd: Math.round(ebay_price_usd * 100) / 100, // 小数点2桁
    profit_usd: Math.round(profit_usd * 100) / 100,
    profit_margin: Math.round(profit_margin * 100) / 100,
    exchange_rate: rate,
    recommended_shipping_policy_id,
    shipping_policy_changed,
  };
}

/**
 * 既存価格から利益を再計算
 * @param ebay_price_usd 現在のeBay価格（USD）
 * @param source_price_jpy 仕入れ価格（円）
 * @param product_data 商品データ
 * @param exchange_rate 為替レート
 * @returns 価格計算結果
 */
export async function recalculateProfit(
  ebay_price_usd: number,
  source_price_jpy: number,
  product_data?: ProductMasterData,
  exchange_rate?: number
): Promise<PriceCalculationResult> {
  // 1. 為替レート取得
  const rate = exchange_rate || (await getExchangeRate());

  // 2. 配送コスト計算
  const shipping_cost_jpy = calculateShippingCost(
    product_data?.weight_g,
    {
      length_cm: product_data?.length_cm,
      width_cm: product_data?.width_cm,
      height_cm: product_data?.height_cm,
    }
  );

  // 3. 総コスト
  const total_cost_jpy = source_price_jpy + shipping_cost_jpy;
  const total_cost_usd = total_cost_jpy / rate;

  // 4. 手数料計算
  const ebay_fee_usd = calculateEbayFee(ebay_price_usd);
  const paypal_fee_usd = calculatePaypalFee(ebay_price_usd);

  // 5. 利益計算
  const profit_usd = ebay_price_usd - total_cost_usd - ebay_fee_usd - paypal_fee_usd;
  const profit_margin = (profit_usd / ebay_price_usd) * 100;

  // 6. 配送ポリシー
  const recommended_shipping_policy_id = getRecommendedShippingPolicy(
    product_data?.weight_g,
    ebay_price_usd
  );
  const shipping_policy_changed =
    product_data?.shipping_policy_id !== undefined &&
    product_data.shipping_policy_id !== recommended_shipping_policy_id;

  return {
    source_price_jpy,
    source_price_usd: source_price_jpy / rate,
    shipping_cost_jpy,
    shipping_cost_usd: shipping_cost_jpy / rate,
    ebay_fee_usd,
    paypal_fee_usd,
    ebay_price_usd,
    profit_usd: Math.round(profit_usd * 100) / 100,
    profit_margin: Math.round(profit_margin * 100) / 100,
    exchange_rate: rate,
    recommended_shipping_policy_id,
    shipping_policy_changed,
  };
}

/**
 * 最低利益を確保する価格を計算
 * @param source_price_jpy 仕入れ価格（円）
 * @param min_profit_usd 最低利益（USD）
 * @param product_data 商品データ
 * @param exchange_rate 為替レート
 * @returns 最低価格（USD）
 */
export async function calculateMinimumPrice(
  source_price_jpy: number,
  min_profit_usd: number,
  product_data?: ProductMasterData,
  exchange_rate?: number
): Promise<number> {
  const rate = exchange_rate || (await getExchangeRate());
  
  const shipping_cost_jpy = calculateShippingCost(
    product_data?.weight_g,
    {
      length_cm: product_data?.length_cm,
      width_cm: product_data?.width_cm,
      height_cm: product_data?.height_cm,
    }
  );
  
  const total_cost_jpy = source_price_jpy + shipping_cost_jpy;
  const total_cost_usd = total_cost_jpy / rate;
  
  // 最低価格 = (総コスト + 最低利益 + PayPal固定手数料) / (1 - 手数料率)
  const fee_rate = 0.1325 + 0.039;
  const min_price = (total_cost_usd + min_profit_usd + 0.3) / (1 - fee_rate);
  
  return Math.round(min_price * 100) / 100;
}
