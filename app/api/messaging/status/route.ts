// app/api/messaging/status/route.ts
// メッセージステータス更新APIエンドポイント

import { NextResponse } from 'next/server';
import { markMessageAsCompleted, markMultipleMessagesAsCompleted } from '@/services/messaging/KpiController';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message_id, message_ids, staff_id, action } = body;

    console.log('[Messaging Status API] リクエスト:', { message_id, message_ids, staff_id, action });

    switch (action) {
      case 'complete':
        if (message_ids && Array.isArray(message_ids)) {
          // 複数メッセージを一括完了
          const result = await markMultipleMessagesAsCompleted(message_ids, staff_id);
          return NextResponse.json({
            success: true,
            message: `${result.success}件のメッセージを完了しました`,
            ...result,
          });
        } else if (message_id) {
          // 単一メッセージを完了
          await markMessageAsCompleted(message_id, staff_id);
          return NextResponse.json({
            success: true,
            message: 'メッセージを完了としてマークしました',
          });
        } else {
          return NextResponse.json(
            { error: 'message_id または message_ids が必要です' },
            { status: 400 }
          );
        }

      case 'reopen':
        // メッセージを再オープン
        // 💡 実際のDB更新ロジック
        // const supabase = createClient();
        // await supabase
        //   .from('unified_messages')
        //   .update({ reply_status: 'Pending', updated_at: new Date().toISOString() })
        //   .eq('message_id', message_id);

        return NextResponse.json({
          success: true,
          message: 'メッセージを再オープンしました',
        });

      case 'archive':
        // メッセージをアーカイブ
        // 💡 実際のDB更新ロジック
        return NextResponse.json({
          success: true,
          message: 'メッセージをアーカイブしました',
        });

      default:
        return NextResponse.json(
          { error: '不明なアクション' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Messaging Status API] エラー:', error);
    return NextResponse.json(
      {
        error: 'ステータス更新に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
