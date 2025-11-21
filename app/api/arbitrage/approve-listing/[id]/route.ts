/**
 * 承認・出品API
 *
 * 検品完了後、商品を承認し、多販路への即時出品パイプラインを起動する。
 *
 * エンドポイント: POST /api/arbitrage/approve-listing/[id]
 *
 * 処理フロー:
 * 1. 商品を承認（arbitrage_status を 'awaiting_inspection' → 'ready_to_list' に更新）
 * 2. 多販路出品パイプラインを起動
 *    - Amazon FBA（自国）
 *    - eBay（オプション）
 *    - 楽天・Yahoo!（オプション）
 * 3. 出品完了後、ステータスを 'listed' に更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

interface ListingChannel {
  channel: 'Amazon FBA' | 'eBay' | 'Rakuten' | 'Yahoo';
  success: boolean;
  listing_id?: string;
  error?: string;
}

/**
 * 多販路への自動出品を実行（モック実装）
 *
 * 本番実装では、各販路のAPIを使用して出品を実行します。
 * - Amazon: SP-API (Listings API)
 * - eBay: Trading API または Inventory API
 * - 楽天: RMS API
 * - Yahoo!: ストアクリエイターPro API
 */
async function executeMultiChannelListing(
  product: any
): Promise<ListingChannel[]> {
  const results: ListingChannel[] = [];

  try {
    // 1. Amazon FBA（自国）への出品
    console.log('📦 Amazon FBAへ出品中...');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    results.push({
      channel: 'Amazon FBA',
      success: true,
      listing_id: `AMZN-${product.asin}`,
    });

    // 2. eBayへの出品（オプション）
    if (product.optimal_sales_channel?.includes('eBay')) {
      console.log('🌐 eBayへ出品中...');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      results.push({
        channel: 'eBay',
        success: true,
        listing_id: `EBAY-${Math.random().toString(36).substr(2, 9)}`,
      });
    }

    // 3. 楽天への出品（オプション、JP商品のみ）
    if (product.target_country === 'JP') {
      console.log('🛒 楽天へ出品中...');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      results.push({
        channel: 'Rakuten',
        success: true,
        listing_id: `RAKU-${Math.random().toString(36).substr(2, 9)}`,
      });
    }

    return results;
  } catch (error) {
    console.error('❌ 多販路出品エラー:', error);
    results.push({
      channel: 'Amazon FBA',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return results;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    console.log(`🚀 承認・出品開始: Product ID=${productId}`);

    const supabase = createClient();

    // 1. 商品情報を取得
    const { data: product, error: fetchError } = await supabase
      .from('products_master')
      .select('*')
      .eq('id', productId)
      .eq('arbitrage_status', 'awaiting_inspection')
      .single();

    if (fetchError || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found or not awaiting inspection' },
        { status: 404 }
      );
    }

    // 2. ステータスを 'ready_to_list' に更新
    const { error: statusUpdateError } = await supabase
      .from('products_master')
      .update({
        arbitrage_status: 'ready_to_list',
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    if (statusUpdateError) {
      console.error('❌ ステータス更新エラー:', statusUpdateError);
    }

    // 3. 多販路への自動出品を実行
    const listingResults = await executeMultiChannelListing(product);

    // 4. 全ての出品が成功した場合、ステータスを 'listed' に更新
    const allSuccess = listingResults.every((r) => r.success);

    if (allSuccess) {
      const { error: finalUpdateError } = await supabase
        .from('products_master')
        .update({
          arbitrage_status: 'listed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (finalUpdateError) {
        console.error('❌ 最終ステータス更新エラー:', finalUpdateError);
      }

      console.log(`✅ 承認・出品完了: Product ID=${productId}`);

      return NextResponse.json({
        success: true,
        message: 'Product approved and listed successfully',
        product_id: productId,
        listing_results: listingResults,
      });
    } else {
      console.warn('⚠️ 一部の出品が失敗しました');

      return NextResponse.json({
        success: false,
        message: 'Some listings failed',
        product_id: productId,
        listing_results: listingResults,
      });
    }
  } catch (error) {
    console.error('❌ 承認・出品APIエラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET: 商品の承認状況を確認（テスト用）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;
    const supabase = createClient();

    const { data: product, error } = await supabase
      .from('products_master')
      .select('id, asin, title, arbitrage_status, arbitrage_score')
      .eq('id', productId)
      .single();

    if (error || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
