/**
 * リトライキューサービス
 *
 * execution_queue から retry_pending 状態のアイテムを取得し、
 * next_retry_at が現在時刻を過ぎたものを自動的に再実行する
 */

import { createClient } from '@/utils/supabase/server';
import { EbayClient } from '@/lib/api-clients/EbayClient';
import { AmazonSPClient } from '@/lib/api-clients/AmazonSPClient';
import { CoupangClient } from '@/lib/api-clients/CoupangClient';
import type { BaseApiClient } from '@/lib/api-clients/BaseApiClient';
import type {
  ExecutionResult,
  ListingPayload,
  ApiCredentials,
} from '@/types/listing';
import type { Platform } from '@/lib/multichannel/types';

interface RetryQueueItem {
  id: number;
  sku: string;
  platform: Platform;
  account_id: string;
  status: string;
  error_code?: string;
  error_message?: string;
  retry_count: number;
  next_retry_at: string;
  created_at: string;
}

/**
 * リトライキューサービス
 */
export class RetryQueueService {
  private supabase: ReturnType<typeof createClient>;
  private credentials: ApiCredentials;
  private maxRetries: number = 5;

  constructor(supabase: ReturnType<typeof createClient>, maxRetries: number = 5) {
    this.supabase = supabase;
    this.credentials = this.loadCredentials();
    this.maxRetries = maxRetries;
  }

  /**
   * 環境変数から認証情報を読み込み
   */
  private loadCredentials(): ApiCredentials {
    return {
      ebay: {
        appId: process.env.EBAY_APP_ID || '',
        devId: process.env.EBAY_DEV_ID || '',
        certId: process.env.EBAY_CERT_ID || '',
        oauthToken: process.env.EBAY_OAUTH_TOKEN || '',
        siteId: process.env.EBAY_SITE_ID || '0',
      },
      amazon: {
        region: (process.env.AMAZON_REGION as any) || 'us',
        clientId: process.env.AMAZON_CLIENT_ID || '',
        clientSecret: process.env.AMAZON_CLIENT_SECRET || '',
        refreshToken: process.env.AMAZON_REFRESH_TOKEN || '',
        sellerId: process.env.AMAZON_SELLER_ID || '',
        marketplaceId: process.env.AMAZON_MARKETPLACE_ID || '',
      },
      coupang: {
        accessKey: process.env.COUPANG_ACCESS_KEY || '',
        secretKey: process.env.COUPANG_SECRET_KEY || '',
        vendorId: process.env.COUPANG_VENDOR_ID || '',
      },
    };
  }

  /**
   * プラットフォームに応じたAPIクライアントを取得
   */
  private getClient(platform: Platform): BaseApiClient | null {
    switch (platform) {
      case 'ebay':
        return new EbayClient(this.credentials.ebay);
      case 'amazon_us':
      case 'amazon_au':
      case 'amazon_jp':
        return new AmazonSPClient(this.credentials.amazon);
      case 'coupang':
        return new CoupangClient(this.credentials.coupang);
      default:
        console.warn(`[RetryQueue] Unsupported platform: ${platform}`);
        return null;
    }
  }

  /**
   * リトライ可能なキューアイテムを取得
   */
  private async getRetryableItems(): Promise<RetryQueueItem[]> {
    const now = new Date().toISOString();

    const { data: items, error } = await this.supabase
      .from('execution_queue')
      .select('*')
      .eq('status', 'retry_pending')
      .lte('next_retry_at', now)
      .order('next_retry_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('[RetryQueue] Failed to get retryable items:', error);
      return [];
    }

    return (items || []) as RetryQueueItem[];
  }

  /**
   * SKUのデータを取得してペイロードを構築
   */
  private async buildPayload(
    sku: string,
    platform: Platform
  ): Promise<ListingPayload | null> {
    try {
      // 商品マスタから基本情報を取得
      const { data: product, error: productError } = await this.supabase
        .from('products_master')
        .select('title, condition, stock_quantity')
        .eq('sku', sku)
        .single();

      if (productError || !product) {
        console.error(`[RetryQueue] Product not found: ${sku}`, productError);
        return null;
      }

      // 出品データを取得
      const { data: listingData, error: listingError } = await this.supabase
        .from('listing_data')
        .select('title, description, item_specifics, image_urls, category_id')
        .eq('sku', sku)
        .eq('platform', platform)
        .single();

      if (listingError || !listingData) {
        console.error(`[RetryQueue] Listing data not found: ${sku}`, listingError);
        return null;
      }

      // 価格データを取得
      const { data: priceData, error: priceError } = await this.supabase
        .from('price_logs')
        .select('price_jpy, currency')
        .eq('sku', sku)
        .order('changed_at', { ascending: false })
        .limit(1)
        .single();

      if (priceError || !priceData) {
        console.error(`[RetryQueue] Price data not found: ${sku}`, priceError);
        return null;
      }

      return {
        sku,
        title: listingData.title || product.title || '',
        description: listingData.description || '',
        price: priceData.price_jpy || 0,
        currency: priceData.currency || 'JPY',
        quantity: product.stock_quantity || 0,
        condition: product.condition || 'New',
        categoryId: listingData.category_id,
        images: listingData.image_urls || [],
        itemSpecifics: listingData.item_specifics || [],
      };
    } catch (error) {
      console.error(`[RetryQueue] Error building payload for ${sku}:`, error);
      return null;
    }
  }

  /**
   * リトライ実行
   */
  private async retryListing(
    item: RetryQueueItem
  ): Promise<ExecutionResult> {
    const { sku, platform, account_id } = item;

    console.log(
      `[RetryQueue] Retrying SKU=${sku}, Platform=${platform}, Attempt=${item.retry_count + 1}`
    );

    try {
      // APIクライアントを取得
      const client = this.getClient(platform);
      if (!client) {
        return {
          sku,
          platform,
          accountId: account_id,
          success: false,
          errorType: 'fatal',
          errorCode: 'UNSUPPORTED_PLATFORM',
          errorMessage: `Platform ${platform} is not supported`,
          timestamp: new Date(),
        };
      }

      // ペイロードを構築
      const payload = await this.buildPayload(sku, platform);
      if (!payload) {
        return {
          sku,
          platform,
          accountId: account_id,
          success: false,
          errorType: 'fatal',
          errorCode: 'PAYLOAD_BUILD_FAILED',
          errorMessage: 'Failed to build listing payload',
          timestamp: new Date(),
        };
      }

      // 在庫・価格の事前チェック
      if (payload.quantity < 1) {
        return {
          sku,
          platform,
          accountId: account_id,
          success: false,
          errorType: 'fatal',
          errorCode: 'NO_STOCK',
          errorMessage: '在庫数が0です',
          timestamp: new Date(),
        };
      }

      if (payload.price <= 0) {
        return {
          sku,
          platform,
          accountId: account_id,
          success: false,
          errorType: 'fatal',
          errorCode: 'INVALID_PRICE',
          errorMessage: '価格が無効です',
          timestamp: new Date(),
        };
      }

      // 事前検証（eBayのみ）
      if (platform === 'ebay') {
        const verifyResult = await client.verifyListing(payload);
        if (!verifyResult.success) {
          return {
            sku,
            platform,
            accountId: account_id,
            success: false,
            errorType: verifyResult.error?.type,
            errorCode: verifyResult.error?.code,
            errorMessage: verifyResult.error?.message,
            timestamp: new Date(),
          };
        }
      }

      // 出品実行
      const addResult = await client.addListing(payload);

      if (addResult.success) {
        console.log(
          `[RetryQueue] Retry success for SKU=${sku}, ListingID=${addResult.data}`
        );
        return {
          sku,
          platform,
          accountId: account_id,
          success: true,
          listingId: addResult.data,
          timestamp: new Date(),
        };
      } else {
        console.error(`[RetryQueue] Retry failed for SKU=${sku}:`, addResult.error);
        return {
          sku,
          platform,
          accountId: account_id,
          success: false,
          errorType: addResult.error?.type,
          errorCode: addResult.error?.code,
          errorMessage: addResult.error?.message,
          timestamp: new Date(),
        };
      }
    } catch (error) {
      console.error(`[RetryQueue] Exception for SKU=${sku}:`, error);
      return {
        sku,
        platform,
        accountId: account_id,
        success: false,
        errorType: 'temporary',
        errorCode: 'EXCEPTION',
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  /**
   * リトライ成功時の処理
   */
  private async handleRetrySuccess(
    item: RetryQueueItem,
    result: ExecutionResult
  ): Promise<void> {
    const { sku, platform, account_id } = item;
    const { listingId } = result;

    console.log(`[RetryQueue] Handling retry success for SKU=${sku}`);

    try {
      // ステータスを「出品中」に更新
      await this.supabase
        .from('products_master')
        .update({ execution_status: 'listed' })
        .eq('sku', sku);

      // listing_idを記録
      await this.supabase
        .from('listing_data')
        .update({
          listing_id: listingId,
          status: 'Active',
          listed_at: new Date().toISOString(),
        })
        .eq('sku', sku)
        .eq('platform', platform)
        .eq('account_id', account_id);

      // 在庫引当ログを記録
      await this.supabase.from('stock_logs').insert({
        sku,
        supplier_id: null,
        quantity_change: -1,
        new_quantity: 0,
        reason: `SKU: ${sku} が ${platform} に 1個引当済み（リトライ成功）`,
        changed_at: new Date().toISOString(),
      });

      // 在庫同期キューに追加
      await this.supabase.from('inventory_sync_queue').insert({
        sku,
        trigger_platform: platform,
        trigger_listing_id: listingId,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      // リトライキューアイテムを完了に更新
      await this.supabase
        .from('execution_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      // 成功ログを記録
      await this.supabase.from('execution_logs').insert({
        sku,
        platform,
        account_id,
        success: true,
        retry_count: item.retry_count + 1,
        executed_at: new Date().toISOString(),
      });

      console.log(`[RetryQueue] Retry success handling complete for SKU=${sku}`);
    } catch (error) {
      console.error(`[RetryQueue] Error handling retry success for SKU=${sku}:`, error);
    }
  }

  /**
   * リトライ失敗時の処理
   */
  private async handleRetryFailure(
    item: RetryQueueItem,
    result: ExecutionResult
  ): Promise<void> {
    const { sku, platform, account_id } = item;
    const { errorType, errorCode, errorMessage } = result;

    const newRetryCount = item.retry_count + 1;

    console.log(
      `[RetryQueue] Handling retry failure for SKU=${sku}, Attempt=${newRetryCount}, ErrorType=${errorType}`
    );

    try {
      if (errorType === 'temporary' && newRetryCount < this.maxRetries) {
        // まだリトライ可能：次回リトライ時刻を設定
        const delayMinutes = Math.pow(2, newRetryCount) * 5; // 指数バックオフ: 5分, 10分, 20分, 40分, 80分
        const nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);

        await this.supabase
          .from('execution_queue')
          .update({
            retry_count: newRetryCount,
            next_retry_at: nextRetryAt.toISOString(),
            error_code: errorCode,
            error_message: errorMessage,
          })
          .eq('id', item.id);

        console.log(
          `[RetryQueue] Scheduled next retry for SKU=${sku} at ${nextRetryAt.toISOString()}`
        );
      } else {
        // 最大リトライ回数に達したか、致命的エラー
        await this.supabase
          .from('products_master')
          .update({ execution_status: 'listing_failed' })
          .eq('sku', sku);

        await this.supabase
          .from('listing_data')
          .update({
            status: 'Error',
            error_message: errorMessage,
          })
          .eq('sku', sku)
          .eq('platform', platform)
          .eq('account_id', account_id);

        await this.supabase
          .from('execution_queue')
          .update({
            status: 'failed',
            retry_count: newRetryCount,
            error_code: errorCode,
            error_message: errorMessage,
            completed_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        console.log(
          `[RetryQueue] Marked as failed after ${newRetryCount} attempts: SKU=${sku}`
        );
      }

      // エラーログを記録
      await this.supabase.from('execution_logs').insert({
        sku,
        platform,
        account_id,
        success: false,
        error_type: errorType,
        error_code: errorCode,
        error_message: errorMessage,
        retry_count: newRetryCount,
        executed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`[RetryQueue] Error handling retry failure for SKU=${sku}:`, error);
    }
  }

  /**
   * メイン実行メソッド
   */
  async execute(): Promise<{
    totalProcessed: number;
    successCount: number;
    failureCount: number;
  }> {
    console.log('[RetryQueue] Starting retry queue processing');

    // リトライ可能なアイテムを取得
    const items = await this.getRetryableItems();

    if (items.length === 0) {
      console.log('[RetryQueue] No items to retry');
      return { totalProcessed: 0, successCount: 0, failureCount: 0 };
    }

    console.log(`[RetryQueue] Found ${items.length} items to retry`);

    let successCount = 0;
    let failureCount = 0;

    // 各アイテムを順次処理
    for (const item of items) {
      const result = await this.retryListing(item);

      if (result.success) {
        await this.handleRetrySuccess(item, result);
        successCount++;
      } else {
        await this.handleRetryFailure(item, result);
        failureCount++;
      }
    }

    console.log(
      `[RetryQueue] Processing complete: ${successCount} success, ${failureCount} failed`
    );

    return {
      totalProcessed: items.length,
      successCount,
      failureCount,
    };
  }
}
