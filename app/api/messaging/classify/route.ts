// app/api/messaging/classify/route.ts
// メッセージAI分類APIエンドポイント

import { NextResponse } from 'next/server';
import { classifyMessage, submitClassificationCorrection } from '@/services/messaging/AutoReplyEngine';
import type { UnifiedMessage, TrainingData } from '@/types/messaging';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, message, correction } = body as {
      action: 'classify' | 'correct';
      message?: UnifiedMessage;
      correction?: TrainingData;
    };

    console.log('[Classify API] リクエスト:', action);

    switch (action) {
      case 'classify':
        if (!message) {
          return NextResponse.json(
            { error: 'メッセージデータが必要です' },
            { status: 400 }
          );
        }

        const classification = await classifyMessage(message);

        console.log('[Classify API] 分類完了:', {
          intent: classification.intent,
          urgency: classification.urgency,
          confidence: classification.confidence,
        });

        return NextResponse.json({
          success: true,
          ...classification,
        });

      case 'correct':
        if (!correction) {
          return NextResponse.json(
            { error: '修正データが必要です' },
            { status: 400 }
          );
        }

        await submitClassificationCorrection(correction);

        console.log('[Classify API] 分類修正を学習データとして保存');

        return NextResponse.json({
          success: true,
          message: '分類修正を学習データとして保存しました',
        });

      default:
        return NextResponse.json(
          { error: '不明なアクション' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Classify API] エラー:', error);
    return NextResponse.json(
      {
        error: 'AI分類処理に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
