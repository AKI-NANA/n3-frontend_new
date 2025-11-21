/**
 * Coupangデータマッパー
 *
 * SKUマスターデータをCoupang API要求形式に変換
 */

import { BaseMapper } from './BaseMapper';
import type { SKUMasterData, MappingResult } from './BaseMapper';

/**
 * Coupang APIペイロード形式
 */
interface CoupangPayload {
  sellerProductId: string; // 販売者商品ID（SKU）
  sellerProductName: string; // 商品名
  displayCategoryCode: string; // カテゴリコード
  brand: string; // ブランド名

  // 商品詳細
  manufacture: string; // 製造者
  searchTags?: string[]; // 検索タグ

  // 画像（Coupangは最大10枚）
  images: Array<{
    imageOrder: number;
    vendorImagePath: string;
  }>;

  // 価格・在庫
  items: Array<{
    itemName: string;
    originalPrice: number; // 定価（KRW）
    salePrice: number; // 販売価格（KRW）
    maximumBuyCount: number; // 最大購入数
    maximumBuyForPerson: number; // 個人最大購入数
    outboundShippingTimeDay: number; // 出荷日数

    // SKU情報
    vendorItemId: string; // 販売者アイテムID
    barcode?: string; // バーコード

    // 在庫
    available: boolean; // 販売可能かどうか
    quantity: number; // 在庫数

    // サイズ・重量
    weight: number; // グラム
    length: number; // mm
    width: number; // mm
    height: number; // mm
  }>;

  // 法定情報（韓国法に基づく必須情報）
  notice: {
    noticeCategoryType: string;
    noticeCategoryDetailType: string;
    manufacturerName?: string;
    manufacturerAddress?: string;
    manufacturedDate?: string;
    asPhone?: string; // アフターサービス電話番号
  };

  // 配送
  shipping: {
    deliveryMethod: 'SEQUEN_NEXT_DAY' | 'COLD_FRESH' | 'DIRECT'; // 配送方法
    deliveryCompanyCode: string; // 配送業者コード
    deliveryCharge: number; // 配送料
    freeShipOverAmount?: number; // 送料無料基準金額
  };

  // 返品・交換情報
  returnCenterCode?: string;
  afterServiceTelephone?: string;
}

/**
 * Coupangマッパー
 */
export class CoupangMapper extends BaseMapper {
  constructor() {
    super('coupang');
  }

  /**
   * カテゴリマッピング
   */
  protected mapCategory(category: string): string {
    // TODO: カテゴリマッピングテーブルを参照
    // 仮実装: カテゴリ名→Coupangカテゴリコード
    const categoryMapping: Record<string, string> = {
      Electronics: '194002',
      Fashion: '302002',
      'Home & Living': '102002',
      Beauty: '302001',
      Toys: '108001',
    };

    return categoryMapping[category] || '194002';
  }

  /**
   * 法定情報の生成
   */
  private generateNotice(data: SKUMasterData): CoupangPayload['notice'] {
    // Coupangは韓国法に基づく商品情報の表示が必須
    return {
      noticeCategoryType: 'ELECTRONICS', // TODO: カテゴリに応じて変更
      noticeCategoryDetailType: 'ELECTRONICS_ETC',
      manufacturerName: data.brand || 'Unknown',
      manufacturerAddress: data.origin_country || 'Unknown',
      asPhone: '02-1234-5678', // TODO: 実際のカスタマーサービス電話番号
    };
  }

  /**
   * USDをKRWに変換
   */
  private convertToKRW(usd: number): number {
    // TODO: 為替レートを動的に取得
    const exchangeRate = 1300; // 1 USD = 1300 KRW
    return Math.round(usd * exchangeRate);
  }

  /**
   * Coupang APIペイロードへの変換
   */
  async map(data: SKUMasterData): Promise<MappingResult> {
    console.log(`[CoupangMapper] Mapping SKU: ${data.sku}`);

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
      // 画像フォーマット（Coupangは最大10枚）
      const formattedImages = this.formatImageUrls(data.image_urls, 10);

      // カテゴリコード取得
      const displayCategoryCode = this.mapCategory(data.category);

      // USDをKRWに変換
      const salePrice = this.convertToKRW(data.final_price_usd || 0);
      const originalPrice = Math.round(salePrice * 1.2); // 定価は販売価格の120%と仮定

      // ペイロード構築
      const payload: CoupangPayload = {
        sellerProductId: data.sku,
        sellerProductName: data.title.substring(0, 100), // Coupangは100文字まで
        displayCategoryCode,
        brand: data.brand || 'No Brand',
        manufacture: data.brand || 'No Brand',
        images: formattedImages.map((url, index) => ({
          imageOrder: index + 1,
          vendorImagePath: url,
        })),
        items: [
          {
            itemName: data.title.substring(0, 100),
            originalPrice,
            salePrice,
            maximumBuyCount: 999,
            maximumBuyForPerson: 10,
            outboundShippingTimeDay: 3, // 3日以内出荷
            vendorItemId: data.sku,
            available: data.stock_quantity > 0,
            quantity: data.stock_quantity,
            weight: data.weight_g || 500,
            length: data.dimensions?.length_cm ? data.dimensions.length_cm * 10 : 100, // mm単位
            width: data.dimensions?.width_cm ? data.dimensions.width_cm * 10 : 100,
            height: data.dimensions?.height_cm ? data.dimensions.height_cm * 10 : 100,
          },
        ],
        notice: this.generateNotice(data),
        shipping: {
          deliveryMethod: 'DIRECT',
          deliveryCompanyCode: 'CJ',
          deliveryCharge: 3000, // 3000 KRW
          freeShipOverAmount: 50000, // 50000 KRW以上で送料無料
        },
      };

      // 警告チェック
      if (data.title.length > 100) {
        warnings.push('タイトルが100文字を超えているため、切り詰められました');
      }

      if (!data.brand) {
        warnings.push('ブランド名が設定されていません。"No Brand"を使用します');
      }

      if (!data.weight_g) {
        warnings.push('重量が設定されていません。デフォルト値（500g）を使用します');
      }

      console.log(`[CoupangMapper] Mapping successful for SKU: ${data.sku}`);

      return {
        success: true,
        platform: this.platform,
        payload,
        errors: [],
        warnings,
      };
    } catch (error) {
      console.error(`[CoupangMapper] Mapping failed for SKU: ${data.sku}`, error);
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
