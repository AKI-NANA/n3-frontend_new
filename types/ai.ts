// ファイル: /types/ai.ts
// コンテンツ自動生成エンジン関連の型定義

/**
 * サイト設定マスター
 */
export interface SiteConfig {
  id: number;
  domain: string;
  site_name: string;
  platform: 'wordpress' | 'youtube' | 'podcast' | 'tiktok';
  api_key_encrypted: string;
  last_post_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * ペルソナマスター
 */
export interface PersonaMaster {
  id: number;
  site_id: number;
  persona_name: string;
  target_audience: string;
  tone_style: string;
  content_focus: string[];
  created_at: string;
  updated_at: string;
}

/**
 * 生成されたコンテンツ
 */
export interface GeneratedContent {
  content_title: string;
  article_markdown: string;
  image_prompts: string[];
  final_affiliate_links: string[];
  metadata?: {
    keyword_density?: Record<string, number>;
    reading_time?: number;
    seo_score?: number;
  };
}

/**
 * 投稿キューのレコード
 */
export interface ContentQueue {
  id: number;
  site_id: number;
  persona_id: number;
  content_title: string | null;
  article_markdown: string;
  image_prompts: string[];
  final_affiliate_links: string[];
  platform: 'wordpress' | 'youtube' | 'podcast' | 'tiktok';
  scheduled_at: string;
  status: 'pending' | 'publishing' | 'completed' | 'failed';
  post_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 動画生成用の中間型
 */
export interface VideoScript {
  script_text: string;
  narration_voice_id: string;
  scene_cuts: Array<{
    time_sec: number;
    image_prompt: string;
    caption: string;
  }>;
}
