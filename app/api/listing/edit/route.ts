/**
 * 出品データ編集API
 *
 * 第3層データ（タイトル、バリエーション、Item Specificsなど）のみを更新
 * ⚠️ 在庫や価格ロジック（第1層/第4層）のDBは絶対に触らない
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { EditListingRequest } from '@/types/listing';

/**
 * POST /api/listing/edit
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body: EditListingRequest = await request.json();

    const { sku, platform, accountId, updates } = body;

    console.log('[EditAPI] リクエスト:', { sku, platform, accountId });

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
      .select('*')
      .eq('sku', sku)
      .eq('platform', platform)
      .eq('account_id', accountId)
      .single();

    if (fetchError || !existingListing) {
      console.error('[EditAPI] 出品データが見つかりません:', fetchError);
      return NextResponse.json(
        { error: '出品データが見つかりません' },
        { status: 404 }
      );
    }

    // 3. 更新データを構築（第3層のみ）
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) {
      updateData.title = updates.title;
    }

    if (updates.description !== undefined) {
      updateData.description = updates.description;
    }

    if (updates.itemSpecifics !== undefined) {
      updateData.item_specifics = updates.itemSpecifics;
    }

    if (updates.variations !== undefined) {
      updateData.variations = updates.variations;
    }

    if (updates.imageUrls !== undefined) {
      // 画像は最大24枚に制限
      updateData.image_urls = updates.imageUrls.slice(0, 24);
    }

    // 4. DB更新（listing_dataのみ）
    const { data: updatedListing, error: updateError } = await supabase
      .from('listing_data')
      .update(updateData)
      .eq('sku', sku)
      .eq('platform', platform)
      .eq('account_id', accountId)
      .select()
      .single();

    if (updateError) {
      console.error('[EditAPI] 更新エラー:', updateError);
      return NextResponse.json(
        { error: '更新に失敗しました', details: updateError.message },
        { status: 500 }
      );
    }

    // 5. 変更履歴を記録
    await supabase.from('listing_edit_logs').insert({
      sku,
      platform,
      account_id: accountId,
      changes: updates,
      edited_at: new Date().toISOString(),
    });

    console.log('[EditAPI] 更新成功:', sku);

    return NextResponse.json({
      success: true,
      data: updatedListing,
    });
  } catch (err) {
    console.error('[EditAPI] 予期しないエラー:', err);
    return NextResponse.json(
      {
        error: '予期しないエラーが発生しました',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
