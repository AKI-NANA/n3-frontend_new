/**
 * 出品停止API
 *
 * ターゲットモールに対し、API連携クライアントを呼び出し、出品停止APIをコール
 * 成功後、DBのmall_statusesを'Inactive'に更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { StopListingRequest } from '@/types/listing';
import type { Platform } from '@/lib/multichannel/types';

/**
 * プラットフォーム別の出品停止処理
 * TODO: 実際のAPI連携クライアントとの統合
 */
async function stopListingOnPlatform(
  platform: Platform,
  listingId: string,
  accountId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(
      `[StopAPI] ${platform} での出品停止処理開始: ListingID=${listingId}`
    );

    // TODO: 実際のプラットフォームAPIクライアントを呼び出し
    switch (platform) {
      case 'ebay':
        // await ebayClient.endListing(listingId, accountId);
        break;
      case 'amazon_us':
      case 'amazon_au':
      case 'amazon_jp':
        // await amazonClient.updateListing({ sku, status: 'Inactive' });
        break;
      case 'coupang':
        // await coupangClient.deactivateListing(listingId);
        break;
      case 'shopee':
        // await shopeeClient.delistItem(listingId);
        break;
      case 'qoo10':
        // await qoo10Client.closeGoods(listingId);
        break;
      case 'mercari':
        // await mercariClient.stopSelling(listingId);
        break;
      case 'shopify':
        // await shopifyClient.updateProduct({ id: listingId, published: false });
        break;
      default:
        console.warn(`[StopAPI] 未対応プラットフォーム: ${platform}`);
    }

    console.log(`[StopAPI] ${platform} での出品停止成功`);
    return { success: true };
  } catch (err) {
    console.error(`[StopAPI] ${platform} での出品停止エラー:`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * POST /api/listing/stop
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body: StopListingRequest = await request.json();

    const { sku, platform, accountId, reason } = body;

    console.log('[StopAPI] リクエスト:', { sku, platform, accountId });

    // 1. バリデーション
    if (!sku || !platform || !accountId) {
      return NextResponse.json(
        { error: 'SKU, platform, accountId は必須です' },
        { status: 400 }
      );
    }

    // 2. 既存の出品データを取得
    const { data: existingListing, error: fetchError } = await supabase
      .from('listing_data')
      .select('listing_id, status')
      .eq('sku', sku)
      .eq('platform', platform)
      .eq('account_id', accountId)
      .single();

    if (fetchError || !existingListing) {
      console.error('[StopAPI] 出品データが見つかりません:', fetchError);
      return NextResponse.json(
        { error: '出品データが見つかりません' },
        { status: 404 }
      );
    }

    // 既に停止している場合
    if (existingListing.status === 'Inactive') {
      return NextResponse.json({
        success: true,
        message: '既に出品は停止されています',
      });
    }

    const listingId = existingListing.listing_id;

    if (!listingId) {
      return NextResponse.json(
        { error: 'listing_id が見つかりません' },
        { status: 400 }
      );
    }

    // 3. プラットフォームAPIで出品停止
    const stopResult = await stopListingOnPlatform(
      platform,
      listingId,
      accountId
    );

    if (!stopResult.success) {
      return NextResponse.json(
        {
          error: 'プラットフォームでの出品停止に失敗しました',
          details: stopResult.error,
        },
        { status: 500 }
      );
    }

    // 4. DBのステータスを'Inactive'に更新
    const { error: updateError } = await supabase
      .from('listing_data')
      .update({
        status: 'Inactive',
        stopped_at: new Date().toISOString(),
        stop_reason: reason || 'ユーザーによる手動停止',
        updated_at: new Date().toISOString(),
      })
      .eq('sku', sku)
      .eq('platform', platform)
      .eq('account_id', accountId);

    if (updateError) {
      console.error('[StopAPI] DB更新エラー:', updateError);
      return NextResponse.json(
        { error: 'DB更新に失敗しました', details: updateError.message },
        { status: 500 }
      );
    }

    // 5. 停止履歴を記録
    await supabase.from('listing_stop_logs').insert({
      sku,
      platform,
      account_id: accountId,
      listing_id: listingId,
      reason: reason || 'ユーザーによる手動停止',
      stopped_at: new Date().toISOString(),
    });

    console.log('[StopAPI] 出品停止成功:', { sku, platform });

    return NextResponse.json({
      success: true,
      message: '出品を停止しました',
      data: {
        sku,
        platform,
        accountId,
        stoppedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[StopAPI] 予期しないエラー:', err);
    return NextResponse.json(
      {
        error: '予期しないエラーが発生しました',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
