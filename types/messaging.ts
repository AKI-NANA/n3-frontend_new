// /types/messaging.ts
// 統合コミュニケーションハブのデータ型定義

export type SourceMall = 'eBay_US' | 'eBay_UK' | 'eBay_DE' | 'Amazon_JP' | 'Amazon_US' | 'Shopee_TW' | 'Shopee_SG' | 'Qoo10_JP' | 'Yahoo_JP' | 'Mercari_JP' | 'Internal';

export type Urgency = '緊急対応 (赤)' | '標準通知 (黄)' | '無視/アーカイブ (灰)';

export type ReplyStatus = 'Unanswered' | 'Pending' | 'Completed';

export type MessageIntent =
  | 'DeliveryStatus'
  | 'RefundRequest'
  | 'PaymentIssue'
  | 'ProductQuestion'
  | 'PolicyViolation'
  | 'AccountSuspension'
  | 'SystemUpdate'
  | 'Marketing'
  | 'PerformanceWarning'
  | 'ShippingDelay'
  | 'ReturnRequest'
  | 'CancellationRequest'
  | 'Other';

export interface UnifiedMessage {
  message_id: string;
  thread_id: string; // スレッド管理用
  source_mall: SourceMall;
  is_customer_message: boolean; // true: 顧客メッセージ, false: モール通知
  sender_id: string;
  sender_name?: string;
  subject: string;
  body: string;
  received_at: Date;

  // AI/処理ステータス
  ai_intent: MessageIntent;
  ai_urgency: Urgency;
  ai_confidence?: number; // AI分類の信頼度 (0-1)

  // KPI/応答ステータス
  reply_status: ReplyStatus;
  completed_by: string | null; // 完了した外注スタッフID
  completed_at?: Date;

  // メタデータ
  order_id?: string; // 関連する注文ID
  customer_id?: string; // 顧客ID
  attachments?: MessageAttachment[];
  tags?: string[];

  // 内部管理用
  created_at?: Date;
  updated_at?: Date;
}

export interface MessageAttachment {
  id: string;
  filename: string;
  url: string;
  mime_type: string;
  size: number;
}

export interface MessageTemplate {
  template_id: string;
  template_name: string;
  target_malls: SourceMall[]; // 空配列は全モールに適用
  target_intent: MessageIntent;
  content: string; // {{order_id}} などのプレースホルダーを含む
  language: string; // ISO 639-1 (en, ja, zh, etc.)
  variables?: TemplateVariable[]; // プレースホルダー変数の定義
  active: boolean;

  // メタデータ
  created_by?: string;
  created_at?: Date;
  updated_at?: Date;
  usage_count?: number; // 使用回数
}

export interface TemplateVariable {
  key: string; // {{key}} の形式でテンプレート内で使用
  label: string; // UI表示用
  type: 'string' | 'number' | 'date' | 'currency';
  required: boolean;
  default_value?: string;
}

export interface TrainingData {
  id?: string;
  original_message_id: string;
  original_message_title: string;
  original_message_body: string;

  // 修正された分類
  corrected_urgency: Urgency;
  corrected_intent: MessageIntent;

  // 修正者情報
  corrected_by: string; // ユーザーID
  corrected_at: Date;

  // フィードバック
  feedback_notes?: string;
}

// 自動返信生成の結果
export interface AutoReplyResult {
  suggested_reply: string;
  template_id: string | null;
  confidence: number; // 0-1
  variables_used?: Record<string, string>; // 使用されたプレースホルダーと値
  translation_applied?: boolean;
  target_language?: string;
}

// AI分類の結果
export interface ClassificationResult {
  intent: MessageIntent;
  urgency: Urgency;
  confidence: number; // 0-1
  reasoning?: string; // AIの判断理由（デバッグ用）
}

// メッセージフィルター用
export interface MessageFilter {
  source_malls?: SourceMall[];
  urgency?: Urgency[];
  reply_status?: ReplyStatus[];
  is_customer_message?: boolean;
  date_from?: Date;
  date_to?: Date;
  search_query?: string;
  tags?: string[];
}

// ダッシュボード用の統計情報
export interface MessageStats {
  total_messages: number;
  unanswered_count: number;
  pending_count: number;
  completed_count: number;
  urgent_count: number;

  // モール別
  by_mall: Record<SourceMall, {
    total: number;
    unanswered: number;
    urgent: number;
  }>;

  // 応答時間統計
  avg_response_time_hours?: number;
  median_response_time_hours?: number;

  // 外注スタッフ別
  by_staff?: Record<string, {
    completed_count: number;
    avg_response_time_hours: number;
  }>;
}

// Google Calendar連携用
export interface CalendarTask {
  id?: string;
  title: string;
  description: string;
  due_date: Date;
  source_message_id: string;
  source_mall: SourceMall;
  priority: 'high' | 'medium' | 'low';
  calendar_event_id?: string; // Google CalendarのイベントID
  completed: boolean;
}

// スレッド表示用（顧客対応タブ）
export interface MessageThread {
  thread_id: string;
  customer_id: string;
  customer_name?: string;
  source_mall: SourceMall;
  subject: string;
  last_message_at: Date;
  message_count: number;
  unread_count: number;
  messages: UnifiedMessage[];
  reply_status: ReplyStatus;

  // 顧客情報
  customer_purchase_history?: CustomerPurchaseHistory[];
}

export interface CustomerPurchaseHistory {
  order_id: string;
  product_name: string;
  purchase_date: Date;
  amount: number;
  status: string;
  source_mall: SourceMall;
}
