/**
 * 共通価格決定モジュール (PriceCalculator)
 *
 * すべての出品先モール（eBay、Shopee、Coupang等）で共通利用できる、
 * DDP/DDUの要件を動的に切り替え可能な最終販売価格の計算サービス
 *
 * 既存の /ebay-pricing ロジックをリファクタリング
 */

import { createClient } from '@/utils/supabase/server';
import { DdpCalculator } from './DdpCalculator';
import type { DdpCalculationInput } from './DdpCalculator';

/**
 * 価格計算入力データ
 */
export interface PriceCalculationData {
  // コスト情報
  item_cost: number; // 商品原価（円）
  shipping_cost_base: number; // 基本送料（円）

  // 目標利益率
  target_profit_rate: number; // 目標利益率（0.15 = 15%）

  // 商品情報
  hs_code?: string; // HSコード
  origin_country?: string; // 原産国
  weight_g?: number; // 重量（グラム）
}

/**
 * マーケットプレイス設定
 */
export interface MarketplaceSettings {
  // モール情報
  platform: string;
  account_id?: string;
  country_code: string; // 出品先国（'US', 'AU', 'JP', etc.）

  // 手数料
  fee_rate: number; // 販売手数料率（0.125 = 12.5%）
  payment_fee_rate?: number; // 決済手数料率（0.03 = 3%）
  fixed_fee?: number; // 固定手数料（USD）

  // その他
  currency?: string; // 通貨（'USD', 'AUD', 'JPY', etc.）
}

/**
 * 価格計算結果
 */
export interface PriceCalculationResult {
  // 入力情報
  item_cost_jpy: number;
  item_cost_usd: number;
  shipping_cost_jpy: number;
  shipping_cost_usd: number;

  // DDPコスト
  ddp_cost_usd: number; // DDPコスト（関税+VAT+処理費）
  is_ddp_mode: boolean; // DDPモードかどうか

  // 手数料
  marketplace_fee_rate: number; // モール手数料率
  payment_fee_rate: number; // 決済手数料率
  fixed_fee_usd: number; // 固定手数料

  // 最終販売価格
  final_price_usd: number; // 最終販売価格（USD）

  // 利益分析
  total_cost_usd: number; // 総コスト（USD）
  total_fees_usd: number; // 総手数料（USD）
  profit_usd: number; // 利益（USD）
  profit_rate: number; // 実利益率

  // 目標との差
  target_profit_rate: number; // 目標利益率
  profit_rate_delta: number; // 目標利益率との差

  // 判定
  is_profitable: boolean; // 利益が出るか
  reason: string; // 判定理由
  warnings: string[]; // 警告メッセージ

  // 為替レート
  exchange_rate: number; // 為替レート（1 USD = X JPY）
}

/**
 * 共通価格決定モジュール
 */
export class PriceCalculator {
  private supabase: ReturnType<typeof createClient>;
  private ddpCalculator: DdpCalculator;

  constructor(supabase: ReturnType<typeof createClient>) {
    this.supabase = supabase;
    this.ddpCalculator = new DdpCalculator(supabase);
  }

  /**
   * 為替レートを取得
   */
  private async getExchangeRate(currency: string = 'USD'): Promise<number> {
    // TODO: DBから最新の為替レートを取得
    // 現在は固定値
    const rates: Record<string, number> = {
      USD: 150.0, // 1 USD = 150 JPY
      AUD: 100.0, // 1 AUD = 100 JPY
      EUR: 160.0, // 1 EUR = 160 JPY
      KRW: 0.11, // 1 KRW = 0.11 JPY
    };

    return rates[currency] || 150.0;
  }

  /**
   * DDPコストを計算
   *
   * @param isDdpRequired - DDPモード（関税を出品者が負担）かどうか
   * @param item_cost_usd - 商品原価（USD）
   * @param data - 商品データ
   * @param marketplaceSettings - マーケットプレイス設定
   * @returns DDPコスト（USD）
   */
  private async calculateDdpCost(
    isDdpRequired: boolean,
    item_cost_usd: number,
    data: PriceCalculationData,
    marketplaceSettings: MarketplaceSettings
  ): Promise<number> {
    // DDUモード（購入者が関税を負担）の場合はコスト0
    if (!isDdpRequired) {
      console.log('[PriceCalculator] DDU mode: DDP Cost = 0');
      return 0;
    }

    // DDPモード（出品者が関税を負担）の場合は関税計算
    console.log('[PriceCalculator] DDP mode: Calculating tariffs');

    if (!data.hs_code) {
      console.warn('[PriceCalculator] No HS code provided, using default tariff rate');
      // デフォルト関税率（簡易計算）
      const default_tariff_rate = 0.058 + 0.08; // 5.8% + 8% DDP処理費
      return item_cost_usd * default_tariff_rate;
    }

    const ddpInput: DdpCalculationInput = {
      hs_code: data.hs_code,
      country_code: marketplaceSettings.country_code,
      item_cost_usd,
      origin_country: data.origin_country,
    };

    const ddpResult = await this.ddpCalculator.calculate(ddpInput);

    return ddpResult.total_ddp_cost;
  }

  /**
   * 最終販売価格を計算
   *
   * 汎用公式:
   * Final Price = (Cost + Shipping Cost + DDP Cost) / (1 - Mall Fee Rate - Target Profit Rate)
   *
   * @param data - 商品データ
   * @param marketplaceSettings - マーケットプレイス設定
   * @param isDdpRequired - DDPモード（関税を出品者が負担）かどうか
   * @returns 価格計算結果
   */
  async calculateFinalPrice(
    data: PriceCalculationData,
    marketplaceSettings: MarketplaceSettings,
    isDdpRequired: boolean
  ): Promise<PriceCalculationResult> {
    console.log('[PriceCalculator] Starting price calculation');
    console.log(`  - Platform: ${marketplaceSettings.platform}`);
    console.log(`  - Country: ${marketplaceSettings.country_code}`);
    console.log(`  - DDP Required: ${isDdpRequired}`);

    const warnings: string[] = [];

    // 1. 為替レートを取得
    const exchange_rate = await this.getExchangeRate(marketplaceSettings.currency);

    // 2. 円建てコストをUSDに変換
    const item_cost_usd = data.item_cost / exchange_rate;
    const shipping_cost_usd = data.shipping_cost_base / exchange_rate;

    console.log(`  - Item Cost: ¥${data.item_cost} = $${item_cost_usd.toFixed(2)}`);
    console.log(`  - Shipping Cost: ¥${data.shipping_cost_base} = $${shipping_cost_usd.toFixed(2)}`);

    // 3. DDPコストを計算（isDdpRequiredに基づく）
    const ddp_cost_usd = await this.calculateDdpCost(
      isDdpRequired,
      item_cost_usd,
      data,
      marketplaceSettings
    );

    console.log(`  - DDP Cost: $${ddp_cost_usd.toFixed(2)}`);

    // 4. 総コスト
    const total_cost_usd = item_cost_usd + shipping_cost_usd + ddp_cost_usd;

    // 5. 手数料率
    const marketplace_fee_rate = marketplaceSettings.fee_rate || 0.125;
    const payment_fee_rate = marketplaceSettings.payment_fee_rate || 0.03;
    const fixed_fee_usd = marketplaceSettings.fixed_fee || 0;

    // 6. 最終販売価格を計算（汎用公式）
    //    Final Price = (Cost + Fixed Fee) / (1 - Mall Fee Rate - Payment Fee Rate - Target Profit Rate)
    const denominator = 1 - marketplace_fee_rate - payment_fee_rate - data.target_profit_rate;

    if (denominator <= 0) {
      // 手数料と利益率の合計が100%を超える場合
      return {
        item_cost_jpy: data.item_cost,
        item_cost_usd,
        shipping_cost_jpy: data.shipping_cost_base,
        shipping_cost_usd,
        ddp_cost_usd,
        is_ddp_mode: isDdpRequired,
        marketplace_fee_rate,
        payment_fee_rate,
        fixed_fee_usd,
        final_price_usd: 0,
        total_cost_usd,
        total_fees_usd: 0,
        profit_usd: 0,
        profit_rate: 0,
        target_profit_rate: data.target_profit_rate,
        profit_rate_delta: 0,
        is_profitable: false,
        reason: '手数料と目標利益率の合計が100%を超えているため、価格計算不可能',
        warnings: [],
        exchange_rate,
      };
    }

    const final_price_usd = (total_cost_usd + fixed_fee_usd) / denominator;

    console.log(`  - Final Price: $${final_price_usd.toFixed(2)}`);

    // 7. 手数料を計算
    const marketplace_fee_usd = final_price_usd * marketplace_fee_rate;
    const payment_fee_usd = final_price_usd * payment_fee_rate;
    const total_fees_usd = marketplace_fee_usd + payment_fee_usd + fixed_fee_usd;

    // 8. 利益を計算
    const profit_usd = final_price_usd - total_cost_usd - total_fees_usd;
    const profit_rate = (profit_usd / final_price_usd) * 100;

    // 9. 目標との差
    const target_profit_rate_percent = data.target_profit_rate * 100;
    const profit_rate_delta = profit_rate - target_profit_rate_percent;

    // 10. 判定
    let is_profitable = profit_usd > 0;
    let reason = '利益が出ます';

    if (profit_usd <= 0) {
      is_profitable = false;
      reason = '赤字になります';
    } else if (Math.abs(profit_rate_delta) > 5) {
      warnings.push(
        `目標利益率（${target_profit_rate_percent.toFixed(1)}%）との差が大きいです: 実利益率 ${profit_rate.toFixed(1)}%`
      );
    }

    if (final_price_usd < 5) {
      warnings.push('販売価格が$5未満です。最低価格設定を確認してください。');
    }

    console.log(`  - Profit: $${profit_usd.toFixed(2)} (${profit_rate.toFixed(1)}%)`);
    console.log(`  - Is Profitable: ${is_profitable}`);

    return {
      item_cost_jpy: data.item_cost,
      item_cost_usd,
      shipping_cost_jpy: data.shipping_cost_base,
      shipping_cost_usd,
      ddp_cost_usd,
      is_ddp_mode: isDdpRequired,
      marketplace_fee_rate,
      payment_fee_rate,
      fixed_fee_usd,
      final_price_usd,
      total_cost_usd,
      total_fees_usd,
      profit_usd,
      profit_rate,
      target_profit_rate: target_profit_rate_percent,
      profit_rate_delta,
      is_profitable,
      reason,
      warnings,
      exchange_rate,
    };
  }

  /**
   * バッチ計算（複数商品×複数マーケットプレイス）
   */
  async calculateBatch(
    items: Array<{
      data: PriceCalculationData;
      marketplaceSettings: MarketplaceSettings;
      isDdpRequired: boolean;
    }>
  ): Promise<PriceCalculationResult[]> {
    const results: PriceCalculationResult[] = [];

    for (const item of items) {
      const result = await this.calculateFinalPrice(
        item.data,
        item.marketplaceSettings,
        item.isDdpRequired
      );
      results.push(result);
    }

    return results;
  }
}
