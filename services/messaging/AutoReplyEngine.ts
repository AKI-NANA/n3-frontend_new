/**
 * I2: AI連携完全実装 - 顧客対応AI自動返信エンジン
 * Gemini APIを使用して、顧客メッセージに適切な返信を自動生成
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// ==========================================
// 型定義
// ==========================================

interface CustomerMessage {
  id: string;
  marketplace: string;
  fromUser: string;
  subject?: string;
  body: string;
  messageType?: string;
  orderNumber?: string;
  orderDetails?: OrderDetails;
  receivedAt: Date;
}

interface OrderDetails {
  orderNumber: string;
  sku: string;
  productName: string;
  sellingPrice: number;
  profitRate: number;
  shippingStatus: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
}

interface AutoReplyResult {
  success: boolean;
  suggestedReply: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  urgencyLevel: 'urgent' | 'high' | 'normal' | 'low';
  requiresHuman: boolean;
  confidence: number;
  error?: string;
}

interface GeminiConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
}

// ==========================================
// Gemini API設定
// ==========================================

const DEFAULT_CONFIG: GeminiConfig = {
  apiKey: process.env.GEMINI_API_KEY || '',
  model: 'gemini-1.5-pro',
  temperature: 0.7,
  maxOutputTokens: 1000,
};

// 安全設定
const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// ==========================================
// AutoReplyEngine クラス
// ==========================================

export class AutoReplyEngine {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private config: GeminiConfig;

  constructor(config?: Partial<GeminiConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (!this.config.apiKey) {
      throw new Error('GEMINI_API_KEY が設定されていません。環境変数を確認してください。');
    }

    this.genAI = new GoogleGenerativeAI(this.config.apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: this.config.model,
      safetySettings: SAFETY_SETTINGS,
    });
  }

  /**
   * 顧客メッセージに対する自動返信を生成
   */
  async generateReply(message: CustomerMessage): Promise<AutoReplyResult> {
    try {
      console.log(`🤖 AI返信生成開始: ${message.id}`);

      // プロンプトの構築
      const prompt = this.buildPrompt(message);

      // Gemini APIを呼び出し
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxOutputTokens,
        },
      });

      const response = await result.response;
      const generatedText = response.text();

      // レスポンスをパース
      const parsedResult = this.parseAIResponse(generatedText);

      console.log(`✅ AI返信生成完了: ${message.id}`);
      console.log(`  感情分析: ${parsedResult.sentiment}`);
      console.log(`  緊急度: ${parsedResult.urgencyLevel}`);
      console.log(`  人間対応必要: ${parsedResult.requiresHuman ? 'はい' : 'いいえ'}`);

      return {
        success: true,
        ...parsedResult,
      };
    } catch (error: any) {
      console.error('❌ AI返信生成エラー:', error.message);

      return {
        success: false,
        suggestedReply: '',
        sentiment: 'neutral',
        urgencyLevel: 'normal',
        requiresHuman: true,
        confidence: 0,
        error: error.message,
      };
    }
  }

  /**
   * プロンプトの構築
   */
  private buildPrompt(message: CustomerMessage): string {
    const { marketplace, fromUser, subject, body, orderDetails } = message;

    let prompt = `
あなたは、ECマーケットプレイス（${marketplace}）のカスタマーサポートAIアシスタントです。

【顧客情報】
- 送信者: ${fromUser}
- 件名: ${subject || '(なし)'}
- メッセージ:
${body}
`;

    // 注文情報がある場合は追加
    if (orderDetails) {
      prompt += `

【注文情報】
- 注文番号: ${orderDetails.orderNumber}
- SKU: ${orderDetails.sku}
- 商品名: ${orderDetails.productName}
- 販売価格: ¥${orderDetails.sellingPrice.toLocaleString()}
- 利益率: ${orderDetails.profitRate}%
- 配送ステータス: ${orderDetails.shippingStatus}
${orderDetails.trackingNumber ? `- 追跡番号: ${orderDetails.trackingNumber}` : ''}
${orderDetails.estimatedDelivery ? `- 配送予定日: ${orderDetails.estimatedDelivery.toLocaleDateString('ja-JP')}` : ''}
`;
    }

    prompt += `

【タスク】
以下の情報を含むJSON形式で応答してください:

1. **suggestedReply**: 顧客への返信文（丁寧で親切、具体的な情報を含む）
2. **sentiment**: メッセージの感情分析（positive/neutral/negative）
3. **urgencyLevel**: 緊急度（urgent/high/normal/low）
4. **requiresHuman**: 人間の対応が必要かどうか（true/false）
5. **confidence**: AI提案の信頼度（0-100）

【返信文の作成ガイドライン】
- 丁寧で親切な言葉遣い
- 具体的な情報（追跡番号、配送予定日など）を提供
- 問題がある場合は、明確な解決策を提示
- クレーム対応の場合は、謝罪と補償案を含める
- 緊急性が高い場合は、迅速な対応を約束

【応答例】
{
  "suggestedReply": "この度はご注文いただきありがとうございます。商品は現在、配送準備中でございます。追跡番号: 1234567890でご確認いただけます。配送予定日は2025年11月25日となっております。何かご不明な点がございましたら、お気軽にお問い合わせください。",
  "sentiment": "neutral",
  "urgencyLevel": "normal",
  "requiresHuman": false,
  "confidence": 85
}

JSON形式のみで応答してください（説明文は不要）:`;

    return prompt;
  }

  /**
   * AIレスポンスのパース
   */
  private parseAIResponse(responseText: string): Omit<AutoReplyResult, 'success'> {
    try {
      // JSONブロックを抽出（マークダウンのコードブロックを除去）
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                       responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('JSONレスポンスが見つかりません');
      }

      const jsonText = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonText);

      return {
        suggestedReply: parsed.suggestedReply || '',
        sentiment: parsed.sentiment || 'neutral',
        urgencyLevel: parsed.urgencyLevel || 'normal',
        requiresHuman: parsed.requiresHuman || false,
        confidence: parsed.confidence || 0,
      };
    } catch (error: any) {
      console.warn('⚠️ AIレスポンスのパースに失敗。デフォルト値を返します。');

      return {
        suggestedReply: responseText,
        sentiment: 'neutral',
        urgencyLevel: 'normal',
        requiresHuman: true,
        confidence: 0,
      };
    }
  }

  /**
   * バッチ処理: 複数メッセージの一括返信生成
   */
  async generateRepliesBatch(messages: CustomerMessage[]): Promise<Map<string, AutoReplyResult>> {
    console.log(`🔄 バッチ処理開始: ${messages.length} 件のメッセージ`);

    const results = new Map<string, AutoReplyResult>();

    for (const message of messages) {
      try {
        const result = await this.generateReply(message);
        results.set(message.id, result);

        // レート制限対策: 各リクエスト間に500ms待機
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        console.error(`❌ メッセージ ${message.id} の処理エラー:`, error.message);
        results.set(message.id, {
          success: false,
          suggestedReply: '',
          sentiment: 'neutral',
          urgencyLevel: 'normal',
          requiresHuman: true,
          confidence: 0,
          error: error.message,
        });
      }
    }

    console.log(`✅ バッチ処理完了: ${results.size} 件処理済み`);
    return results;
  }

  /**
   * メッセージの感情分析のみ実行
   */
  async analyzeSentiment(messageBody: string): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative';
    urgencyLevel: 'urgent' | 'high' | 'normal' | 'low';
    confidence: number;
  }> {
    try {
      const prompt = `
以下の顧客メッセージを分析し、感情と緊急度をJSON形式で返してください:

メッセージ:
${messageBody}

応答例:
{
  "sentiment": "negative",
  "urgencyLevel": "urgent",
  "confidence": 90
}

JSON形式のみで応答してください:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          sentiment: parsed.sentiment || 'neutral',
          urgencyLevel: parsed.urgencyLevel || 'normal',
          confidence: parsed.confidence || 0,
        };
      }

      return { sentiment: 'neutral', urgencyLevel: 'normal', confidence: 0 };
    } catch (error) {
      console.error('❌ 感情分析エラー:', error);
      return { sentiment: 'neutral', urgencyLevel: 'normal', confidence: 0 };
    }
  }
}

// ==========================================
// エクスポート
// ==========================================

export default AutoReplyEngine;

// シングルトンインスタンス
let autoReplyEngineInstance: AutoReplyEngine | null = null;

export function getAutoReplyEngine(config?: Partial<GeminiConfig>): AutoReplyEngine {
  if (!autoReplyEngineInstance) {
    autoReplyEngineInstance = new AutoReplyEngine(config);
  }
  return autoReplyEngineInstance;
}
