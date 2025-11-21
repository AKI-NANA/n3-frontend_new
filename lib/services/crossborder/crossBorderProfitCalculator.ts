/**
 * lib/services/crossborder/crossBorderProfitCalculator.ts
 *
 * クロスボーダー無在庫システム Phase 2
 * 関税・DDP対応の利益計算エンジン
 */

import { createClient } from '@/utils/supabase/server';
import type { TaxRateMaster } from '@/src/db/marketplace_db_schema';

// ----------------------------------------------------
// 型定義
// ----------------------------------------------------

/**
 * 商品情報の入力パラメータ
 */
export interface ProductInput {
  id: number;
  hs_code: string;
  supplier_price: number; // 仕入れ価格 (USD)
  weight_g: number; // 商品重量 (グラム)
  target_selling_price?: number; // 目標販売価格 (オプション)
}

/**
 * クロスボーダールート情報
 */
export interface CrossBorderRoute {
  source_country: string; // 輸出国 (例: US, JP, DE)
  target_country: string; // 輸入国 (例: JP, US, DE)
}

/**
 * 利益計算結果
 */
export interface ProfitCalculationResult {
  route: CrossBorderRoute;
  product: ProductInput;

  // コスト内訳
  cif_price: number; // CIF価格 (商品代 + 国際送料 + 保険料)
  duty_amount: number; // 関税額
  tax_amount: number; // 消費税額
  total_duty_and_tax: number; // 関税 + 消費税の合計
  international_shipping: number; // 国際送料
  forwarder_cost: number; // フォワーダー処理費用 (DDP処理 + 再梱包費)
  marketplace_fee: number; // マーケットプレイス手数料

  // 収益
  selling_price: number; // 販売価格
  final_profit: number; // 最終利益
  profit_margin: number; // 利益率 (%)

  // その他
  is_profitable: boolean; // 利益が出るかどうか
  recommended_price?: number; // 推奨販売価格 (目標利益率を達成するための価格)
}

/**
 * 最適ルート計算結果
 */
export interface OptimalRouteResult {
  optimal_route: ProfitCalculationResult;
  all_routes: ProfitCalculationResult[];
}

// ----------------------------------------------------
// ヘルパー関数
// ----------------------------------------------------

/**
 * 関税率を取得する
 */
async function getDutyRate(
  hsCode: string,
  exportCountry: string,
  importCountry: string
): Promise<{ dutyRate: number; taxRate: number }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('tax_rate_master')
    .select('duty_rate, consumption_tax_rate')
    .eq('hs_code', hsCode)
    .eq('export_country', exportCountry)
    .eq('import_country', importCountry)
    .single();

  if (error || !data) {
    console.warn(`税率が見つかりません: ${hsCode} ${exportCountry} -> ${importCountry}`, error);
    // デフォルト値を返す
    return { dutyRate: 0, taxRate: 0 };
  }

  return {
    dutyRate: data.duty_rate,
    taxRate: data.consumption_tax_rate,
  };
}

/**
 * 国際送料を計算する (簡易版)
 * 実際のプロジェクトでは、より詳細な送料計算ロジックまたはAPIを使用する
 */
function calculateInternationalShipping(
  weightG: number,
  sourceCountry: string,
  targetCountry: string
): number {
  // 重量をキログラムに変換
  const weightKg = weightG / 1000;

  // 簡易的な送料計算 (実際にはフォワーダーAPIまたは送料テーブルを使用)
  const baseRate = 15; // USD
  const perKgRate = 8; // USD per kg

  return baseRate + (weightKg * perKgRate);
}

/**
 * フォワーダーコストを計算する (DDP処理費 + 再梱包費)
 */
function calculateForwarderCost(
  internationalShipping: number,
  weightG: number
): number {
  // DDP処理費: 送料の20%
  const ddpProcessingFee = internationalShipping * 0.2;

  // 再梱包費: 重量ベース (簡易計算)
  const repackFee = Math.min(5, weightG / 1000 * 2); // 最大$5

  return ddpProcessingFee + repackFee;
}

/**
 * マーケットプレイス手数料を計算する
 */
function calculateMarketplaceFee(
  sellingPrice: number,
  targetCountry: string
): number {
  // 簡易的な手数料計算 (実際には marketplace_settings から取得)
  const feeRate = 0.15; // 15%
  return sellingPrice * feeRate;
}

// ----------------------------------------------------
// メイン関数
// ----------------------------------------------------

/**
 * クロスボーダー利益を計算する
 *
 * @param product 商品情報
 * @param route クロスボーダールート
 * @param targetProfit 目標利益率 (オプション、デフォルト: 20%)
 * @returns 利益計算結果
 */
export async function calculateCrossBorderProfit(
  product: ProductInput,
  route: CrossBorderRoute,
  targetProfit: number = 0.20
): Promise<ProfitCalculationResult> {
  // 1. 国際送料を計算
  const internationalShipping = calculateInternationalShipping(
    product.weight_g,
    route.source_country,
    route.target_country
  );

  // 2. CIF価格を計算 (商品代 + 送料 + 保険料)
  // 保険料は簡易的に送料の5%とする
  const insuranceFee = internationalShipping * 0.05;
  const cifPrice = product.supplier_price + internationalShipping + insuranceFee;

  // 3. 関税率と消費税率を取得
  const { dutyRate, taxRate } = await getDutyRate(
    product.hs_code,
    route.source_country,
    route.target_country
  );

  // 4. 関税と消費税を計算
  const dutyAmount = cifPrice * (dutyRate / 100);
  const taxAmount = (cifPrice + dutyAmount) * (taxRate / 100);
  const totalDutyAndTax = dutyAmount + taxAmount;

  // 5. フォワーダーコストを計算
  const forwarderCost = calculateForwarderCost(
    internationalShipping,
    product.weight_g
  );

  // 6. 販売価格を計算または使用
  let sellingPrice: number;
  let recommendedPrice: number | undefined;

  if (product.target_selling_price) {
    sellingPrice = product.target_selling_price;
  } else {
    // 目標利益率に基づいて販売価格を計算
    // 販売価格 = (原価 + 関税 + 送料 + フォワーダー費用) / (1 - 目標利益率 - 手数料率)
    const totalCost = product.supplier_price + totalDutyAndTax + internationalShipping + forwarderCost;
    const feeRate = 0.15; // 15% (簡易計算)
    sellingPrice = totalCost / (1 - targetProfit - feeRate);
    recommendedPrice = sellingPrice;
  }

  // 7. マーケットプレイス手数料を計算
  const marketplaceFee = calculateMarketplaceFee(sellingPrice, route.target_country);

  // 8. 最終利益を計算
  const totalCost = product.supplier_price + totalDutyAndTax + internationalShipping + forwarderCost + marketplaceFee;
  const finalProfit = sellingPrice - totalCost;
  const profitMargin = (finalProfit / sellingPrice) * 100;

  return {
    route,
    product,
    cif_price: cifPrice,
    duty_amount: dutyAmount,
    tax_amount: taxAmount,
    total_duty_and_tax: totalDutyAndTax,
    international_shipping: internationalShipping,
    forwarder_cost: forwarderCost,
    marketplace_fee: marketplaceFee,
    selling_price: sellingPrice,
    final_profit: finalProfit,
    profit_margin: profitMargin,
    is_profitable: finalProfit > 0,
    recommended_price: recommendedPrice,
  };
}

/**
 * 最適なクロスボーダールートを自動で決定する
 * 全ての国間ペアを計算し、最も利益が高いルートを返す
 *
 * @param product 商品情報
 * @param routes 検討するルートのリスト
 * @param targetProfit 目標利益率
 * @returns 最適ルートと全ルートの計算結果
 */
export async function findOptimalCrossBorderRoute(
  product: ProductInput,
  routes: CrossBorderRoute[],
  targetProfit: number = 0.20
): Promise<OptimalRouteResult> {
  // 全てのルートで利益を計算
  const allResults = await Promise.all(
    routes.map(route => calculateCrossBorderProfit(product, route, targetProfit))
  );

  // 利益が最も高いルートを見つける
  const optimalRoute = allResults.reduce((best, current) => {
    return current.final_profit > best.final_profit ? current : best;
  });

  return {
    optimal_route: optimalRoute,
    all_routes: allResults.sort((a, b) => b.final_profit - a.final_profit),
  };
}

/**
 * 出品価格を自動設定する
 * ターゲット国の販売価格は、仕入れ価格、DDP総額、手数料、希望利益率を自動で組み込んで設定される
 *
 * @param product 商品情報
 * @param route クロスボーダールート
 * @param targetProfitRate 希望利益率 (0-1の範囲)
 * @returns 自動設定された販売価格
 */
export async function calculateAutoListingPrice(
  product: ProductInput,
  route: CrossBorderRoute,
  targetProfitRate: number = 0.20
): Promise<number> {
  // 利益計算を実行
  const result = await calculateCrossBorderProfit(product, route, targetProfitRate);

  // 推奨価格を返す (利益が出ない場合は調整)
  if (result.is_profitable) {
    return result.selling_price;
  } else {
    // 最低限の利益を確保するための価格調整
    const totalCost =
      product.supplier_price +
      result.total_duty_and_tax +
      result.international_shipping +
      result.forwarder_cost;

    const feeRate = 0.15; // マーケットプレイス手数料率
    const minPrice = totalCost / (1 - feeRate - 0.05); // 最低5%の利益を確保

    return minPrice;
  }
}
