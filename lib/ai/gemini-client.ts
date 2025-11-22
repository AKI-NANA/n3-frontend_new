// ファイル: /lib/ai/gemini-client.ts

import { EmailClassification, AutoResponse } from '@/types/ai';

// TODO: 実際のGemini SDK (@google/generative-ai) をインストールして統合する必要があります
// 現在はプレースホルダー実装です

/**
 * Gemini APIクライアントの初期化（仮実装）
 * TODO: 実際のGemini SDKに置き換える
 */
const ai = {
  models: {
    async generateContent(config: any): Promise<{ text: string }> {
      // 仮実装：実際のGemini APIを呼び出す代わりにモックレスポンスを返す
      console.warn('Gemini API: Using mock implementation. Please integrate actual Gemini SDK.');

      if (config.config?.responseMimeType === "application/json") {
        // JSON応答の場合のモック
        return {
          text: JSON.stringify({
            language: "English",
            classification: "General_Inquiry",
            extracted_data: {
              sku_list: [],
              quantity: null,
              price_usd: null,
              tracking_number: null
            },
            confidence_score: 0.75
          })
        };
      } else {
        // テキスト応答の場合のモック
        return {
          text: "Subject: Re: Your Inquiry\n\nThank you for your message. We have received your inquiry and will respond shortly.\n\nBest regards,\nN3 Trading Team"
        };
      }
    }
  }
};

/**
 * 受信した貿易メールを分類し、キーデータを抽出する
 * @param emailBody 受信メールの本文
 * @returns 分類と抽出データ
 */
export async function classifyIncomingEmail(emailBody: string): Promise<EmailClassification> {

  const JSON_SCHEMA = JSON.stringify({
      type: "object",
      properties: {
          language: { type: "string", description: "メールの言語を English, Chinese, Japanese, Other から判定" },
          classification: { type: "string", description: "メール内容を Quotation_Request, Payment_Confirmation, Shipping_Update, General_Inquiry, Unknown から分類" },
          extracted_data: { type: "object", properties: { sku_list: { type: "array", items: { type: "string" } }, quantity: { type: "number" }, price_usd: { type: "number" }, tracking_number: { type: "string" } } },
          confidence_score: { type: "number", description: "分類の確信度 (0.00-1.00)" }
      },
      required: ["language", "classification", "extracted_data", "confidence_score"]
  });

  const prompt = `
    あなたはプロの貿易実務担当者です。以下の受信メールを厳密に分析し、言語の判定、内容の分類、および関連するキーデータ（SKU、数量、追跡番号など）を抽出してください。

    ---
    【受信メール本文】:
    ${emailBody}
    ---

    結果をJSON形式で出力してください。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: JSON_SCHEMA,
        temperature: 0.1, // 正確な分類のため、非常に低く設定
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as EmailClassification;

  } catch (error) {
    console.error('Gemini API Error (Email Classification):', error);
    throw new Error('Failed to classify incoming email.');
  }
}

/**
 * 貿易メールへの自動返信文（多言語対応）を生成する
 * @param classification AIによるメール分類結果
 * @param originalEmailBody 元のメール本文
 * @param targetLanguage 返信に使用する言語 ('English' or 'Chinese')
 * @returns 自動返信の件名と本文
 */
export async function generateMultilingualResponse(
    classification: EmailClassification,
    originalEmailBody: string,
    targetLanguage: 'English' | 'Chinese'
): Promise<AutoResponse> {

    // N3の標準ポリシーを定義（実際のデータやDBから取得を想定）
    const N3_POLICY: Record<string, string> = {
        Quotation_Request: `Regarding your inquiry about SKUs ${classification.extracted_data.sku_list.join(', ')}, we are currently confirming the latest stock and price with the manufacturer. We will provide a formal quotation within 2 business days. Thank you for your patience.`,
        Payment_Confirmation: "Thank you for confirming the payment. We have initiated the shipping process. You will receive the tracking number within 24 hours.",
        // ... 他の分類のポリシー
    };

    const policy = N3_POLICY[classification.classification] || `We have received your email regarding "${classification.classification}". We will review the details and respond shortly.`;

    const prompt = `
        あなたはプロの貿易担当者です。以下の情報を基に、${targetLanguage}（${targetLanguage === 'Chinese' ? '簡体字' : '英語'}）で丁寧なビジネスメールを生成してください。

        ---
        【元のメール本文】: ${originalEmailBody}
        【分類結果】: ${classification.classification}
        【N3の標準対応ポリシー】: ${policy}

        【指示】: 標準対応ポリシーをベースに、元のメールの文脈を考慮し、プロフェッショナルで自然な多言語メールを作成してください。
        ---
    `;

    // 適切なモデル（ここでは generateContent のテキスト応答を利用）
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            temperature: 0.2,
        },
    });

    // LLMの出力を件名と本文に分割するロジックを実装（例：最初の1行を件名とする）
    const fullText = response.text.trim();
    const subject = fullText.split('\n')[0].replace(/Subject: ?/i, '').trim();

    return {
        subject: subject,
        body: fullText,
        language: targetLanguage,
    };
}
