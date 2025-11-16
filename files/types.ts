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
  
  // 重み設定 (Wk)
  weight_profit: number;
  weight_competition: number;
  weight_trend: number;
  weight_scarcity: number;
  weight_reliability: number;
  
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
  score_discontinued_bonus: number;
  score_trend_boost: number;
  score_success_rate_bonus: number;
  
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
  min_price_bonus: number;       // C5: 最安値競争力ボーナス
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
}

/**
 * 商品マスター（スコア関連フィールドのみ）
 */
export interface ProductMaster {
  id: string;
  sku: string;
  title: string;
  title_en: string | null;
  condition: 'new' | 'used';
  
  // 価格情報
  price_jpy: number;
  acquired_price_jpy: number | null;
  
  // スコア関連
  listing_score: number | null;
  score_calculated_at: string | null;
  score_details: ScoreDetails | null;
  
  // SellerMirror分析データ
  sm_analyzed_at: string | null;
  sm_profit_margin: number | null;
  sm_competitors: number | null;
  sm_min_price_usd: number | null;
  
  // JSONB型データ
  listing_data: {
    weight_g?: number;
    height_cm?: number;
    width_cm?: number;
    length_cm?: number;
  } | null;
  
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
  score_discontinued_bonus?: number;
  score_trend_boost?: number;
  score_success_rate_bonus?: number;
}
