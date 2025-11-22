/**
 * NAGANO-3 B2B Partnership Acquisition - TypeScript型定義
 *
 * 生成日: 2025-11-22
 * 目的: 企業案件（タイアップ）獲得自動化のための型定義
 */

// ================================================================
// 1. site_config_master - サイト設定マスター
// ================================================================

export type SiteType = 'blog' | 'youtube' | 'tiktok' | 'note' | 'x' | 'podcast';
export type SiteStatus = 'active' | 'inactive' | 'archived';

export interface SiteMetrics {
  monthly_visitors?: number;
  monthly_pageviews?: number;
  followers?: number;
  avg_engagement_rate?: number;
  youtube_subscribers?: number;
  youtube_avg_views?: number;
  email_subscribers?: number;
  [key: string]: any;
}

export interface SiteApiCredentials {
  google_analytics_view_id?: string;
  youtube_channel_id?: string;
  x_api_key?: string;
  note_api_key?: string;
  [key: string]: any;
}

export interface SiteConfigMaster {
  id: string;

  // 基本情報
  site_name: string;
  site_url: string;
  site_type: SiteType;
  persona_id: string | null;

  // サイト詳細
  description: string | null;
  category: string | null;
  target_audience: string | null;

  // パフォーマンス指標
  metrics: SiteMetrics;

  // API認証情報
  api_credentials: SiteApiCredentials;

  // ステータス
  status: SiteStatus;
  last_metrics_update: string | null;

  // メタ情報
  created_at: string;
  updated_at: string;
}

// ================================================================
// 2. persona_master - ペルソナマスター
// ================================================================

export type PersonaType = 'fictional' | 'real' | 'brand';
export type PersonaStatus = 'active' | 'inactive';

export interface PersonaMaster {
  id: string;

  // 基本情報
  persona_name: string;
  real_name: string | null;

  // ペルソナ設定
  persona_type: PersonaType;
  tone_and_voice: string | null;
  expertise_areas: string[] | null;

  // 強み・影響力
  unique_selling_points: string[] | null;
  total_reach: number;

  // コンタクト情報
  email: string | null;
  phone: string | null;

  // プロフィール
  bio: string | null;
  profile_image_url: string | null;

  // ステータス
  status: PersonaStatus;

  // メタ情報
  created_at: string;
  updated_at: string;
}

// ================================================================
// 3. outreach_log_master - アウトリーチログ
// ================================================================

export type OutreachType = 'email' | 'dm' | 'phone' | 'linkedin';
export type OutreachStatus =
  | 'draft'
  | 'sent'
  | 'opened'
  | 'replied'
  | 'accepted'
  | 'rejected'
  | 'no_response';

export interface EmailAttachment {
  name: string;
  url: string;
  type?: string;
}

export interface OutreachLogMaster {
  id: string;

  // 企業情報
  company_name: string;
  company_url: string | null;
  company_industry: string | null;
  company_size: string | null;

  // コンタクト先
  contact_person: string | null;
  contact_email: string;
  contact_role: string | null;

  // 提案内容
  proposal_id: string | null;
  persona_id: string | null;
  site_ids: string[] | null;

  // アウトリーチ詳細
  outreach_date: string;
  outreach_type: OutreachType;
  email_subject: string | null;
  email_body: string | null;
  attachments: EmailAttachment[];

  // ステータス・進捗
  status: OutreachStatus;
  response_date: string | null;
  response_content: string | null;

  // 成果
  partnership_value_jpy: number | null;
  partnership_start_date: string | null;
  partnership_end_date: string | null;

  // AI生成情報
  ai_generated: boolean;
  ai_confidence_score: number | null;

  // フォローアップ
  follow_up_count: number;
  next_follow_up_date: string | null;

  // メタ情報
  created_at: string;
  updated_at: string;
}

// ================================================================
// 4. partnership_proposals - 提案書マスター
// ================================================================

export type ProposalType =
  | 'sponsored_content'
  | 'affiliate'
  | 'product_review'
  | 'brand_ambassador';

export type ProposalStatus = 'draft' | 'ready' | 'sent' | 'accepted' | 'rejected';

export interface PlatformPlan {
  video_count?: number;
  article_count?: number;
  post_count?: number;
  estimated_reach?: number;
  estimated_engagement?: number;
  format?: string;
  description?: string;
  [key: string]: any;
}

export interface PlatformPlans {
  tiktok?: PlatformPlan;
  youtube?: PlatformPlan;
  blog?: PlatformPlan;
  note?: PlatformPlan;
  x?: PlatformPlan;
  podcast?: PlatformPlan;
  [key: string]: PlatformPlan | undefined;
}

export interface InfluenceProof {
  total_followers?: number;
  monthly_reach?: number;
  avg_engagement_rate?: number;
  past_partnerships?: string[];
  analytics_screenshots?: string[];
  media_mentions?: string[];
  testimonials?: string[];
  [key: string]: any;
}

export interface PartnershipProposal {
  id: string;

  // 提案基本情報
  title: string;
  persona_id: string | null;
  target_company: string;
  target_product: string | null;

  // 提案内容
  proposal_type: ProposalType;
  proposal_summary: string;

  // プラットフォーム別企画
  platform_plans: PlatformPlans;

  // 期待効果
  estimated_reach: number | null;
  estimated_engagement: number | null;
  estimated_conversions: number | null;

  // 価格
  proposed_price_jpy: number | null;
  currency: string;

  // 影響力証明データ
  influence_proof: InfluenceProof;

  // AI生成情報
  ai_generated: boolean;
  ai_prompt_used: string | null;
  ai_generation_date: string | null;

  // ステータス
  status: ProposalStatus;

  // メタ情報
  created_at: string;
  updated_at: string;
}

// ================================================================
// 5. API リクエスト/レスポンス型
// ================================================================

// 影響力証明データ生成リクエスト
export interface GenerateInfluenceProofRequest {
  persona_id: string;
  site_ids?: string[];
}

export interface GenerateInfluenceProofResponse {
  success: boolean;
  data: InfluenceProof;
  pdf_url?: string;
}

// 企業リサーチリクエスト
export interface ResearchCompanyRequest {
  company_url: string;
  product_category?: string;
}

export interface CompanyResearchData {
  company_name: string;
  company_url: string;
  industry: string;
  size: string;
  description: string;
  recent_campaigns?: string[];
  contact_info?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  social_media?: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
}

export interface ResearchCompanyResponse {
  success: boolean;
  data: CompanyResearchData;
}

// 提案書生成リクエスト
export interface GenerateProposalRequest {
  persona_id: string;
  company_data: CompanyResearchData;
  target_product?: string;
  proposal_type?: ProposalType;
  platforms?: SiteType[];
}

export interface GenerateProposalResponse {
  success: boolean;
  proposal_id: string;
  proposal: PartnershipProposal;
}

// アウトリーチメール送信リクエスト
export interface SendOutreachEmailRequest {
  proposal_id: string;
  contact_email: string;
  contact_person?: string;
  company_name: string;
  personalize?: boolean;
}

export interface SendOutreachEmailResponse {
  success: boolean;
  outreach_log_id: string;
  message: string;
}

// ================================================================
// 6. ユーティリティ型
// ================================================================

// フィルター用
export interface OutreachLogFilter {
  status?: OutreachStatus[];
  persona_id?: string;
  company_name?: string;
  date_from?: string;
  date_to?: string;
  ai_generated?: boolean;
}

export interface ProposalFilter {
  status?: ProposalStatus[];
  persona_id?: string;
  proposal_type?: ProposalType[];
  target_company?: string;
}

// 統計用
export interface OutreachStatistics {
  total_sent: number;
  total_replied: number;
  total_accepted: number;
  total_rejected: number;
  response_rate: number;
  acceptance_rate: number;
  total_value_jpy: number;
  avg_value_jpy: number;
}

export interface PersonaPerformance {
  persona_id: string;
  persona_name: string;
  total_outreach: number;
  acceptance_rate: number;
  total_value_jpy: number;
  avg_response_time_hours: number;
}
