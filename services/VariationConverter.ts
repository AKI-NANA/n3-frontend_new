/**
 * バリエーション変換サービス
 *
 * 親SKU・子SKUデータをプラットフォーム別のAPI形式に変換
 */

import { createClient } from '@/lib/supabase/server';
import { Platform } from '@/types/strategy';
import {
  ParentSku,
  ChildSku,
  EbayVariationData,
  AmazonVariationData,
  ShopeeVariationData,
  VariationConversionError,
} from '@/types/variation';

export class VariationConverter {
  /**
   * 親SKUから子SKUリストを取得
   */
  static async getChildrenBySku(parentSku: string): Promise<ChildSku[]> {
    const supabase = await createClient();

    const { data: children, error } = await supabase
      .from('products_master')
      .select('*')
      .eq('parent_sku', parentSku);

    if (error) {
      console.error('❌ 子SKU取得エラー:', error);
      return [];
    }

    return children.map((child) => ({
      sku: child.sku,
      parent_sku: child.parent_sku,
      attributes: child.variation_attributes || [],
      price: child.price,
      quantity: child.current_stock_count || 0,
      images: child.images?.map((img: any) => img.url) || [],
      ean: child.ean,
      condition: child.condition || 'New',
    }));
  }

  /**
   * eBay Trading API形式に変換
   */
  static convertToEbay(parent: ParentSku, children: ChildSku[]): EbayVariationData | VariationConversionError {
    if (children.length === 0) {
      return {
        code: 'NO_CHILDREN',
        message: '子SKUが存在しません',
        platform: 'ebay',
      };
    }

    // バリエーション属性の抽出（例: Color, Size）
    const attributeNames = Array.from(
      new Set(children.flatMap((child) => child.attributes.map((attr) => attr.name)))
    );

    if (attributeNames.length === 0) {
      return {
        code: 'NO_ATTRIBUTES',
        message: 'バリエーション属性が設定されていません',
        missing_fields: ['variation_attributes'],
        platform: 'ebay',
      };
    }

    // 属性値のリスト作成（eBayのVariationSpecificsSet）
    const variationSpecificsSet = attributeNames.map((attrName) => {
      const values = Array.from(
        new Set(
          children
            .flatMap((child) => child.attributes)
            .filter((attr) => attr.name === attrName)
            .map((attr) => attr.value)
        )
      );

      return {
        name: attrName,
        values,
      };
    });

    // 各子SKUのバリエーションデータ
    const variations = children.map((child) => ({
      variation_specifics: child.attributes.map((attr) => ({
        name: attr.name,
        value: attr.value,
      })),
      start_price: child.price,
      quantity: child.quantity,
      sku: child.sku,
    }));

    return {
      title: parent.title,
      description: parent.description || '',
      category_id: parent.category_id || '0',
      pictures: parent.main_image ? [parent.main_image] : [],
      variations,
      variation_specifics_set: variationSpecificsSet,
    };
  }

  /**
   * Amazon SP-API形式に変換
   */
  static convertToAmazon(parent: ParentSku, children: ChildSku[]): AmazonVariationData | VariationConversionError {
    if (children.length === 0) {
      return {
        code: 'NO_CHILDREN',
        message: '子SKUが存在しません',
        platform: 'amazon',
      };
    }

    // バリエーションテーマ（Color, Size, SizeColor など）
    const attributeNames = Array.from(
      new Set(children.flatMap((child) => child.attributes.map((attr) => attr.name)))
    );

    let variationTheme = 'Color';
    if (attributeNames.includes('Size') && attributeNames.includes('Color')) {
      variationTheme = 'SizeColor';
    } else if (attributeNames.includes('Size')) {
      variationTheme = 'Size';
    }

    // 子SKUデータの変換
    const amazonChildren = children.map((child) => {
      const attributes: any = {};

      // バリエーション属性を動的に追加
      child.attributes.forEach((attr) => {
        const attrKey = attr.name.toLowerCase().replace(/\s/g, '_');
        attributes[attrKey] = [
          {
            value: attr.value,
            marketplace_id: 'ATVPDKIKX0DER', // US marketplace
          },
        ];
      });

      return {
        sku: child.sku,
        attributes,
        offers: [
          {
            marketplace_id: 'ATVPDKIKX0DER',
            our_price: [
              {
                schedule: [
                  {
                    value_with_tax: child.price,
                  },
                ],
              },
            ],
            quantity_available: child.quantity,
          },
        ],
      };
    });

    return {
      parent_sku: parent.sku,
      product_type: 'PRODUCT',
      attributes: {
        item_name: [
          {
            value: parent.title,
            marketplace_id: 'ATVPDKIKX0DER',
          },
        ],
        variation_theme: [
          {
            value: variationTheme,
          },
        ],
      },
      children: amazonChildren,
    };
  }

  /**
   * Shopee Wing API形式に変換
   * ⚠️ 重要: Shopeeはバリエーション画像が必須
   */
  static convertToShopee(parent: ParentSku, children: ChildSku[]): ShopeeVariationData | VariationConversionError {
    if (children.length === 0) {
      return {
        code: 'NO_CHILDREN',
        message: '子SKUが存在しません',
        platform: 'shopee',
      };
    }

    // バリエーション属性の抽出
    const attributeNames = Array.from(
      new Set(children.flatMap((child) => child.attributes.map((attr) => attr.name)))
    );

    if (attributeNames.length === 0) {
      return {
        code: 'NO_ATTRIBUTES',
        message: 'バリエーション属性が設定されていません',
        missing_fields: ['variation_attributes'],
        platform: 'shopee',
      };
    }

    // Tier Variation構築（Shopee特有）
    const tierVariation = attributeNames.map((attrName) => {
      const uniqueValues = Array.from(
        new Set(
          children
            .flatMap((child) => child.attributes)
            .filter((attr) => attr.name === attrName)
            .map((attr) => attr.value)
        )
      );

      // 画像の取得（Color属性の場合は子SKUの画像を使用）
      const optionList = uniqueValues.map((value) => {
        const matchingChild = children.find((child) =>
          child.attributes.some((attr) => attr.name === attrName && attr.value === value)
        );

        const option: any = { option: value };

        // Colorバリエーションには画像を追加
        if (attrName.toLowerCase() === 'color' && matchingChild?.images?.[0]) {
          option.image = {
            image_id: matchingChild.images[0], // TODO: Shopeeの画像IDに変換が必要
          };
        }

        return option;
      });

      return {
        name: attrName,
        option_list: optionList,
      };
    });

    // バリエーションマッピング
    const variation = children.map((child) => {
      // tier_indexの計算（各属性値のインデックス）
      const tierIndex = attributeNames.map((attrName) => {
        const attr = child.attributes.find((a) => a.name === attrName);
        const tierData = tierVariation.find((t) => t.name === attrName);
        return tierData?.option_list.findIndex((opt) => opt.option === attr?.value) || 0;
      });

      return {
        tier_index: tierIndex,
        price: child.price,
        stock: child.quantity,
        variation_sku: child.sku,
      };
    });

    // ⚠️ バリエーション画像の検証
    const hasColorVariation = tierVariation.some((tier) => tier.name.toLowerCase() === 'color');
    const hasImages = tierVariation.some((tier) =>
      tier.option_list.some((opt) => opt.image)
    );

    if (hasColorVariation && !hasImages) {
      return {
        code: 'MISSING_VARIATION_IMAGES',
        message: 'Shopeeではカラーバリエーションに画像が必須です',
        missing_fields: ['variation_images'],
        platform: 'shopee',
      };
    }

    return {
      item_name: parent.title,
      description: parent.description || '',
      category_id: parseInt(parent.category_id || '0'),
      images: parent.main_image ? [parent.main_image] : [],
      tier_variation: tierVariation,
      variation,
    };
  }

  /**
   * プラットフォーム別変換の統一インターフェース
   */
  static async convert(
    parentSku: string,
    platform: Platform
  ): Promise<EbayVariationData | AmazonVariationData | ShopeeVariationData | VariationConversionError> {
    const supabase = await createClient();

    // 親SKU情報を取得
    const { data: parentData, error: parentError } = await supabase
      .from('products_master')
      .select('*')
      .eq('sku', parentSku)
      .single();

    if (parentError || !parentData) {
      return {
        code: 'PARENT_NOT_FOUND',
        message: `親SKUが見つかりません: ${parentSku}`,
        platform,
      };
    }

    const parent: ParentSku = {
      sku: parentData.sku,
      title: parentData.title,
      description: parentData.description,
      category_id: parentData.category_id,
      children: [],
      main_image: parentData.images?.[0]?.url,
      variation_attributes: parentData.variation_attributes || [],
    };

    // 子SKUを取得
    const children = await this.getChildrenBySku(parentSku);

    // プラットフォーム別変換
    switch (platform) {
      case 'ebay':
        return this.convertToEbay(parent, children);
      case 'amazon':
        return this.convertToAmazon(parent, children);
      case 'shopee':
        return this.convertToShopee(parent, children);
      default:
        return {
          code: 'UNSUPPORTED_PLATFORM',
          message: `プラットフォーム ${platform} はバリエーション変換に対応していません`,
          platform,
        };
    }
  }

  /**
   * 単品商品かバリエーション親かを判定
   */
  static async isParentSku(sku: string): Promise<boolean> {
    const children = await this.getChildrenBySku(sku);
    return children.length > 0;
  }
}
