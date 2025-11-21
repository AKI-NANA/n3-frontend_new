// ============================================
// Phase 7: SEO/健全性マネージャー 型定義
// ============================================

/**
 * オークションアンカー設定（機能7-1）
 * 全カテゴリーに対し、「利益損失にならないスタート価格」を設定
 */
export interface AuctionAnchor {
  id: string;
  product_id: string;
  category: string;

  // 価格設定
  min_start_price_usd: number;          // 最低開始価格（利益損失にならない価格）
  current_start_price_usd: number;      // 現在の開始価格
  auto_relist: boolean;                 // 自動再出品フラグ

  // オークション状態
  auction_status: 'active' | 'ended_no_bids' | 'ended_with_bids' | 'converted_to_fixed';
  ebay_auction_id?: string | null;      // eBayオークションID
  current_bid_count: number;            // 現在の入札数
  current_highest_bid_usd?: number | null;

  // 自動切り替え設定（機能7-2）
  auto_convert_to_fixed: boolean;       // 入札なしで自動的に定額出品に切り替え
  fixed_price_usd?: number | null;      // 切り替え後の定額価格
  converted_at?: string | null;         // 定額に切り替えた日時

  // 在庫監視（機能7-3）
  inventory_check_enabled: boolean;     // 在庫監視の有効化
  inventory_lost_at?: string | null;    // 在庫ロス検出日時
  auto_ended_for_inventory?: boolean;   // 在庫ロスによる自動終了フラグ

  // スケジュール
  next_auction_scheduled_at?: string | null;
  last_auction_ended_at?: string | null;

  created_at: string;
  updated_at: string;
}

/**
 * リスティング健全性スコア（機能7-4）
 * 90日間の販売実績を監視し、スコアが低いものは自動終了を推奨
 */
export interface ListingHealthScore {
  id: string;
  product_id: string;
  ebay_listing_id?: string | null;

  // 健全性スコア（0-100）
  health_score: number;
  score_calculated_at: string;

  // 評価指標（過去90日間）
  days_since_last_sale: number;         // 最終販売からの経過日数
  total_views_90d: number;              // 総閲覧数
  total_sales_90d: number;              // 総販売数
  conversion_rate_90d: number;          // コンバージョン率 (%)
  avg_daily_views: number;              // 1日平均閲覧数

  // eBay SEO指標
  search_appearance_rate: number;       // 検索表示率 (%)
  click_through_rate: number;           // クリック率 (%)
  watch_count: number;                  // ウォッチ数

  // 死に筋判定
  is_dead_listing: boolean;             // 死に筋フラグ
  dead_listing_reason?: string | null;  // 死に筋理由
  recommended_action: 'keep' | 'revise' | 'end';  // 推奨アクション

  // 自動終了設定
  auto_end_enabled: boolean;            // 自動終了の有効化
  auto_ended_at?: string | null;        // 自動終了日時

  created_at: string;
  updated_at: string;
}

/**
 * SEOアラート（ダッシュボード統合用）
 */
export interface SeoHealthAlert {
  id: string;
  alert_type: 'auction_no_bids' | 'inventory_lost' | 'low_health_score' | 'zero_dollar_ending';
  severity: 'High' | 'Medium' | 'Low';
  message: string;

  product_id: string;
  product_title?: string;
  ebay_listing_id?: string | null;

  // 関連データ
  auction_anchor_id?: string | null;
  health_score_id?: string | null;

  // アクション
  action_taken: 'pending' | 'auto_converted' | 'auto_ended' | 'manual_review' | 'ignored';
  action_taken_at?: string | null;

  created_at: string;
  resolved_at?: string | null;
}

/**
 * オークション実行リクエスト（一括承認UI連携）
 */
export interface AuctionBatchExecutionRequest {
  anchor_ids: string[];                 // 実行するアンカーIDのリスト
  execution_type: 'immediate' | 'scheduled';
  scheduled_at?: string | null;         // スケジュール実行時刻

  // 人間承認ゲートウェイ（C2）
  approved_by_user_id: string;
  approval_notes?: string | null;
}

/**
 * オークション実行結果
 */
export interface AuctionExecutionResult {
  anchor_id: string;
  success: boolean;
  ebay_auction_id?: string | null;
  error_message?: string | null;
  executed_at: string;
}

/**
 * 一括オークション実行レスポンス
 */
export interface AuctionBatchExecutionResponse {
  total_requested: number;
  successful: number;
  failed: number;
  results: AuctionExecutionResult[];
}

/**
 * 健全性スコア計算リクエスト
 */
export interface HealthScoreCalculateRequest {
  product_ids?: string[];               // 指定商品のみ計算（未指定なら全商品）
  force_recalculate?: boolean;          // 強制再計算
}

/**
 * 健全性スコア計算レスポンス
 */
export interface HealthScoreCalculateResponse {
  success: boolean;
  updated: number;
  dead_listings_detected: number;
  results: HealthScoreResult[];
  error?: string;
}

/**
 * 健全性スコア計算結果（個別商品）
 */
export interface HealthScoreResult {
  product_id: string;
  health_score: number;
  is_dead_listing: boolean;
  recommended_action: 'keep' | 'revise' | 'end';
  details: {
    days_since_last_sale: number;
    total_views_90d: number;
    total_sales_90d: number;
    conversion_rate_90d: number;
  };
}

/**
 * カテゴリー別オークション統計
 */
export interface CategoryAuctionStats {
  category: string;
  total_anchors: number;
  active_auctions: number;
  avg_bid_count: number;
  conversion_rate_to_fixed: number;     // 定額切り替え率 (%)
  avg_health_score: number;
}

/**
 * SEO/健全性ダッシュボード統計
 */
export interface SeoHealthDashboardStats {
  total_active_auctions: number;
  auctions_with_no_bids: number;
  inventory_lost_count: number;
  dead_listings_count: number;
  avg_health_score: number;

  // アラート統計
  high_severity_alerts: number;
  medium_severity_alerts: number;
  pending_actions: number;

  // カテゴリー別統計
  category_stats: CategoryAuctionStats[];
}
