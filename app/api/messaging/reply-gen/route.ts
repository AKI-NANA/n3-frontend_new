// app/api/messaging/reply-gen/route.ts
// 自動返信生成APIエンドポイント

import { NextResponse } from 'next/server';
import { generateAutoReply } from '@/services/messaging/AutoReplyEngine';
import type { UnifiedMessage } from '@/types/messaging';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message } = body as { message: UnifiedMessage };

    if (!message) {
      return NextResponse.json(
        { error: 'メッセージデータが必要です' },
        { status: 400 }
      );
    }

    console.log('[Reply Gen API] 返信生成リクエスト:', message.message_id);

    // 自動返信を生成
    const result = await generateAutoReply(message);

    console.log('[Reply Gen API] 返信生成完了:', {
      template_id: result.template_id,
      confidence: result.confidence,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Reply Gen API] エラー:', error);
    return NextResponse.json(
      {
        error: '返信生成に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー',
        suggested_reply: 'AIによる自動応答生成が不可能です。手動で対応してください。',
        template_id: null,
        confidence: 0,
      },
      { status: 500 }
    );
  }
}
