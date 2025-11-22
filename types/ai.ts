// ファイル: /types/ai.ts

/**
 * AIによる受信メールの分類と抽出データ
 */
export interface EmailClassification {
  /** 判定されたメールの言語 */
  language: 'English' | 'Chinese' | 'Japanese' | 'Other';
  /** AIによる分類 */
  classification: 'Quotation_Request' | 'Payment_Confirmation' | 'Shipping_Update' | 'General_Inquiry' | 'Unknown';
  /** 抽出されたキーデータ */
  extracted_data: {
    sku_list: string[];
    quantity: number | null;
    price_usd: number | null;
    tracking_number: string | null;
  };
  /** AIの分類確信度 (0.00-1.00) */
  confidence_score: number;
}

/**
 * AIが生成する自動返信文
 */
export interface AutoResponse {
  subject: string;
  body: string;
  language: 'English' | 'Chinese'; // 返信に使用する言語
}

/**
 * 貿易メールログのレコード
 */
export interface TradeEmailLog {
    id: number;
    sender_email: string;
    email_subject: string | null;
    email_body_original: string;
    language: string | null;
    classification: string;
    extracted_data: any;
    response_subject: string | null;
    response_body: string | null;
    auto_send_status: 'pending_review' | 'sent_auto' | 'sent_manual' | 'ignored' | 'failed';
    received_at: string | null;
    processed_at: string;
}
