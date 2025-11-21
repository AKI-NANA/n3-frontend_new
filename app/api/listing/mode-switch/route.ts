/**
 * 出品モード切替API
 *
 * ListingMode（中古優先/新品優先）の変更を受け、
 * 価格調整ロジック（第4層）に新しいモードでの価格再計算を非同期でトリガーする
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { ModeSwitchRequest, ListingMode } from '@/types/listing';

/**
 * 価格再計算をトリガー（非同期処理）
 * TODO: 実際の価格調整ロジック（第4層）との統合
 */
async function triggerPriceRecalculation(
  supabase: any,
  sku: string,
  platform: string,
  newMode: ListingMode
): Promise<void> {
  try {
    // 価格再計算ジョブをキューに追加
    await supabase.from('price_recalculation_queue').insert({
      sku,
      platform,
      listing_mode: newMode,
      status: 'pending',
      queued_at: new Date().toISOString(),
    });

    console.log(
      `[ModeSwitchAPI] 価格再計算ジョブをキューに追加: SKU=${sku}, Mode=${newMode}`
    );

    // TODO: VPSバッチ処理にWebhookまたはメッセージキューで通知
    // 例: await fetch('https://vps.example.com/webhook/price-recalc', { ... });
  } catch (err) {
    console.error('[ModeSwitchAPI] 価格再計算トリガーエラー:', err);
    throw err;
  }
}

/**
 * POST /api/listing/mode-switch
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body: ModeSwitchRequest = await request.json();

    const { sku, platform, accountId, newMode } = body;

    console.log('[ModeSwitchAPI] リクエスト:', {
      sku,
      platform,
      accountId,
      newMode,
    });

    // 1. バリデーション
    if (!sku || !platform || !accountId || !newMode) {
      return NextResponse.json(
        { error: 'SKU, platform, accountId, newMode は必須です' },
        { status: 400 }
      );
    }

    if (newMode !== 'used_priority' && newMode !== 'new_priority') {
      return NextResponse.json(
        { error: 'newMode は "used_priority" または "new_priority" である必要があります' },
        { status: 400 }
      );
    }

    // 2. 既存の出品データを取得
    const { data: existingListing, error: fetchError } = await supabase
      .from('listing_data')
      .select('listing_mode')
      .eq('sku', sku)
      .eq('platform', platform)
      .eq('account_id', accountId)
      .single();

    if (fetchError || !existingListing) {
      console.error('[ModeSwitchAPI] 出品データが見つかりません:', fetchError);
      return NextResponse.json(
        { error: '出品データが見つかりません' },
        { status: 404 }
      );
    }

    const oldMode = existingListing.listing_mode as ListingMode;

    // 同じモードの場合は何もしない
    if (oldMode === newMode) {
      return NextResponse.json({
        success: true,
        message: 'モードは既に設定されています',
      });
    }

    // 3. listing_dataのモードを更新
    const { error: updateError } = await supabase
      .from('listing_data')
      .update({
        listing_mode: newMode,
        updated_at: new Date().toISOString(),
      })
      .eq('sku', sku)
      .eq('platform', platform)
      .eq('account_id', accountId);

    if (updateError) {
      console.error('[ModeSwitchAPI] 更新エラー:', updateError);
      return NextResponse.json(
        { error: '更新に失敗しました', details: updateError.message },
        { status: 500 }
      );
    }

    // 4. モード切替履歴を記録
    await supabase.from('listing_mode_switch_logs').insert({
      sku,
      platform,
      account_id: accountId,
      old_mode: oldMode,
      new_mode: newMode,
      switched_at: new Date().toISOString(),
    });

    // 5. 価格再計算をトリガー（非同期）
    // ⚠️ DBを直接更新せず、価格調整ロジック（第4層）に処理を委譲
    await triggerPriceRecalculation(supabase, sku, platform, newMode);

    console.log('[ModeSwitchAPI] モード切替成功:', {
      sku,
      oldMode,
      newMode,
    });

    return NextResponse.json({
      success: true,
      message: `モードを ${oldMode} から ${newMode} に切り替えました。価格再計算を開始しました。`,
      data: {
        sku,
        platform,
        accountId,
        oldMode,
        newMode,
      },
    });
  } catch (err) {
    console.error('[ModeSwitchAPI] 予期しないエラー:', err);
    return NextResponse.json(
      {
        error: '予期しないエラーが発生しました',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
