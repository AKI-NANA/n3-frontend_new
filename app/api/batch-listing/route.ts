/**
 * バッチ出品処理エンドポイント
 * POST /api/batch-listing
 *
 * 戦略決定済み商品を取得し、各プラットフォームのAPIに自動出品
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CredentialsManager } from '@/services/CredentialsManager';
import { ExclusiveLockManager } from '@/services/ExclusiveLockManager';
import { ListingResultLogger } from '@/services/ListingResultLogger';
import { EbayClient, EbayListingData } from '@/lib/api-clients/EbayClient';
import { AmazonClient, AmazonListingData } from '@/lib/api-clients/AmazonClient';
import { CoupangClient, CoupangListingData } from '@/lib/api-clients/CoupangClient';
import { ShopifyClient, ShopifyListingData } from '@/lib/api-clients/ShopifyClient';
import { Platform } from '@/types/strategy';
import { Product } from '@/types/product';

interface BatchListingRequest {
  limit?: number;           // 処理件数（デフォルト: 50）
  platform?: Platform;      // 特定プラットフォームのみ処理
  dryRun?: boolean;         // テスト実行（実際のAPI呼び出しなし）
}

interface BatchListingResult {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: Array<{
    sku: string;
    platform: Platform;
    status: 'success' | 'failed' | 'skipped';
    listing_id?: string;
    error?: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: BatchListingRequest = await request.json();
    const limit = body.limit || 50;
    const targetPlatform = body.platform;
    const dryRun = body.dryRun || false;

    const supabase = await createClient();

    // 1. 戦略決定済み または 出品スケジュール待ち の商品を取得
    let query = supabase
      .from('products_master')
      .select('*')
      .in('status', ['戦略決定済', '出品スケジュール待ち']);

    if (targetPlatform) {
      query = query.eq('recommended_platform', targetPlatform);
    }

    const { data: products, error } = await query.limit(limit);

    if (error || !products) {
      throw new Error(`商品取得エラー: ${error?.message}`);
    }

    console.log(`📦 バッチ出品開始: ${products.length}件処理`);

    // 2. 各商品を順次処理
    const results: BatchListingResult['results'] = [];
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    for (const product of products as Product[]) {
      const result = await processListing(product, dryRun);
      results.push(result);

      if (result.status === 'success') succeeded++;
      else if (result.status === 'failed') failed++;
      else skipped++;

      // レート制限対策: 各APIコール間に500ms待機
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(
      `✅ バッチ出品完了: 成功 ${succeeded}件 / 失敗 ${failed}件 / スキップ ${skipped}件`
    );

    return NextResponse.json({
      success: true,
      processed: products.length,
      succeeded,
      failed,
      skipped,
      results,
    });
  } catch (error) {
    console.error('❌ バッチ出品エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '処理中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}

/**
 * 個別商品の出品処理
 */
async function processListing(
  product: Product,
  dryRun: boolean
): Promise<BatchListingResult['results'][0]> {
  const sku = product.sku;
  const platform = product.recommended_platform as Platform;
  const accountId = product.recommended_account_id;

  // 必須情報のチェック
  if (!platform || !accountId) {
    console.warn(`⚠️ スキップ: ${sku} - 推奨プラットフォームまたはアカウントIDが未設定`);
    return {
      sku,
      platform: platform || 'amazon',
      status: 'skipped',
      error: '推奨プラットフォームまたはアカウントIDが未設定',
    };
  }

  // 排他的ロックのチェック
  const isLocked = await ExclusiveLockManager.isLocked(sku);
  if (isLocked) {
    const lock = await ExclusiveLockManager.getActiveLock(sku);
    console.warn(
      `⚠️ スキップ: ${sku} - 既に ${lock?.locked_platform} #${lock?.locked_account_id} で出品中`
    );
    return {
      sku,
      platform,
      status: 'skipped',
      error: `既に ${lock?.locked_platform} で出品中`,
    };
  }

  // Dry Runモード
  if (dryRun) {
    console.log(`🧪 [DRY RUN] ${sku} → ${platform} #${accountId}`);
    return {
      sku,
      platform,
      status: 'success',
      listing_id: 'DRY_RUN_ID',
    };
  }

  try {
    // 認証情報を取得
    const config = await CredentialsManager.getClientConfig(platform, accountId);

    // プラットフォーム別の出品処理
    let result;

    switch (platform) {
      case 'ebay':
        result = await listToEbay(product, config);
        break;
      case 'amazon':
        result = await listToAmazon(product, config);
        break;
      // case 'coupang':
      //   result = await listToCoupang(product, config);
      //   break;
      // case 'shopify':
      //   result = await listToShopify(product, config);
      //   break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    if (result.success && result.data) {
      // 成功: ログ記録 + ロック取得
      await ListingResultLogger.logSuccess(sku, platform, accountId, result.data);
      await ExclusiveLockManager.acquireLock(sku, platform, accountId);

      return {
        sku,
        platform,
        status: 'success',
        listing_id: result.data,
      };
    } else {
      // 失敗: ログ記録
      await ListingResultLogger.logFailure(sku, platform, accountId, result);

      return {
        sku,
        platform,
        status: 'failed',
        error: result.error?.message,
      };
    }
  } catch (error) {
    console.error(`❌ 出品エラー: ${sku}`, error);
    return {
      sku,
      platform,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * eBayに出品
 */
async function listToEbay(product: Product, config: any) {
  const client = new EbayClient(config);

  const listingData: EbayListingData = {
    sku: product.sku,
    title: product.title,
    description: product.description || '',
    category_id: '123456', // TODO: カテゴリーマッピング
    price: product.price,
    quantity: product.current_stock_count || 1,
    condition: 'New',
    images: product.images?.map((img) => img.url) || [],
  };

  return await client.addItem(listingData);
}

/**
 * Amazonに出品
 */
async function listToAmazon(product: Product, config: any) {
  const client = new AmazonClient(config);

  const listingData: AmazonListingData = {
    sku: product.sku,
    asin: product.asin,
    product_type: 'PRODUCT', // TODO: 商品タイプマッピング
    title: product.title,
    description: product.description || '',
    brand: product.brand_name || 'Generic',
    price: product.price,
    quantity: product.current_stock_count || 1,
    condition: 'NewItem',
    images: product.images?.map((img) => img.url) || [],
  };

  return await client.createListing(listingData);
}

/**
 * リトライ処理エンドポイント
 * GET /api/batch-listing/retry
 */
export async function GET(request: NextRequest) {
  try {
    // リトライ待ち商品を取得
    const retryQueue = await ListingResultLogger.getRetryQueue();

    if (retryQueue.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'リトライ対象の商品はありません',
        retried: 0,
      });
    }

    console.log(`🔄 リトライ処理開始: ${retryQueue.length}件`);

    // 各商品を再処理
    let retriedCount = 0;
    for (const log of retryQueue) {
      // リトライカウントを増加
      await ListingResultLogger.incrementRetryCount(log.log_id);

      // 商品情報を取得して再処理
      const supabase = await createClient();
      const { data: product } = await supabase
        .from('products_master')
        .select('*')
        .eq('sku', log.sku)
        .single();

      if (product) {
        await processListing(product as Product, false);
        retriedCount++;
      }

      // レート制限対策
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`✅ リトライ処理完了: ${retriedCount}件処理`);

    return NextResponse.json({
      success: true,
      message: `${retriedCount}件の商品をリトライしました`,
      retried: retriedCount,
    });
  } catch (error) {
    console.error('❌ リトライ処理エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '処理中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
