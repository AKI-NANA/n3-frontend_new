/**
 * 統合利益計算サービス
 *
 * Phase 1-1: 基盤構築
 *
 * 既存の /ebay-pricing ロジックを多モール対応にリファクタリング。
 * marketplace_settings テーブルを参照し、目標利益率から販売価格を逆算する。
 */

import { createClient } from '@/utils/supabase/server';
import type { Platform } from '@/lib/multichannel/types';

/**
 * マーケットプレイス設定
 */
interface MarketplaceSettings {
  platform: Platform;
  account_id?: string;
  target_profit_margin: number; // 目標利益率（%）
  min_profit_margin: number; // 最低利益率（%）
  commission_rate: number; // 販売手数料（%）
  fixed_fee: number; // 固定手数料
  payment_fee_rate: number; // 決済手数料（%）
}

/**
 * 利益計算入力パラメータ
 */
export interface ProfitCalculationInput {
  // 商品情報
  sku: string;
  cost_jpy: number; // 原価（円）
  weight_g: number; // 重量（グラム）

  // モール情報
  platform: Platform;
  account_id?: string;
  destination_country: string; // 配送先国

  // その他
  exchange_rate?: number; // 為替レート（指定がなければDBから取得）
  hts_code?: string; // 関税コード
  category?: string; // カテゴリ
}

/**
 * 利益計算結果
 */
export interface ProfitCalculationResult {
  // 入力情報
  sku: string;
  platform: Platform;
  cost_jpy: number;
  cost_usd: number;

  // 設定値
  target_profit_margin: number; // 目標利益率（%）
  commission_rate: number; // 手数料率（%）

  // 送料
  shipping_cost: number; // 送料（USD）

  // 関税（DDP対応モールの場合）
  tariff_rate: number; // 関税率（%）
  tariff_amount: number; // 関税額（USD）

  // 販売価格の計算
  suggested_price: number; // 推奨販売価格（USD）

  // 収益とコスト
  revenue: number; // 売上（USD）
  commission_fee: number; // 販売手数料（USD）
  payment_fee: number; // 決済手数料（USD）
  fixed_fee: number; // 固定手数料（USD）
  total_cost: number; // 総コスト（USD）

  // 利益
  profit: number; // 利益（USD）
  profit_margin: number; // 実利益率（%）

  // 判定
  can_list: boolean; // 出品可否
  reason: string; // 理由
  warnings: string[]; // 警告メッセージ
}

/**
 * 統合利益計算サービス
 */
export class UnifiedProfitCalculator {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabase: ReturnType<typeof createClient>) {
    this.supabase = supabase;
  }

  /**
   * マーケットプレイス設定を取得
   */
  private async getMarketplaceSettings(
    platform: Platform,
    account_id?: string
  ): Promise<MarketplaceSettings | null> {
    let query = this.supabase
      .from('marketplace_settings')
      .select('*')
      .eq('platform', platform)
      .eq('is_active', true);

    if (account_id) {
      query = query.eq('account_id', account_id);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      console.error(`[UnifiedProfitCalculator] Settings not found for ${platform}:`, error);
      return null;
    }

    return {
      platform: data.platform,
      account_id: data.account_id,
      target_profit_margin: data.target_profit_margin || 15.0,
      min_profit_margin: data.min_profit_margin || 10.0,
      commission_rate: data.commission_rate || 10.0,
      fixed_fee: data.fixed_fee || 0,
      payment_fee_rate: data.payment_fee_rate || 3.0,
    };
  }

  /**
   * 送料を計算
   */
  private async calculateShipping(
    platform: Platform,
    destination_country: string,
    weight_g: number
  ): Promise<number> {
    const { data: rules, error } = await this.supabase
      .from('shipping_rules')
      .select('*')
      .eq('platform', platform)
      .eq('destination_country', destination_country)
      .lte('min_weight_g', weight_g)
      .gte('max_weight_g', weight_g)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1);

    if (error || !rules || rules.length === 0) {
      console.warn(`[UnifiedProfitCalculator] No shipping rule found for ${platform} to ${destination_country}`);
      // デフォルト送料（仮）
      return 10.0;
    }

    const rule = rules[0];
    const weight_kg = weight_g / 1000;

    // 送料計算: base_fee + (per_kg_fee * kg)
    const shippingCost = rule.base_fee + rule.per_kg_fee * weight_kg;

    return shippingCost;
  }

  /**
   * 関税を計算（DDP対応モールの場合）
   */
  private async calculateTariff(
    platform: Platform,
    cost_usd: number,
    hts_code?: string
  ): Promise<{ tariff_rate: number; tariff_amount: number }> {
    // DDP対応モール（eBay US、一部のAmazon）の場合のみ関税計算
    const ddpPlatforms = ['ebay', 'amazon_us'];

    if (!ddpPlatforms.includes(platform) || !hts_code) {
      return { tariff_rate: 0, tariff_amount: 0 };
    }

    // HTS codeから関税率を取得
    const { data: htsData } = await this.supabase
      .from('hts_codes')
      .select('base_rate')
      .eq('code', hts_code)
      .single();

    const base_rate = htsData?.base_rate || 0.058; // デフォルト5.8%

    // 追加関税（中国製品など）
    // TODO: 原産国情報を追加する
    const additional_rate = 0; // 簡易実装

    const total_tariff_rate = base_rate + additional_rate;

    // DDP処理費用（関税 + 8%）
    const effective_ddp_rate = total_tariff_rate + 0.08;

    const tariff_amount = cost_usd * effective_ddp_rate;

    return {
      tariff_rate: effective_ddp_rate,
      tariff_amount,
    };
  }

  /**
   * 為替レートを取得
   */
  private async getExchangeRate(): Promise<number> {
    // TODO: DBから最新の為替レートを取得
    // 暫定的に固定値
    return 150.0; // 1 USD = 150 JPY
  }

  /**
   * 販売価格を逆算
   *
   * 目標利益率から販売価格を計算する汎用公式:
   *
   * Revenue = SalesPrice
   * Cost = CostUSD + Shipping + Tariff
   * Fees = Commission + PaymentFee + FixedFee
   *      = SalesPrice * (CommissionRate + PaymentFeeRate) / 100 + FixedFee
   *
   * Profit = Revenue - Cost - Fees
   * ProfitMargin = Profit / Revenue * 100
   *
   * TargetProfitMargin = Profit / Revenue * 100
   * → Profit = Revenue * TargetProfitMargin / 100
   * → Revenue - Cost - Fees = Revenue * TargetProfitMargin / 100
   * → Revenue * (1 - TargetProfitMargin / 100) = Cost + Fees
   * → Revenue * (1 - TargetProfitMargin / 100) = Cost + Revenue * FeeRate / 100 + FixedFee
   * → Revenue * (1 - TargetProfitMargin / 100 - FeeRate / 100) = Cost + FixedFee
   * → Revenue = (Cost + FixedFee) / (1 - (TargetProfitMargin + FeeRate) / 100)
   *
   * SalesPrice = Revenue
   */
  private calculateSuggestedPrice(
    cost_usd: number,
    shipping_cost: number,
    tariff_amount: number,
    settings: MarketplaceSettings
  ): number {
    const total_cost = cost_usd + shipping_cost + tariff_amount;
    const fee_rate = settings.commission_rate + settings.payment_fee_rate;

    // 目標利益率から販売価格を逆算
    const suggested_price =
      (total_cost + settings.fixed_fee) /
      (1 - (settings.target_profit_margin + fee_rate) / 100);

    return suggested_price;
  }

  /**
   * 利益計算を実行
   */
  async calculate(
    input: ProfitCalculationInput
  ): Promise<ProfitCalculationResult> {
    console.log(`[UnifiedProfitCalculator] Calculating profit for SKU=${input.sku}, Platform=${input.platform}`);

    const warnings: string[] = [];

    // 1. マーケットプレイス設定を取得
    const settings = await this.getMarketplaceSettings(
      input.platform,
      input.account_id
    );

    if (!settings) {
      return {
        sku: input.sku,
        platform: input.platform,
        cost_jpy: input.cost_jpy,
        cost_usd: 0,
        target_profit_margin: 15.0,
        commission_rate: 10.0,
        shipping_cost: 0,
        tariff_rate: 0,
        tariff_amount: 0,
        suggested_price: 0,
        revenue: 0,
        commission_fee: 0,
        payment_fee: 0,
        fixed_fee: 0,
        total_cost: 0,
        profit: 0,
        profit_margin: 0,
        can_list: false,
        reason: `マーケットプレイス設定が見つかりません: ${input.platform}`,
        warnings: [],
      };
    }

    // 2. 為替レートを取得
    const exchange_rate = input.exchange_rate || (await this.getExchangeRate());
    const cost_usd = input.cost_jpy / exchange_rate;

    // 3. 送料を計算
    const shipping_cost = await this.calculateShipping(
      input.platform,
      input.destination_country,
      input.weight_g
    );

    // 4. 関税を計算
    const { tariff_rate, tariff_amount } = await this.calculateTariff(
      input.platform,
      cost_usd,
      input.hts_code
    );

    // 5. 販売価格を逆算
    const suggested_price = this.calculateSuggestedPrice(
      cost_usd,
      shipping_cost,
      tariff_amount,
      settings
    );

    // 6. 実利益を計算
    const revenue = suggested_price;
    const commission_fee = revenue * (settings.commission_rate / 100);
    const payment_fee = revenue * (settings.payment_fee_rate / 100);
    const fixed_fee = settings.fixed_fee;
    const total_cost = cost_usd + shipping_cost + tariff_amount;

    const profit = revenue - total_cost - commission_fee - payment_fee - fixed_fee;
    const profit_margin = (profit / revenue) * 100;

    // 7. 出品可否判定
    let can_list = true;
    let reason = '出品可能';

    if (profit_margin < settings.min_profit_margin) {
      can_list = false;
      reason = `利益率（${profit_margin.toFixed(1)}%）が最低ライン（${settings.min_profit_margin}%）を下回っています`;
    }

    if (suggested_price <= 0) {
      can_list = false;
      reason = '販売価格が0以下です';
    }

    if (Math.abs(profit_margin - settings.target_profit_margin) > 5) {
      warnings.push(
        `目標利益率（${settings.target_profit_margin}%）との差が大きいです: 実利益率 ${profit_margin.toFixed(1)}%`
      );
    }

    console.log(`[UnifiedProfitCalculator] Result: Price=$${suggested_price.toFixed(2)}, Profit=$${profit.toFixed(2)}, Margin=${profit_margin.toFixed(1)}%`);

    return {
      sku: input.sku,
      platform: input.platform,
      cost_jpy: input.cost_jpy,
      cost_usd,
      target_profit_margin: settings.target_profit_margin,
      commission_rate: settings.commission_rate,
      shipping_cost,
      tariff_rate,
      tariff_amount,
      suggested_price,
      revenue,
      commission_fee,
      payment_fee,
      fixed_fee,
      total_cost,
      profit,
      profit_margin,
      can_list,
      reason,
      warnings,
    };
  }

  /**
   * バッチ計算（複数SKU、複数プラットフォーム）
   */
  async calculateBatch(
    inputs: ProfitCalculationInput[]
  ): Promise<ProfitCalculationResult[]> {
    const results: ProfitCalculationResult[] = [];

    for (const input of inputs) {
      const result = await this.calculate(input);
      results.push(result);
    }

    return results;
  }
}
