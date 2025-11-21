/**
 * Phase 1: 受注管理システム V2.0 - TypeScript型定義
 */

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  sale_price: number; // 単価
}

export interface Order {
  // 基本情報
  id: string; // UUID
  order_id: string; // 受注ID (例: ORD-20251101-001)
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;

  // モール情報
  marketplace: 'ebay' | 'amazon' | 'shopee' | 'qoo10';
  marketplace_order_id?: string;

  // 日時情報
  order_date: string; // ISO 8601
  shipping_deadline: string; // ISO 8601

  // ステータス
  status: '未処理' | '処理中' | '出荷済' | 'キャンセル';
  payment_status: '未入金' | '入金済';

  // 商品情報
  items: OrderItem[];

  // === Phase 1 新要件: 仕入れ関連フィールド ===
  is_sourced: boolean; // 仕入れ確定フラグ
  sourcing_status: '未仕入れ' | '仕入れ済み' | 'キャンセル';
  cost_price?: number; // 実際の仕入れ価格（JPY）
  estimated_cost_price?: number; // 予想仕入れ価格（JPY）
  sourcing_url?: string; // 仕入れ元URL
  actual_sourcing_url?: string; // 実際に使用した仕入れ元URL
  sourcing_date?: string; // ISO 8601
  sourcing_arrival_date?: string; // ISO 8601 (日付のみ)
  credit_card_id?: string; // 使用予定/使用したクレカID

  // === 利益計算フィールド ===
  sale_price: number; // 販売価格合計
  platform_fee: number; // プラットフォーム手数料
  platform_fee_rate: number; // 手数料率
  shipping_cost: number; // 送料
  estimated_shipping_cost: number; // 予想送料
  final_shipping_cost?: number; // 確定送料
  estimated_profit: number; // 予想利益
  final_profit?: number; // 確定利益
  profit_margin: number; // 利益率
  is_profit_confirmed: boolean; // 利益確定済みフラグ

  // === 赤字リスク警告 ===
  is_negative_profit_risk: boolean; // 赤字リスクフラグ
  risk_reason?: string; // リスク理由

  // === AI関連 ===
  ai_score?: number; // AIスコア (0.00 ~ 1.00)
  ai_analysis?: Record<string, any>; // AI分析結果（JSON形式）

  // === 顧客対応 ===
  customer_inquiry_count: number; // 問い合わせ件数
  customer_inquiry_history?: any[]; // 問い合わせ履歴

  // === 出荷情報 (Phase 2連携用) ===
  tracking_number?: string; // 追跡番号
  shipped_date?: string; // ISO 8601
  delivery_date?: string; // ISO 8601

  // === メタデータ ===
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  created_by?: string;
  updated_by?: string;
  notes?: string; // 備考
}

export interface OrdersResponse {
  success: boolean;
  data: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  query: OrdersQuery;
}

export interface OrdersQuery {
  // フィルタリング
  isSourced?: 'all' | 'pending' | 'completed';
  marketplace?: string;
  status?: string;
  hasRisk?: boolean;
  minProfit?: number;
  minAiScore?: number;

  // ソート
  sortBy?: 'order_date' | 'shipping_deadline' | 'estimated_profit' | 'ai_score';
  sortOrder?: 'asc' | 'desc';

  // ページネーション
  page?: number;
  limit?: number;

  // 検索
  search?: string;
}
