// lib/ai/gemini-client.ts
// Gemini API クライアント - ペルソナ駆動コンテンツ生成エンジン

import { ContentInput, GeneratedContent } from '@/types/ai';

/**
 * IMPORTANT: このファイルを使用する前に、以下のいずれかのSDKをインストールしてください:
 *
 * オプション1: Google AI SDK (推奨、シンプル)
 *   npm install @google/generative-ai
 *
 * オプション2: Vertex AI SDK (エンタープライズ向け)
 *   npm install @google-cloud/vertexai
 *
 * また、環境変数を設定してください:
 *   GEMINI_API_KEY=your_api_key_here (Google AI SDKの場合)
 *   または
 *   GOOGLE_CLOUD_PROJECT=your_project_id (Vertex AIの場合)
 */

// Google AI SDK使用例 (インストール後に有効化)
// import { GoogleGenerativeAI } from '@google/generative-ai';
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
// const ai = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

/**
 * 一時的な実装: Gemini APIへのHTTPリクエスト
 * 本番環境では上記のSDKを使用することを推奨
 */
async function callGeminiAPI(prompt: string, temperature: number = 0.8): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set. Please configure your API key.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: temperature,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textResponse) {
    throw new Error('No response from Gemini API');
  }

  return textResponse;
}

/**
 * ペルソナ文体に基づき、記事本文と画像指示を生成する
 * @param input コンテンツ生成に必要な全てのデータ
 * @returns 記事本文と画像プロンプト (GeneratedContent)
 */
export async function generatePersonaContent(
  input: ContentInput
): Promise<GeneratedContent> {

  const JSON_SCHEMA = {
    type: "object",
    properties: {
      article_markdown: {
        type: "string",
        description: "ペルソナの文体とN3のデータに基づいた記事本文（Markdown形式）。最低3000字。"
      },
      image_prompts: {
        type: "array",
        items: { type: "string" },
        description: "記事のアイキャッチや本文中に挿入するための、Midjourney/DALL-E向けの画像生成プロンプト（3つ以上）。"
      },
      final_affiliate_links: {
        type: "array",
        items: { type: "string" },
        description: "記事に自然に組み込まれたアフィリエイトリンクのリスト。"
      }
    },
    required: ["article_markdown", "image_prompts", "final_affiliate_links"]
  };

  const prompt = `
あなたは、指定された【ペルソナ】として、読者のために【テーマ】に関する記事を執筆してください。

---
【ペルソナの文体指示 (Style Prompt)】:
${input.style_prompt}

【記事のテーマ】:
${input.theme}

【必須データ (N3の優位性)】:
記事内には、以下のN3内部データ（高利益率商品事例）を引用し、「独自の経験とノウハウ」として説得力を持たせてください。
${JSON.stringify(input.internal_data)}

【アフィリエイト候補】:
${input.affiliate_candidates.join(', ')}

---
【記事作成のルール】
1. 記事は**Markdown形式**で出力し、H2/H3タグを適切に使用して構成すること。
2. ペルソナの文体を徹底すること。
3. N3の内部データを「独自の分析結果」として記事の根幹に組み込むこと。
4. アフィリエイト候補を**自然な文脈**で紹介し、誘導文を作成すること。
5. 読者が飽きないよう、適切な場所に**画像挿入指示**（例えば「[ここに商品画像Aの挿入]」）を含め、別途画像生成用のプロンプトも出力すること。

分析結果を以下のJSON形式で出力してください:
${JSON.stringify(JSON_SCHEMA, null, 2)}
`;

  try {
    const jsonText = await callGeminiAPI(prompt, 0.8);

    // JSONのパースとバリデーション
    const parsed = JSON.parse(jsonText) as GeneratedContent;

    // 基本的なバリデーション
    if (!parsed.article_markdown || !parsed.image_prompts || !parsed.final_affiliate_links) {
      throw new Error('Generated content is missing required fields');
    }

    return parsed;

  } catch (error) {
    console.error('Gemini API Error (Content Generation):', error);
    throw new Error(`Failed to generate persona-driven content from AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * テーマ分析とアフィリエイトリンク候補の生成
 * (S3で使用される想定の関数 - 将来の実装用)
 */
export async function analyzeAndGenerateTheme(
  ideaData: any,
  personaData: any
): Promise<{ theme: string; affiliate_candidates: string[] }> {
  // TODO: S3の実装が完了した際に、この関数を実装
  throw new Error('Not implemented yet - this function will be used in S3 (Theme Generator)');
}
