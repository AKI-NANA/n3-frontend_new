import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const geminiApiKey = process.env.GEMINI_API_KEY || '';

interface ClassifyRequest {
  inquiryId: string;
  customerMessage: string;
  level0Choice?: string;
  orderInfo?: {
    orderId: string;
    trackingNumber?: string;
    shippingStatus?: string;
  };
}

interface AIClassificationResult {
  aiCategory: string;
  confidence: number;
  suggestedTemplate?: string;
}

/**
 * Gemini APIを使用してAI分類を実行
 */
async function classifyWithGemini(
  customerMessage: string,
  level0Choice?: string
): Promise<AIClassificationResult> {
  const systemInstruction = `
あなたはプロのカスタマーサポートAIです。
顧客からの問い合わせメッセージを分析し、以下のカテゴリのいずれかに分類してください：

1. "Shipping_Delay" - 配送遅延、追跡番号の問い合わせ、商品が届かない
2. "Product_Defect" - 商品の不具合、破損、部品不足、交換・返品の要望
3. "Product_Question" - 商品の仕様、使用方法、保証期間などの質問
4. "Price_Question" - 価格、値引き、クーポンに関する問い合わせ
5. "Other" - 上記以外のすべて

Level 0フィルターの選択肢：
1 = 追跡・配送について
2 = 返品・交換・不具合について
3 = 商品の使用方法・仕様について
4 = その他（担当者との会話を希望）

分類結果を以下のJSON形式で返してください：
{
  "aiCategory": "カテゴリ名",
  "confidence": 0-100の信頼度,
  "suggestedTemplate": "推奨テンプレートID"
}
`;

  const level0Label = level0Choice
    ? `\n顧客が選択したオプション: ${level0Choice} (${
        ['追跡・配送', '返品・交換', '商品仕様', 'その他'][parseInt(level0Choice) - 1] || '不明'
      })`
    : '';

  const userQuery = `
以下の顧客メッセージを分析してください：

${customerMessage}${level0Label}
`;

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`;

  const payload = {
    contents: [{ parts: [{ text: userQuery }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          aiCategory: { type: 'STRING' },
          confidence: { type: 'NUMBER' },
          suggestedTemplate: { type: 'STRING' }
        },
        required: ['aiCategory', 'confidence']
      }
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
      const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (jsonText) {
        const parsed = JSON.parse(jsonText);
        return {
          aiCategory: parsed.aiCategory || 'Other',
          confidence: parsed.confidence || 50,
          suggestedTemplate: parsed.suggestedTemplate
        };
      }

      throw new Error('No content returned from AI');
    } catch (error: any) {
      if (i === maxRetries - 1) {
        console.error('AI classification failed after retries:', error);
        return {
          aiCategory: 'Other',
          confidence: 0,
          suggestedTemplate: 'TPL-OTHER-001'
        };
      }

      console.warn(`Retry ${i + 1}/${maxRetries} after ${currentDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= 2;
    }
  }

  return {
    aiCategory: 'Other',
    confidence: 0,
    suggestedTemplate: 'TPL-OTHER-001'
  };
}

/**
 * POST: 問い合わせをAI分類
 */
export async function POST(request: Request) {
  try {
    const body: ClassifyRequest = await request.json();
    const { inquiryId, customerMessage, level0Choice, orderInfo } = body;

    if (!inquiryId || !customerMessage) {
      return NextResponse.json(
        { success: false, message: 'inquiryId と customerMessage は必須です' },
        { status: 400 }
      );
    }

    // AI分類実行
    const classification = await classifyWithGemini(customerMessage, level0Choice);

    // Supabase更新
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('inquiries')
      .update({
        ai_category: classification.aiCategory,
        status: 'DRAFT_PENDING',
        updated_at: new Date().toISOString()
      })
      .eq('inquiry_id', inquiryId)
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      return NextResponse.json(
        { success: false, message: 'データベース更新エラー', error: error.message },
        { status: 500 }
      );
    }

    // フィルターボットログに記録
    if (level0Choice) {
      await supabase.from('inquiry_filter_bot_log').insert({
        inquiry_id: inquiryId,
        customer_message: customerMessage,
        bot_question_sent: 'Level 0 フィルター: カテゴリ選択',
        customer_choice: level0Choice,
        choice_timestamp: new Date().toISOString(),
        next_action: 'AI分類完了: ' + classification.aiCategory
      });
    }

    return NextResponse.json({
      success: true,
      message: 'AI分類が完了しました',
      data: {
        inquiryId,
        classification,
        updatedInquiry: data
      }
    });
  } catch (error: any) {
    console.error('Classification error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'AI分類エラー',
        error: error.message
      },
      { status: 500 }
    );
  }
}
