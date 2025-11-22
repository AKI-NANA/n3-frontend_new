/**
 * AI画像生成関連の型定義
 * NAGANO-3 AI画像生成自動化システム用
 */

/**
 * AIによる画像生成プロンプトの最適化結果
 */
export interface PromptOptimization {
  /** 画像生成APIに渡す具体的なプロンプト */
  optimized_prompt: string;
  /** 推奨される画像比率 (例: 16:9, 1:1, 4:5) */
  aspect_ratio: string;
  /** 最適化の根拠（なぜこのプロンプトが魅力的か） */
  optimization_justification: string;
}

/**
 * 画像生成ログのレコード
 */
export interface ImageGenerationLog {
  id: number;
  source_product_id: number | null;
  source_cf_project_id: number | null;
  prompt_original: string | null;
  prompt_optimized: string;
  generated_image_url: string | null;
  generation_model: string | null;
  cost_usd: number;
  status: 'success' | 'failed' | 'pending_review' | 'approved_use';
  created_at: string;
}
