// /services/messaging/AutoReplyEngine.ts

import { UnifiedMessage, MessageIntent, Urgency, MessageTemplate, SourceMall, TrainingData } from '@/types/messaging';

// 💡 外部DB/APIからテンプレートと教師データを取得するモック
const MOCK_TEMPLATES: MessageTemplate[] = [
    { template_id: 'T-001', target_malls: ['eBay_US', 'Amazon_JP'], target_intent: 'DeliveryStatus', content: "Thank you for your inquiry about order {{order_id}} on {{source_mall}}. The tracking shows it is scheduled for delivery on {{estimated_date}}. {{Mall_Specific_Policy}}", language: 'EN' },
    { template_id: 'T-002', target_malls: ['Shopee_TW'], target_intent: 'DeliveryStatus', content: "感謝您的訂單 {{order_id}}。 預計交貨日期是 {{estimated_date}}。 {{Mall_Specific_Policy}}", language: 'ZH' },
];

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
 * モールコンテキストに基づき、最適なテンプレートを検索・レンダリングする
 */
export async function generateAutoReply(message: UnifiedMessage): Promise<{ suggestedReply: string, templateId: string | null }> {
    
    // 1. 意図とモールに合致するテンプレートをフィルタリング
    const matchedTemplate = MOCK_TEMPLATES.find(t => 
        t.target_intent === message.ai_intent && 
        (t.target_malls.length === 0 || t.target_malls.includes(message.source_mall))
    );

    if (!matchedTemplate) {
        // テンプレートが見つからない場合、Claude KDLにゼロショット応答生成を依頼
        // 💡 callClaudeKdlForZeroShot(message.body);
        return { suggestedReply: "AIが応答を生成できませんでした。手動で対応してください。", templateId: null };
    }
    
    // 2. プレースホルダーとモール固有ポリシーのレンダリング
    let reply = matchedTemplate.content;
    const orderId = "ORD-" + message.thread_id.substring(0, 5).toUpperCase();
    const estimatedDate = "2025-11-20";
    
    // モール固有ポリシーの動的挿入
    let mallPolicyText = "";
    if (message.source_mall.includes('eBay')) {
        mallPolicyText = "We highly value your positive feedback and are protected by eBay's Seller Policy.";
    } else if (message.source_mall.includes('Amazon')) {
        mallPolicyText = "Please refer to Amazon's 30-day return window for eligibility.";
    }
    
    // 3. 最終的な応答文を生成
    reply = reply.replace('{{order_id}}', orderId)
                 .replace('{{estimated_date}}', estimatedDate)
                 .replace('{{source_mall}}', message.source_mall)
                 .replace('{{Mall_Specific_Policy}}', mallPolicyText);

    // 4. AI翻訳 (必要に応じて)
    // 💡 if (matchedTemplate.language !== customerLanguage) { reply = await translateReply(reply, customerLanguage); }
    
    return { suggestedReply: reply, templateId: matchedTemplate.template_id };
}