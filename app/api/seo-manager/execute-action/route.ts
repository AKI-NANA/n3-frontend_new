/**
 * SEOマネージャー - アクション実行API
 * POST /api/seo-manager/execute-action
 *
 * リスティングに対するアクション（即時終了、価格改訂）を実行する
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { listingId, action } = body;

    if (!listingId || !action) {
      return NextResponse.json(
        { error: 'listingId と action は必須です' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // アクションに応じた処理を実行
    switch (action) {
      case '即時終了':
        // リスティングのステータスを「終了」に更新
        const { data: endedListing, error: endError } = await supabase
          .from('marketplace_listings')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', listingId)
          .select()
          .single();

        if (endError) {
          console.error('リスティング終了エラー:', endError);
          return NextResponse.json(
            { error: 'リスティングの終了に失敗しました', details: endError.message },
            { status: 500 }
          );
        }

        // アクション履歴を記録（任意）
        await supabase
          .from('seo_manager_actions')
          .insert({
            listing_id: listingId,
            action_type: 'end_listing',
            reason: '健全性スコアが低い（死に筋）',
            executed_at: new Date().toISOString(),
          });

        return NextResponse.json({
          success: true,
          message: `リスティング ${listingId} を終了しました。`,
          listing: endedListing,
        });

      case '価格改訂':
        // 価格改訂フラグを設定
        const { data: revisedListing, error: reviseError } = await supabase
          .from('marketplace_listings')
          .update({
            needs_price_revision: true,
            revision_requested_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', listingId)
          .select()
          .single();

        if (reviseError) {
          console.error('価格改訂リクエストエラー:', reviseError);
          return NextResponse.json(
            { error: '価格改訂リクエストに失敗しました', details: reviseError.message },
            { status: 500 }
          );
        }

        // アクション履歴を記録（任意）
        await supabase
          .from('seo_manager_actions')
          .insert({
            listing_id: listingId,
            action_type: 'price_revision',
            reason: '健全性スコアが中程度（改善の余地あり）',
            executed_at: new Date().toISOString(),
          });

        return NextResponse.json({
          success: true,
          message: `リスティング ${listingId} の価格改訂をリクエストしました。`,
          listing: revisedListing,
        });

      default:
        return NextResponse.json(
          { error: `不明なアクション: ${action}` },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('アクション実行API エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラー', details: error.message },
      { status: 500 }
    );
  }
}
