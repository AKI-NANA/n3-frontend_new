import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const geminiApiKey = process.env.GEMINI_API_KEY || '';

interface GenerateDraftRequest {
  inquiryId?: string;
  bulkGenerate?: boolean;
}

interface DraftGenerationResult {
  inquiryId: string;
  aiCategory: string;
  draftText: string;
  templateUsed?: string;
}

/**
 * Gemini APIを使用して回答ドラフトを生成
 */
async function generateDraftWithGemini(
  inquiry: any,
  template?: any
): Promise<string> {
  const systemInstruction = `
あなたはプロのカスタマーサポート担当者です。
顧客からの問い合わせに対して、丁寧で分かりやすい日本語の回答を作成してください。

回答作成の原則：
1. 謝罪が必要な場合は冒頭で謝罪する
2. 具体的な情報（追跡番号、日付、手順など）を明記する
3. 次のステップを明確に示す
4. 丁寧で親しみやすい口調を保つ
5. 箇条書きを使って分かりやすく構成する

テンプレートが提供されている場合は、それを参考にしながらも、
個別の状況に合わせてカスタマイズしてください。
`;

  const level0Label = inquiry.level0_choice
    ? ['追跡・配送', '返品・交換', '商品仕様', 'その他'][parseInt(inquiry.level0_choice) - 1]
    : '不明';

  const templateInfo = template
    ? `\n\n参考テンプレート:\n${template.template_content}`
    : '';

  const userQuery = `
以下の情報を元に、顧客への回答文を作成してください：

顧客メッセージ: ${inquiry.customer_message_raw}

カテゴリ: ${inquiry.ai_category}
顧客の選択: ${inquiry.level0_choice} (${level0Label})

受注情報:
- 受注ID: ${inquiry.order_id || '不明'}
- 追跡番号: ${inquiry.tracking_number || '未発行'}
- 出荷ステータス: ${inquiry.shipping_status || '確認中'}
${templateInfo}

上記の情報を適切に組み込んで、顧客に送信する回答文を作成してください。
回答文のみを返してください（JSON形式ではなく、プレーンテキストで）。
`;

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`;

  const payload = {
    contents: [{ parts: [{ text: userQuery }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000
    }
  };

  // Exponential Backoff付きリトライロジック
  const maxRetries = 3;
  let currentDelay = 1000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const draftText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (draftText) {
        return draftText.trim();
      }

      throw new Error('No content returned from AI');
    } catch (error: any) {
      if (i === maxRetries - 1) {
        console.error('Draft generation failed after retries:', error);
        return `お問い合わせいただきありがとうございます。
現在、お客様のご質問について確認中です。
詳細につきましては、担当者より改めてご連絡させていただきます。
今しばらくお待ちくださいますよう、お願い申し上げます。`;
      }

      console.warn(`Retry ${i + 1}/${maxRetries} after ${currentDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= 2;
    }
  }

  return 'AIによる回答生成に失敗しました。手動で対応してください。';
}

/**
 * 単一の問い合わせに対してドラフトを生成
 */
async function generateSingleDraft(
  supabase: any,
  inquiryId: string
): Promise<DraftGenerationResult | null> {
  // 問い合わせ情報を取得
  const { data: inquiry, error: inquiryError } = await supabase
    .from('inquiries')
    .select('*')
    .eq('inquiry_id', inquiryId)
    .single();

  if (inquiryError || !inquiry) {
    console.error('Inquiry not found:', inquiryError);
    return null;
  }

  // テンプレートを取得
  const { data: template } = await supabase
    .from('inquiry_templates')
    .select('*')
    .eq('ai_category', inquiry.ai_category)
    .eq('is_active', true)
    .order('average_score', { ascending: false })
    .limit(1)
    .single();

  // AIでドラフト生成
  const draftText = await generateDraftWithGemini(inquiry, template);

  // DBを更新
  const { data: updated, error: updateError } = await supabase
    .from('inquiries')
    .update({
      ai_draft_text: draftText,
      status: 'DRAFT_GENERATED',
      updated_at: new Date().toISOString()
    })
    .eq('inquiry_id', inquiryId)
    .select()
    .single();

  if (updateError) {
    console.error('Update error:', updateError);
    return null;
  }

  // テンプレート使用回数を更新
  if (template) {
    await supabase
      .from('inquiry_templates')
      .update({
        usage_count: (template.usage_count || 0) + 1
      })
      .eq('id', template.id);
  }

  return {
    inquiryId,
    aiCategory: inquiry.ai_category,
    draftText,
    templateUsed: template?.template_id
  };
}

/**
 * POST: 回答ドラフトを生成
 */
export async function POST(request: Request) {
  try {
    const body: GenerateDraftRequest = await request.json();
    const { inquiryId, bulkGenerate } = body;

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (bulkGenerate) {
      // 一括生成：DRAFT_PENDING の問い合わせすべてを処理
      const { data: pendingInquiries, error: fetchError } = await supabase
        .from('inquiries')
        .select('inquiry_id')
        .eq('status', 'DRAFT_PENDING');

      if (fetchError || !pendingInquiries || pendingInquiries.length === 0) {
        return NextResponse.json({
          success: false,
          message: 'ドラフト生成待ちの問い合わせはありません'
        });
      }

      const results: DraftGenerationResult[] = [];
      const errors: string[] = [];

      for (const { inquiry_id } of pendingInquiries) {
        const result = await generateSingleDraft(supabase, inquiry_id);
        if (result) {
          results.push(result);
        } else {
          errors.push(inquiry_id);
        }
      }

      return NextResponse.json({
        success: true,
        message: `${results.length}件の回答ドラフトを生成しました`,
        data: {
          total: pendingInquiries.length,
          succeeded: results.length,
          failed: errors.length,
          results,
          errors: errors.length > 0 ? errors : undefined
        }
      });
    } else if (inquiryId) {
      // 単一生成
      const result = await generateSingleDraft(supabase, inquiryId);

      if (!result) {
        return NextResponse.json(
          { success: false, message: '回答ドラフトの生成に失敗しました' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '回答ドラフトを生成しました',
        data: result
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'inquiryId または bulkGenerate を指定してください' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Draft generation error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '回答ドラフト生成エラー',
        error: error.message
      },
      { status: 500 }
    );
  }
}
