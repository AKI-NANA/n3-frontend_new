// /services/messaging/AutoReplyEngine.ts
// I2-1: Gemini API統合による顧客対応AI

import { UnifiedMessage, MessageIntent, Urgency, MessageTemplate, SourceMall, TrainingData } from '@/types/messaging';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API設定
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash-exp'; // または 'gemini-1.5-flash'

// Gemini APIクライアント初期化
let genAI: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  } catch (error) {
    console.error('Failed to initialize Gemini AI:', error);
  }
}

// 💡 外部DB/APIからテンプレートと教師データを取得するモック
const MOCK_TEMPLATES: MessageTemplate[] = [
    { template_id: 'T-001', target_malls: ['eBay_US', 'Amazon_JP'], target_intent: 'DeliveryStatus', content: "Thank you for your inquiry about order {{order_id}} on {{source_mall}}. The tracking shows it is scheduled for delivery on {{estimated_date}}. {{Mall_Specific_Policy}}", language: 'EN' },
    { template_id: 'T-002', target_malls: ['Shopee_TW'], target_intent: 'DeliveryStatus', content: "感謝您的訂單 {{order_id}}。 預計交貨日期是 {{estimated_date}}。 {{Mall_Specific_Policy}}", language: 'ZH' },
];

// Gemini APIが利用可能かチェック
function isGeminiAvailable(): boolean {
  return genAI !== null && GEMINI_API_KEY.length > 0;
}

// --- A. AI分類・学習ロジック ---

/**
 * AIを利用して通知メッセージの緊急度と意図を分類する（Claude KDL連携想定）
 */
export async function classifyMessage(message: UnifiedMessage): Promise<{ intent: MessageIntent, urgency: Urgency }> {
    // 💡 Claude KDLへのAPIコールを想定。ここではキーワードベースの簡易ロジックで代用。

    const titleBody = (message.subject + " " + message.body).toLowerCase();

    // 1. 緊急度 (Urgency) 分類
    if (titleBody.includes('suspend') || titleBody.includes('violation') || titleBody.includes('restriction')) {
        return { intent: 'PolicyViolation', urgency: '緊急対応 (赤)' };
    }
    if (titleBody.includes('payment') || titleBody.includes('account update')) {
        return { intent: 'SystemUpdate', urgency: '標準通知 (黄)' };
    }
    if (titleBody.includes('promotion') || titleBody.includes('marketing')) {
        return { intent: 'Marketing', urgency: '無視/アーカイブ (灰)' };
    }
    
    // 2. 顧客メッセージの意図 (Intent) 分類
    if (titleBody.includes('tracking') || titleBody.includes('where is my order')) {
        return { intent: 'DeliveryStatus', urgency: '標準通知 (黄)' };
    }
    if (titleBody.includes('return') || titleBody.includes('exchange') || titleBody.includes('refund')) {
        return { intent: 'RefundRequest', urgency: '緊急対応 (赤)' }; // 迅速対応が基本
    }

    // デフォルト
    return { intent: 'ProductQuestion', urgency: '標準通知 (黄)' };
}

/**
 * ユーザーがAI分類を修正した際に、教師データとしてDBに書き込むモック関数
 */
export async function submitClassificationCorrection(data: TrainingData): Promise<void> {
    // 💡 ここに教師データDB（Firestore/Supabase）への書き込みロジックを実装
    console.log(`[AI Learning] Submitted correction for: ${data.original_message_title}. New Urgency: ${data.corrected_urgency}`);
}


// --- B. 自動返信生成ロジック ---

/**
 * Gemini APIを使用してAI応答を生成
 */
async function generateGeminiResponse(
  message: UnifiedMessage,
  orderInfo?: { orderId: string; estimatedDelivery?: string; totalAmount?: number }
): Promise<string> {
  if (!isGeminiAvailable()) {
    throw new Error('Gemini APIが利用できません');
  }

  const model = genAI!.getGenerativeModel({ model: GEMINI_MODEL });

  // プロンプト構築
  const prompt = `あなたはeコマースのカスタマーサポート担当者です。以下の顧客からの問い合わせに対して、プロフェッショナルで親切な返信を生成してください。

【マーケットプレイス】: ${message.source_mall}
【顧客からの問い合わせ】:
件名: ${message.subject}
本文: ${message.body}

${orderInfo ? `【注文情報】:
- 注文ID: ${orderInfo.orderId}
- 配送予定日: ${orderInfo.estimatedDelivery || '確認中'}
- 注文金額: ${orderInfo.totalAmount ? `$${orderInfo.totalAmount}` : '未確認'}` : ''}

【返信要件】:
1. 顧客の質問に的確に回答する
2. プロフェッショナルかつ親切なトーンを保つ
3. 必要に応じてマーケットプレイスのポリシーに言及する
4. 200語以内で簡潔に
5. 問い合わせ内容が英語の場合は英語で、日本語の場合は日本語で返信する

返信文のみを生成してください（挨拶や署名は含めないでください）:`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API呼び出しエラー:', error);
    throw error;
  }
}

/**
 * モールコンテキストに基づき、最適なテンプレートを検索・レンダリングする
 * I2-1: Gemini API統合版
 */
export async function generateAutoReply(message: UnifiedMessage, orderInfo?: { orderId: string; estimatedDelivery?: string; totalAmount?: number }): Promise<{ suggestedReply: string, templateId: string | null }> {

    // 1. Gemini APIが利用可能な場合、AI生成を優先
    if (isGeminiAvailable()) {
      try {
        const aiReply = await generateGeminiResponse(message, orderInfo);
        return { suggestedReply: aiReply, templateId: 'AI_GENERATED' };
      } catch (error) {
        console.warn('Gemini API生成に失敗、テンプレートにフォールバック:', error);
        // エラー時はテンプレートベースにフォールバック
      }
    }

    // 2. 意図とモールに合致するテンプレートをフィルタリング（フォールバック）
    const matchedTemplate = MOCK_TEMPLATES.find(t =>
        t.target_intent === message.ai_intent &&
        (t.target_malls.length === 0 || t.target_malls.includes(message.source_mall))
    );

    if (!matchedTemplate) {
        // テンプレートが見つからない場合、定型文を返す
        return {
          suggestedReply: isGeminiAvailable()
            ? "AIサービスは現在利用できません。お手数ですが、手動でご対応ください。"
            : "お問い合わせありがとうございます。担当者が確認の上、24時間以内にご返信いたします。",
          templateId: null
        };
    }

    // 3. プレースホルダーとモール固有ポリシーのレンダリング
    let reply = matchedTemplate.content;
    const orderId = orderInfo?.orderId || "ORD-" + message.thread_id.substring(0, 5).toUpperCase();
    const estimatedDate = orderInfo?.estimatedDelivery || "2025-11-20";

    // モール固有ポリシーの動的挿入
    let mallPolicyText = "";
    if (message.source_mall.includes('eBay')) {
        mallPolicyText = "We highly value your positive feedback and are protected by eBay's Seller Policy.";
    } else if (message.source_mall.includes('Amazon')) {
        mallPolicyText = "Please refer to Amazon's 30-day return window for eligibility.";
    } else if (message.source_mall.includes('Etsy')) {
        mallPolicyText = "All items are backed by Etsy's Purchase Protection program.";
    } else if (message.source_mall.includes('Bonanza')) {
        mallPolicyText = "Returns accepted within 30 days of delivery.";
    }

    // 4. 最終的な応答文を生成
    reply = reply.replace('{{order_id}}', orderId)
                 .replace('{{estimated_date}}', estimatedDate)
                 .replace('{{source_mall}}', message.source_mall)
                 .replace('{{Mall_Specific_Policy}}', mallPolicyText);

    return { suggestedReply: reply, templateId: matchedTemplate.template_id };
}

/**
 * Gemini APIの健全性チェック
 */
export function checkGeminiApiStatus(): {
  available: boolean;
  message: string;
} {
  if (!GEMINI_API_KEY) {
    return {
      available: false,
      message: 'NEXT_PUBLIC_GEMINI_API_KEYが設定されていません。環境変数を確認してください。',
    };
  }

  if (!genAI) {
    return {
      available: false,
      message: 'Gemini AIの初期化に失敗しました。',
    };
  }

  return {
    available: true,
    message: 'Gemini APIは正常に動作しています。',
  };
}