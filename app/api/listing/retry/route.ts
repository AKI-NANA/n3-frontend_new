/**
 * 個別リトライAPI
 * POST /api/listing/retry
 *
 * 特定のSKUとプラットフォームの出品を手動でリトライ
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CredentialsManager } from '@/services/CredentialsManager';
import { ListingResultLogger } from '@/services/ListingResultLogger';
import { EbayClient, EbayListingData } from '@/lib/api-clients/EbayClient';
import { AmazonClient, AmazonListingData } from '@/lib/api-clients/AmazonClient';
import { Platform } from '@/types/strategy';
import { Product } from '@/types/product';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sku, platform } = body;

    if (!sku || !platform) {
      return NextResponse.json(
        { success: false, error: 'SKUとplatformが必要です' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 商品情報を取得
    const { data: product, error } = await supabase
      .from('products_master')
      .select('*')
      .eq('sku', sku)
      .single();

    if (error || !product) {
      throw new Error(`商品が見つかりません: ${sku}`);
    }

    const accountId = product.recommended_account_id;
    if (!accountId) {
      throw new Error('推奨アカウントIDが設定されていません');
    }

    // 認証情報を取得
    const config = await CredentialsManager.getClientConfig(platform as Platform, accountId);

    // プラットフォーム別の出品処理
    let result;

    switch (platform) {
      case 'ebay':
        result = await retryEbay(product as Product, config);
        break;
      case 'amazon':
        result = await retryAmazon(product as Product, config);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    if (result.success && result.data) {
      // 成功: ログ記録 + ステータス更新
      await ListingResultLogger.logSuccess(sku, platform as Platform, accountId, result.data);

      return NextResponse.json({
        success: true,
        sku,
        platform,
        listing_id: result.data,
        message: '出品に成功しました',
      });
    } else {
      // 失敗: ログ記録
      const errorLog = await supabase
        .from('listing_result_logs')
        .select('retry_count')
        .eq('sku', sku)
        .eq('platform', platform)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const retryCount = (errorLog.data?.retry_count || 0) + 1;
      await ListingResultLogger.logFailure(sku, platform as Platform, accountId, result, retryCount);

      return NextResponse.json(
        {
          success: false,
          sku,
          platform,
          error: result.error?.message,
          retry_count: retryCount,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ 個別リトライエラー:', error);
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
 * eBayリトライ
 */
async function retryEbay(product: Product, config: any) {
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
 * Amazonリトライ
 */
async function retryAmazon(product: Product, config: any) {
  const client = new AmazonClient(config);

  const listingData: AmazonListingData = {
    sku: product.sku,
    asin: product.asin,
    product_type: 'PRODUCT',
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
