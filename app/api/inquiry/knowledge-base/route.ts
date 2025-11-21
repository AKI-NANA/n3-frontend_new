import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET: ナレッジベースから類似事例を取得
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '5');

    if (!category) {
      return NextResponse.json(
        { success: false, message: 'category パラメータは必須です' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 高スコアの過去事例を取得
    const { data, error } = await supabase
      .from('inquiry_knowledge_base')
      .select('*')
      .eq('ai_category', category)
      .order('response_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Knowledge base query error:', error);
      return NextResponse.json(
        { success: false, message: 'ナレッジベース取得エラー', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      category,
      count: data?.length || 0
    });
  } catch (error: any) {
    console.error('Knowledge base error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'ナレッジベース取得エラー',
        error: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * POST: ナレッジベースに新規事例を追加
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      inquiryId,
      aiCategory,
      customerMessage,
      finalResponse,
      responseScore,
      orderId,
      templateUsed
    } = body;

    if (!inquiryId || !aiCategory || !customerMessage || !finalResponse) {
      return NextResponse.json(
        { success: false, message: '必須フィールドが不足しています' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('inquiry_knowledge_base')
      .insert({
        inquiry_id: inquiryId,
        ai_category: aiCategory,
        customer_message_raw: customerMessage,
        final_response_text: finalResponse,
        response_template_used: templateUsed,
        response_score: responseScore || 80,
        order_id: orderId,
        response_date: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Knowledge base insert error:', error);
      return NextResponse.json(
        { success: false, message: 'ナレッジベース登録エラー', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'ナレッジベースに登録しました',
      data
    });
  } catch (error: any) {
    console.error('Knowledge base POST error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'ナレッジベース登録エラー',
        error: error.message
      },
      { status: 500 }
    );
  }
}
