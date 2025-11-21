/**
 * Publisher Hub（出品実行制御モジュール）
 *
 * Phase 1-3: 多モール変換機能の実行制御
 *
 * execution_status = 'strategy_determined' または 'approved' のSKUを取得し、
 * 対応するマッパーを呼び出して出品を実行する
 */

import { createClient } from '@/utils/supabase/server';
import { MapperFactory } from '@/lib/mappers/MapperFactory';
import { PriceCalculator } from './PriceCalculator';
import type { SKUMasterData } from '@/lib/mappers/BaseMapper';
import type { Platform } from '@/lib/multichannel/types';
import type {
  PriceCalculationData,
  MarketplaceSettings,
} from './PriceCalculator';

/**
 * 出品結果
 */
export interface PublishResult {
  sku: string;
  platform: Platform;
  success: boolean;
  listing_id?: string;
  payload?: any; // マッピング結果のペイロード
  error_message?: string;
  warnings: string[];
}

/**
 * Publisher Hub
 */
export class PublisherHub {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabase: ReturnType<typeof createClient>) {
    this.supabase = supabase;
  }

  /**
   * 戦略決定済みのSKUを取得
   */
  private async getStrategyDeterminedSkus(
    status: 'strategy_determined' | 'approved' = 'strategy_determined'
  ): Promise<string[]> {
    const { data: products, error } = await this.supabase
      .from('products_master')
      .select('sku')
      .eq('execution_status', status)
      .gte('stock_quantity', 1);

    if (error) {
      console.error('[PublisherHub] Failed to get strategy determined SKUs:', error);
      return [];
    }

    return (products || []).map((p) => p.sku);
  }

  /**
   * 推奨プラットフォームを取得
   */
  private async getRecommendedPlatform(sku: string): Promise<{
    platform: Platform | null;
    account_id: string | null;
  }> {
    const { data: decision, error } = await this.supabase
      .from('strategy_decisions')
      .select('recommended_platform, recommended_account_id')
      .eq('sku', sku)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !decision) {
      console.warn(`[PublisherHub] No strategy decision found for SKU: ${sku}`);
      return { platform: null, account_id: null };
    }

    return {
      platform: decision.recommended_platform,
      account_id: decision.recommended_account_id,
    };
  }

  /**
   * SKUマスターデータを取得
   */
  private async getSKUMasterData(sku: string): Promise<SKUMasterData | null> {
    const { data: product, error } = await this.supabase
      .from('products_master')
      .select('*')
      .eq('sku', sku)
      .single();

    if (error || !product) {
      console.error(`[PublisherHub] Product not found: ${sku}`, error);
      return null;
    }

    // marketplace_listingsから出品データを取得
    const { data: listing } = await this.supabase
      .from('marketplace_listings')
      .select('*')
      .eq('sku', sku)
      .single();

    const masterData: SKUMasterData = {
      sku: product.sku,
      title: listing?.title || product.title || '',
      description: listing?.description || '',
      category: product.category || '',
      condition: product.condition || 'New',
      item_cost: product.price_jpy || 0,
      stock_quantity: product.stock_quantity || 0,
      brand: product.brand,
      model: product.model,
      weight_g: product.weight_g,
      image_urls: listing?.image_urls || [],
      hs_code: product.hts_code,
      origin_country: product.origin_country,
      item_specifics: listing?.item_specifics,
      variations: listing?.variations,
    };

    return masterData;
  }

  /**
   * 価格を計算してSKUマスターデータに追加
   */
  private async calculatePrice(
    masterData: SKUMasterData,
    platform: Platform,
    account_id: string | null
  ): Promise<number> {
    const priceCalculator = new PriceCalculator(this.supabase);

    // マーケットプレイス設定を取得
    let query = this.supabase
      .from('marketplace_settings')
      .select('*')
      .eq('platform', platform)
      .eq('is_active', true);

    if (account_id) {
      query = query.eq('account_id', account_id);
    }

    const { data: settings } = await query.single();

    if (!settings) {
      console.warn(
        `[PublisherHub] No marketplace settings found for ${platform}`
      );
      return 0;
    }

    const data: PriceCalculationData = {
      item_cost: masterData.item_cost,
      shipping_cost_base: 2000, // TODO: 送料ルールから取得
      target_profit_rate: 0.15,
      hs_code: masterData.hs_code,
      origin_country: masterData.origin_country,
      weight_g: masterData.weight_g,
    };

    const marketplaceSettings: MarketplaceSettings = {
      platform: settings.platform,
      account_id: settings.account_id,
      country_code: settings.country_code || 'US',
      fee_rate: settings.commission_rate / 100,
      payment_fee_rate: settings.payment_fee_rate / 100,
      fixed_fee: settings.fixed_fee,
      currency: 'USD',
    };

    // DDP要否判定（eBay USのみDDP）
    const isDdpRequired = platform === 'ebay' && settings.country_code === 'US';

    const result = await priceCalculator.calculateFinalPrice(
      data,
      marketplaceSettings,
      isDdpRequired
    );

    return result.final_price_usd;
  }

  /**
   * 単一SKUの出品を実行
   */
  async publishSku(sku: string): Promise<PublishResult> {
    console.log(`[PublisherHub] Publishing SKU: ${sku}`);

    try {
      // 1. 推奨プラットフォームを取得
      const { platform, account_id } = await this.getRecommendedPlatform(sku);

      if (!platform) {
        return {
          sku,
          platform: 'ebay', // placeholder
          success: false,
          error_message: '推奨プラットフォームが見つかりません',
          warnings: [],
        };
      }

      // 2. SKUマスターデータを取得
      const masterData = await this.getSKUMasterData(sku);

      if (!masterData) {
        return {
          sku,
          platform,
          success: false,
          error_message: 'SKUマスターデータが見つかりません',
          warnings: [],
        };
      }

      // 3. 価格を計算
      const final_price_usd = await this.calculatePrice(
        masterData,
        platform,
        account_id
      );

      masterData.final_price_usd = final_price_usd;

      // 4. マッパーを取得
      const mapper = MapperFactory.getMapper(platform);

      if (!mapper) {
        // eBay、Amazon等は既存のListingExecutorで処理
        console.log(
          `[PublisherHub] Platform ${platform} is handled by existing ListingExecutor`
        );
        return {
          sku,
          platform,
          success: true,
          warnings: [
            `プラットフォーム ${platform} は既存のListingExecutorで処理されます`,
          ],
        };
      }

      // 5. データ変換
      const mappingResult = await mapper.map(masterData);

      if (!mappingResult.success) {
        return {
          sku,
          platform,
          success: false,
          error_message: mappingResult.errors.join(', '),
          warnings: mappingResult.warnings,
        };
      }

      // 6. APIへの出品実行（TODO: 実際のAPI呼び出し）
      // 現時点ではペイロードを返すのみ
      console.log(`[PublisherHub] Mapping successful for SKU ${sku}:`, mappingResult.payload);

      // 7. marketplace_listingsを更新
      await this.supabase
        .from('marketplace_listings')
        .update({
          price: final_price_usd,
          status: 'active', // TODO: 実際のAPI呼び出し後に更新
          updated_at: new Date().toISOString(),
        })
        .eq('sku', sku)
        .eq('platform', platform);

      // 8. products_masterのステータスを更新
      await this.supabase
        .from('products_master')
        .update({ execution_status: 'listed' })
        .eq('sku', sku);

      return {
        sku,
        platform,
        success: true,
        payload: mappingResult.payload,
        warnings: mappingResult.warnings,
      };
    } catch (error) {
      console.error(`[PublisherHub] Failed to publish SKU ${sku}:`, error);
      return {
        sku,
        platform: 'ebay', // placeholder
        success: false,
        error_message: error instanceof Error ? error.message : String(error),
        warnings: [],
      };
    }
  }

  /**
   * バッチ出品実行
   */
  async publishBatch(
    status: 'strategy_determined' | 'approved' = 'strategy_determined'
  ): Promise<PublishResult[]> {
    console.log(`[PublisherHub] Starting batch publish for status: ${status}`);

    // 戦略決定済みのSKUを取得
    const skus = await this.getStrategyDeterminedSkus(status);

    if (skus.length === 0) {
      console.log('[PublisherHub] No SKUs to publish');
      return [];
    }

    console.log(`[PublisherHub] Found ${skus.length} SKUs to publish`);

    const results: PublishResult[] = [];

    for (const sku of skus) {
      const result = await this.publishSku(sku);
      results.push(result);
    }

    console.log(`[PublisherHub] Batch publish complete: ${results.length} processed`);

    return results;
  }
}
