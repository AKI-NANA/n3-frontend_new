// AutoReplyEngine.ts: Gemini APIを利用した顧客対応自動化エンジン (I2-1)

import { GoogleGenerativeAI } from "@google/generative-ai";

// メッセージの緊急度レベル
export enum UrgencyLevel {
  CRITICAL = "CRITICAL", // 即時対応必要
  HIGH = "HIGH", // 24時間以内対応
  MEDIUM = "MEDIUM", // 48時間以内対応
  LOW = "LOW", // 1週間以内対応
}

// 自動返信エンジンの設定
interface AutoReplyConfig {
  geminiApiKey?: string;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  enableAutoSend?: boolean; // 自動送信を有効化（危険なのでデフォルトfalse）
}

// 顧客メッセージの情報
interface CustomerMessage {
  messageId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  messageBody: string;
  receivedAt: Date;
  marketplace: string; // Amazon, eBay, etc.
  orderId?: string;
}

// 注文情報（orders_v2テーブル）
interface OrderInfo {
  orderId: string;
  status: string;
  totalAmount: number;
  currency: string;
  items: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    price: number;
  }>;
  createdAt: Date;
  estimatedDeliveryDate?: Date;
}

// 配送状況（shipping_queueテーブル）
interface ShippingStatus {
  shipmentId: string;
  orderId: string;
  carrier: string;
  trackingNumber?: string;
  status: string; // PENDING, IN_TRANSIT, DELIVERED, etc.
  shippedAt?: Date;
  estimatedDeliveryAt?: Date;
  actualDeliveryAt?: Date;
  lastUpdatedAt: Date;
}

// AI生成結果
interface AIResponse {
  suggestedReply: string;
  urgencyLevel: UrgencyLevel;
  requiresHumanReview: boolean;
  detectedIntent: string;
  confidence: number; // 0-1
  reasoning: string;
}

/**
 * Gemini APIを利用した自動返信エンジン
 */
export class AutoReplyEngine {
  private genAI: GoogleGenerativeAI | null = null;
  private config: AutoReplyConfig;

  constructor(config: AutoReplyConfig = {}) {
    this.config = {
      modelName: "gemini-2.0-flash-exp",
      temperature: 0.7,
      maxTokens: 1024,
      enableAutoSend: false,
      ...config,
    };

    // APIキー検証と初期化
    if (this.config.geminiApiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(this.config.geminiApiKey);
      } catch (error) {
        console.error("Failed to initialize Gemini API:", error);
        this.genAI = null;
      }
    } else {
      console.warn(
        "Gemini API key not provided. AutoReplyEngine will run in mock mode."
      );
    }
  }

  /**
   * 顧客メッセージに対する自動返信を生成
   */
  async generateAutoReply(
    message: CustomerMessage,
    orderInfo?: OrderInfo,
    shippingStatus?: ShippingStatus
  ): Promise<AIResponse> {
    // APIキー未設定時のエラーハンドリング
    if (!this.genAI) {
      return this.generateMockResponse(message);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.config.modelName!,
      });

      // プロンプト構築
      const prompt = this.buildPrompt(message, orderInfo, shippingStatus);

      // Gemini APIを呼び出し
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxTokens,
        },
      });

      const response = result.response;
      const text = response.text();

      // レスポンスをパース
      return this.parseAIResponse(text, message);
    } catch (error) {
      console.error("Gemini API error:", error);

      // APIエラー時のフォールバック
      if (error instanceof Error && error.message.includes("API_KEY")) {
        throw new Error(
          "Invalid Gemini API key. Please check your configuration."
        );
      }

      // その他のエラーはモックレスポンスを返す
      return this.generateMockResponse(message);
    }
  }

  /**
   * プロンプト構築
   */
  private buildPrompt(
    message: CustomerMessage,
    orderInfo?: OrderInfo,
    shippingStatus?: ShippingStatus
  ): string {
    let prompt = `You are a professional customer service AI for an e-commerce business. Analyze the customer message and generate an appropriate reply in the customer's language.

Customer Information:
- Name: ${message.customerName}
- Email: ${message.customerEmail}
- Marketplace: ${message.marketplace}
- Message Received: ${message.receivedAt.toISOString()}

Customer Message:
"""
${message.messageBody}
"""
`;

    // 注文情報を追加
    if (orderInfo) {
      prompt += `\nOrder Information:
- Order ID: ${orderInfo.orderId}
- Status: ${orderInfo.status}
- Total: ${orderInfo.totalAmount} ${orderInfo.currency}
- Order Date: ${orderInfo.createdAt.toISOString()}
- Items: ${orderInfo.items.map((item) => `${item.itemName} (x${item.quantity})`).join(", ")}
`;
      if (orderInfo.estimatedDeliveryDate) {
        prompt += `- Estimated Delivery: ${orderInfo.estimatedDeliveryDate.toISOString()}\n`;
      }
    }

    // 配送状況を追加
    if (shippingStatus) {
      prompt += `\nShipping Status:
- Shipment ID: ${shippingStatus.shipmentId}
- Carrier: ${shippingStatus.carrier}
- Status: ${shippingStatus.status}
`;
      if (shippingStatus.trackingNumber) {
        prompt += `- Tracking Number: ${shippingStatus.trackingNumber}\n`;
      }
      if (shippingStatus.shippedAt) {
        prompt += `- Shipped At: ${shippingStatus.shippedAt.toISOString()}\n`;
      }
      if (shippingStatus.estimatedDeliveryAt) {
        prompt += `- Estimated Delivery: ${shippingStatus.estimatedDeliveryAt.toISOString()}\n`;
      }
      if (shippingStatus.actualDeliveryAt) {
        prompt += `- Actual Delivery: ${shippingStatus.actualDeliveryAt.toISOString()}\n`;
      }
    }

    prompt += `\nPlease provide your response in the following JSON format:
{
  "suggestedReply": "Your suggested reply to the customer in their language",
  "urgencyLevel": "CRITICAL | HIGH | MEDIUM | LOW",
  "requiresHumanReview": true/false,
  "detectedIntent": "Brief description of what the customer wants",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of your analysis"
}

Urgency Guidelines:
- CRITICAL: Disputes, refund demands, legal threats, severe complaints
- HIGH: Delivery delays, damaged items, order cancellations
- MEDIUM: General inquiries, minor issues, product questions
- LOW: Thank you messages, general feedback

requiresHumanReview should be true if:
- Urgency is CRITICAL or HIGH
- Customer is angry or frustrated
- Complex issues requiring judgment
- Refunds or compensation are involved

Respond ONLY with valid JSON. No markdown, no extra text.`;

    return prompt;
  }

  /**
   * AIレスポンスをパース
   */
  private parseAIResponse(
    text: string,
    originalMessage: CustomerMessage
  ): AIResponse {
    try {
      // JSONを抽出（マークダウンのコードブロックを除去）
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        suggestedReply: parsed.suggestedReply || "",
        urgencyLevel: this.validateUrgencyLevel(parsed.urgencyLevel),
        requiresHumanReview: parsed.requiresHumanReview === true,
        detectedIntent: parsed.detectedIntent || "Unknown",
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        reasoning: parsed.reasoning || "",
      };
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      // パースエラー時のフォールバック
      return {
        suggestedReply: text,
        urgencyLevel: UrgencyLevel.MEDIUM,
        requiresHumanReview: true,
        detectedIntent: "Parse Error",
        confidence: 0.3,
        reasoning: "Failed to parse AI response properly",
      };
    }
  }

  /**
   * 緊急度レベルの検証
   */
  private validateUrgencyLevel(level: string): UrgencyLevel {
    const validLevels = Object.values(UrgencyLevel);
    if (validLevels.includes(level as UrgencyLevel)) {
      return level as UrgencyLevel;
    }
    return UrgencyLevel.MEDIUM;
  }

  /**
   * モックレスポンス生成（APIキー未設定時）
   */
  private generateMockResponse(message: CustomerMessage): AIResponse {
    // キーワードベースの簡易分析
    const lowercaseMessage = message.messageBody.toLowerCase();

    let urgencyLevel = UrgencyLevel.MEDIUM;
    let detectedIntent = "General Inquiry";
    let requiresHumanReview = false;

    // キーワードマッチング
    if (
      lowercaseMessage.includes("refund") ||
      lowercaseMessage.includes("dispute") ||
      lowercaseMessage.includes("lawyer") ||
      lowercaseMessage.includes("complaint")
    ) {
      urgencyLevel = UrgencyLevel.CRITICAL;
      detectedIntent = "Refund/Dispute Request";
      requiresHumanReview = true;
    } else if (
      lowercaseMessage.includes("delay") ||
      lowercaseMessage.includes("damaged") ||
      lowercaseMessage.includes("cancel") ||
      lowercaseMessage.includes("wrong item")
    ) {
      urgencyLevel = UrgencyLevel.HIGH;
      detectedIntent = "Order Issue";
      requiresHumanReview = true;
    } else if (
      lowercaseMessage.includes("when") ||
      lowercaseMessage.includes("where") ||
      lowercaseMessage.includes("how")
    ) {
      urgencyLevel = UrgencyLevel.MEDIUM;
      detectedIntent = "Information Request";
    } else if (
      lowercaseMessage.includes("thank") ||
      lowercaseMessage.includes("great")
    ) {
      urgencyLevel = UrgencyLevel.LOW;
      detectedIntent = "Positive Feedback";
    }

    const suggestedReply = this.generateTemplatReply(detectedIntent, message);

    return {
      suggestedReply,
      urgencyLevel,
      requiresHumanReview,
      detectedIntent,
      confidence: 0.6,
      reasoning:
        "Generated using fallback template logic (Gemini API not available)",
    };
  }

  /**
   * テンプレート返信生成
   */
  private generateTemplatReply(
    intent: string,
    message: CustomerMessage
  ): string {
    const customerName = message.customerName || "Valued Customer";

    switch (intent) {
      case "Refund/Dispute Request":
        return `Dear ${customerName},

Thank you for contacting us. We take your concerns very seriously and want to resolve this matter as quickly as possible.

Our customer service team has been notified of your request and will review your case within 24 hours. We will contact you directly with a resolution.

If you have any additional information or documentation that would help us resolve this issue, please feel free to share it with us.

Best regards,
Customer Service Team`;

      case "Order Issue":
        return `Dear ${customerName},

Thank you for reaching out to us about your order.

We apologize for any inconvenience this may have caused. We are currently investigating your case and will provide you with an update within 24-48 hours.

In the meantime, if you have any questions or additional concerns, please don't hesitate to contact us.

Best regards,
Customer Service Team`;

      case "Information Request":
        return `Dear ${customerName},

Thank you for your inquiry.

We have received your message and our team is looking into your request. We will get back to you with the information you need as soon as possible, typically within 1-2 business days.

If you have any urgent concerns, please let us know.

Best regards,
Customer Service Team`;

      case "Positive Feedback":
        return `Dear ${customerName},

Thank you so much for your kind words! We're thrilled to hear that you're satisfied with your purchase.

Customer satisfaction is our top priority, and feedback like yours makes our day. We look forward to serving you again in the future.

Best regards,
Customer Service Team`;

      default:
        return `Dear ${customerName},

Thank you for contacting us. We have received your message and will respond as soon as possible.

If you have any urgent concerns, please don't hesitate to reach out to us directly.

Best regards,
Customer Service Team`;
    }
  }

  /**
   * バッチ処理: 複数メッセージの一括分析
   */
  async processBatch(
    messages: Array<{
      message: CustomerMessage;
      orderInfo?: OrderInfo;
      shippingStatus?: ShippingStatus;
    }>
  ): Promise<AIResponse[]> {
    const results: AIResponse[] = [];

    for (const item of messages) {
      try {
        const response = await this.generateAutoReply(
          item.message,
          item.orderInfo,
          item.shippingStatus
        );
        results.push(response);
      } catch (error) {
        console.error(
          `Failed to process message ${item.message.messageId}:`,
          error
        );
        results.push(this.generateMockResponse(item.message));
      }
    }

    return results;
  }
}

// デフォルトインスタンス（環境変数からAPIキーを取得）
let defaultEngine: AutoReplyEngine | null = null;

export function getAutoReplyEngine(): AutoReplyEngine {
  if (!defaultEngine) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    defaultEngine = new AutoReplyEngine({ geminiApiKey: apiKey });
  }
  return defaultEngine;
}

// 使用例エクスポート
export const AutoReplyEngineExample = {
  async example() {
    const engine = getAutoReplyEngine();

    const testMessage: CustomerMessage = {
      messageId: "msg_001",
      customerId: "cust_12345",
      customerName: "John Doe",
      customerEmail: "john@example.com",
      messageBody: "Where is my order? It's been 2 weeks!",
      receivedAt: new Date(),
      marketplace: "Amazon",
      orderId: "order_67890",
    };

    const testOrder: OrderInfo = {
      orderId: "order_67890",
      status: "SHIPPED",
      totalAmount: 99.99,
      currency: "USD",
      items: [
        {
          itemId: "item_001",
          itemName: "Wireless Headphones",
          quantity: 1,
          price: 99.99,
        },
      ],
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      estimatedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    };

    const testShipping: ShippingStatus = {
      shipmentId: "ship_001",
      orderId: "order_67890",
      carrier: "USPS",
      trackingNumber: "9400111899562537840123",
      status: "IN_TRANSIT",
      shippedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      estimatedDeliveryAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      lastUpdatedAt: new Date(),
    };

    const response = await engine.generateAutoReply(
      testMessage,
      testOrder,
      testShipping
    );

    console.log("AI Response:", response);
  },
};
