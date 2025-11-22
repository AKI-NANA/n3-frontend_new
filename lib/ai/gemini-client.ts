// /lib/ai/gemini-client.ts
// Gemini AI クライアント - チャット応答生成・リライト機能

import { ChatResponseRewrite } from '@/types/ai';

/**
 * 注意: このファイルはGoogle Generative AI SDK (@google/generative-ai または @ai-sdk/google) の使用を想定しています。
 * パッケージがインストールされていない場合は、以下のコマンドでインストールしてください：
 * npm install @google/generative-ai
 *
 * また、環境変数 GEMINI_API_KEY を設定する必要があります。
 */

// TODO: 実際のGemini SDKをインポート
// import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API クライアントのモック型定義
interface GeminiAI {
  models: {
    generateContent: (params: {
      model: string;
      contents: string;
      config: {
        responseMimeType: string;
        responseSchema: string;
        temperature: number;
      };
    }) => Promise<{ text: string }>;
  };
}

// Gemini APIクライアントの初期化（モック）
// TODO: 実際の実装に置き換える
const createGeminiClient = (): GeminiAI => {
  // const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  // return genAI;

  // モック実装
  return {
    models: {
      generateContent: async (params) => {
        console.warn('[MOCK] Gemini API call - real implementation needed');
        // モックレスポンス
        return {
          text: JSON.stringify({
            rewritten_body: "お問い合わせありがとうございます。詳細を確認させていただきますので、今しばらくお待ちください。",
            category: "General_Inquiry",
            rewrite_justification: "丁寧な初期応答を提供するため、基本的な確認メッセージをリライトしました。"
          })
        };
      }
    }
  };
};

const ai = createGeminiClient();

/**
 * 顧客の問い合わせに基づき、詳細な返信案を生成・リライトする
 * @param originalMessage 顧客からのメッセージ
 * @param contextMessage 過去の会話履歴（省略可）
 * @param personaStyle 返信に適用するペルソナの文体
 * @returns リライトされた返信案と分類
 */
export async function generateChatResponseRewrite(
    originalMessage: string,
    contextMessage: string = '',
    personaStyle: string
): Promise<ChatResponseRewrite> {

  const JSON_SCHEMA = JSON.stringify({
      type: "object",
      properties: {
          rewritten_body: {
            type: "string",
            description: "ペルソナの文体でリライトされた、最終返信に使用する本文。"
          },
          category: {
            type: "string",
            enum: ['Sales_Lead', 'Technical_Support', 'Complaint', 'General_Inquiry'],
            description: "メッセージの分類。"
          },
          rewrite_justification: {
            type: "string",
            description: "リライトされた返信が、なぜ元の問い合わせに最適であるかの説明。"
          }
      },
      required: ["rewritten_body", "category", "rewrite_justification"]
  });

  const prompt = `
    あなたは、プロフェッショナルな顧客対応AIです。
    顧客からの【元のメッセージ】を分析し、【ペルソナの文体指示】に従って、詳細な情報収集または問題解決を目的とした返信案を生成してください。

    ---
    【元のメッセージ】: ${originalMessage}
    【会話コンテキスト】: ${contextMessage || 'なし'}
    【ペルソナの文体指示】: ${personaStyle}

    【指示】:
    1. 返信案 (rewritten_body) は、丁寧で、曖昧な点をなくし、必要な情報を詳細に聞き出す形にすること。
    2. 全ての結果を厳密にJSON形式で出力すること。
    ---
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: JSON_SCHEMA,
        temperature: 0.5,
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as ChatResponseRewrite;

  } catch (error) {
    console.error('Gemini API Error (Chat Response Rewrite):', error);

    // エラー時のフォールバック
    return {
      rewritten_body: `お問い合わせありがとうございます。${originalMessage.substring(0, 50)}... について、担当者が確認の上、ご連絡させていただきます。`,
      category: 'General_Inquiry',
      rewrite_justification: 'API エラーのため、デフォルトの返信を生成しました。'
    };
  }
}

/**
 * TODO: 追加のGemini関連機能をここに実装
 * - メール分類
 * - トレード判断
 * - 商品データ抽出
 * など
 */
