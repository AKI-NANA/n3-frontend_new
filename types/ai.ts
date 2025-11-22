// /types/ai.ts
// AI関連の型定義

/**
 * 応答キューのレコード
 */
export interface ResponseQueueItem {
    id: number;
    source_platform: 'chat_tool' | 'email' | 'x_dm';
    conversation_id: string;
    original_message: string;
    ai_classification: string | null;
    ai_generated_response: string | null;
    final_response: string | null;
    status: 'pending_review' | 'approved_ready' | 'sent' | 'rejected';
    reviewer_user_id: number | null;
    created_at: string;
    updated_at: string;
}

/**
 * AIによるチャット応答リライトデータ
 */
export interface ChatResponseRewrite {
    /** 最終返信に使用する本文 */
    rewritten_body: string;
    /** メッセージの分類 */
    category: 'Sales_Lead' | 'Technical_Support' | 'Complaint' | 'General_Inquiry';
    /** リライトの根拠 */
    rewrite_justification: string;
}

/**
 * ペルソナデータ（プロフェッショナルな対応スタイル）
 */
export interface Persona {
    id: number;
    name: string;
    style_description: string;
    tone: string;
    created_at: string;
    updated_at: string;
}
