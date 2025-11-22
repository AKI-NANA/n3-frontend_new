// services/messaging/AutoReplyEngine.ts

/**
 * I2: AI連携の完全実装
 * 顧客対応メール自動生成エンジン（Gemini API統合）
 *
 * このモジュールは、Gemini APIを使用して顧客メッセージを分析し、
 * 適切な返信を自動生成します。
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// ============================================================================
// 型定義
// ============================================================================

/**
 * 顧客メッセージ
 */
export interface CustomerMessage {
  id: string;
  threadId: string;
  sourceMall: string;
  messageBody: string;
  receivedAt: Date;
  orderId?: string;
  senderEmail?: string;
  senderName?: string;
}

/**
 * AI分析結果
 */
export interface MessageAnalysis {
  urgency: "critical" | "high" | "standard" | "low";
  sentiment: "positive" | "neutral" | "negative" | "angry";
  category:
    | "shipping_inquiry"
    | "product_inquiry"
    | "complaint"
    | "return_request"
    | "general"
    | "spam";
  requiresHumanReview: boolean;
  keyPoints: string[];
  suggestedActions: string[];
  confidenceScore: number;
}

/**
 * 自動返信結果
 */
export interface AutoReplyResult {
  success: boolean;
  replyText: string;
  analysis: MessageAnalysis;
  shouldSendImmediately: boolean;
  requiresApproval: boolean;
  processingTime: number;
  error?: string;
}

/**
 * Gemini API設定
 */
interface GeminiConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
}

// ============================================================================
// AutoReplyEngine クラス
// ============================================================================

/**
 * 顧客対応メール自動生成エンジン
 */
export class AutoReplyEngine {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private config: GeminiConfig;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || "";

    if (!apiKey) {
      console.warn(
        "⚠️ [AutoReplyEngine] GEMINI_API_KEY is not set. AI features will be disabled."
      );
    }

    this.config = {
      apiKey,
      model: process.env.GEMINI_MODEL || "gemini-1.5-pro",
      temperature: 0.7,
      maxOutputTokens: 2048,
    };

    this.genAI = new GoogleGenerativeAI(this.config.apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: this.config.model,
    });
  }

  // ==========================================================================
  // メイン処理: メッセージ分析と返信生成
  // ==========================================================================

  /**
   * 顧客メッセージを分析し、自動返信を生成
   *
   * @param message - 顧客メッセージ
   * @returns 自動返信結果
   */
  async generateAutoReply(
    message: CustomerMessage
  ): Promise<AutoReplyResult> {
    const startTime = Date.now();

    console.log(
      `\n🤖 [AutoReplyEngine] Processing message from ${message.sourceMall}...`
    );
    console.log(`   Thread ID: ${message.threadId}`);

    try {
      // STEP 1: メッセージを分析
      const analysis = await this.analyzeMessage(message);

      console.log(`   📊 Analysis completed:`);
      console.log(`      Urgency: ${analysis.urgency}`);
      console.log(`      Sentiment: ${analysis.sentiment}`);
      console.log(`      Category: ${analysis.category}`);
      console.log(`      Confidence: ${(analysis.confidenceScore * 100).toFixed(1)}%`);

      // STEP 2: 返信テキストを生成
      const replyText = await this.generateReplyText(message, analysis);

      // STEP 3: 送信可否を判定
      const shouldSendImmediately = this.shouldAutoSend(analysis);
      const requiresApproval = analysis.requiresHumanReview;

      const processingTime = Date.now() - startTime;

      console.log(`   ✅ Reply generated successfully`);
      console.log(`      Auto-send: ${shouldSendImmediately}`);
      console.log(`      Requires approval: ${requiresApproval}`);
      console.log(`      Processing time: ${processingTime}ms`);

      return {
        success: true,
        replyText,
        analysis,
        shouldSendImmediately,
        requiresApproval,
        processingTime,
      };
    } catch (error) {
      console.error(`   ❌ [AutoReplyEngine] Error:`, error);

      return {
        success: false,
        replyText: "",
        analysis: this.getDefaultAnalysis(),
        shouldSendImmediately: false,
        requiresApproval: true,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ==========================================================================
  // STEP 1: メッセージ分析
  // ==========================================================================

  /**
   * Gemini APIを使用してメッセージを分析
   */
  private async analyzeMessage(
    message: CustomerMessage
  ): Promise<MessageAnalysis> {
    const prompt = `
あなたはECマーケットプレイスのカスタマーサポートAIアシスタントです。
以下の顧客メッセージを分析し、JSON形式で結果を返してください。

【顧客メッセージ】
差出人: ${message.senderName || "不明"}
モール: ${message.sourceMall}
受信日時: ${message.receivedAt.toISOString()}
注文ID: ${message.orderId || "なし"}

メッセージ本文:
"""
${message.messageBody}
"""

【分析項目】
1. urgency: 緊急度 ("critical", "high", "standard", "low")
   - critical: クレーム、返金要求、法的問題
   - high: 配送遅延、商品不良
   - standard: 一般的な問い合わせ
   - low: 感謝のメッセージ

2. sentiment: 感情 ("positive", "neutral", "negative", "angry")

3. category: カテゴリ ("shipping_inquiry", "product_inquiry", "complaint", "return_request", "general", "spam")

4. requiresHumanReview: 人間の確認が必要か (true/false)
   - クレーム、返品、複雑な問い合わせはtrue

5. keyPoints: 重要なポイント（配列）

6. suggestedActions: 推奨アクション（配列）

7. confidenceScore: 分析の信頼度 (0.0-1.0)

以下のJSON形式で返してください:
{
  "urgency": "...",
  "sentiment": "...",
  "category": "...",
  "requiresHumanReview": true/false,
  "keyPoints": ["...", "..."],
  "suggestedActions": ["...", "..."],
  "confidenceScore": 0.0-1.0
}
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // JSONを抽出（マークダウンコードブロックを除去）
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to extract JSON from AI response");
      }

      const analysis: MessageAnalysis = JSON.parse(jsonMatch[0]);

      return analysis;
    } catch (error) {
      console.error(`❌ [AutoReplyEngine] Analysis failed:`, error);

      // フォールバック: デフォルト分析
      return this.getDefaultAnalysis();
    }
  }

  // ==========================================================================
  // STEP 2: 返信テキスト生成
  // ==========================================================================

  /**
   * Gemini APIを使用して返信テキストを生成
   */
  private async generateReplyText(
    message: CustomerMessage,
    analysis: MessageAnalysis
  ): Promise<string> {
    const prompt = `
あなたはECマーケットプレイスのカスタマーサポート担当者です。
以下の顧客メッセージに対して、丁寧で適切な返信を日本語で作成してください。

【顧客メッセージ】
差出人: ${message.senderName || "お客様"}
モール: ${message.sourceMall}
注文ID: ${message.orderId || "なし"}

メッセージ本文:
"""
${message.messageBody}
"""

【分析結果】
- 緊急度: ${analysis.urgency}
- 感情: ${analysis.sentiment}
- カテゴリ: ${analysis.category}
- 重要ポイント: ${analysis.keyPoints.join(", ")}

【返信ガイドライン】
1. 丁寧で誠実な対応を心がける
2. 具体的な解決策を提示する
3. 感謝の気持ちを伝える
4. クレームの場合は謝罪を含める
5. 200文字以内で簡潔に

返信テキストのみを生成してください（挨拶文と署名は除く）:
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const replyText = response.text().trim();

      return replyText;
    } catch (error) {
      console.error(`❌ [AutoReplyEngine] Reply generation failed:`, error);

      // フォールバック: 定型文
      return this.getDefaultReply(analysis.category);
    }
  }

  // ==========================================================================
  // STEP 3: 自動送信判定
  // ==========================================================================

  /**
   * 自動送信すべきかを判定
   */
  private shouldAutoSend(analysis: MessageAnalysis): boolean {
    // 人間の確認が必要な場合は自動送信しない
    if (analysis.requiresHumanReview) {
      return false;
    }

    // 緊急度がcriticalまたはhighの場合は自動送信しない
    if (analysis.urgency === "critical" || analysis.urgency === "high") {
      return false;
    }

    // 感情がangryまたはnegativeの場合は自動送信しない
    if (analysis.sentiment === "angry" || analysis.sentiment === "negative") {
      return false;
    }

    // クレームや返品要求は自動送信しない
    if (
      analysis.category === "complaint" ||
      analysis.category === "return_request"
    ) {
      return false;
    }

    // 信頼度が低い場合は自動送信しない
    if (analysis.confidenceScore < 0.8) {
      return false;
    }

    // それ以外は自動送信OK
    return true;
  }

  // ==========================================================================
  // ヘルパー関数
  // ==========================================================================

  /**
   * デフォルトの分析結果を取得
   */
  private getDefaultAnalysis(): MessageAnalysis {
    return {
      urgency: "standard",
      sentiment: "neutral",
      category: "general",
      requiresHumanReview: true,
      keyPoints: ["AI分析が失敗しました"],
      suggestedActions: ["人間が直接確認してください"],
      confidenceScore: 0,
    };
  }

  /**
   * カテゴリ別のデフォルト返信テキストを取得
   */
  private getDefaultReply(category: string): string {
    const defaultReplies: Record<string, string> = {
      shipping_inquiry:
        "お問い合わせいただきありがとうございます。配送状況につきまして、現在確認中でございます。詳細が分かり次第、改めてご連絡させていただきます。",
      product_inquiry:
        "お問い合わせいただきありがとうございます。商品につきまして、担当者が確認の上、改めてご連絡させていただきます。",
      complaint:
        "この度はご不便をおかけして誠に申し訳ございません。詳細を確認の上、早急に対応させていただきます。",
      return_request:
        "返品のご希望につきまして承知いたしました。返品手続きの詳細につきまして、担当者より改めてご連絡させていただきます。",
      general:
        "お問い合わせいただきありがとうございます。内容を確認の上、改めてご連絡させていただきます。",
      spam:
        "お問い合わせいただきありがとうございます。内容を確認させていただきます。",
    };

    return (
      defaultReplies[category] ||
      "お問い合わせいただきありがとうございます。内容を確認の上、改めてご連絡させていただきます。"
    );
  }

  // ==========================================================================
  // バッチ処理
  // ==========================================================================

  /**
   * 複数のメッセージを一括処理
   */
  async processBatch(
    messages: CustomerMessage[]
  ): Promise<AutoReplyResult[]> {
    console.log(
      `\n🔄 [AutoReplyEngine] Processing batch of ${messages.length} messages...`
    );

    const results: AutoReplyResult[] = [];

    for (const message of messages) {
      const result = await this.generateAutoReply(message);
      results.push(result);

      // レート制限対策: 各リクエスト間に500ms待機
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const successCount = results.filter((r) => r.success).length;
    const autoSendCount = results.filter((r) => r.shouldSendImmediately).length;

    console.log(`\n✅ [AutoReplyEngine] Batch processing completed:`);
    console.log(`   Total: ${messages.length}`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Auto-send ready: ${autoSendCount}`);
    console.log(`   Requires approval: ${results.length - autoSendCount}`);

    return results;
  }
}

// ============================================================================
// エクスポート: シングルトンインスタンス
// ============================================================================

let autoReplyEngineInstance: AutoReplyEngine | null = null;

/**
 * AutoReplyEngineのシングルトンインスタンスを取得
 */
export function getAutoReplyEngine(): AutoReplyEngine {
  if (!autoReplyEngineInstance) {
    autoReplyEngineInstance = new AutoReplyEngine();
  }
  return autoReplyEngineInstance;
}
