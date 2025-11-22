// /services/messaging/AutoReplyEngine.ts
// ✅ I2-1: Gemini API連携完全実装版

import { UnifiedMessage, MessageIntent, Urgency, MessageTemplate, SourceMall, TrainingData } from '@/types/messaging';
import { callGeminiAPIForJSON, callGeminiAPI } from '@/lib/services/ai/gemini/gemini-api';
import { createClient } from '@/lib/supabase/server';

// テンプレート取得（Supabase DBから）
async function fetchTemplates(): Promise<MessageTemplate[]> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('message_templates')
            .select('*');

        if (error) throw error;
        return data as MessageTemplate[];
    } catch (error) {
        console.error('[Templates] DB取得エラー、モックを使用:', error);
        return [
            { template_id: 'T-001', target_malls: ['eBay_US', 'Amazon_JP'], target_intent: 'DeliveryStatus', content: "Thank you for your inquiry about order {{order_id}} on {{source_mall}}. The tracking shows it is scheduled for delivery on {{estimated_date}}. {{Mall_Specific_Policy}}", language: 'EN' },
            { template_id: 'T-002', target_malls: ['Shopee_TW'], target_intent: 'DeliveryStatus', content: "感謝您的訂單 {{order_id}}。 預計交貨日期是 {{estimated_date}}。 {{Mall_Specific_Policy}}", language: 'ZH' },
        ];
    }
}

// --- A. AI分類・学習ロジック ---

/**
 * ✅ Gemini AIを利用してメッセージの緊急度と意図を分類
 */
export async function classifyMessage(message: UnifiedMessage): Promise<{ intent: MessageIntent, urgency: Urgency }> {
    try {
        const prompt = `
あなたは顧客サポートメッセージの分類AIです。以下のメッセージを分析し、意図(intent)と緊急度(urgency)を判定してください。

【メッセージ情報】
件名: ${message.subject}
本文: ${message.body}
送信元モール: ${message.source_mall}

【分類ルール】
意図(intent)の選択肢:
- PolicyViolation: ポリシー違反・アカウント制限の通知
- SystemUpdate: システム更新・支払い関連の通知
- Marketing: プロモーション・マーケティング
- DeliveryStatus: 配送状況の問い合わせ
- RefundRequest: 返金・返品・交換の要求
- ProductQuestion: 商品に関する質問
- Other: その他

緊急度(urgency)の選択肢:
- 緊急対応 (赤): すぐに対応が必要（アカウント停止、返金要求など）
- 標準通知 (黄): 通常の対応が必要（配送問い合わせなど）
- 無視/アーカイブ (灰): 対応不要（プロモーション、マーケティング）

以下のJSON形式で応答してください：
{
  "intent": "分類した意図",
  "urgency": "分類した緊急度",
  "reasoning": "判定理由（簡潔に）"
}
`.trim();

        const result = await callGeminiAPIForJSON<{
            intent: MessageIntent;
            urgency: Urgency;
            reasoning: string;
        }>(prompt, {
            temperature: 0.3,
            maxTokens: 512,
        });

        console.log(`[AI分類] ${message.thread_id} - Intent: ${result.intent}, Urgency: ${result.urgency}`);

        return {
            intent: result.intent,
            urgency: result.urgency,
        };
    } catch (error) {
        console.error('[AI分類] エラー、フォールバック分類を使用:', error);

        // フォールバック: キーワードベースの簡易ロジック
        const titleBody = (message.subject + " " + message.body).toLowerCase();

        if (titleBody.includes('suspend') || titleBody.includes('violation') || titleBody.includes('restriction')) {
            return { intent: 'PolicyViolation', urgency: '緊急対応 (赤)' };
        }
        if (titleBody.includes('payment') || titleBody.includes('account update')) {
            return { intent: 'SystemUpdate', urgency: '標準通知 (黄)' };
        }
        if (titleBody.includes('promotion') || titleBody.includes('marketing')) {
            return { intent: 'Marketing', urgency: '無視/アーカイブ (灰)' };
        }
        if (titleBody.includes('tracking') || titleBody.includes('where is my order')) {
            return { intent: 'DeliveryStatus', urgency: '標準通知 (黄)' };
        }
        if (titleBody.includes('return') || titleBody.includes('exchange') || titleBody.includes('refund')) {
            return { intent: 'RefundRequest', urgency: '緊急対応 (赤)' };
        }

        return { intent: 'ProductQuestion', urgency: '標準通知 (黄)' };
    }
}

/**
 * ユーザーがAI分類を修正した際に、教師データとしてDBに書き込む
 */
export async function submitClassificationCorrection(data: TrainingData): Promise<void> {
    try {
        const supabase = await createClient();
        const { error } = await supabase.from('ai_training_data').insert({
            message_id: data.message_id,
            original_intent: data.original_intent,
            corrected_intent: data.corrected_intent,
            original_urgency: data.original_urgency,
            corrected_urgency: data.corrected_urgency,
            message_title: data.original_message_title,
            message_body: data.original_message_body,
            created_at: new Date().toISOString(),
        });

        if (error) throw error;
        console.log(`[AI Learning] 教師データ保存成功: ${data.message_id}`);
    } catch (error) {
        console.error('[AI Learning] 教師データ保存エラー:', error);
    }
}

// --- B. 自動返信生成ロジック ---

/**
 * ✅ Gemini AIで顧客に適した返信メールを生成
 */
export async function generateAutoReply(message: UnifiedMessage, orderInfo?: any): Promise<{ suggestedReply: string, templateId: string | null }> {
    try {
        // テンプレートを取得
        const templates = await fetchTemplates();
        const matchedTemplate = templates.find(t =>
            t.target_intent === message.ai_intent &&
            (t.target_malls.length === 0 || t.target_malls.includes(message.source_mall))
        );

        if (!matchedTemplate) {
            // ✅ テンプレートがない場合、Gemini APIでゼロショット生成
            const prompt = `
あなたはプロのカスタマーサポート担当者です。以下の顧客メッセージに対して、丁寧で適切な返信を生成してください。

【顧客メッセージ】
件名: ${message.subject}
本文: ${message.body}

【コンテキスト情報】
- 送信元モール: ${message.source_mall}
- メッセージ意図: ${message.ai_intent}
- 緊急度: ${message.urgency}
${orderInfo ? `- 注文情報: ${JSON.stringify(orderInfo)}` : ''}

【返信の要件】
1. プロフェッショナルで丁寧な口調
2. 顧客の問い合わせに直接回答
3. 必要に応じてモール固有のポリシーに言及
4. 簡潔で明確（200単語以内）

返信メールの本文のみを生成してください（件名不要）。
`.trim();

            const reply = await callGeminiAPI(prompt, {
                temperature: 0.7,
                maxTokens: 1024,
            });

            console.log(`[AI返信] ゼロショット生成成功: ${message.thread_id}`);
            return { suggestedReply: reply.trim(), templateId: null };
        }

        // テンプレートベースの返信生成
        let reply = matchedTemplate.content;
        const orderId = orderInfo?.order_id || "ORD-" + message.thread_id.substring(0, 5).toUpperCase();
        const estimatedDate = orderInfo?.estimated_delivery || "2025-12-01";

        // モール固有ポリシーの動的挿入
        let mallPolicyText = "";
        if (message.source_mall.includes('eBay')) {
            mallPolicyText = "We highly value your positive feedback and are protected by eBay's Seller Policy.";
        } else if (message.source_mall.includes('Amazon')) {
            mallPolicyText = "Please refer to Amazon's 30-day return window for eligibility.";
        } else if (message.source_mall.includes('Shopee')) {
            mallPolicyText = "Shopeeの返品ポリシーに従い、対応させていただきます。";
        }

        reply = reply.replace('{{order_id}}', orderId)
            .replace('{{estimated_date}}', estimatedDate)
            .replace('{{source_mall}}', message.source_mall)
            .replace('{{Mall_Specific_Policy}}', mallPolicyText);

        console.log(`[AI返信] テンプレート生成成功: ${matchedTemplate.template_id}`);
        return { suggestedReply: reply, templateId: matchedTemplate.template_id };
    } catch (error) {
        console.error('[AI返信] 生成エラー:', error);
        return { suggestedReply: "自動返信の生成に失敗しました。手動で対応してください。", templateId: null };
    }
}
