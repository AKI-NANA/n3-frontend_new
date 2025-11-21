/**
 * 出品実行サービス (ListingExecutor)
 *
 * 戦略エンジンが決定した推奨出品先に対し、各モールのAPIを介して
 * 安全かつ確実に出品を実行する「実行エンジン」
 */

import { createClient } from '@/utils/supabase/server';
import { EbayClient } from '@/lib/api-clients/EbayClient';
import { AmazonSPClient } from '@/lib/api-clients/AmazonSPClient';
import { CoupangClient } from '@/lib/api-clients/CoupangClient';
import type { BaseApiClient } from '@/lib/api-clients/BaseApiClient';
import type {
  ExecutionResult,
  ExecutionStatus,
  ListingPayload,
  ApiCredentials,
} from '@/types/listing';
import type { Platform } from '@/lib/multichannel/types';

/**
 * 出品実行候補
 */
interface ExecutionCandidate {
  sku: string;
  productId: number;
  platform: Platform;
  accountId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  quantity: number;
  condition: 'New' | 'Used' | 'Refurbished';
  categoryId?: string;
  images: string[];
  itemSpecifics?: any[];
}

/**
 * 出品実行サービス
 */
export class ListingExecutor {
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
        console.warn(`[ListingExecutor] Unsupported platform: ${platform}`);
        return null;
    }
  }

  /**
   * 1. 実行対象の選定（承認ロジックとの連携）
   */
  async selectCandidates(
    status: ExecutionStatus = 'strategy_determined',
    minStock: number = 1
  ): Promise<ExecutionCandidate[]> {
    console.log('[ListingExecutor] Selecting candidates...', { status, minStock });

    try {
      // DBから戦略決定済みSKUを抽出
      const { data: products, error } = await this.supabase
        .from('products_master')
        .select('id, sku, title, category, condition, price_jpy, stock_quantity')
        .eq('execution_status', status)
        .gte('stock_quantity', minStock);

      if (error) {
        console.error('[ListingExecutor] Failed to select candidates:', error);
        return [];
      }

      if (!products || products.length === 0) {
        console.log('[ListingExecutor] No candidates found');
        return [];
      }

      // 各SKUの推奨プラットフォームと出品データを取得
      const candidates: ExecutionCandidate[] = [];

      for (const product of products) {
        // 戦略決定ログから推奨先を取得
        const { data: strategy } = await this.supabase
          .from('strategy_decisions')
          .select('recommended_platform, recommended_account_id')
          .eq('sku', product.sku)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!strategy || !strategy.recommended_platform) {
          console.warn(`[ListingExecutor] No strategy found for SKU: ${product.sku}`);
          continue;
        }

        // 出品データ（第3層）を取得
        const { data: listingData } = await this.supabase
          .from('listing_data')
          .select('title, description, item_specifics, image_urls, category_id')
          .eq('sku', product.sku)
          .eq('platform', strategy.recommended_platform)
          .single();

        // 価格データ（第4層）を取得
        const { data: priceData } = await this.supabase
          .from('price_logs')
          .select('price_jpy, currency')
          .eq('sku', product.sku)
          .order('changed_at', { ascending: false })
          .limit(1)
          .single();

        candidates.push({
          sku: product.sku,
          productId: product.id,
          platform: strategy.recommended_platform,
          accountId: strategy.recommended_account_id || 'default',
          title: listingData?.title || product.title || '',
          description: listingData?.description || '',
          price: priceData?.price_jpy || product.price_jpy || 0,
          currency: priceData?.currency || 'JPY',
          quantity: product.stock_quantity || 0,
          condition: product.condition || 'New',
          categoryId: listingData?.category_id,
          images: listingData?.image_urls || [],
          itemSpecifics: listingData?.item_specifics || [],
        });
      }

      console.log(`[ListingExecutor] ${candidates.length} candidates selected`);
      return candidates;
    } catch (error) {
      console.error('[ListingExecutor] Error selecting candidates:', error);
      return [];
    }
  }

  /**
   * 2. 実行前チェック
   */
  private async preExecutionCheck(
    candidate: ExecutionCandidate
  ): Promise<{ passed: boolean; reason?: string }> {
    // 在庫確認
    if (candidate.quantity < 1) {
      return { passed: false, reason: '在庫数が0です' };
    }

    // 価格確認
    if (candidate.price <= 0 || isNaN(candidate.price)) {
      return { passed: false, reason: '価格が無効です' };
    }

    // 画像確認
    if (candidate.images.length === 0) {
      return { passed: false, reason: '画像がありません' };
    }

    // タイトル確認
    if (!candidate.title || candidate.title.length === 0) {
      return { passed: false, reason: 'タイトルが空です' };
    }

    // 排他制御：同じSKUが既に出品処理中でないか確認
    const { data: inProgress } = await this.supabase
      .from('execution_queue')
      .select('*')
      .eq('sku', candidate.sku)
      .eq('status', 'processing');

    if (inProgress && inProgress.length > 0) {
      return { passed: false, reason: '既に出品処理中です' };
    }

    return { passed: true };
  }

  /**
   * 3. 出品実行とエラーハンドリング
   */
  private async executeListing(
    candidate: ExecutionCandidate
  ): Promise<ExecutionResult> {
    const { sku, platform, accountId } = candidate;

    console.log(`[ListingExecutor] Executing listing for SKU=${sku}, Platform=${platform}`);

    try {
      // APIクライアントを取得
      const client = this.getClient(platform);
      if (!client) {
        return {
          sku,
          platform,
          accountId,
          success: false,
          errorType: 'fatal',
          errorCode: 'UNSUPPORTED_PLATFORM',
          errorMessage: `Platform ${platform} is not supported`,
          timestamp: new Date(),
        };
      }

      // ペイロードを構築
      const payload: ListingPayload = {
        sku: candidate.sku,
        title: candidate.title,
        description: candidate.description,
        price: candidate.price,
        currency: candidate.currency,
        quantity: candidate.quantity,
        condition: candidate.condition,
        categoryId: candidate.categoryId,
        images: candidate.images,
        itemSpecifics: candidate.itemSpecifics,
      };

      // 事前検証（eBayのみ）
      if (platform === 'ebay') {
        console.log(`[ListingExecutor] Verifying listing for SKU=${sku}`);
        const verifyResult = await client.verifyListing(payload);

        if (!verifyResult.success) {
          console.error(`[ListingExecutor] Verification failed for SKU=${sku}:`, verifyResult.error);
          return {
            sku,
            platform,
            accountId,
            success: false,
            errorType: verifyResult.error?.type,
            errorCode: verifyResult.error?.code,
            errorMessage: verifyResult.error?.message,
            timestamp: new Date(),
          };
        }
      }

      // 出品実行
      console.log(`[ListingExecutor] Adding listing for SKU=${sku}`);
      const addResult = await client.addListing(payload);

      if (addResult.success) {
        console.log(`[ListingExecutor] Listing success for SKU=${sku}, ListingID=${addResult.data}`);
        return {
          sku,
          platform,
          accountId,
          success: true,
          listingId: addResult.data,
          timestamp: new Date(),
        };
      } else {
        console.error(`[ListingExecutor] Listing failed for SKU=${sku}:`, addResult.error);
        return {
          sku,
          platform,
          accountId,
          success: false,
          errorType: addResult.error?.type,
          errorCode: addResult.error?.code,
          errorMessage: addResult.error?.message,
          timestamp: new Date(),
        };
      }
    } catch (error) {
      console.error(`[ListingExecutor] Exception for SKU=${sku}:`, error);
      return {
        sku,
        platform,
        accountId,
        success: false,
        errorType: 'temporary',
        errorCode: 'EXCEPTION',
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  /**
   * 4. 成功時の処理（在庫とステータスの更新）
   */
  private async handleSuccess(result: ExecutionResult): Promise<void> {
    const { sku, platform, accountId, listingId } = result;

    console.log(`[ListingExecutor] Handling success for SKU=${sku}`);

    try {
      // トランザクション開始
      // ⚠️ Supabaseはネイティブなトランザクションをサポートしていないため、
      // 個別に更新を実行（本番環境ではPostgreSQL関数を使用することを推奨）

      // 1. ステータスを「出品中」に更新
      await this.supabase
        .from('products_master')
        .update({ execution_status: 'listed' })
        .eq('sku', sku);

      // 2. listing_idを記録
      await this.supabase
        .from('listing_data')
        .update({
          listing_id: listingId,
          status: 'Active',
          listed_at: new Date().toISOString(),
        })
        .eq('sku', sku)
        .eq('platform', platform)
        .eq('account_id', accountId);

      // 3. 在庫引当ログを記録
      await this.supabase.from('stock_logs').insert({
        sku,
        supplier_id: null,
        quantity_change: -1,
        new_quantity: 0, // TODO: 実際の新在庫数を計算
        reason: `SKU: ${sku} が ${platform} に 1個引当済み`,
        changed_at: new Date().toISOString(),
      });

      // 4. 在庫連動ロジック（B-3）に通知
      // TODO: 他の全てのモールへの在庫追従（在庫数調整）を開始
      await this.notifyInventorySync(sku, platform, listingId!);

      console.log(`[ListingExecutor] Success handling complete for SKU=${sku}`);
    } catch (error) {
      console.error(`[ListingExecutor] Error handling success for SKU=${sku}:`, error);
    }
  }

  /**
   * 5. 失敗時の処理
   */
  private async handleFailure(result: ExecutionResult): Promise<void> {
    const { sku, platform, accountId, errorType, errorCode, errorMessage } = result;

    console.log(`[ListingExecutor] Handling failure for SKU=${sku}, ErrorType=${errorType}`);

    try {
      if (errorType === 'temporary') {
        // 一時的エラー：リトライキューに追加
        await this.supabase
          .from('products_master')
          .update({ execution_status: 'api_retry_pending' })
          .eq('sku', sku);

        await this.supabase.from('execution_queue').insert({
          sku,
          platform,
          account_id: accountId,
          status: 'retry_pending',
          error_code: errorCode,
          error_message: errorMessage,
          retry_count: 0,
          next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5分後
          created_at: new Date().toISOString(),
        });

        console.log(`[ListingExecutor] Added to retry queue: SKU=${sku}`);
      } else {
        // 致命的エラー：出品停止（要確認）
        await this.supabase
          .from('products_master')
          .update({ execution_status: 'listing_failed' })
          .eq('sku', sku);

        // ダッシュボードでアラート表示用のフラグを設定
        await this.supabase.from('listing_data').update({
          status: 'Error',
          error_message: errorMessage,
        }).eq('sku', sku).eq('platform', platform).eq('account_id', accountId);

        console.log(`[ListingExecutor] Marked as failed: SKU=${sku}`);
      }

      // エラーログを記録
      await this.supabase.from('execution_logs').insert({
        sku,
        platform,
        account_id: accountId,
        success: false,
        error_type: errorType,
        error_code: errorCode,
        error_message: errorMessage,
        executed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`[ListingExecutor] Error handling failure for SKU=${sku}:`, error);
    }
  }

  /**
   * 在庫連動ロジックに通知
   */
  private async notifyInventorySync(
    sku: string,
    platform: Platform,
    listingId: string
  ): Promise<void> {
    console.log(`[ListingExecutor] Notifying inventory sync for SKU=${sku}`);

    // TODO: B-3在庫連動ロジックとの統合
    // - 他の全てのモールの在庫数を調整
    // - 例: eBayで出品した場合、Amazon/Coupangの在庫数を-1する

    // 仮実装: inventory_sync_queueに追加
    await this.supabase.from('inventory_sync_queue').insert({
      sku,
      trigger_platform: platform,
      trigger_listing_id: listingId,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
  }

  /**
   * メイン実行メソッド
   */
  async execute(
    status: ExecutionStatus = 'strategy_determined',
    minStock: number = 1
  ): Promise<ExecutionResult[]> {
    console.log('[ListingExecutor] Starting execution batch');

    // 1. 実行対象を選定
    const candidates = await this.selectCandidates(status, minStock);

    if (candidates.length === 0) {
      console.log('[ListingExecutor] No candidates to execute');
      return [];
    }

    const results: ExecutionResult[] = [];

    // 2. 各候補を順次実行
    for (const candidate of candidates) {
      // 実行前チェック
      const checkResult = await this.preExecutionCheck(candidate);

      if (!checkResult.passed) {
        console.warn(`[ListingExecutor] Pre-execution check failed for SKU=${candidate.sku}: ${checkResult.reason}`);
        results.push({
          sku: candidate.sku,
          platform: candidate.platform,
          accountId: candidate.accountId,
          success: false,
          errorType: 'fatal',
          errorCode: 'PRE_CHECK_FAILED',
          errorMessage: checkResult.reason,
          timestamp: new Date(),
        });
        continue;
      }

      // 出品実行
      const result = await this.executeListing(candidate);
      results.push(result);

      // 結果処理
      if (result.success) {
        await this.handleSuccess(result);
      } else {
        await this.handleFailure(result);
      }
    }

    console.log(`[ListingExecutor] Execution batch complete: ${results.length} processed`);
    return results;
  }
}
