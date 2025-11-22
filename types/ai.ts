// ファイル: /types/ai.ts

/**
 * 投稿ペルソナの定義
 */
export interface Persona {
  id: number;
  name: string;
  age: number | null;
  gender: string | null;
  expertise: string | null;
  /** LLMに渡す、文体や口調に関する詳細な指示プロンプト */
  style_prompt: string;
  created_at: string;
  updated_at: string;
}

/**
 * サイト・アカウント設定（100+サイト管理用）
 */
export interface SiteConfig {
  id: number;
  name: string;
  domain: string;
  /** 'wordpress' | 'youtube' | 'tiktok' | 'podcast' */
  platform: 'wordpress' | 'youtube' | 'tiktok' | 'podcast';
  /** APIキーやパスワードなどの機密情報は暗号化して保存 */
  api_key_encrypted: string | null;
  /** 紐づけられたペルソナID */
  persona_id: number | null;
  status: 'active' | 'paused' | 'error';
  last_post_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * アイデア/URLソース管理
 */
export interface IdeaSource {
  id: number;
  url: string;
  title: string | null;
  platform: string | null;
  /** LLMによって決定された最終的な投稿テーマ */
  assigned_theme: string | null;
  priority: number;
  /** 'new' | 'in_analysis' | 'processed' */
  status: 'new' | 'in_analysis' | 'processed';
  created_at: string;
}
