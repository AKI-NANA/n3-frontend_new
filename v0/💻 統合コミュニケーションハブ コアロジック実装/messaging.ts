// /types/messaging.ts

export type SourceMall = 'eBay_US' | 'Amazon_JP' | 'Shopee_TW' | 'Internal';
export type Urgency = '緊急対応 (赤)' | '標準通知 (黄)' | '無視/アーカイブ (灰)';
export type ReplyStatus = 'Unanswered' | 'Pending' | 'Completed';
export type MessageIntent = 'DeliveryStatus' | 'RefundRequest' | 'PaymentIssue' | 'ProductQuestion' | 'PolicyViolation' | 'SystemUpdate' | 'Marketing';

export interface UnifiedMessage {
    message_id: string;
    thread_id: string; // スレッド管理用
    source_mall: SourceMall;
    is_customer_message: boolean;
    sender_id: string;
    subject: string;
    body: string;
    received_at: Date;
    
    // AI/処理ステータス
    ai_intent: MessageIntent;
    ai_urgency: Urgency;
    
    // KPI/応答ステータス
    reply_status: ReplyStatus;
    completed_by: string | null;
}

export interface MessageTemplate {
    template_id: string;
    target_malls: SourceMall[];
    target_intent: MessageIntent;
    content: string; // {{order_id}} などのプレースホルダーを含む
    language: string;
}

export interface TrainingData {
    original_message_title: string;
    original_message_body: string;
    corrected_urgency: Urgency;
    corrected_intent: MessageIntent;
    // ... その他の文脈情報
}