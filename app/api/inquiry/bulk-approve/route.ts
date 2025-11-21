import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface BulkApproveRequest {
  inquiryIds: string[];
  staffId?: string;
}

/**
 * POST: AIドラフトを一括承認・送信
 */
export async function POST(request: Request) {
  try {
    const body: BulkApproveRequest = await request.json();
    const { inquiryIds, staffId } = body;

    if (!inquiryIds || inquiryIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'inquiryIds は必須です' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const now = new Date().toISOString();
    const results = [];
    const errors = [];

    for (const inquiryId of inquiryIds) {
      try {
        // 問い合わせ情報を取得
        const { data: inquiry, error: fetchError } = await supabase
          .from('inquiries')
          .select('*')
          .eq('inquiry_id', inquiryId)
          .single();

        if (fetchError || !inquiry) {
          errors.push({ inquiryId, error: 'Not found' });
          continue;
        }

        // ステータスを更新（SENT -> COMPLETED）
        const { error: updateError } = await supabase
          .from('inquiries')
          .update({
            final_response_text: inquiry.ai_draft_text,
            status: 'SENT',
            response_date: now,
            response_score: 90, // 一括承認の場合は高スコア
            updated_at: now
          })
          .eq('inquiry_id', inquiryId);

        if (updateError) {
          errors.push({ inquiryId, error: updateError.message });
          continue;
        }

        // KPI記録
        const responseTime = inquiry.received_at
          ? Math.floor((new Date(now).getTime() - new Date(inquiry.received_at).getTime()) / 1000)
          : 0;

        await supabase.from('inquiry_kpi').insert({
          staff_id: staffId || 'system',
          inquiry_id: inquiryId,
          response_time_seconds: responseTime,
          ai_draft_used: true,
          manual_edit_count: 0,
          customer_satisfaction_score: 90,
          resolved_on_first_contact: true
        });

        // ナレッジベースに追加
        await supabase.from('inquiry_knowledge_base').insert({
          inquiry_id: inquiryId,
          ai_category: inquiry.ai_category,
          customer_message_raw: inquiry.customer_message_raw,
          final_response_text: inquiry.ai_draft_text,
          response_score: 90,
          order_id: inquiry.order_id,
          response_date: now
        });

        results.push({ inquiryId, success: true });
      } catch (err: any) {
        errors.push({ inquiryId, error: err.message });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      message:
        errors.length === 0
          ? `${results.length}件の回答を一括送信しました`
          : `${results.length}件成功、${errors.length}件失敗`,
      data: {
        total: inquiryIds.length,
        succeeded: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error: any) {
    console.error('Bulk approve error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '一括承認エラー',
        error: error.message
      },
      { status: 500 }
    );
  }
}
