/**
 * モール規約・出品制限ルール
 * 各プラットフォームの出品可否条件を定義
 */

import type { Platform } from '@/lib/multichannel/types';
import type { PlatformRule } from './types';

/**
 * プラットフォーム別出品規約ルール
 */
export const PLATFORM_RULES: Record<Platform, PlatformRule[]> = {
  // Amazon US
  amazon_us: [
    {
      platform: 'amazon_us',
      ruleType: 'condition_restriction',
      conditions: {
        category: ['Electronics', 'Computers', 'Camera'],
        condition: ['New', 'Refurbished'], // 中古不可
      },
      action: 'allow',
      description: '電子機器は新品または再生品のみ出品可能',
    },
    {
      platform: 'amazon_us',
      ruleType: 'category_restriction',
      conditions: {
        category: ['Alcohol', 'Tobacco', 'Weapons'],
      },
      action: 'block',
      description: 'アルコール、タバコ、武器は出品禁止',
    },
  ],

  // Amazon AU
  amazon_au: [
    {
      platform: 'amazon_au',
      ruleType: 'condition_restriction',
      conditions: {
        category: ['Electronics'],
        condition: ['New', 'Refurbished'],
      },
      action: 'allow',
      description: '電子機器は新品または再生品のみ',
    },
  ],

  // Amazon JP
  amazon_jp: [
    {
      platform: 'amazon_jp',
      ruleType: 'category_restriction',
      conditions: {
        category: ['医薬品', 'サプリメント'],
      },
      action: 'block',
      description: '医薬品・サプリメントは許可が必要',
    },
  ],

  // eBay
  ebay: [
    {
      platform: 'ebay',
      ruleType: 'category_restriction',
      conditions: {
        category: ['Weapons', 'Drugs', 'Alcohol'],
      },
      action: 'block',
      description: '武器、薬物、アルコールは出品禁止',
    },
    {
      platform: 'ebay',
      ruleType: 'condition_restriction',
      conditions: {
        condition: ['New', 'Used', 'Refurbished'], // すべて可
      },
      action: 'allow',
      description: 'すべてのコンディションで出品可能',
    },
  ],

  // Coupang
  coupang: [
    {
      platform: 'coupang',
      ruleType: 'condition_restriction',
      conditions: {
        category: ['패션', '뷰티', '가전'],
        condition: ['New'], // 新品のみ
      },
      action: 'allow',
      description: 'ファッション、美容、家電は新品のみ出品可能',
    },
    {
      platform: 'coupang',
      ruleType: 'category_restriction',
      conditions: {
        category: ['의약품', '건강기능식품'],
      },
      action: 'block',
      description: '医薬品・健康機能食品は韓国の許可が必要',
    },
  ],

  // Qoo10
  qoo10: [
    {
      platform: 'qoo10',
      ruleType: 'condition_restriction',
      conditions: {
        condition: ['New', 'Used'],
      },
      action: 'allow',
      description: '新品・中古ともに出品可能',
    },
  ],

  // Shopee
  shopee: [
    {
      platform: 'shopee',
      ruleType: 'category_restriction',
      conditions: {
        category: ['Weapons', 'Adult Content'],
      },
      action: 'block',
      description: '武器、アダルトコンテンツは出品禁止',
    },
    {
      platform: 'shopee',
      ruleType: 'condition_restriction',
      conditions: {
        condition: ['New', 'Used'],
      },
      action: 'allow',
      description: '新品・中古ともに出品可能',
    },
  ],

  // Shopify
  shopify: [
    {
      platform: 'shopify',
      ruleType: 'condition_restriction',
      conditions: {
        condition: ['New', 'Used', 'Refurbished'],
      },
      action: 'allow',
      description: 'すべてのコンディションで販売可能（自社サイト）',
    },
  ],

  // メルカリ
  mercari: [
    {
      platform: 'mercari',
      ruleType: 'category_restriction',
      conditions: {
        category: ['医薬品', 'たばこ', '酒類', '現金・金券類'],
      },
      action: 'block',
      description: '医薬品、たばこ、酒類、現金・金券類は出品禁止',
    },
    {
      platform: 'mercari',
      ruleType: 'condition_restriction',
      conditions: {
        condition: ['New', 'Used'],
      },
      action: 'allow',
      description: '新品・中古ともに出品可能',
    },
  ],
};

/**
 * プラットフォーム規約に違反していないかチェック
 * @param platform - プラットフォーム
 * @param category - カテゴリ
 * @param condition - コンディション
 * @param htsCode - HSコード（オプション）
 * @returns { allowed: boolean, reason?: string }
 */
export function checkPlatformRules(
  platform: Platform,
  category: string,
  condition: 'New' | 'Used' | 'Refurbished',
  htsCode?: string
): { allowed: boolean; reason?: string } {
  const rules = PLATFORM_RULES[platform];

  if (!rules || rules.length === 0) {
    return { allowed: true }; // ルールがない場合は許可
  }

  for (const rule of rules) {
    // ブロックルールのチェック
    if (rule.action === 'block') {
      // カテゴリチェック
      if (
        rule.conditions.category &&
        rule.conditions.category.some(
          (cat) =>
            cat.toLowerCase() === category.toLowerCase() ||
            category.toLowerCase().includes(cat.toLowerCase())
        )
      ) {
        return {
          allowed: false,
          reason: `${platform}: ${rule.description}`,
        };
      }

      // HSコードチェック
      if (
        htsCode &&
        rule.conditions.htsCode &&
        rule.conditions.htsCode.includes(htsCode)
      ) {
        return {
          allowed: false,
          reason: `${platform}: ${rule.description}`,
        };
      }
    }

    // 許可ルールのチェック（コンディション）
    if (rule.action === 'allow' && rule.ruleType === 'condition_restriction') {
      // 特定カテゴリの場合のみ適用
      if (rule.conditions.category && rule.conditions.category.length > 0) {
        const categoryMatches = rule.conditions.category.some(
          (cat) =>
            cat.toLowerCase() === category.toLowerCase() ||
            category.toLowerCase().includes(cat.toLowerCase())
        );

        if (categoryMatches) {
          // カテゴリが一致した場合、コンディションをチェック
          if (
            rule.conditions.condition &&
            !rule.conditions.condition.includes(condition)
          ) {
            return {
              allowed: false,
              reason: `${platform}: ${category}カテゴリでは${condition}は出品不可`,
            };
          }
        }
      }
    }
  }

  return { allowed: true };
}

/**
 * 複数のプラットフォームで規約チェックを実行
 */
export function checkMultiplePlatformRules(
  platforms: Platform[],
  category: string,
  condition: 'New' | 'Used' | 'Refurbished',
  htsCode?: string
): Record<Platform, { allowed: boolean; reason?: string }> {
  const results: Record<string, { allowed: boolean; reason?: string }> = {};

  for (const platform of platforms) {
    results[platform] = checkPlatformRules(platform, category, condition, htsCode);
  }

  return results as Record<Platform, { allowed: boolean; reason?: string }>;
}
