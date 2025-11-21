/**
 * マッパーファクトリー
 *
 * プラットフォームに応じた適切なマッパーを返す
 */

import type { Platform } from '@/lib/multichannel/types';
import { BaseMapper } from './BaseMapper';
import { ShopeeMapper } from './ShopeeMapper';
import { CoupangMapper } from './CoupangMapper';

/**
 * マッパーファクトリー
 */
export class MapperFactory {
  /**
   * プラットフォームに応じたマッパーを取得
   */
  static getMapper(platform: Platform): BaseMapper | null {
    switch (platform) {
      case 'shopee':
        return new ShopeeMapper();

      case 'coupang':
        return new CoupangMapper();

      // 既存のeBay, Amazon等は既存のAPIクライアントを使用
      case 'ebay':
      case 'amazon_us':
      case 'amazon_au':
      case 'amazon_jp':
        // これらは既存のListingExecutorで処理
        console.warn(
          `[MapperFactory] Platform ${platform} is handled by existing ListingExecutor`
        );
        return null;

      default:
        console.warn(`[MapperFactory] No mapper found for platform: ${platform}`);
        return null;
    }
  }

  /**
   * サポートされているプラットフォームのリスト
   */
  static getSupportedPlatforms(): Platform[] {
    return ['shopee', 'coupang'];
  }
}
