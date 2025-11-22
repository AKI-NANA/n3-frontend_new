/**
 * AI仕入れ先特定機能の型定義
 */

/**
 * 仕入れ先プラットフォーム
 */
export type SupplierPlatform =
  | 'amazon_jp'
  | 'rakuten'
  | 'yahoo_shopping'
  | 'mercari'
  | 'yahoo_auction'
  | 'qoo10'
  | 'au_pay_market'
  | 'other';

/**
 * マッチング手法
 */
export type MatchingMethod =
  | 'title_match'      // 商品名・型番での検索
  | 'image_search'     // 画像解析による検索
  | 'database_match'   // DBとの照合
  | 'hybrid';          // 複合

/**
 * 仕入れ先候補データ
 */
export interface SupplierCandidate {
  id: string;
  product_id: string;

  // 仕入れ先情報
  supplier_url: string;
  supplier_platform: SupplierPlatform;
  supplier_name?: string;

  // 価格情報
  candidate_price_jpy: number;           // 本体価格（税抜）
  estimated_domestic_shipping_jpy: number; // 推定国内送料
  total_cost_jpy: number;                // 総仕入れコスト（計算値）

  // 信頼度情報
  confidence_score: number;              // 0.0 ~ 1.0
  matching_method: MatchingMethod;
  similarity_score?: number;             // 類似度スコア

  // 在庫・可用性
  in_stock: boolean;
  stock_quantity?: number;
  stock_checked_at?: string;

  // メタデータ
  created_at: string;
  updated_at: string;
  verified_by_human: boolean;
  verification_notes?: string;

  // 検索データ
  search_keywords?: string[];
  image_search_used: boolean;
}

/**
 * リサーチステータス
 */
export type ResearchStatus =
  | 'NEW'           // 新規（未スコア計算）
  | 'SCORED'        // 暫定スコア計算済み
  | 'AI_QUEUED'     // AI解析キュー待ち
  | 'AI_COMPLETED'  // AI解析完了
  | 'VERIFIED';     // 人間による検証済み

/**
 * AIリサーチキューステータス
 */
export type QueueStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

/**
 * AIリサーチキューアイテム
 */
export interface AIResearchQueueItem {
  id: string;
  product_id: string;

  // キュー状態
  status: QueueStatus;
  priority: number;

  // 処理情報
  queued_at: string;
  started_at?: string;
  completed_at?: string;

  // 結果情報
  suppliers_found: number;
  best_price_jpy?: number;
  error_message?: string;
  retry_count: number;

  // メタデータ
  requested_by?: string;
  processing_node?: string;
}

/**
 * リサーチ管理ビューデータ
 */
export interface ResearchManagementView {
  id: string;
  title: string;
  english_title?: string;

  // ステータス
  research_status: ResearchStatus;
  ai_cost_status: boolean;

  // スコア
  provisional_ui_score?: number;  // 暫定Uiスコア
  final_ui_score?: number;        // 最終Uiスコア
  legacy_score?: number;          // 旧スコア

  // eBayリサーチデータ
  sm_sales_count?: number;
  sm_competitor_count?: number;
  sm_lowest_price?: number;
  sm_profit_margin?: number;

  // 仕入れ先情報
  best_supplier_price?: number;
  best_supplier_url?: string;
  best_supplier_platform?: SupplierPlatform;
  supplier_confidence?: number;

  // タイムスタンプ
  last_research_date?: string;
  supplier_found_at?: string;

  // キュー状態
  queue_status?: QueueStatus;
  queue_priority?: number;
}

/**
 * AI仕入れ先探索リクエスト
 */
export interface SupplierSearchRequest {
  product_id: string;
  title: string;
  english_title?: string;
  image_urls?: string[];
  keywords?: string[];
  priority?: number;
}

/**
 * AI仕入れ先探索結果
 */
export interface SupplierSearchResult {
  product_id: string;
  success: boolean;
  candidates: SupplierCandidate[];
  best_candidate?: SupplierCandidate;
  search_method_used: MatchingMethod[];
  error?: string;
  searched_at: string;
}

/**
 * スコア計算用の仕入れ原価データ
 */
export interface CostDataForScoring {
  has_actual_cost: boolean;          // 確定原価があるか
  actual_cost_jpy?: number;          // 確定原価
  ai_candidate_cost_jpy?: number;    // AI特定の候補原価
  cost_confidence?: number;          // 原価の信頼度
  domestic_shipping_jpy: number;     // 国内送料
  total_cost_jpy: number;            // 総コスト
}

/**
 * リサーチフィルター条件
 */
export interface ResearchFilterCriteria {
  research_status?: ResearchStatus[];
  ai_cost_status?: boolean;
  min_provisional_score?: number;
  max_provisional_score?: number;
  min_sales_count?: number;
  max_competitor_count?: number;
  has_supplier?: boolean;
  supplier_platform?: SupplierPlatform[];
  min_confidence?: number;
}

/**
 * リサーチ結果ソート条件
 */
export type ResearchSortField =
  | 'provisional_ui_score'
  | 'final_ui_score'
  | 'sm_sales_count'
  | 'sm_competitor_count'
  | 'sm_profit_margin'
  | 'best_supplier_price'
  | 'supplier_confidence'
  | 'last_research_date';

export interface ResearchSortCriteria {
  field: ResearchSortField;
  direction: 'asc' | 'desc';
}
