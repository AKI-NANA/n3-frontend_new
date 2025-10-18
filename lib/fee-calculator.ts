/**
 * eBay手数料設定
 * ユーザーの月間売上に応じた手数料計算
 */

export interface FeeSettings {
  monthly_sales_usd: number; // 月間売上（ドル）
  payoneer_fee_percent: number; // Payoneer手数料 (デフォルト2%)
  use_international_fee: boolean; // 海外手数料を含めるか
}

export const DEFAULT_FEE_SETTINGS: FeeSettings = {
  monthly_sales_usd: 0,
  payoneer_fee_percent: 2.0,
  use_international_fee: true,
};

/**
 * 月間売上に基づく手数料ティア
 */
export function getSalesTier(monthly_sales_usd: number): 'standard' | 'premium' {
  return monthly_sales_usd >= 7500 ? 'premium' : 'standard';
}

/**
 * カテゴリーと売上ティアに基づくFinal Value Fee
 */
export function getFinalValueFeePercent(
  category_id: string,
  monthly_sales_usd: number
): number {
  const tier = getSalesTier(monthly_sales_usd);
  
  // Trading Cards (183454)
  if (category_id === '183454') {
    return tier === 'premium' ? 12.35 : 13.25;
  }
  
  // その他のカテゴリー（デフォルト）
  return tier === 'premium' ? 12.35 : 13.25;
}
