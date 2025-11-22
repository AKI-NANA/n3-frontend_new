// ファイル: /types/ai.ts
// The Wisdom Core API - AI関連の型定義

/**
 * ペルソナ定義（既存のCADシステムから継承）
 */
export interface Persona {
  id: string;
  name: string;
  tone: string;
  writing_style: string;
  expertise_areas: string[];
}

/**
 * サイト設定（既存のCADシステムから継承）
 */
export interface SiteConfig {
  id: string;
  site_name: string;
  target_audience: string;
  content_themes: string[];
}

/**
 * アイデアソース（idea_source_master テーブルの型定義）
 */
export interface IdeaSource {
  id: string;
  url: string;
  source_type: 'blog' | 'sns' | 'news' | 'competitor' | 'other';
  status: 'new' | 'processing' | 'processed' | 'failed';
  assigned_theme?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * The Wisdom Core API によるテーマ分析結果
 */
export interface ThemeAnalysisResult {
  /** 最終決定された投稿テーマ（日本語） */
  final_theme_jp: string;
  /** メインターゲットとするSEOキーワード */
  target_keywords: string[];
  /** なぜこのテーマが選ばれたかの理由（例: 低競合、高利益率商品との関連） */
  analysis_reason: string;
  /** 記事に含めるべきアフィリエイト商品IDまたはURL */
  affiliate_links: string[];
}

/**
 * 内部データ（N3）をLLMに渡すための型
 */
export interface N3InternalData {
  high_profit_examples: Array<{
    title: string;
    profit_margin: number;
  }>;
}
