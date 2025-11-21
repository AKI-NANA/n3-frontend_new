import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface Level0Request {
  inquiryId: string;
  choice: string; // "1", "2", "3", "4"
}

/**
 * POST: Level 0 フィルターの顧客選択を処理
 */
export async function POST(request: Request) {
  try {
    const body: Level0Request = await request.json();
    const { inquiryId, choice } = body;

    if (!inquiryId || !choice) {
      return NextResponse.json(
        { success: false, message: 'inquiryId と choice は必須です' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 問い合わせ情報を取得
    const { data: inquiry, error: fetchError } = await supabase
      .from('inquiries')
      .select('*')
      .eq('inquiry_id', inquiryId)
      .single();

    if (fetchError || !inquiry) {
      return NextResponse.json(
        { success: false, message: '問い合わせが見つかりません' },
        { status: 404 }
      );
    }

    let newStatus = 'LEVEL0_PENDING';
    let aiCategory = null;

    // 選択肢に応じた処理
    if (choice === '4') {
      // 4. その他（担当者との会話を希望）- 最優先で人間に振り分け
      newStatus = 'DRAFT_GENERATED';
      aiCategory = 'Other';

      // 簡易ドラフトを作成
      const quickDraft = `お問い合わせいただきありがとうございます。
担当者に引き継ぎました。詳細を確認の上、改めてご連絡させていただきます。
今しばらくお待ちくださいますよう、お願い申し上げます。`;

      await supabase
        .from('inquiries')
        .update({
          level0_choice: choice,
          ai_category: aiCategory,
          ai_draft_text: quickDraft,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('inquiry_id', inquiryId);
    } else {
      // 1, 2, 3 の場合は AI 分析ステップへ
      await supabase
        .from('inquiries')
        .update({
          level0_choice: choice,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('inquiry_id', inquiryId);
    }

    // フィルターボットログに記録
    await supabase.from('inquiry_filter_bot_log').insert({
      inquiry_id: inquiryId,
      customer_message: inquiry.customer_message_raw,
      bot_question_sent:
        'お問い合わせありがとうございます。以下のどれに該当しますか？\n1. 注文した商品の追跡・配送について\n2. 届いた商品の返品・交換・不具合について\n3. 商品の使用方法・仕様について\n4. その他（担当者との会話を希望）',
      customer_choice: choice,
      choice_timestamp: new Date().toISOString(),
      next_action: choice === '4' ? 'Direct to staff' : 'To AI classification'
    });

    return NextResponse.json({
      success: true,
      message: 'Level 0 フィルターを処理しました',
      data: {
        inquiryId,
        choice,
        newStatus,
        aiCategory
      }
    });
  } catch (error: any) {
    console.error('Level 0 process error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Level 0 フィルター処理エラー',
        error: error.message
      },
      { status: 500 }
    );
  }
}
