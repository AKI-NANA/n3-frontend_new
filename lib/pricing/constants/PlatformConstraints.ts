/**
 * プラットフォーム（モール）別の制約定義
 *
 * 各モールの規約に基づく制約をハードコードで管理
 */

import { Platform, PlatformConstraint } from '@/types/strategy';

/**
 * モール別制約マップ
 */
export const PLATFORM_CONSTRAINTS: Record<Platform, PlatformConstraint> = {
  /**
   * Amazon
   * - 中古品の制限が厳しい
   * - 最低価格制限あり
   */
  amazon: {
    platform: 'amazon',
    allowed_categories: null, // 全カテゴリー許可
    blocked_categories: [
      'アダルト',
      '医薬品',
      '健康食品（一部）',
    ],
    allowed_conditions: ['New', 'Like New', 'Very Good', 'Good', 'Acceptable'],
    blocked_conditions: null,
    min_price_jpy: 300, // 最低価格: 300円
    max_price_jpy: null,
    requires_approval: false,
  },

  /**
   * eBay
   * - カテゴリー制限が緩い
   * - 中古品も広く対応
   */
  ebay: {
    platform: 'ebay',
    allowed_categories: null, // 全カテゴリー許可
    blocked_categories: [
      'アダルト',
      '偽造品',
      'レプリカ（一部）',
    ],
    allowed_conditions: null, // 全コンディション許可
    blocked_conditions: null,
    min_price_jpy: 100, // 最低価格: 100円
    max_price_jpy: null,
    requires_approval: false,
  },

  /**
   * Mercari（メルカリ）
   * - 個人間取引プラットフォーム
   * - 中古品に強い
   */
  mercari: {
    platform: 'mercari',
    allowed_categories: null,
    blocked_categories: [
      'アダルト',
      '医薬品',
      '偽造品',
      'チケット転売',
    ],
    allowed_conditions: null, // 全コンディション許可
    blocked_conditions: null,
    min_price_jpy: 300, // 最低価格: 300円
    max_price_jpy: 999999,
    requires_approval: false,
  },

  /**
   * Yahoo!オークション
   * - 日本国内最大級のオークションサイト
   * - レアアイテムに強い
   */
  yahoo: {
    platform: 'yahoo',
    allowed_categories: null,
    blocked_categories: [
      'アダルト',
      '医薬品',
      '偽造品',
    ],
    allowed_conditions: null, // 全コンディション許可
    blocked_conditions: null,
    min_price_jpy: 1, // オークションなので1円から
    max_price_jpy: null,
    requires_approval: false,
  },

  /**
   * 楽天市場
   * - 新品中心のモール
   * - 審査が必要
   */
  rakuten: {
    platform: 'rakuten',
    allowed_categories: null,
    blocked_categories: [
      'アダルト',
      '医薬品',
    ],
    allowed_conditions: ['New'], // 新品のみ
    blocked_conditions: ['Used', 'Refurbished'],
    min_price_jpy: 500,
    max_price_jpy: null,
    requires_approval: true, // 店舗審査が必要
  },

  /**
   * Shopee（東南アジア）
   * - 価格競争が激しい
   * - 低価格帯に強い
   */
  shopee: {
    platform: 'shopee',
    allowed_categories: null,
    blocked_categories: [
      'アダルト',
      '医薬品',
      '偽造品',
    ],
    allowed_conditions: null, // 全コンディション許可
    blocked_conditions: null,
    min_price_jpy: 50, // 非常に低価格から対応
    max_price_jpy: null,
    requires_approval: false,
  },

  /**
   * Walmart（米国）
   * - 新品中心
   * - 審査が厳しい
   */
  walmart: {
    platform: 'walmart',
    allowed_categories: null,
    blocked_categories: [
      'アダルト',
      '医薬品',
      '武器',
    ],
    allowed_conditions: ['New'], // 新品のみ
    blocked_conditions: ['Used', 'Refurbished', 'Like New'],
    min_price_jpy: 1000, // 最低価格: 1000円相当
    max_price_jpy: null,
    requires_approval: true, // セラー審査が必要
  },
};

/**
 * プラットフォームの制約を取得
 */
export function getPlatformConstraint(platform: Platform): PlatformConstraint {
  return PLATFORM_CONSTRAINTS[platform];
}

/**
 * 商品がプラットフォームの制約を満たすかチェック
 */
export function checkPlatformConstraints(
  platform: Platform,
  category: string,
  condition: string,
  priceJpy: number
): { allowed: boolean; reason?: string } {
  const constraint = getPlatformConstraint(platform);

  // カテゴリーチェック（ブラックリスト）
  if (constraint.blocked_categories) {
    const isBlocked = constraint.blocked_categories.some(
      (blocked) => category.toLowerCase().includes(blocked.toLowerCase())
    );
    if (isBlocked) {
      return {
        allowed: false,
        reason: `カテゴリー「${category}」は${platform}で禁止されています`,
      };
    }
  }

  // カテゴリーチェック（ホワイトリスト）
  if (constraint.allowed_categories) {
    const isAllowed = constraint.allowed_categories.some(
      (allowed) => category.toLowerCase().includes(allowed.toLowerCase())
    );
    if (!isAllowed) {
      return {
        allowed: false,
        reason: `カテゴリー「${category}」は${platform}で許可されていません`,
      };
    }
  }

  // コンディションチェック（ブラックリスト）
  if (constraint.blocked_conditions) {
    const isBlocked = constraint.blocked_conditions.some(
      (blocked) => condition.toLowerCase() === blocked.toLowerCase()
    );
    if (isBlocked) {
      return {
        allowed: false,
        reason: `コンディション「${condition}」は${platform}で禁止されています`,
      };
    }
  }

  // コンディションチェック（ホワイトリスト）
  if (constraint.allowed_conditions) {
    const isAllowed = constraint.allowed_conditions.some(
      (allowed) => condition.toLowerCase() === allowed.toLowerCase()
    );
    if (!isAllowed) {
      return {
        allowed: false,
        reason: `コンディション「${condition}」は${platform}で許可されていません`,
      };
    }
  }

  // 価格チェック（最低価格）
  if (constraint.min_price_jpy !== null && priceJpy < constraint.min_price_jpy) {
    return {
      allowed: false,
      reason: `価格¥${priceJpy}は${platform}の最低価格¥${constraint.min_price_jpy}を下回っています`,
    };
  }

  // 価格チェック（最高価格）
  if (constraint.max_price_jpy !== null && priceJpy > constraint.max_price_jpy) {
    return {
      allowed: false,
      reason: `価格¥${priceJpy}は${platform}の最高価格¥${constraint.max_price_jpy}を超えています`,
    };
  }

  return { allowed: true };
}

/**
 * 利用可能な全プラットフォームのリストを取得
 */
export function getAllPlatforms(): Platform[] {
  return Object.keys(PLATFORM_CONSTRAINTS) as Platform[];
}
