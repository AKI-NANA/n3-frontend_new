// /services/messaging/AutoReplyEngine.ts

import { UnifiedMessage, MessageIntent, Urgency, MessageTemplate, TrainingData, SourceMall } from '@/types/messaging';

// 💡 モックテンプレートデータ（DB連携で置き換えが必要）
const MOCK_TEMPLATES: MessageTemplate[] = [
    { template_id: 'T-001', target_malls: ['eBay_US', 'Amazon_JP'], target_intent: 'DeliveryStatus', content: "Thank you for your inquiry about order {{order_id}} on {{source_mall}}. The tracking shows delivery on {{estimated_date}}. {{Mall_Specific_Policy}}", language: 'EN' },
    { template_id: 'T-002', target_malls: ['Shopee_TW'], target_intent: 'DeliveryStatus', content: "感謝您的訂單 {{order_id}}。 預計交貨日期是 {{estimated_date}}。 {{Mall_Specific_Policy}}", language: 'ZH' },
    { template_id: 'T-003', target_malls: [], target_intent: 'RefundRequest', content: "We have received your refund request for order {{order_id}}. Please note our policy requires item return within 30 days. {{Mall_Specific_Policy}}", language: 'EN' },
];


// --- A. AI分類・学習ロジック ---

/**
 * Claude KDL連携を想定したメッセージ分類
 */
export async function classifyMessage(message: UnifiedMessage): Promise<{ intent: MessageIntent, urgency: Urgency }> {
    const titleBody = (message.subject + " " + message.body).toLowerCase();

    // 1. 緊急度 (Urgency) 分類 (キーワードベースの予備チェック)
    if (titleBody.includes('suspend') || titleBody.includes('violation') || titleBody.includes('restriction')) {
        return { intent: 'PolicyViolation', urgency: '緊急対応 (赤)' };
    }
    if (titleBody.includes('promotion') || titleBody.includes('marketing')) {
        return { intent: 'Marketing', urgency: '無視/アーカイブ (灰)' };
    }
    
    // 2. 意図 (Intent) 分類 (キーワードベースの予備チェック)
    if (titleBody.includes('tracking') || titleBody.includes('where is my order')) {
        return { intent: 'DeliveryStatus', urgency: '標準通知 (黄)' };
    }
    if (titleBody.includes('return') || titleBody.includes('refund')) {
        return { intent: 'RefundRequest', urgency: '緊急対応 (赤)' };
    }

    // 💡 この中間的なメッセージに対し、Claude KDLへの高コストなAPIコールを実行し、意図と緊急度を精密に分類するロジックをClaude/MCPが実装する。
    
    return { intent: 'Other', urgency: '標準通知 (黄)' };
}

/**
 * ユーザー修正を教師データとしてDBに書き込むモック関数
 */
export async function submitClassificationCorrection(data: TrainingData): Promise<void> {
    console.log(`[AI Learning] Submitted correction for: ${data.original_message_title}. New Urgency: ${data.corrected_urgency}. (DB書き込みはClaude/MCP担当)`);
    // 💡 DBへの書き込みロジックはClaude/MCP担当
}


// --- B. 自動返信生成ロジック ---

/**
 * モールコンテキストに基づき、最適なテンプレートを検索・レンダリングする
 */
export async function generateAutoReply(message: UnifiedMessage): Promise<{ suggestedReply: string, templateId: string | null }> {
    
    // 1. 意図とモールに合致するテンプレートをフィルタリング（モール別優先度）
    const matchedTemplate = MOCK_TEMPLATES.find(t => 
        t.target_intent === message.ai_intent && 
        (t.target_malls.length === 0 || t.target_malls.includes(message.source_mall))
    );

    if (!matchedTemplate) {
        // テンプレートがない場合、Claude KDLにゼロショット応答生成を依頼するロジックをClaude/MCPが実装
        return { suggestedReply: "AIによる自動応答生成が不可能です。手動で対応してください。", templateId: null };
    }
    
    // 2. プレースホルダーとモール固有ポリシーのレンダリング
    let reply = matchedTemplate.content;
    
    // 💡 データベースやトランザクション履歴から取得すべき個別情報
    const orderId = "ORD-" + message.thread_id.substring(0, 5).toUpperCase();
    const estimatedDate = "2025-11-20"; 
    
    // モール固有ポリシーの動的挿入ロジック
    let mallPolicyText = "";
    if (message.source_mall.includes('eBay')) {
        mallPolicyText = "Please note our response is compliant with eBay's Seller Protection Policy.";
    } else if (message.source_mall.includes('Amazon')) {
        mallPolicyText = "This action strictly follows Amazon's A-to-z Guarantee guidelines.";
    } else if (message.source_mall.includes('Shopee')) {
        mallPolicyText = "所有回复均符合蝦皮 (Shopee) 平台政策。";
    }
    
    // 3. 最終的な応答文を生成
    reply = reply.replace('{{order_id}}', orderId)
                 .replace('{{estimated_date}}', estimatedDate)
                 .replace('{{source_mall}}', message.source_mall)
                 .replace('{{Mall_Specific_Policy}}', mallPolicyText);

    // 4. AI翻訳の適用 (ここではモック)
    // 💡 実際の翻訳ロジックはClaude/MCP担当
    
    return { suggestedReply: reply, templateId: matchedTemplate.template_id };
}