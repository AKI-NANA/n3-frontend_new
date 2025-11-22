// ============================================
// 自動返信エンジン（Phase 6統合: AI連携）
// Gemini API使用: gemini-2.5-flash推奨
// ============================================

interface OrderInfo {
  order_id: string;
  sku: string;
  product_title: string;
  shipping_status: string; // 'new', 'pending', 'processing', 'shipped', 'delivered'
  tracking_number?: string;
  profit_rate?: number;
  total_amount_usd: number;
  customer_name: string;
  shipping_country: string;
  shipping_deadline?: string;
}

interface CustomerMessage {
  message_id: string;
  subject: string;
  body: string;
  marketplace: string;
  received_at: string;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface AutoReplyResult {
  success: boolean;
  reply_draft: string;
  ai_confidence: number; // 0-1
  suggested_urgency: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  error?: string;
}

/**
 * Gemini APIを使用して顧客対応メールを生成
 *
 * @param orderInfo 注文情報（SKU, 配送状況, 利益率など）
 * @param customerMessage 顧客メッセージ
 * @returns AI生成の返信ドラフト
 */
export async function generateAutoReply(
  orderInfo: OrderInfo,
  customerMessage: CustomerMessage
): Promise<AutoReplyResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      reply_draft: '',
      ai_confidence: 0,
      suggested_urgency: 'medium',
      category: 'unknown',
      error: 'GEMINI_API_KEY not configured',
    };
  }

  try {
    // プロンプト構築
    const prompt = buildCustomerReplyPrompt(orderInfo, customerMessage);

    // Gemini API呼び出し
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
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
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data: GeminiResponse = await response.json();
    const replyText = data.candidates[0]?.content?.parts[0]?.text || '';

    // カテゴリーと緊急度の分析
    const analysis = analyzeCustomerMessage(customerMessage.body);

    return {
      success: true,
      reply_draft: replyText.trim(),
      ai_confidence: 0.85, // Geminiの品質は高いため、デフォルト0.85
      suggested_urgency: analysis.urgency,
      category: analysis.category,
    };
  } catch (error: any) {
    console.error('AutoReplyEngine error:', error);
    return {
      success: false,
      reply_draft: '',
      ai_confidence: 0,
      suggested_urgency: 'medium',
      category: 'unknown',
      error: error.message,
    };
  }
}

/**
 * プロンプト構築（構造化された返信を強制）
 */
function buildCustomerReplyPrompt(
  orderInfo: OrderInfo,
  customerMessage: CustomerMessage
): string {
  const shippingStatusJapanese = {
    new: '注文確認中',
    pending: '出荷準備中',
    processing: '梱包中',
    shipped: '発送済み',
    delivered: '配達完了',
  };

  return `あなたは、多販路EC（${customerMessage.marketplace}）の顧客サポート担当者です。
以下の注文情報と顧客メッセージに基づいて、丁寧で適切な返信メールを日本語で作成してください。

【重要な制約】
1. 返信は「謝罪 → 状況説明 → 具体的な解決策」の構造に従うこと
2. 配送状況が「発送済み」の場合は追跡番号を必ず記載すること
3. 配送遅延の可能性がある場合は、出荷期限（${orderInfo.shipping_deadline || '未設定'}）を考慮した正確な見込み日を伝えること
4. 返金要求の場合は、ポリシーに沿った対応を明記すること
5. 顧客名（${orderInfo.customer_name}）を使用し、個別対応感を出すこと

【注文情報】
- 注文番号: ${orderInfo.order_id}
- 商品: ${orderInfo.product_title} (SKU: ${orderInfo.sku})
- 配送先: ${orderInfo.shipping_country}
- 配送状況: ${shippingStatusJapanese[orderInfo.shipping_status as keyof typeof shippingStatusJapanese] || orderInfo.shipping_status}
- 追跡番号: ${orderInfo.tracking_number || 'まだ発行されていません'}
- 出荷期限: ${orderInfo.shipping_deadline || '設定なし'}

【顧客メッセージ】
件名: ${customerMessage.subject}
本文:
${customerMessage.body}

【返信メールを生成してください】
※ 件名は含めず、本文のみを出力してください。
※ 署名は「多販路ECサポートチーム」で終わってください。`;
}

/**
 * 顧客メッセージの緊急度とカテゴリーを分析
 */
function analyzeCustomerMessage(messageBody: string): {
  urgency: 'low' | 'medium' | 'high' | 'critical';
  category: string;
} {
  const lowerBody = messageBody.toLowerCase();

  // 緊急度の判定
  let urgency: 'low' | 'medium' | 'high' | 'critical' = 'medium';

  if (
    lowerBody.includes('refund') ||
    lowerBody.includes('返金') ||
    lowerBody.includes('cancel') ||
    lowerBody.includes('キャンセル') ||
    lowerBody.includes('詐欺') ||
    lowerBody.includes('scam')
  ) {
    urgency = 'critical';
  } else if (
    lowerBody.includes('not received') ||
    lowerBody.includes('届かない') ||
    lowerBody.includes('遅い') ||
    lowerBody.includes('late') ||
    lowerBody.includes('delayed')
  ) {
    urgency = 'high';
  } else if (
    lowerBody.includes('tracking') ||
    lowerBody.includes('追跡') ||
    lowerBody.includes('where is') ||
    lowerBody.includes('どこ')
  ) {
    urgency = 'medium';
  }

  // カテゴリーの判定
  let category = 'general_inquiry';

  if (lowerBody.includes('refund') || lowerBody.includes('返金')) {
    category = 'refund_request';
  } else if (
    lowerBody.includes('not received') ||
    lowerBody.includes('届かない') ||
    lowerBody.includes('lost')
  ) {
    category = 'delivery_issue';
  } else if (lowerBody.includes('tracking') || lowerBody.includes('追跡')) {
    category = 'tracking_inquiry';
  } else if (lowerBody.includes('product') || lowerBody.includes('商品')) {
    category = 'product_question';
  } else if (lowerBody.includes('damage') || lowerBody.includes('破損')) {
    category = 'damage_claim';
  }

  return { urgency, category };
}

/**
 * バッチ処理用: 複数のメッセージに対して一括で返信を生成
 */
export async function generateBatchReplies(
  messages: Array<{
    orderInfo: OrderInfo;
    customerMessage: CustomerMessage;
  }>
): Promise<AutoReplyResult[]> {
  const results: AutoReplyResult[] = [];

  for (const { orderInfo, customerMessage } of messages) {
    const result = await generateAutoReply(orderInfo, customerMessage);
    results.push(result);

    // API制限を考慮して1秒待機
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}

/**
 * 返信ドラフトの品質チェック
 */
export function validateReplyDraft(replyDraft: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (replyDraft.length < 50) {
    issues.push('返信が短すぎます（最低50文字必要）');
  }

  if (!replyDraft.includes('お客様') && !replyDraft.includes('様')) {
    issues.push('敬称が含まれていません');
  }

  if (
    !replyDraft.includes('ありがとうございます') &&
    !replyDraft.includes('申し訳')
  ) {
    issues.push('感謝または謝罪の表現が含まれていません');
  }

  if (replyDraft.includes('追跡番号') && !replyDraft.match(/[A-Z0-9]{10,}/)) {
    issues.push('追跡番号の形式が不正です');
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}
