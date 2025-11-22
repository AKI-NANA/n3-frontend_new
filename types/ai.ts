// types/ai.ts
// AI駆動のコンテンツ自動生成エンジン用の型定義

/**
 * N3の内部データ（高利益商品事例など）
 */
export interface N3InternalData {
  /** 高利益率商品の事例リスト */
  high_profit_examples: Array<{
    title: string;
    profit_margin: number;
  }>;
}

/**
 * 記事生成APIの出力
 */
export interface GeneratedContent {
  /** ペルソナの文体で書かれた記事本文 (Markdown形式) */
  article_markdown: string;
  /** 記事のアイキャッチ画像や挿入画像のためのプロンプト */
  image_prompts: string[];
  /** 記事内で使用する最適なアフィリエイトリンクの最終リスト */
  final_affiliate_links: string[];
}

/**
 * 記事生成APIへの入力
 */
export interface ContentInput {
  /** Theme Generatorから決定された最終テーマ */
  theme: string;
  /** Persona Masterから取得した文体指示プロンプト */
  style_prompt: string;
  /** N3の内部データ（高利益商品など） */
  internal_data: N3InternalData;
  /** テーマ分析で決定されたアフィリエイトリンク候補 */
  affiliate_candidates: string[];
}
