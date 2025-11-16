// ============================================
// スコア管理システム 型定義
// ============================================

/**
 * スコア設定
 */
export interface ScoreSettings {
  id: string;
  name: string;
  description: string | null;
  
  // 重み設定 (Wk) - 合計100点
  weight_profit: number;         // P: 利益額
  weight_competition: number;    // C: 競合の少なさ
  weight_future: number;         // F: 将来性（新規）
  weight_trend: number;          // T: データ鮮度
  weight_scarcity: number;       // S: 希少性
  weight_reliability: number;    // R: 実績
  
  // 利益乗数設定 (M_Profit)
  profit_multiplier_base: number;
  profit_multiplier_threshold: number;
  profit_multiplier_increment: number;
  
  // ペナルティ設定 (M_Penalty)
  penalty_low_profit_threshold: number;
  penalty_multiplier: number;
  
  // 基本点設定 (Sk の基準値)
  score_profit_per_1000_jpy: number;
  score_competitor_penalty: number;
  score_jp_seller_penalty: number;          // 日本人セラーペナルティ (新規)
  score_discontinued_bonus: number;
  score_trend_boost: number;
  score_success_rate_bonus: number;
  score_future_release_boost: number;       // 発売後ブースト (新規)
  score_future_premium_boost: number;       // 予約・高騰ブースト (新規)
  
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * スコア詳細内訳
 */
export interface ScoreDetails {
  // カテゴリ別スコア
  profit_score: number;          // P1: 純利益スコア
  competition_score: number;     // C1: 飽和度ペナルティ
  jp_seller_score: number;       // C2: 日本人セラー競合スコア (新規)
  min_price_bonus: number;       // C5: 最安値競争力ボーナス
  future_score: number;          // F: 将来性スコア (新規)
  trend_score: number;           // T1: トレンドスコア
  scarcity_score: number;        // S1: 希少性スコア
  reliability_score: number;     // R1: 実績スコア
  
  // 計算過程
  weighted_sum: number;          // 重み付け合計
  profit_multiplier: number;     // M_Profit: 利益乗数
  penalty_multiplier: number;    // M_Penalty: ペナルティ乗数
  random_value: number;          // R: 微細な乱数
  
  // 最終スコア
  final_score: number;
  
  // 🆕 新スコアシステムの項目（v4: 市場調査データ有無対応）
  market_research_score?: number;      // 市場調査スコア (0-40) or 推定スコア
  has_market_research?: boolean;       // 市場調査データの有無
  is_estimated?: boolean;              // 推定スコアかどうか
  competition_score?: number;          // 競合の少なさ (0-15)
  price_competitiveness_score?: number; // 最安値競争力 (0-15)
  recent_sales_score?: number;         // 最近の売れ行き (0-10)
  scarcity_score?: number;             // 希少性・廃盤 (0-10)
  profit_score?: number;               // 利益額 (0-10)
  jp_market_scarcity_score?: number;   // 日本市場の希少性 (0-10)
  
  // 廃止された項目（互換性のため保持）
  image_score?: number;
  size_score?: number;
  html_score?: number;
  eu_score?: number;
  hts_score?: number;
  master_key_score?: number;
  sm_score?: number;
}

/**
 * 商品マスター（スコア関連フィールドのみ）
 */
export interface ProductMaster {
  id: string;
  sku: string;
  master_key?: string | null;    // Master Key
  title: string;
  title_en: string | null;
  english_title?: string | null;
  condition: 'new' | 'used' | string;
  
  // 価格情報
  price_jpy: number;
  purchase_price_jpy: number | null;
  acquired_price_jpy?: number | null;  // 互換性のため保持
  ddp_price_usd?: number | null;       // DDP価格（USD）
  
  // スコア関連
  listing_score: number | null;
  score_calculated_at: string | null;
  score_details: ScoreDetails | null;
  
  // SellerMirror分析データ
  sm_analyzed_at: string | null;
  sm_profit_margin: number | null;
  sm_competitors: number | null;
  sm_competitor_count?: number | null;
  sm_recent_sales_count?: number | null;  // 最近の販売件数
  sm_profit_amount_usd?: number | null;   // 利益額（USD）
  sm_jp_sellers: number | null;              // 日本人セラー数 (新規)
  sm_lowest_price: number | null;
  
  // 商品情報（将来性スコア用）
  release_date: string | null;               // 発売日 (新規)
  msrp_jpy: number | null;                   // メーカー希望小売価格 (新規)
  discontinued_at: string | null;            // 廃盤判定日 (新規)
  
  // HTS情報
  hts_code?: string | null;
  hts_score?: number | null;
  hts_confidence?: string | null;
  
  // EU情報
  eu_responsible_company_name?: string | null;
  
  // 市場調査スコア
  market_research_score?: number | null;
  market_research_data?: any | null;
  market_researched_at?: string | null;
  
  // 画像情報
  images?: any[] | null;
  image_urls?: string[] | null;
  primary_image_url?: string | null;
  
  // JSONB型データ
  listing_data: {
    weight_g?: number;
    height_cm?: number;
    width_cm?: number;
    length_cm?: number;
    html_description?: string;
  } | null;
  scraped_data?: any | null;
  
  created_at: string;
  updated_at: string;
}

/**
 * スコア計算リクエスト
 */
export interface ScoreCalculateRequest {
  productIds?: string[];  // 指定商品のみ計算（未指定なら全商品）
  settingId?: string;     // 使用する設定ID（未指定ならデフォルト）
}

/**
 * スコア計算レスポンス
 */
export interface ScoreCalculateResponse {
  success: boolean;
  updated: number;
  results: ScoreResult[];
  error?: string;
}

/**
 * スコア計算結果（個別商品）
 */
export interface ScoreResult {
  id: string;
  sku: string;
  score: number;
  details: ScoreDetails;
}

/**
 * 設定更新リクエスト
 */
export interface SettingsUpdateRequest {
  weight_profit?: number;
  weight_competition?: number;
  weight_future?: number;
  weight_trend?: number;
  weight_scarcity?: number;
  weight_reliability?: number;
  profit_multiplier_base?: number;
  profit_multiplier_threshold?: number;
  profit_multiplier_increment?: number;
  penalty_low_profit_threshold?: number;
  penalty_multiplier?: number;
  score_profit_per_1000_jpy?: number;
  score_competitor_penalty?: number;
  score_jp_seller_penalty?: number;
  score_discontinued_bonus?: number;
  score_trend_boost?: number;
  score_success_rate_bonus?: number;
  score_future_release_boost?: number;
  score_future_premium_boost?: number;
}
