/**
 * 在庫同期サービス (B-3)
 *
 * 出品成功時に記録された inventory_sync_queue を定期的に処理し、
 * トリガー元の在庫数に基づき、他の全モールに対し在庫数を自動調整する
 */

import { createClient } from '@/utils/supabase/server';
import { EbayClient } from '@/lib/api-clients/EbayClient';
import { AmazonSPClient } from '@/lib/api-clients/AmazonSPClient';
import { CoupangClient } from '@/lib/api-clients/CoupangClient';
import type { BaseApiClient } from '@/lib/api-clients/BaseApiClient';
import type { ApiCredentials } from '@/types/listing';
import type { Platform } from '@/lib/multichannel/types';

interface SyncQueueItem {
  id: number;
  sku: string;
  trigger_platform: Platform;
  trigger_listing_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

interface ListingToSync {
  sku: string;
  platform: Platform;
  account_id: string;
  listing_id: string;
  current_quantity: number;
}

export class InventorySyncService {
  private supabase: ReturnType<typeof createClient>;
  private credentials: ApiCredentials;

  constructor(supabase: ReturnType<typeof createClient>) {
    this.supabase = supabase;
    this.credentials = this.loadCredentials();
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
        console.warn(`[InventorySync] Unsupported platform: ${platform}`);
        return null;
    }
  }

  /**
   * 合計在庫数を計算
   */
  private async calculateTotalStock(sku: string): Promise<number> {
    // 自社有在庫を取得
    const { data: masterData } = await this.supabase
      .from('products_master')
      .select('stock_quantity')
      .eq('sku', sku)
      .single();

    const ownStock = masterData?.stock_quantity || 0;

    // 無在庫仕入れ先の在庫を優先度順に取得
    const { data: suppliers } = await this.supabase
      .from('supplier_stocks')
      .select('stock_quantity, priority, is_active')
      .eq('sku', sku)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    const supplierStock =
      suppliers?.reduce(
        (sum: number, s: any) => sum + (s.stock_quantity || 0),
        0
      ) || 0;

    return ownStock + supplierStock;
  }

  /**
   * 同期対象のリスティングを取得
   */
  private async getListingsToSync(
    sku: string,
    triggerPlatform: Platform
  ): Promise<ListingToSync[]> {
    // トリガー元以外の全てのアクティブなリスティングを取得
    const { data: listings, error } = await this.supabase
      .from('listing_data')
      .select('sku, platform, account_id, listing_id, quantity')
      .eq('sku', sku)
      .eq('status', 'Active')
      .neq('platform', triggerPlatform);

    if (error) {
      console.error('[InventorySync] Failed to get listings:', error);
      return [];
    }

    if (!listings || listings.length === 0) {
      console.log(`[InventorySync] No other active listings for SKU=${sku}`);
      return [];
    }

    return listings.map((l: any) => ({
      sku: l.sku,
      platform: l.platform,
      account_id: l.account_id,
      listing_id: l.listing_id,
      current_quantity: l.quantity || 0,
    }));
  }

  /**
   * リスティングの在庫数を更新
   */
  private async updateListingQuantity(
    listing: ListingToSync,
    newQuantity: number
  ): Promise<{ success: boolean; error?: string }> {
    console.log(
      `[InventorySync] Updating ${listing.platform} listing ${listing.listing_id}: ${listing.current_quantity} -> ${newQuantity}`
    );

    try {
      const client = this.getClient(listing.platform);
      if (!client) {
        return { success: false, error: 'Unsupported platform' };
      }

      // APIで在庫数を更新
      const result = await client.updateQuantity(
        listing.listing_id,
        newQuantity
      );

      if (result.success) {
        // DBの在庫数も更新
        await this.supabase
          .from('listing_data')
          .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
          .eq('sku', listing.sku)
          .eq('platform', listing.platform)
          .eq('account_id', listing.account_id);

        // 在庫変動ログを記録
        await this.supabase.from('stock_logs').insert({
          sku: listing.sku,
          supplier_id: null,
          quantity_change: newQuantity - listing.current_quantity,
          new_quantity: newQuantity,
          reason: `在庫同期: ${listing.platform} の在庫を ${listing.current_quantity} から ${newQuantity} に調整`,
          changed_at: new Date().toISOString(),
        });

        return { success: true };
      } else {
        return {
          success: false,
          error: result.error?.message || 'Update failed',
        };
      }
    } catch (error) {
      console.error(
        `[InventorySync] Exception updating ${listing.platform}:`,
        error
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 1件の同期キューアイテムを処理
   */
  private async processSyncItem(item: SyncQueueItem): Promise<boolean> {
    console.log(`[InventorySync] Processing queue item ${item.id} for SKU=${item.sku}`);

    try {
      // ステータスを処理中に更新
      await this.supabase
        .from('inventory_sync_queue')
        .update({ status: 'processing' })
        .eq('id', item.id);

      // 合計在庫数を計算
      const totalStock = await this.calculateTotalStock(item.sku);

      // トリガー元プラットフォームで出品済みの数を引く（通常は1）
      const availableStock = Math.max(0, totalStock - 1);

      console.log(
        `[InventorySync] SKU=${item.sku}: Total=${totalStock}, Available for sync=${availableStock}`
      );

      // 同期対象のリスティングを取得
      const listingsToSync = await this.getListingsToSync(
        item.sku,
        item.trigger_platform
      );

      if (listingsToSync.length === 0) {
        console.log(`[InventorySync] No listings to sync for SKU=${item.sku}`);
        await this.supabase
          .from('inventory_sync_queue')
          .update({ status: 'completed' })
          .eq('id', item.id);
        return true;
      }

      // 各リスティングの在庫数を更新
      let successCount = 0;
      let failureCount = 0;

      for (const listing of listingsToSync) {
        const result = await this.updateListingQuantity(
          listing,
          availableStock
        );

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
          console.error(
            `[InventorySync] Failed to update ${listing.platform}: ${result.error}`
          );
        }
      }

      console.log(
        `[InventorySync] Sync complete for SKU=${item.sku}: ${successCount} success, ${failureCount} failed`
      );

      // ステータスを完了に更新
      await this.supabase
        .from('inventory_sync_queue')
        .update({
          status: failureCount === 0 ? 'completed' : 'failed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      return failureCount === 0;
    } catch (error) {
      console.error(`[InventorySync] Error processing item ${item.id}:`, error);

      // ステータスを失敗に更新
      await this.supabase
        .from('inventory_sync_queue')
        .update({ status: 'failed' })
        .eq('id', item.id);

      return false;
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
    console.log('[InventorySync] Starting inventory sync batch');

    // pending状態のキューアイテムを取得
    const { data: queueItems, error } = await this.supabase
      .from('inventory_sync_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('[InventorySync] Failed to get queue items:', error);
      return { totalProcessed: 0, successCount: 0, failureCount: 0 };
    }

    if (!queueItems || queueItems.length === 0) {
      console.log('[InventorySync] No items in queue');
      return { totalProcessed: 0, successCount: 0, failureCount: 0 };
    }

    console.log(`[InventorySync] Found ${queueItems.length} items to process`);

    let successCount = 0;
    let failureCount = 0;

    // 各アイテムを順次処理
    for (const item of queueItems as SyncQueueItem[]) {
      const success = await this.processSyncItem(item);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    console.log(
      `[InventorySync] Batch complete: ${successCount} success, ${failureCount} failed`
    );

    return {
      totalProcessed: queueItems.length,
      successCount,
      failureCount,
    };
  }
}
