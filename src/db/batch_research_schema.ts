/**
 * src/db/batch_research_schema.ts
 *
 * 目的: eBay大規模データ一括取得バッチシステムのデータベーススキーマを定義
 * 日付で細かく分割した検索条件を管理し、Finding APIのレートリミットを回避しつつ
 * 特定セラーの全Soldデータを大量に取得できるシステムのための型定義
 *
 * 対応テーブル:
 * - research_condition_stock: 検索条件ストックテーブル
 * - research_batch_results: バッチリサーチ結果テーブル
 * - research_batch_jobs: バッチジョブ管理テーブル
 */

/**
 * research_condition_stock
 * 検索条件ストックテーブル
 *
 * 大規模リサーチジョブを日付分割された小さなタスクとして管理。
 * 各レコードは1つのAPI実行タスクを表し、ページネーション情報も含む。
 */
export interface ResearchConditionStock {
  // Primary Key
  id: number;

  // Job Identification
  job_id: string; // 親ジョブID（複数のタスクをグループ化）
  search_id: string; // 個別タスクの一意なID

  // Search Conditions (セラーIDが最重要の絞り込み条件)
  target_seller_id: string; // 必須: eBayセラーID
  keyword: string | null; // 任意: 検索キーワード（空欄許可）

  // Date Range (分割された日付範囲)
  date_start: Date; // 開始日
  date_end: Date; // 終了日

  // Listing Filters
  listing_status: "Sold" | "Completed"; // 出品ステータス
  listing_type: "FixedPrice" | "Auction" | "All"; // 出品タイプ

  // Pagination Control
  current_page: number; // 現在のページ番号
  total_pages: number | null; // 総ページ数（初回API呼び出し後に設定）
  items_per_page: number; // 1ページあたりの取得件数（API最大値: 100）
  total_items_found: number | null; // 見つかった総アイテム数
  items_retrieved: number; // 取得済みアイテム数

  // Status Management
  status: "pending" | "processing" | "completed" | "failed" | "paused";
  priority: number; // 優先度（高い値ほど優先）

  // Execution Tracking
  started_at: Date | null; // 処理開始日時
  completed_at: Date | null; // 処理完了日時
  last_processed_at: Date | null; // 最終処理日時
  retry_count: number; // リトライ回数
  max_retries: number; // 最大リトライ回数

  // Error Handling
  error_message: string | null; // エラーメッセージ
  error_details: Record<string, any> | null; // エラー詳細情報

  // Scheduling
  scheduled_at: Date | null; // 実行予定日時
  execution_frequency: "once" | "daily" | "weekly" | "monthly" | null;
  next_execution_at: Date | null; // 次回実行予定日時

  // Metadata
  created_by: string | null; // 作成ユーザー
  metadata: Record<string, any> | null; // 追加メタデータ

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

/**
 * research_batch_results
 * バッチリサーチ結果テーブル
 *
 * eBay Finding APIから取得したSoldデータを保存。
 * 各レコードは1つのeBayアイテムを表す。
 */
export interface ResearchBatchResult {
  // Primary Key
  id: number;

  // Reference to Condition
  search_id: string; // research_condition_stock.search_id への参照
  job_id: string; // 親ジョブID

  // eBay Item Data
  ebay_item_id: string; // eBay Item ID
  title: string; // 商品タイトル

  // Seller Information
  seller_id: string; // セラーID
  seller_feedback_score: number | null; // セラーフィードバックスコア
  seller_positive_feedback_percent: number | null; // セラー評価率

  // Pricing Information
  current_price_usd: number | null; // 現在価格（USD）
  current_price_currency: string; // 通貨コード
  shipping_cost_usd: number | null; // 送料（USD）
  total_price_usd: number | null; // 合計金額（USD）

  // Listing Details
  listing_type: string | null; // 'FixedPrice', 'Auction', 'StoreInventory'
  condition_display_name: string | null; // 商品状態（'New', 'Used', etc.）
  condition_id: number | null; // 商品状態ID

  // Category
  primary_category_id: string | null; // プライマリカテゴリID
  primary_category_name: string | null; // プライマリカテゴリ名

  // Location
  location: string | null; // 商品所在地
  country: string | null; // 国コード
  postal_code: string | null; // 郵便番号

  // Timing
  listing_start_time: Date | null; // 出品開始日時
  listing_end_time: Date | null; // 出品終了日時（Sold日時）

  // Sales Data (Sold Items)
  is_sold: boolean; // 売れたかどうか
  sold_date: Date | null; // 売れた日時

  // URLs and Images
  view_item_url: string | null; // 商品ページURL
  gallery_url: string | null; // サムネイル画像URL

  // Additional Data
  returns_accepted: boolean | null; // 返品受付可否
  top_rated_listing: boolean | null; // トップレーテッドリスティングか

  // Raw API Response
  raw_api_data: Record<string, any> | null; // 生のAPIレスポンス（完全なデータ保存用）

  // Metadata
  search_keyword: string | null; // 検索時に使用されたキーワード
  date_range_start: Date | null; // このレコードが属する検索期間の開始日
  date_range_end: Date | null; // このレコードが属する検索期間の終了日

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

/**
 * research_batch_jobs
 * バッチジョブ管理テーブル
 *
 * 複数の検索条件をグループ化し、ジョブ全体の進捗を管理。
 */
export interface ResearchBatchJob {
  // Primary Key
  id: number;
  job_id: string; // ジョブの一意なID

  // Job Configuration
  job_name: string; // ジョブ名（ユーザーが指定）
  description: string | null; // ジョブの説明

  // Target Configuration
  target_seller_ids: string[]; // ターゲットセラーIDリスト
  keywords: string[] | null; // キーワードリスト（任意）

  // Date Range (Original)
  original_date_start: Date; // 元の開始日
  original_date_end: Date; // 元の終了日

  // Split Configuration
  split_unit: "day" | "week"; // 日付分割単位
  total_tasks: number | null; // 生成されたタスク総数

  // Status Summary
  status: "pending" | "running" | "completed" | "failed" | "paused";
  tasks_pending: number; // Pending状態のタスク数
  tasks_processing: number; // Processing状態のタスク数
  tasks_completed: number; // Completed状態のタスク数
  tasks_failed: number; // Failed状態のタスク数

  // Results Summary
  total_items_found: number; // 見つかった総アイテム数
  total_items_saved: number; // 保存された総アイテム数

  // Execution Tracking
  started_at: Date | null; // ジョブ開始日時
  completed_at: Date | null; // ジョブ完了日時
  estimated_completion_at: Date | null; // 完了予定日時

  // Scheduling
  execution_frequency: "once" | "daily" | "weekly" | "monthly" | null;
  next_execution_at: Date | null; // 次回実行予定日時
  is_recurring: boolean; // 定期実行かどうか

  // Progress
  progress_percentage: number; // 進捗率

  // Metadata
  created_by: string | null; // 作成ユーザー
  metadata: Record<string, any> | null; // 追加メタデータ

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

/**
 * ジョブ作成リクエストの型定義
 */
export interface CreateBatchJobRequest {
  job_name: string;
  description?: string;
  target_seller_ids: string[];
  keywords?: string[];
  date_start: string; // YYYY-MM-DD
  date_end: string; // YYYY-MM-DD
  split_unit: "day" | "week";
  execution_frequency?: "once" | "daily" | "weekly" | "monthly";
  scheduled_at?: string; // ISO 8601
}

/**
 * タスク実行レスポンスの型定義
 */
export interface BatchTaskExecutionResult {
  search_id: string;
  status: "success" | "failed" | "partial";
  items_retrieved: number;
  total_items_found: number;
  total_pages: number;
  current_page: number;
  error_message?: string;
}

/**
 * ジョブ進捗レスポンスの型定義
 */
export interface BatchJobProgress {
  job_id: string;
  job_name: string;
  status: ResearchBatchJob["status"];
  progress_percentage: number;
  total_tasks: number;
  tasks_completed: number;
  tasks_pending: number;
  tasks_processing: number;
  tasks_failed: number;
  total_items_saved: number;
  started_at: Date | null;
  estimated_completion_at: Date | null;
}

/**
 * eBay Finding API Sold Item のレスポンス型定義（簡略版）
 */
export interface EbaySoldItem {
  itemId: string;
  title: string;
  sellerInfo: {
    sellerUserName: string;
    feedbackScore: number;
    positiveFeedbackPercent: number;
  };
  sellingStatus: {
    convertedCurrentPrice: {
      value: number;
      currencyId: string;
    };
    sellingState: string;
  };
  shippingInfo: {
    shippingServiceCost: {
      value: number;
      currencyId: string;
    };
    shipToLocations: string[];
  };
  listingInfo: {
    listingType: string;
    startTime: string;
    endTime: string;
  };
  primaryCategory: {
    categoryId: string;
    categoryName: string;
  };
  condition: {
    conditionId: number;
    conditionDisplayName: string;
  };
  location: string;
  country: string;
  viewItemURL: string;
  galleryURL: string;
  returnsAccepted: boolean;
  topRatedListing: boolean;
}

/**
 * バッチ処理設定
 */
export interface BatchProcessingConfig {
  concurrent_requests: number; // 同時実行数
  delay_between_tasks_ms: number; // タスク間の遅延（ミリ秒）
  delay_between_pages_ms: number; // ページ間の遅延（ミリ秒）
  max_retries: number; // 最大リトライ回数
  retry_delay_ms: number; // リトライ遅延（ミリ秒）
  timeout_per_task_ms: number; // タスクあたりのタイムアウト（ミリ秒）
}

/**
 * デフォルトバッチ処理設定
 */
export const DEFAULT_BATCH_CONFIG: BatchProcessingConfig = {
  concurrent_requests: 1, // レート制限を考慮して1つずつ実行
  delay_between_tasks_ms: 5000, // 5秒間隔（要件に従う）
  delay_between_pages_ms: 2000, // ページネーション間は2秒
  max_retries: 3,
  retry_delay_ms: 3000,
  timeout_per_task_ms: 60000, // 60秒
};
