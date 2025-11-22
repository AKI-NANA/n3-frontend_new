// ファイル: /lib/ai/gemini-client.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ThemeAnalysisResult, N3InternalData } from '@/types/ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined in environment variables.');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * The Wisdom Core ロジック: トレンド分析とテーマ決定をGeminiに依頼する
 * @param trendContent 競合ブログやSNSからスクレイピングしたテキストコンテンツ
 * @param internalData N3のDBから抽出した高利益商品の内部データ
 * @returns テーマ分析結果 (ThemeAnalysisResult)
 */
export async function analyzeAndGenerateTheme(
  trendContent: string[],
  internalData: N3InternalData
): Promise<ThemeAnalysisResult> {

  // JSON形式で出力を強制するためのスキーマ定義
  const responseSchema = {
    type: "object",
    properties: {
      final_theme_jp: {
        type: "string",
        description: "決定された投稿テーマ。"
      },
      target_keywords: {
        type: "array",
        items: { type: "string" },
        description: "SEOターゲットキーワードのリスト。"
      },
      analysis_reason: {
        type: "string",
        description: "テーマ選定理由。低競合や高利益率商品との関連性を含める。"
      },
      affiliate_links: {
        type: "array",
        items: { type: "string" },
        description: "記事に含めるべきアフィリエイトリンク候補。"
      }
    },
    required: ["final_theme_jp", "target_keywords", "analysis_reason", "affiliate_links"]
  };

  const prompt = `
あなたは、AI自動化事業のチーフストラテジストであり、投稿テーマの選定責任者です。
提供された【トレンドコンテンツ】、【内部データ】に基づき、最も収益性が高く、競合のAIがまだ扱っていないニッチなテーマを決定してください。

---
【ルール】
1. 出力は厳密にJSONスキーマに従うこと。
2. テーマは、N3の物販データ（高利益率商品）に関連付けられるものが望ましい。
3. 競合のブログではまだ深掘りされていない「マニュアル的」「属人的ノウハウ」を含むテーマを優先すること。
---

【トレンドコンテンツ - 競合の動向】:
${trendContent.join('\n---\n')}

【内部データ - N3の高利益商品実績】:
${JSON.stringify(internalData, null, 2)}

分析結果をJSON形式で出力してください。
  `.trim();

  try {
    // Gemini 2.0 Flash モデルを使用（高速かつコスト効率が良い）
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text();

    return JSON.parse(jsonText) as ThemeAnalysisResult;

  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Failed to generate theme analysis from AI.');
  }
}
