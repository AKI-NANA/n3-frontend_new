// app/api/gemini/run-prompt/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { generateResearchPrompt } from '@/lib/services/ai/gemini/gemini-api';
import type { ResearchPromptType } from '@/types/product';

/**
 * POST /api/gemini/run-prompt
 * 選択されたプロンプトタイプに基づき、AIリサーチを実行する
 */
export async function POST(request: Request) {
  try {
    const { productId, type, productData } = await request.json();
    const promptType: ResearchPromptType = type;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: '商品IDが必要です' },
        { status: 400 }
      );
    }

    console.log('📝 AIリサーチAPI呼び出し:', { productId, type });

    // 🔥 HTS専用（Claude MCP）の場合は別処理
    if (promptType === 'HTS_CLAUDE_MCP') {
      return NextResponse.json(
        {
          success: true,
          message: 'Claude MCPによるHTS取得は現在開発中です。',
          note: 'Supabaseデータベース接続機能を実装予定です。',
        },
        { status: 200 }
      );
    }

    // 🔥 プロンプトを生成
    const { prompt, imageUrl } = generateResearchPrompt(promptType, productData);

    console.log('🤖 生成されたプロンプト:', {
      type: promptType,
      promptLength: prompt.length,
      hasImage: !!imageUrl,
    });

    // 🔥 Gemini APIを呼び出す
    const geminiResult = await callGeminiAPI(prompt, imageUrl);

    if (!geminiResult.success) {
      return NextResponse.json(
        { success: false, error: geminiResult.error || 'AI実行に失敗しました' },
        { status: 500 }
      );
    }

    // 🔥 AIレスポンスをパース
    const parsedData = parseGeminiResponse(geminiResult.response, promptType);

    console.log('📊 パース結果:', parsedData);

    // 🔥 データベースに保存
    const supabase = await createClient();
    const updateData = buildUpdateData(parsedData, promptType);

    const { data, error } = await supabase
      .from('products_master')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      console.error('❌ DB更新エラー:', error);
      return NextResponse.json(
        { success: false, error: 'データベース更新に失敗しました: ' + error.message },
        { status: 500 }
      );
    }

    console.log('✅ AIリサーチ完了:', data);

    return NextResponse.json({
      success: true,
      message: 'AIリサーチが完了し、データベースに保存しました',
      data: {
        productId,
        type: promptType,
        updatedFields: Object.keys(updateData),
        parsedData,
      },
    });
  } catch (error: any) {
    console.error('❌ AIリサーチAPIエラー:', error);
    return NextResponse.json(
      { success: false, error: error.message || '不明なエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * Gemini APIを呼び出す
 */
async function callGeminiAPI(
  prompt: string,
  imageUrl?: string
): Promise<{ success: boolean; response?: string; error?: string }> {
  try {
    // 🔥 Gemini API Keyの確認
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY が設定されていません。モックレスポンスを返します。');
      return {
        success: true,
        response: JSON.stringify({
          english_title: 'AI Generated Title (Mock)',
          english_description: 'AI Generated Description (Mock)',
          hts_code: '0000.00.00.00',
          origin_country: 'JP',
          material: 'Unknown',
          price_usd: 0,
        }),
      };
    }

    // 🔥 画像がある場合は Vision API を使用
    if (imageUrl) {
      return await callGeminiVisionAPI(apiKey, prompt, imageUrl);
    }

    // 🔥 テキストのみの場合
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt + '\n\n必ずJSON形式で回答してください。',
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini APIエラー:', errorText);
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const result = await response.json();
    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return { success: true, response: textResponse };
  } catch (error: any) {
    console.error('❌ Gemini API呼び出しエラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Gemini Vision APIを呼び出す（画像付き）
 */
async function callGeminiVisionAPI(
  apiKey: string,
  prompt: string,
  imageUrl: string
): Promise<{ success: boolean; response?: string; error?: string }> {
  try {
    console.log('📸 画像付きリサーチを実行:', imageUrl);

    // 🔥 画像をBase64にエンコード
    const imageBase64 = await fetchImageAsBase64(imageUrl);

    if (!imageBase64) {
      throw new Error('画像の取得に失敗しました');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt + '\n\n必ずJSON形式で回答してください。',
                },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini Vision APIエラー:', errorText);
      throw new Error(`Gemini Vision API Error: ${response.status}`);
    }

    const result = await response.json();
    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return { success: true, response: textResponse };
  } catch (error: any) {
    console.error('❌ Gemini Vision API呼び出しエラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 画像URLをBase64にエンコード
 */
async function fetchImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`画像取得失敗: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
  } catch (error: any) {
    console.error('❌ 画像取得エラー:', error);
    return null;
  }
}

/**
 * GeminiレスポンスをパースしてJSONオブジェクトに変換
 */
function parseGeminiResponse(response: string, type: ResearchPromptType): any {
  try {
    // JSONブロックを抽出（```json ... ``` または { ... }）
    const jsonMatch =
      response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      console.warn('⚠️ JSON形式が見つかりません。レスポンス全体をパース試行:', response);
      return JSON.parse(response);
    }

    const jsonText = jsonMatch[1].trim();
    const parsed = JSON.parse(jsonText);

    return parsed;
  } catch (error: any) {
    console.error('❌ JSONパースエラー:', error);
    console.error('元のレスポンス:', response);

    // パースに失敗した場合は空のオブジェクトを返す
    return {};
  }
}

/**
 * パース結果からDB更新用のデータを構築
 */
function buildUpdateData(parsedData: any, type: ResearchPromptType): any {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  // 英語タイトル
  if (parsedData.english_title) {
    updateData.english_title = parsedData.english_title;
    updateData.title_en = parsedData.english_title; // 互換性
  }

  // 英語説明
  if (parsedData.english_description) {
    updateData.english_description = parsedData.english_description;
    updateData.description_en = parsedData.english_description; // 互換性
  }

  // HTSコード
  if (parsedData.hts_code) {
    updateData.hts_code = parsedData.hts_code;
  }

  // 原産国
  if (parsedData.origin_country) {
    updateData.origin_country = parsedData.origin_country;
  }

  // 素材
  if (parsedData.material) {
    updateData.material = parsedData.material;
  }

  // 価格（最安値）
  if (parsedData.price_usd) {
    updateData.price_usd = parsedData.price_usd;
  }

  // 市場調査データ
  if (parsedData.research_lowest_price) {
    updateData.research_lowest_price = parsedData.research_lowest_price;
  }

  if (parsedData.research_competitor_count !== undefined) {
    updateData.research_competitor_count = parsedData.research_competitor_count;
  }

  if (parsedData.research_sold_count !== undefined) {
    updateData.research_sold_count = parsedData.research_sold_count;
  }

  // サイズ・重量情報（listing_data内に格納）
  if (
    parsedData.length_cm ||
    parsedData.width_cm ||
    parsedData.height_cm ||
    parsedData.weight_g
  ) {
    updateData.listing_data = {
      length_cm: parsedData.length_cm,
      width_cm: parsedData.width_cm,
      height_cm: parsedData.height_cm,
      weight_g: parsedData.weight_g,
    };
  }

  return updateData;
}
