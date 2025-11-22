// lib/ai/gemini-client.ts
import { GoogleGenAI, Type } from "@google/genai";
import { PromptOptimization } from '@/types/ai';

// Gemini AIクライアントの初期化
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * 抽象的なコンセプトから、DALL-E/Midjourney向けの画像生成プロンプトを最適化する
 * @param baseConcept LP構成案などから得られた画像の基本コンセプト
 * @param productDetails 商品の詳細情報
 * @returns 最適化されたプロンプトと設定
 */
export async function optimizeImagePrompt(
  baseConcept: string,
  productDetails: string
): Promise<PromptOptimization> {

  const outputSchema = {
    type: Type.OBJECT,
    properties: {
      optimized_prompt: {
        type: Type.STRING,
        description: "写真のスタイル、照明、カメラアングル、被写体の配置など、具体的なディテールを含んだ英語の最終プロンプト。"
      },
      aspect_ratio: {
        type: Type.STRING,
        enum: ['16:9', '1:1', '4:5'],
        description: "LPのヒーローセクションに最適なアスペクト比。"
      },
      optimization_justification: {
        type: Type.STRING,
        description: "このプロンプトがターゲット顧客の購入意欲を高める理由。"
      }
    },
    required: ["optimized_prompt", "aspect_ratio", "optimization_justification"]
  };

  const prompt = `
あなたは、商品LPのコンバージョン率を最大化するトップクリエイティブディレクターです。
以下の【基本コンセプト】と【商品の詳細】に基づき、DALL-E 3やMidjourneyで最高の画像を生成するための、具体的で魅力的なプロンプトを生成してください。プロンプトは**英語**である必要があります。

---
【基本コンセプト】: ${baseConcept}
【商品の詳細】: ${productDetails}

【指示】:
1. 視覚的なインパクトを重視し、商品の魅力を最大限に引き出すプロンプトにすること。
2. JSONスキーマに厳密に従うこと。
---
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: outputSchema,
        temperature: 0.8, // 創造性を高める
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as PromptOptimization;

  } catch (error) {
    console.error('Gemini API Error (Prompt Optimization):', error);
    throw new Error('Failed to optimize image prompt.');
  }
}
