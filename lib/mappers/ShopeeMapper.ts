/**
 * Shopeeデータマッパー
 *
 * SKUマスターデータをShopee API要求形式に変換
 */

import { BaseMapper } from './BaseMapper';
import type { SKUMasterData, MappingResult } from './BaseMapper';

/**
 * Shopee APIペイロード形式
 */
interface ShopeePayload {
  item_name: string; // 商品名
  description: string; // 説明文
  category_id: number; // カテゴリID
  price: number; // 価格
  stock: number; // 在庫数
  condition: string; // 'NEW' | 'USED'

  // 画像
  images: Array<{
    image_url: string;
  }>;

  // 重量・サイズ
  weight: number; // グラム
  package_length?: number; // cm
  package_width?: number; // cm
  package_height?: number; // cm

  // 属性
  attributes?: Array<{
    attribute_id: number;
    attribute_value: string;
  }>;

  // ブランド
  brand?: {
    brand_id: number;
    original_brand_name: string;
  };

  // バリエーション
  variations?: Array<{
    name: string;
    stock: number;
    price: number;
    variation_sku: string;
  }>;

  // 配送
  logistics: Array<{
    logistic_id: number;
    enabled: boolean;
  }>;

  // その他
  item_sku?: string;
}

/**
 * Shopeeマッパー
 */
export class ShopeeMapper extends BaseMapper {
  constructor() {
    super('shopee');
  }

  /**
   * カテゴリマッピング
   */
  protected mapCategory(category: string): string {
    // TODO: カテゴリマッピングテーブルを参照
    // 仮実装: カテゴリ名→カテゴリID
    const categoryMapping: Record<string, number> = {
      Electronics: 100001,
      Fashion: 100002,
      'Home & Living': 100003,
      Beauty: 100004,
      Toys: 100005,
    };

    const categoryId = categoryMapping[category] || 100001;
    return String(categoryId);
  }

  /**
   * コンディションマッピング
   */
  protected mapCondition(condition: 'New' | 'Used' | 'Refurbished'): string {
    if (condition === 'New') return 'NEW';
    return 'USED'; // Shopeeは基本的にNEWとUSEDのみ
  }

  /**
   * Shopee APIペイロードへの変換
   */
  async map(data: SKUMasterData): Promise<MappingResult> {
    console.log(`[ShopeeMapper] Mapping SKU: ${data.sku}`);

    const errors: string[] = [];
    const warnings: string[] = [];

    // バリデーション
    const validation = this.validate(data);
    if (!validation.valid) {
      return {
        success: false,
        platform: this.platform,
        payload: null,
        errors: validation.errors,
        warnings,
      };
    }

    try {
      // 画像フォーマット（Shopeeは最大9枚）
      const formattedImages = this.formatImageUrls(data.image_urls, 9);

      // カテゴリID取得
      const category_id = parseInt(this.mapCategory(data.category), 10);

      // ペイロード構築
      const payload: ShopeePayload = {
        item_name: data.title.substring(0, 120), // Shopeeは120文字まで
        description: data.description,
        category_id,
        price: data.final_price_usd || 0,
        stock: data.stock_quantity,
        condition: this.mapCondition(data.condition),
        images: formattedImages.map((url) => ({ image_url: url })),
        weight: data.weight_g || 500,
        package_length: data.dimensions?.length_cm,
        package_width: data.dimensions?.width_cm,
        package_height: data.dimensions?.height_cm,
        logistics: [
          {
            logistic_id: 1, // デフォルト配送方法
            enabled: true,
          },
        ],
        item_sku: data.sku,
      };

      // ブランド情報があれば追加
      if (data.brand) {
        payload.brand = {
          brand_id: 0, // TODO: ブランドIDマッピング
          original_brand_name: data.brand,
        };
      }

      // 属性があれば追加
      if (data.item_specifics) {
        payload.attributes = Object.entries(data.item_specifics).map(
          ([key, value], index) => ({
            attribute_id: index + 1, // TODO: 属性IDマッピング
            attribute_value: value,
          })
        );
      }

      // バリエーションがあれば追加
      if (data.variations && data.variations.length > 0) {
        payload.variations = data.variations.map((v) => ({
          name: v.name || '',
          stock: v.stock || 0,
          price: v.price || payload.price,
          variation_sku: v.sku || data.sku,
        }));
      }

      // 警告チェック
      if (data.title.length > 120) {
        warnings.push('タイトルが120文字を超えているため、切り詰められました');
      }

      if (!data.weight_g) {
        warnings.push('重量が設定されていません。デフォルト値（500g）を使用します');
      }

      console.log(`[ShopeeMapper] Mapping successful for SKU: ${data.sku}`);

      return {
        success: true,
        platform: this.platform,
        payload,
        errors: [],
        warnings,
      };
    } catch (error) {
      console.error(`[ShopeeMapper] Mapping failed for SKU: ${data.sku}`, error);
      return {
        success: false,
        platform: this.platform,
        payload: null,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings,
      };
    }
  }
}
