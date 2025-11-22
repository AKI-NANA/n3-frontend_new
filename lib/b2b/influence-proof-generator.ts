/**
 * NAGANO-3 B2B Partnership - 影響力証明データ生成
 *
 * 目的: ペルソナの全サイトのメトリクスを集計し、企業への提案用の影響力証明データを生成
 */

import {
  fetchPersonaById,
  fetchSites,
  aggregatePersonaMetrics,
} from '@/lib/supabase/b2b-partnership';
import type { InfluenceProof, SiteConfigMaster } from '@/types/b2b-partnership';

/**
 * 影響力証明データを生成
 */
export async function generateInfluenceProof(
  personaId: string,
  siteIds?: string[]
): Promise<InfluenceProof> {
  // ペルソナ情報を取得
  const persona = await fetchPersonaById(personaId);

  // サイト情報を取得
  let sites: SiteConfigMaster[];
  if (siteIds && siteIds.length > 0) {
    // 指定されたサイトのみ
    const allSites = await fetchSites(personaId, 'active');
    sites = allSites.filter((site) => siteIds.includes(site.id));
  } else {
    // 全てのアクティブなサイト
    sites = await fetchSites(personaId, 'active');
  }

  // メトリクスを集計
  const aggregated = await aggregatePersonaMetrics(personaId);

  // プラットフォーム別の詳細データを生成
  const platformDetails = sites.map((site) => ({
    platform: site.site_type,
    site_name: site.site_name,
    site_url: site.site_url,
    metrics: site.metrics,
    category: site.category,
    target_audience: site.target_audience,
  }));

  // 影響力証明データを構築
  const influenceProof: InfluenceProof = {
    total_followers: aggregated.total_followers,
    monthly_reach: aggregated.total_monthly_visitors + aggregated.total_monthly_pageviews,
    avg_engagement_rate: aggregated.avg_engagement_rate,

    // ペルソナの強み
    unique_selling_points: persona.unique_selling_points || [],
    expertise_areas: persona.expertise_areas || [],

    // プラットフォーム情報
    platforms: aggregated.platforms,
    platform_details: platformDetails,

    // 信頼性データ
    persona_name: persona.persona_name,
    persona_bio: persona.bio || '',
    years_active: calculateYearsActive(persona.created_at),

    // 追加メトリクス
    email_subscribers: calculateTotalEmailSubscribers(sites),
    youtube_subscribers: calculateYouTubeSubscribers(sites),
    youtube_avg_views: calculateYouTubeAvgViews(sites),
    tiktok_followers: calculateTikTokFollowers(sites),
    x_followers: calculateXFollowers(sites),

    // 過去の実績（今後拡張予定）
    past_partnerships: [],
    media_mentions: [],
    testimonials: [],

    // データの鮮度
    data_last_updated: new Date().toISOString(),
  };

  return influenceProof;
}

/**
 * 影響力証明データをMarkdown形式で出力（提案書用）
 */
export function formatInfluenceProofAsMarkdown(proof: InfluenceProof): string {
  const sections: string[] = [];

  // ヘッダー
  sections.push(`# 影響力証明書`);
  sections.push(`## ${proof.persona_name}\n`);

  // プロフィール
  if (proof.persona_bio) {
    sections.push(`### プロフィール`);
    sections.push(proof.persona_bio);
    sections.push('');
  }

  // 総合リーチ
  sections.push(`### 総合リーチ`);
  sections.push(`- **総フォロワー数**: ${proof.total_followers?.toLocaleString() || 'N/A'} 人`);
  sections.push(
    `- **月間リーチ**: ${proof.monthly_reach?.toLocaleString() || 'N/A'} 人`
  );
  sections.push(
    `- **平均エンゲージメント率**: ${proof.avg_engagement_rate?.toFixed(1) || 'N/A'}%`
  );
  sections.push('');

  // プラットフォーム別詳細
  sections.push(`### プラットフォーム別詳細\n`);

  if (proof.youtube_subscribers) {
    sections.push(`#### YouTube`);
    sections.push(`- チャンネル登録者数: ${proof.youtube_subscribers.toLocaleString()} 人`);
    if (proof.youtube_avg_views) {
      sections.push(`- 平均再生回数: ${proof.youtube_avg_views.toLocaleString()} 回`);
    }
    sections.push('');
  }

  if (proof.tiktok_followers) {
    sections.push(`#### TikTok`);
    sections.push(`- フォロワー数: ${proof.tiktok_followers.toLocaleString()} 人`);
    sections.push('');
  }

  if (proof.x_followers) {
    sections.push(`#### X (旧Twitter)`);
    sections.push(`- フォロワー数: ${proof.x_followers.toLocaleString()} 人`);
    sections.push('');
  }

  if (proof.email_subscribers) {
    sections.push(`#### メールマガジン`);
    sections.push(`- 購読者数: ${proof.email_subscribers.toLocaleString()} 人`);
    sections.push('');
  }

  // 専門分野
  if (proof.expertise_areas && proof.expertise_areas.length > 0) {
    sections.push(`### 専門分野`);
    proof.expertise_areas.forEach((area) => {
      sections.push(`- ${area}`);
    });
    sections.push('');
  }

  // 強み
  if (proof.unique_selling_points && proof.unique_selling_points.length > 0) {
    sections.push(`### 強み・特徴`);
    proof.unique_selling_points.forEach((point) => {
      sections.push(`- ${point}`);
    });
    sections.push('');
  }

  // 過去の実績
  if (proof.past_partnerships && proof.past_partnerships.length > 0) {
    sections.push(`### 過去のタイアップ実績`);
    proof.past_partnerships.forEach((partner) => {
      sections.push(`- ${partner}`);
    });
    sections.push('');
  }

  // フッター
  sections.push(`---`);
  sections.push(
    `*データ更新日: ${new Date(proof.data_last_updated!).toLocaleDateString('ja-JP')}*`
  );

  return sections.join('\n');
}

/**
 * 影響力証明データをJSON形式で出力（API用）
 */
export function formatInfluenceProofAsJSON(proof: InfluenceProof): string {
  return JSON.stringify(proof, null, 2);
}

// ================================================================
// ヘルパー関数
// ================================================================

function calculateYearsActive(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const years = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 365);
  return Math.max(1, Math.floor(years));
}

function calculateTotalEmailSubscribers(sites: SiteConfigMaster[]): number {
  return sites.reduce((total, site) => {
    const subscribers = site.metrics?.email_subscribers || 0;
    return total + subscribers;
  }, 0);
}

function calculateYouTubeSubscribers(sites: SiteConfigMaster[]): number {
  const youtubeSites = sites.filter((site) => site.site_type === 'youtube');
  return youtubeSites.reduce((total, site) => {
    const subscribers = site.metrics?.youtube_subscribers || 0;
    return total + subscribers;
  }, 0);
}

function calculateYouTubeAvgViews(sites: SiteConfigMaster[]): number {
  const youtubeSites = sites.filter((site) => site.site_type === 'youtube');
  if (youtubeSites.length === 0) return 0;

  const totalViews = youtubeSites.reduce((total, site) => {
    const views = site.metrics?.youtube_avg_views || 0;
    return total + views;
  }, 0);

  return Math.floor(totalViews / youtubeSites.length);
}

function calculateTikTokFollowers(sites: SiteConfigMaster[]): number {
  const tiktokSites = sites.filter((site) => site.site_type === 'tiktok');
  return tiktokSites.reduce((total, site) => {
    const followers = site.metrics?.followers || 0;
    return total + followers;
  }, 0);
}

function calculateXFollowers(sites: SiteConfigMaster[]): number {
  const xSites = sites.filter((site) => site.site_type === 'x');
  return xSites.reduce((total, site) => {
    const followers = site.metrics?.followers || 0;
    return total + followers;
  }, 0);
}
