/**
 * ベースデータマッパー
 *
 * Phase 1-3: 多モール変換機能
 *
 * SKUマスターデータを各モール固有のAPI要求形式に変換する基底クラス
 */

import type { Platform } from '@/lib/multichannel/types';

/**
 * SKUマスターデータ（入力）
 */
export interface SKUMasterData {
  // 基本情報
  sku: string;
  title: string;
  description: string;
  category: string;
  condition: 'New' | 'Used' | 'Refurbished';

  // 価格・コスト
  item_cost: number; // 原価（円）
  final_price_usd?: number; // 最終販売価格（USD）- PriceCalculatorから取得

  // 在庫
  stock_quantity: number;

  // 商品詳細
  brand?: string;
  model?: string;
  weight_g?: number;
  dimensions?: {
    length_cm: number;
    width_cm: number;
    height_cm: number;
  };

  // 画像
  image_urls: string[];

  // 税関・配送
  hs_code?: string;
  origin_country?: string;

  // その他
  item_specifics?: Record<string, string>; // Key-Value属性
  variations?: any[]; // バリエーション情報

  // メタデータ
  [key: string]: any;
}

/**
 * マッピング結果
 */
export interface MappingResult {
  success: boolean;
  platform: Platform;
  payload: any; // モール固有のJSONペイロード
  errors: string[]; // エラーメッセージ
  warnings: string[]; // 警告メッセージ
}

/**
 * ベースマッパー抽象クラス
 */
export abstract class BaseMapper {
  protected platform: Platform;

  constructor(platform: Platform) {
    this.platform = platform;
  }

  /**
   * マッピングを実行（抽象メソッド）
   */
  abstract map(data: SKUMasterData): Promise<MappingResult>;

  /**
   * バリデーション（共通）
   */
  protected validate(data: SKUMasterData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 必須フィールドチェック
    if (!data.sku) errors.push('SKUが空です');
    if (!data.title) errors.push('タイトルが空です');
    if (!data.final_price_usd || data.final_price_usd <= 0)
      errors.push('販売価格が設定されていません');
    if (data.stock_quantity <= 0) errors.push('在庫数が0です');
    if (!data.image_urls || data.image_urls.length === 0)
      errors.push('画像が設定されていません');

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 画像URLのフォーマット調整
   */
  protected formatImageUrls(
    urls: string[],
    maxImages: number,
    requiredSize?: { width: number; height: number }
  ): string[] {
    // 最大画像数に制限
    let formatted = urls.slice(0, maxImages);

    // TODO: サイズ変換処理（必要に応じて）
    // if (requiredSize) {
    //   formatted = formatted.map(url => resizeImage(url, requiredSize));
    // }

    return formatted;
  }

  /**
   * カテゴリマッピング（プラットフォーム固有）
   */
  protected abstract mapCategory(category: string): string;

  /**
   * コンディションマッピング（プラットフォーム固有）
   */
  protected mapCondition(
    condition: 'New' | 'Used' | 'Refurbished'
  ): string {
    // デフォルトマッピング（各マッパーでオーバーライド可能）
    const mapping: Record<string, string> = {
      New: 'NEW',
      Used: 'USED',
      Refurbished: 'REFURBISHED',
    };

    return mapping[condition] || 'NEW';
  }
}
