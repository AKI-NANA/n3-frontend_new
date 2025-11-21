/**
 * DDP関税計算サービス
 *
 * DDP (Delivered Duty Paid) モードで必要となる関税・消費税を計算する
 */

import { createClient } from '@/utils/supabase/server';

/**
 * 関税計算入力
 */
export interface DdpCalculationInput {
  hs_code: string; // HSコード
  country_code: string; // 配送先国コード（'US', 'AU', 'JP', etc.）
  item_cost_usd: number; // 商品原価（USD）
  origin_country?: string; // 原産国（追加関税の判定用）
}

/**
 * 関税計算結果
 */
export interface DdpCalculationResult {
  tariff_rate: number; // 関税率（%）
  tariff_amount: number; // 関税額（USD）
  vat_rate: number; // 消費税率（%）
  vat_amount: number; // 消費税額（USD）
  processing_fee: number; // DDP処理費用（USD）
  total_ddp_cost: number; // 合計DDPコスト（USD）
  breakdown: {
    base_tariff: number; // 基本関税率
    additional_tariff: number; // 追加関税率
    ddp_processing_rate: number; // DDP処理費率（通常8%）
  };
}

/**
 * DDP関税計算サービス
 */
export class DdpCalculator {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabase: ReturnType<typeof createClient>) {
    this.supabase = supabase;
  }

  /**
   * 基本関税率を取得
   */
  private async getBaseTariffRate(hs_code: string): Promise<number> {
    const { data: htsData, error } = await this.supabase
      .from('hts_codes')
      .select('base_rate')
      .eq('code', hs_code)
      .single();

    if (error || !htsData) {
      console.warn(`[DdpCalculator] HTS code ${hs_code} not found, using default rate`);
      return 0.058; // デフォルト5.8%
    }

    return htsData.base_rate;
  }

  /**
   * 追加関税率を取得（原産国ベース）
   */
  private async getAdditionalTariffRate(
    origin_country: string
  ): Promise<number> {
    const { data: additionalData, error } = await this.supabase
      .from('country_additional_tariffs')
      .select('additional_rate')
      .eq('country_code', origin_country)
      .eq('is_active', true)
      .single();

    if (error || !additionalData) {
      return 0; // 追加関税なし
    }

    return additionalData.additional_rate;
  }

  /**
   * 消費税率を取得（国別）
   */
  private getVatRate(country_code: string): number {
    // 国別のVAT率
    const vatRates: Record<string, number> = {
      US: 0.0, // アメリカは消費税なし（州税は別）
      AU: 0.1, // オーストラリアGST 10%
      JP: 0.1, // 日本消費税 10%
      KR: 0.1, // 韓国VAT 10%
      SG: 0.08, // シンガポールGST 8%
      UK: 0.2, // イギリスVAT 20%
      DE: 0.19, // ドイツVAT 19%
    };

    return vatRates[country_code] || 0;
  }

  /**
   * DDP処理費率（通常8%）
   */
  private getDdpProcessingRate(): number {
    return 0.08; // 8%
  }

  /**
   * DDP関税を計算
   */
  async calculate(input: DdpCalculationInput): Promise<DdpCalculationResult> {
    console.log(`[DdpCalculator] Calculating DDP for ${input.hs_code} to ${input.country_code}`);

    // 1. 基本関税率を取得
    const base_tariff = await this.getBaseTariffRate(input.hs_code);

    // 2. 追加関税率を取得（原産国がある場合）
    const additional_tariff = input.origin_country
      ? await this.getAdditionalTariffRate(input.origin_country)
      : 0;

    // 3. DDP処理費率
    const ddp_processing_rate = this.getDdpProcessingRate();

    // 4. 合計関税率
    const total_tariff_rate = base_tariff + additional_tariff;

    // 5. 関税額を計算
    const tariff_amount = input.item_cost_usd * total_tariff_rate;

    // 6. DDP処理費用（関税にかかる8%）
    const processing_fee = input.item_cost_usd * ddp_processing_rate;

    // 7. 消費税率を取得
    const vat_rate = this.getVatRate(input.country_code);

    // 8. 消費税額を計算（商品価格 + 関税に対して）
    const vat_base = input.item_cost_usd + tariff_amount;
    const vat_amount = vat_base * vat_rate;

    // 9. 合計DDPコスト
    const total_ddp_cost = tariff_amount + processing_fee + vat_amount;

    const result: DdpCalculationResult = {
      tariff_rate: total_tariff_rate,
      tariff_amount,
      vat_rate,
      vat_amount,
      processing_fee,
      total_ddp_cost,
      breakdown: {
        base_tariff,
        additional_tariff,
        ddp_processing_rate,
      },
    };

    console.log(
      `[DdpCalculator] Result: Tariff=${(total_tariff_rate * 100).toFixed(1)}%, Total DDP Cost=$${total_ddp_cost.toFixed(2)}`
    );

    return result;
  }
}
