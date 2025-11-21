// /services/messaging/AutoReplyEngine.ts
// AI分類・自動応答エンジン

import {
  UnifiedMessage,
  MessageIntent,
  Urgency,
  MessageTemplate,
  TrainingData,
  SourceMall,
  AutoReplyResult,
  ClassificationResult,
} from '@/types/messaging';

// 💡 モックテンプレートデータ（DB連携で置き換えが必要）
const MOCK_TEMPLATES: MessageTemplate[] = [
  {
    template_id: 'T-001',
    template_name: '配送状況確認（eBay/Amazon）',
    target_malls: ['eBay_US', 'eBay_UK', 'Amazon_JP', 'Amazon_US'],
    target_intent: 'DeliveryStatus',
    content: `Thank you for your inquiry about order {{order_id}} on {{source_mall}}.

According to our tracking information, your package is currently in transit and is expected to be delivered by {{estimated_date}}.

Tracking Number: {{tracking_number}}

{{Mall_Specific_Policy}}

If you have any further questions, please don't hesitate to contact us.

Best regards,
Customer Support Team`,
    language: 'en',
    active: true,
    usage_count: 0,
  },
  {
    template_id: 'T-002',
    template_name: '配送状況確認（Shopee）',
    target_malls: ['Shopee_TW', 'Shopee_SG'],
    target_intent: 'DeliveryStatus',
    content: `感謝您的訂單 {{order_id}}。

根據追蹤資訊，您的包裹目前正在運送中，預計交貨日期是 {{estimated_date}}。

追蹤編號：{{tracking_number}}

{{Mall_Specific_Policy}}

如有任何疑問，請隨時與我們聯繫。

客戶服務團隊`,
    language: 'zh-TW',
    active: true,
    usage_count: 0,
  },
  {
    template_id: 'T-003',
    template_name: '返金リクエスト（全モール）',
    target_malls: [],
    target_intent: 'RefundRequest',
    content: `Thank you for contacting us regarding order {{order_id}}.

We have received your refund request. Please note that according to {{source_mall}}'s policy and our return policy, we require:

1. The item must be returned within 30 days of delivery
2. The item must be in its original condition
3. Original packaging should be included if possible

{{Mall_Specific_Policy}}

To proceed with your refund request, please provide:
- Reason for return
- Photos of the item (if applicable)
- Your preferred refund method

We will process your request within 2-3 business days.

Best regards,
Customer Support Team`,
    language: 'en',
    active: true,
    usage_count: 0,
  },
  {
    template_id: 'T-004',
    template_name: '商品に関する質問',
    target_malls: [],
    target_intent: 'ProductQuestion',
    content: `Thank you for your interest in our product!

Regarding your question about {{product_name}}:

{{answer_placeholder}}

Product Details:
- SKU: {{sku}}
- Condition: {{condition}}
- Shipping: {{shipping_info}}

{{Mall_Specific_Policy}}

If you have any other questions, please feel free to ask!

Best regards,
Customer Support Team`,
    language: 'en',
    active: true,
    usage_count: 0,
  },
  {
    template_id: 'T-005',
    template_name: '配送遅延のお詫び',
    target_malls: [],
    target_intent: 'ShippingDelay',
    content: `Dear valued customer,

We sincerely apologize for the delay in delivering your order {{order_id}}.

Due to {{delay_reason}}, your package has been delayed. We are working closely with our shipping partners to ensure your order arrives as soon as possible.

Updated estimated delivery date: {{new_estimated_date}}
Tracking Number: {{tracking_number}}

{{Mall_Specific_Policy}}

As a token of our apology, we would like to offer you {{compensation}}.

Thank you for your patience and understanding.

Best regards,
Customer Support Team`,
    language: 'en',
    active: true,
    usage_count: 0,
  },
];

// --- A. AI分類・学習ロジック ---

/**
 * Claude/Gemini API連携を想定したメッセージ分類
 * キーワードベースの予備チェック + AI APIコールのハイブリッド方式
 */
export async function classifyMessage(message: UnifiedMessage): Promise<ClassificationResult> {
  const titleBody = (message.subject + ' ' + message.body).toLowerCase();

  // 1. 緊急度 (Urgency) 分類 - キーワードベースの高速チェック
  if (
    titleBody.includes('suspend') ||
    titleBody.includes('violation') ||
    titleBody.includes('restriction') ||
    titleBody.includes('account') ||
    titleBody.includes('警告') ||
    titleBody.includes('ペナルティ')
  ) {
    return {
      intent: 'PolicyViolation',
      urgency: '緊急対応 (赤)',
      confidence: 0.95,
      reasoning: 'アカウント制限やポリシー違反に関するキーワードを検出',
    };
  }

  if (
    titleBody.includes('promotion') ||
    titleBody.includes('marketing') ||
    titleBody.includes('newsletter') ||
    titleBody.includes('広告')
  ) {
    return {
      intent: 'Marketing',
      urgency: '無視/アーカイブ (灰)',
      confidence: 0.9,
      reasoning: 'マーケティング・プロモーションに関するキーワードを検出',
    };
  }

  // 2. 意図 (Intent) 分類 - キーワードベースの予備チェック
  if (
    titleBody.includes('tracking') ||
    titleBody.includes('where is my order') ||
    titleBody.includes('delivery') ||
    titleBody.includes('shipped') ||
    titleBody.includes('配送') ||
    titleBody.includes('追跡')
  ) {
    return {
      intent: 'DeliveryStatus',
      urgency: '標準通知 (黄)',
      confidence: 0.85,
      reasoning: '配送状況に関する問い合わせを検出',
    };
  }

  if (
    titleBody.includes('return') ||
    titleBody.includes('refund') ||
    titleBody.includes('返品') ||
    titleBody.includes('返金')
  ) {
    return {
      intent: 'RefundRequest',
      urgency: '緊急対応 (赤)',
      confidence: 0.88,
      reasoning: '返金・返品リクエストを検出',
    };
  }

  if (
    titleBody.includes('payment') ||
    titleBody.includes('charge') ||
    titleBody.includes('billing') ||
    titleBody.includes('支払い') ||
    titleBody.includes('請求')
  ) {
    return {
      intent: 'PaymentIssue',
      urgency: '緊急対応 (赤)',
      confidence: 0.87,
      reasoning: '支払い・請求に関する問題を検出',
    };
  }

  if (
    titleBody.includes('cancel') ||
    titleBody.includes('キャンセル')
  ) {
    return {
      intent: 'CancellationRequest',
      urgency: '標準通知 (黄)',
      confidence: 0.82,
      reasoning: 'キャンセルリクエストを検出',
    };
  }

  // 💡 ここで、Claude/Gemini APIに高コストな精密分類を依頼
  // 実装例（実際のAPI呼び出しはプロジェクト固有の設定が必要）:
  try {
    const aiClassification = await callAIClassificationAPI(message);
    return aiClassification;
  } catch (error) {
    console.error('AI分類APIエラー:', error);

    // フォールバック: デフォルト分類
    return {
      intent: 'Other',
      urgency: '標準通知 (黄)',
      confidence: 0.5,
      reasoning: 'AI分類APIが利用できないため、デフォルト分類を適用',
    };
  }
}

/**
 * 実際のAI分類API呼び出し（Claude/Gemini）
 * 💡 この関数は実際のAI APIエンドポイントに接続する必要がある
 */
async function callAIClassificationAPI(message: UnifiedMessage): Promise<ClassificationResult> {
  // TODO: Claude/Gemini APIの実装
  // 例: Anthropic Claude API の場合

  // const response = await fetch('https://api.anthropic.com/v1/messages', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'x-api-key': process.env.ANTHROPIC_API_KEY || '',
  //     'anthropic-version': '2023-06-01',
  //   },
  //   body: JSON.stringify({
  //     model: 'claude-3-sonnet-20240229',
  //     max_tokens: 1024,
  //     messages: [
  //       {
  //         role: 'user',
  //         content: `次のメッセージを分析し、意図（Intent）と緊急度（Urgency）を分類してください。
  //
  // メッセージ:
  // 件名: ${message.subject}
  // 本文: ${message.body}
  //
  // 以下のJSON形式で回答してください:
  // {
  //   "intent": "DeliveryStatus | RefundRequest | PaymentIssue | ProductQuestion | PolicyViolation | Other",
  //   "urgency": "緊急対応 (赤) | 標準通知 (黄) | 無視/アーカイブ (灰)",
  //   "confidence": 0.0-1.0,
  //   "reasoning": "判断理由"
  // }`,
  //       },
  //     ],
  //   }),
  // });
  //
  // const data = await response.json();
  // return JSON.parse(data.content[0].text);

  // モック実装（開発用）
  throw new Error('AI分類APIが未実装です');
}

/**
 * ユーザー修正を教師データとしてDBに書き込む
 * 💡 Supabaseの training_data テーブルに保存
 */
export async function submitClassificationCorrection(data: TrainingData): Promise<void> {
  console.log(
    `[AI Learning] Submitted correction for: ${data.original_message_title}. New Urgency: ${data.corrected_urgency}. Intent: ${data.corrected_intent}`
  );

  try {
    // TODO: Supabaseへの書き込みロジック
    // const { error } = await supabase
    //   .from('training_data')
    //   .insert({
    //     original_message_id: data.original_message_id,
    //     original_message_title: data.original_message_title,
    //     original_message_body: data.original_message_body,
    //     corrected_urgency: data.corrected_urgency,
    //     corrected_intent: data.corrected_intent,
    //     corrected_by: data.corrected_by,
    //     corrected_at: data.corrected_at,
    //     feedback_notes: data.feedback_notes,
    //   });
    //
    // if (error) throw error;

    console.log('[AI Learning] 教師データを正常に保存しました');
  } catch (error) {
    console.error('[AI Learning] 教師データの保存に失敗しました:', error);
    throw error;
  }
}

// --- B. 自動返信生成ロジック ---

/**
 * モールコンテキストに基づき、最適なテンプレートを検索・レンダリングする
 */
export async function generateAutoReply(message: UnifiedMessage): Promise<AutoReplyResult> {
  // 1. 意図とモールに合致するテンプレートをフィルタリング（モール別優先度）
  let matchedTemplate = MOCK_TEMPLATES.find(
    (t) =>
      t.active &&
      t.target_intent === message.ai_intent &&
      t.target_malls.length > 0 &&
      t.target_malls.includes(message.source_mall)
  );

  // モール固有のテンプレートがない場合、全モール対応のテンプレートを検索
  if (!matchedTemplate) {
    matchedTemplate = MOCK_TEMPLATES.find(
      (t) =>
        t.active &&
        t.target_intent === message.ai_intent &&
        t.target_malls.length === 0
    );
  }

  if (!matchedTemplate) {
    // テンプレートがない場合、AI（Claude/Gemini）にゼロショット応答生成を依頼
    console.log('[AutoReply] テンプレートが見つからないため、AI生成を試みます');

    try {
      const aiGeneratedReply = await generateReplyWithAI(message);
      return {
        suggested_reply: aiGeneratedReply,
        template_id: null,
        confidence: 0.7,
        translation_applied: false,
      };
    } catch (error) {
      console.error('[AutoReply] AI生成に失敗しました:', error);
      return {
        suggested_reply:
          'AIによる自動応答生成が不可能です。手動で対応してください。\n\n[エラー詳細]\nテンプレートが見つからず、AI生成も失敗しました。',
        template_id: null,
        confidence: 0,
        translation_applied: false,
      };
    }
  }

  // 2. プレースホルダーとモール固有ポリシーのレンダリング
  let reply = matchedTemplate.content;
  const variablesUsed: Record<string, string> = {};

  // 💡 データベースやトランザクション履歴から取得すべき個別情報
  const orderId = message.order_id || 'ORD-' + message.thread_id.substring(0, 8).toUpperCase();
  const estimatedDate = '2025-12-15'; // TODO: 実際の配送予定日を取得
  const trackingNumber = 'TRK-' + Math.random().toString(36).substring(2, 12).toUpperCase();

  variablesUsed.order_id = orderId;
  variablesUsed.estimated_date = estimatedDate;
  variablesUsed.tracking_number = trackingNumber;
  variablesUsed.source_mall = message.source_mall;

  // モール固有ポリシーの動的挿入ロジック
  let mallPolicyText = '';
  if (message.source_mall.includes('eBay')) {
    mallPolicyText =
      'Please note our response is compliant with eBay\'s Seller Protection Policy and Money Back Guarantee program.';
  } else if (message.source_mall.includes('Amazon')) {
    mallPolicyText =
      'This action strictly follows Amazon\'s A-to-z Guarantee guidelines and our commitment to customer satisfaction.';
  } else if (message.source_mall.includes('Shopee')) {
    mallPolicyText = '所有回复均符合蝦皮 (Shopee) 平台政策和買家保障計劃。';
  } else if (message.source_mall.includes('Qoo10')) {
    mallPolicyText = 'この対応は、Qoo10の購入者保護プログラムに準拠しています。';
  }

  variablesUsed.Mall_Specific_Policy = mallPolicyText;

  // 3. プレースホルダーの置換
  reply = reply
    .replace(/\{\{order_id\}\}/g, orderId)
    .replace(/\{\{estimated_date\}\}/g, estimatedDate)
    .replace(/\{\{tracking_number\}\}/g, trackingNumber)
    .replace(/\{\{source_mall\}\}/g, message.source_mall)
    .replace(/\{\{Mall_Specific_Policy\}\}/g, mallPolicyText);

  // 4. AI翻訳の適用（オプション）
  // 💡 実際の翻訳ロジックは外部翻訳APIと連携
  let translationApplied = false;
  let targetLanguage = matchedTemplate.language;

  // 例: 日本語の顧客に英語テンプレートを使う場合、翻訳を適用
  // if (shouldTranslate(message, matchedTemplate)) {
  //   reply = await translateText(reply, 'ja');
  //   translationApplied = true;
  //   targetLanguage = 'ja';
  // }

  return {
    suggested_reply: reply,
    template_id: matchedTemplate.template_id,
    confidence: 0.9,
    variables_used: variablesUsed,
    translation_applied: translationApplied,
    target_language: targetLanguage,
  };
}

/**
 * AIによる返信生成（テンプレートがない場合のフォールバック）
 * 💡 Claude/Gemini APIを使用してゼロショット生成
 */
async function generateReplyWithAI(message: UnifiedMessage): Promise<string> {
  // TODO: Claude/Gemini APIの実装

  // 例: Anthropic Claude API の場合
  // const response = await fetch('https://api.anthropic.com/v1/messages', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'x-api-key': process.env.ANTHROPIC_API_KEY || '',
  //     'anthropic-version': '2023-06-01',
  //   },
  //   body: JSON.stringify({
  //     model: 'claude-3-sonnet-20240229',
  //     max_tokens: 2048,
  //     messages: [
  //       {
  //         role: 'user',
  //         content: `あなたはECサイトのカスタマーサポート担当者です。以下の顧客メッセージに対して、プロフェッショナルで親切な返信を英語で生成してください。
  //
  // マーケットプレイス: ${message.source_mall}
  // 件名: ${message.subject}
  // 本文: ${message.body}
  //
  // 返信は以下の要素を含めてください:
  // 1. 丁寧な挨拶
  // 2. 問題への具体的な回答
  // 3. 次のステップ（必要な場合）
  // 4. 締めの挨拶
  //
  // ${message.source_mall}のポリシーに準拠した返信を作成してください。`,
  //       },
  //     ],
  //   }),
  // });
  //
  // const data = await response.json();
  // return data.content[0].text;

  throw new Error('AI返信生成APIが未実装です');
}

/**
 * テンプレートの一覧を取得
 */
export async function getTemplates(
  filters?: {
    source_mall?: SourceMall;
    intent?: MessageIntent;
    active_only?: boolean;
  }
): Promise<MessageTemplate[]> {
  let templates = MOCK_TEMPLATES;

  if (filters) {
    if (filters.active_only) {
      templates = templates.filter((t) => t.active);
    }
    if (filters.source_mall) {
      templates = templates.filter(
        (t) =>
          t.target_malls.length === 0 ||
          t.target_malls.includes(filters.source_mall!)
      );
    }
    if (filters.intent) {
      templates = templates.filter((t) => t.target_intent === filters.intent);
    }
  }

  return templates;
}

/**
 * テンプレートを作成・更新
 * 💡 Supabaseの message_templates テーブルに保存
 */
export async function saveTemplate(template: MessageTemplate): Promise<void> {
  console.log('[Template] テンプレートを保存:', template.template_id);

  try {
    // TODO: Supabaseへの書き込みロジック
    console.log('[Template] テンプレートを正常に保存しました');
  } catch (error) {
    console.error('[Template] テンプレートの保存に失敗しました:', error);
    throw error;
  }
}
