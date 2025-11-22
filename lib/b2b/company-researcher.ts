/**
 * NAGANO-3 B2B Partnership - 企業リサーチャー
 *
 * 目的: 企業のウェブサイトから情報を自動収集し、親和性スコアを計算
 */

import type { CompanyResearchData } from '@/types/b2b-partnership';

/**
 * 企業情報をリサーチ
 *
 * TODO: 実際のスクレイピング実装
 * - Puppeteerを使用してウェブサイトをクロール
 * - 会社概要、事業内容、ニュース等を抽出
 * - コンタクト情報を収集
 */
export async function researchCompany(
  companyUrl: string,
  options?: {
    deep_research?: boolean; // 深堀りリサーチ（複数ページをクロール）
    extract_contacts?: boolean; // コンタクト情報を抽出
    analyze_campaigns?: boolean; // 最近のキャンペーンを分析
  }
): Promise<CompanyResearchData> {
  console.log(`[B2B] Researching company: ${companyUrl}`);

  try {
    // URLを正規化
    const normalizedUrl = normalizeUrl(companyUrl);

    // 基本情報をスクレイピング
    const basicInfo = await scrapeBasicInfo(normalizedUrl);

    // コンタクト情報を抽出（オプション）
    let contactInfo;
    if (options?.extract_contacts) {
      contactInfo = await extractContactInfo(normalizedUrl);
    }

    // SNS情報を抽出
    const socialMedia = await extractSocialMedia(normalizedUrl);

    // 最近のキャンペーン情報を分析（オプション）
    let recentCampaigns;
    if (options?.analyze_campaigns) {
      recentCampaigns = await analyzeCampaigns(normalizedUrl);
    }

    const researchData: CompanyResearchData = {
      company_name: basicInfo.name,
      company_url: normalizedUrl,
      industry: basicInfo.industry || '不明',
      size: basicInfo.size || 'unknown',
      description: basicInfo.description || '',
      recent_campaigns: recentCampaigns,
      contact_info: contactInfo,
      social_media: socialMedia,
    };

    console.log(`[B2B] Research completed for ${basicInfo.name}`);

    return researchData;
  } catch (error) {
    console.error(`[B2B] Error researching company:`, error);
    throw error;
  }
}

/**
 * 企業とペルソナの親和性スコアを計算
 */
export function calculateAffinityScore(
  companyData: CompanyResearchData,
  personaData: {
    expertise_areas?: string[];
    category?: string;
    target_audience?: string;
  }
): number {
  let score = 0;

  // 業種の一致（最大30点）
  if (personaData.category && companyData.industry) {
    if (isIndustryMatch(personaData.category, companyData.industry)) {
      score += 30;
    } else if (isIndustryRelated(personaData.category, companyData.industry)) {
      score += 15;
    }
  }

  // 専門分野の一致（最大40点）
  if (personaData.expertise_areas && personaData.expertise_areas.length > 0) {
    const description = companyData.description.toLowerCase();
    const matchedAreas = personaData.expertise_areas.filter((area) =>
      description.includes(area.toLowerCase())
    );

    score += Math.min(40, matchedAreas.length * 10);
  }

  // 企業規模（最大15点）
  if (companyData.size) {
    switch (companyData.size) {
      case 'enterprise':
        score += 15; // 大企業は予算が多い
        break;
      case 'sme':
        score += 10; // 中小企業は柔軟性がある
        break;
      case 'startup':
        score += 5; // スタートアップは予算が限られる
        break;
    }
  }

  // SNS活用度（最大15点）
  if (companyData.social_media) {
    const platformCount = Object.values(companyData.social_media).filter(Boolean).length;
    score += Math.min(15, platformCount * 3);
  }

  return Math.min(100, score);
}

// ================================================================
// スクレイピング関数（TODO: 実装）
// ================================================================

/**
 * 基本情報をスクレイピング
 */
async function scrapeBasicInfo(url: string): Promise<{
  name: string;
  industry?: string;
  size?: string;
  description?: string;
}> {
  // TODO: Puppeteerで実装
  // - タイトルタグから企業名を抽出
  // - メタディスクリプションから説明を抽出
  // - 会社概要ページから詳細情報を取得

  // モックデータ（開発用）
  const domain = new URL(url).hostname;
  const companyName = domain.split('.')[0];

  return {
    name: companyName.charAt(0).toUpperCase() + companyName.slice(1) + '株式会社',
    industry: 'IT・ソフトウェア',
    size: 'sme',
    description:
      'デジタルマーケティング支援とEコマースソリューションを提供する企業です。最新のAI技術を活用した効果的なプロモーションをサポートします。',
  };
}

/**
 * コンタクト情報を抽出
 */
async function extractContactInfo(url: string): Promise<{
  email?: string;
  phone?: string;
  address?: string;
}> {
  // TODO: Puppeteerで実装
  // - 「お問い合わせ」ページを探索
  // - メールアドレスを抽出（正規表現）
  // - 電話番号を抽出
  // - 住所を抽出

  // モックデータ（開発用）
  return {
    email: 'info@example.com',
    phone: '03-1234-5678',
    address: '東京都渋谷区',
  };
}

/**
 * SNS情報を抽出
 */
async function extractSocialMedia(url: string): Promise<{
  twitter?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
}> {
  // TODO: Puppeteerで実装
  // - ページ内のSNSリンクを検索
  // - twitter.com, facebook.com, instagram.com, linkedin.com のリンクを抽出

  // モックデータ（開発用）
  return {
    twitter: 'https://twitter.com/example',
    instagram: 'https://instagram.com/example',
  };
}

/**
 * 最近のキャンペーン情報を分析
 */
async function analyzeCampaigns(url: string): Promise<string[]> {
  // TODO: Puppeteerで実装
  // - ニュースページやブログをクロール
  // - 「キャンペーン」「プロモーション」等のキーワードで記事を抽出
  // - 直近3ヶ月のキャンペーン情報を収集

  // モックデータ（開発用）
  return [
    '春の新商品キャンペーン（2025年3月）',
    'インフルエンサーコラボ企画（2025年2月）',
    '年末セール（2024年12月）',
  ];
}

// ================================================================
// ヘルパー関数
// ================================================================

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    // プロトコルがない場合は追加
    return `https://${url}`;
  }
}

function isIndustryMatch(category: string, industry: string): boolean {
  const categoryLower = category.toLowerCase();
  const industryLower = industry.toLowerCase();

  const matchMap: { [key: string]: string[] } = {
    美容: ['化粧品', 'コスメ', '美容', 'beauty', 'cosmetics'],
    ファッション: ['アパレル', 'ファッション', 'fashion', 'apparel'],
    食品: ['食品', 'フード', 'food', '飲料', 'beverage'],
    ビジネス: ['it', 'ソフトウェア', 'コンサルティング', 'マーケティング'],
    健康: ['健康', 'ヘルスケア', 'health', 'wellness', 'フィットネス'],
  };

  const keywords = matchMap[category] || [categoryLower];

  return keywords.some((keyword) => industryLower.includes(keyword));
}

function isIndustryRelated(category: string, industry: string): boolean {
  const relatedMap: { [key: string]: string[] } = {
    美容: ['ファッション', 'アパレル', '健康', 'ヘルスケア'],
    ファッション: ['美容', '化粧品', 'ライフスタイル'],
    食品: ['健康', 'フィットネス', 'ライフスタイル'],
    ビジネス: ['マーケティング', 'コンサルティング', 'テクノロジー'],
  };

  const relatedIndustries = relatedMap[category] || [];
  const industryLower = industry.toLowerCase();

  return relatedIndustries.some((related) => industryLower.includes(related.toLowerCase()));
}
