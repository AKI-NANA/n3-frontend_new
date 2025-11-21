/**
 * プラットフォーム別必須項目とUIスキーマ定義
 * 統合編集モーダルで使用するフォームフィールドの定義
 */

import type { Platform } from './types';

/**
 * フィールドタイプ
 */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'url'
  | 'date';

/**
 * フィールド定義
 */
export interface FieldDefinition {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    customError?: string;
  };
}

/**
 * プラットフォーム別フィールドグループ
 */
export interface PlatformFieldGroup {
  title: string;
  description?: string;
  fields: FieldDefinition[];
}

/**
 * プラットフォーム別フィールド定義
 */
export const PLATFORM_FIELDS: Record<Platform, PlatformFieldGroup[]> = {
  ebay: [
    {
      title: '基本情報',
      fields: [
        {
          id: 'title',
          label: 'タイトル',
          type: 'text',
          required: true,
          validation: { max: 80 },
          helpText: '最大80文字',
        },
        {
          id: 'description',
          label: '商品説明',
          type: 'textarea',
          required: true,
        },
        {
          id: 'category',
          label: 'カテゴリ',
          type: 'text',
          required: true,
        },
        {
          id: 'condition',
          label: 'コンディション',
          type: 'select',
          required: true,
          options: [
            { value: 'New', label: '新品' },
            { value: 'Used', label: '中古' },
            { value: 'Refurbished', label: '再生品' },
          ],
        },
      ],
    },
  ],

  amazon_us: [
    {
      title: '基本情報',
      fields: [
        {
          id: 'title',
          label: 'Product Title',
          type: 'text',
          required: true,
          validation: { max: 200 },
          helpText: 'Max 200 characters',
        },
        {
          id: 'description',
          label: 'Product Description',
          type: 'textarea',
          required: true,
          validation: { max: 2000 },
        },
        {
          id: 'brand',
          label: 'Brand',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      title: '商品識別',
      description: 'Product identifiers',
      fields: [
        {
          id: 'asin',
          label: 'ASIN',
          type: 'text',
          required: false,
          helpText: 'Amazon Standard Identification Number',
        },
        {
          id: 'upc',
          label: 'UPC',
          type: 'text',
          required: true,
          helpText: 'Universal Product Code',
        },
      ],
    },
    {
      title: 'フルフィルメント',
      fields: [
        {
          id: 'fulfillment_method',
          label: 'Fulfillment Method',
          type: 'select',
          required: true,
          options: [
            { value: 'FBA', label: 'FBA (Fulfillment by Amazon)' },
            { value: 'FBM', label: 'FBM (Fulfillment by Merchant)' },
          ],
          helpText: 'FBAを選択すると、Amazonが配送を担当します',
        },
      ],
    },
  ],

  amazon_au: [
    {
      title: '基本情報',
      fields: [
        {
          id: 'title',
          label: 'Product Title',
          type: 'text',
          required: true,
          validation: { max: 200 },
          helpText: 'Max 200 characters (English)',
        },
        {
          id: 'description',
          label: 'Product Description',
          type: 'textarea',
          required: true,
          validation: { max: 2000 },
        },
        {
          id: 'brand',
          label: 'Brand',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      title: '商品識別',
      fields: [
        {
          id: 'asin',
          label: 'ASIN',
          type: 'text',
          required: true,
          helpText: 'Required for Amazon AU',
        },
      ],
    },
    {
      title: 'フルフィルメント',
      fields: [
        {
          id: 'fulfillment_method',
          label: 'Fulfillment Method',
          type: 'select',
          required: true,
          options: [
            { value: 'FBA', label: 'FBA (Fulfillment by Amazon)' },
            { value: 'FBM', label: 'FBM (Fulfillment by Merchant)' },
          ],
        },
      ],
    },
  ],

  amazon_jp: [
    {
      title: '基本情報',
      fields: [
        {
          id: 'title',
          label: '商品名',
          type: 'text',
          required: true,
          validation: { max: 200 },
          helpText: '最大200文字（日本語）',
        },
        {
          id: 'description',
          label: '商品説明',
          type: 'textarea',
          required: true,
          validation: { max: 2000 },
        },
        {
          id: 'brand',
          label: 'ブランド',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      title: '商品識別',
      fields: [
        {
          id: 'jan_code',
          label: 'JANコード',
          type: 'text',
          required: true,
          helpText: '必須',
        },
        {
          id: 'asin',
          label: 'ASIN',
          type: 'text',
          required: false,
        },
      ],
    },
    {
      title: 'フルフィルメント',
      fields: [
        {
          id: 'fulfillment_method',
          label: 'フルフィルメント方法',
          type: 'select',
          required: true,
          options: [
            { value: 'FBA', label: 'FBA（Amazonから出荷）' },
            { value: 'FBM', label: 'FBM（出品者から出荷）' },
          ],
        },
      ],
    },
  ],

  coupang: [
    {
      title: '기본 정보 (基本情報)',
      fields: [
        {
          id: 'title_ko',
          label: '상품명 (商品名)',
          type: 'text',
          required: true,
          validation: { max: 100 },
          helpText: '韓国語必須、最大100文字',
        },
        {
          id: 'description_ko',
          label: '상품설명 (商品説明)',
          type: 'textarea',
          required: true,
          helpText: '韓国語必須',
        },
        {
          id: 'brand',
          label: '브랜드 (ブランド)',
          type: 'text',
          required: true,
        },
        {
          id: 'origin_country',
          label: '원산지 (原産地)',
          type: 'text',
          required: true,
          helpText: '例: 일본 (日本)',
        },
      ],
    },
    {
      title: '상품 관리 (商品管理)',
      fields: [
        {
          id: 'item_id',
          label: 'Item ID',
          type: 'text',
          required: true,
          helpText: 'クーパン独自の商品番号',
        },
        {
          id: 'category',
          label: '카테고리 (カテゴリ)',
          type: 'text',
          required: true,
          helpText: 'クーパンのカテゴリIDを入力',
        },
      ],
    },
    {
      title: '배송 (配送)',
      fields: [
        {
          id: 'delivery_method',
          label: '배송방법 (配送方法)',
          type: 'select',
          required: true,
          options: [
            { value: 'Coupang Wing', label: 'Coupang Wing' },
            { value: 'Rocket', label: 'Rocket Delivery' },
            { value: 'Standard', label: 'Standard' },
          ],
        },
      ],
    },
  ],

  qoo10: [
    {
      title: '基本情報',
      fields: [
        {
          id: 'title',
          label: 'Title',
          type: 'text',
          required: true,
          validation: { max: 100 },
        },
        {
          id: 'description',
          label: 'Description',
          type: 'textarea',
          required: true,
        },
        {
          id: 'category',
          label: 'Category',
          type: 'text',
          required: true,
          helpText: 'Qoo10カテゴリID',
        },
      ],
    },
    {
      title: '価格設定',
      description: '通常価格とセール価格の二重設定',
      fields: [
        {
          id: 'price',
          label: '通常価格',
          type: 'number',
          required: true,
        },
        {
          id: 'sale_price',
          label: 'セール価格',
          type: 'number',
          required: false,
          helpText: '空欄の場合は通常価格が適用されます',
        },
      ],
    },
    {
      title: '配送',
      fields: [
        {
          id: 'shipping_method',
          label: 'Shipping Method',
          type: 'select',
          required: true,
          options: [
            { value: 'Qxpress', label: 'Qxpress' },
            { value: 'Standard', label: 'Standard' },
          ],
        },
        {
          id: 'weight_g',
          label: 'Weight (g)',
          type: 'number',
          required: true,
        },
      ],
    },
  ],

  shopee: [
    {
      title: '基本情報',
      fields: [
        {
          id: 'title',
          label: 'Product Name',
          type: 'text',
          required: true,
          validation: { max: 120 },
        },
        {
          id: 'description',
          label: 'Description',
          type: 'textarea',
          required: true,
          validation: { max: 3000 },
        },
        {
          id: 'category',
          label: 'Category',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      title: '配送',
      fields: [
        {
          id: 'weight_g',
          label: 'Weight (g)',
          type: 'number',
          required: true,
          helpText: 'Required for shipping calculation',
        },
        {
          id: 'shipping_method',
          label: 'Shipping Method',
          type: 'select',
          required: false,
          options: [
            { value: 'SLS', label: 'Shopee Logistics Service (SLS)' },
            { value: 'Standard', label: 'Standard Shipping' },
          ],
        },
      ],
    },
  ],

  shopify: [
    {
      title: '基本情報',
      description: 'SKUマスターを信頼、Shopifyのテーマに合わせた設定',
      fields: [
        {
          id: 'title',
          label: 'Product Title',
          type: 'text',
          required: true,
        },
        {
          id: 'description',
          label: 'Product Description (HTML)',
          type: 'textarea',
          required: true,
          helpText: 'HTMLタグが使用できます',
        },
        {
          id: 'vendor',
          label: 'Vendor',
          type: 'text',
          required: false,
        },
      ],
    },
    {
      title: 'バリエーション',
      fields: [
        {
          id: 'sku',
          label: 'SKU',
          type: 'text',
          required: true,
          helpText: 'products_masterのSKUを使用',
        },
      ],
    },
  ],

  mercari: [
    {
      title: '基本情報',
      fields: [
        {
          id: 'title',
          label: '商品名',
          type: 'text',
          required: true,
          validation: { max: 40 },
          helpText: '最大40文字',
        },
        {
          id: 'description',
          label: '商品説明',
          type: 'textarea',
          required: true,
          validation: { max: 1000 },
          helpText: '最大1000文字',
        },
        {
          id: 'category',
          label: 'カテゴリ',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      title: 'コンディション',
      fields: [
        {
          id: 'condition',
          label: 'コンディション',
          type: 'select',
          required: true,
          options: [
            { value: 'New', label: '新品、未使用' },
            { value: 'Like New', label: '未使用に近い' },
            { value: 'Good', label: '目立った傷や汚れなし' },
          ],
        },
      ],
    },
    {
      title: '配送',
      fields: [
        {
          id: 'shipping_method',
          label: '配送方法',
          type: 'select',
          required: true,
          options: [
            { value: 'Mercari', label: 'らくらくメルカリ便' },
            { value: 'Yu-Packet', label: 'ゆうゆうメルカリ便' },
          ],
        },
        {
          id: 'shipping_payer',
          label: '送料負担',
          type: 'select',
          required: true,
          options: [
            { value: 'Seller', label: '送料込み（出品者負担）' },
            { value: 'Buyer', label: '着払い（購入者負担）' },
          ],
        },
      ],
    },
  ],
};

/**
 * プラットフォームのフィールドグループを取得
 */
export function getPlatformFieldGroups(platform: Platform): PlatformFieldGroup[] {
  return PLATFORM_FIELDS[platform] || [];
}

/**
 * プラットフォームの全フィールドをフラットなリストで取得
 */
export function getAllPlatformFields(platform: Platform): FieldDefinition[] {
  const groups = getPlatformFieldGroups(platform);
  return groups.flatMap((group) => group.fields);
}

/**
 * 必須フィールドのみを取得
 */
export function getRequiredPlatformFields(platform: Platform): FieldDefinition[] {
  return getAllPlatformFields(platform).filter((field) => field.required);
}

/**
 * フィールドのバリデーション
 */
export function validateField(
  value: any,
  field: FieldDefinition
): { valid: boolean; error?: string } {
  // 必須チェック
  if (field.required && (value === undefined || value === null || value === '')) {
    return { valid: false, error: `${field.label}は必須です` };
  }

  // 型別バリデーション
  if (value !== undefined && value !== null && value !== '') {
    if (field.type === 'number') {
      const num = Number(value);
      if (isNaN(num)) {
        return { valid: false, error: `${field.label}は数値を入力してください` };
      }
      if (field.validation?.min !== undefined && num < field.validation.min) {
        return {
          valid: false,
          error: `${field.label}は${field.validation.min}以上である必要があります`,
        };
      }
      if (field.validation?.max !== undefined && num > field.validation.max) {
        return {
          valid: false,
          error: `${field.label}は${field.validation.max}以下である必要があります`,
        };
      }
    }

    if (field.type === 'text' || field.type === 'textarea') {
      const str = String(value);
      if (field.validation?.max !== undefined && str.length > field.validation.max) {
        return {
          valid: false,
          error: `${field.label}は${field.validation.max}文字以内で入力してください`,
        };
      }
      if (field.validation?.pattern) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(str)) {
          return {
            valid: false,
            error:
              field.validation.customError ||
              `${field.label}の形式が正しくありません`,
          };
        }
      }
    }
  }

  return { valid: true };
}

/**
 * 全フィールドのバリデーション
 */
export function validateAllFields(
  data: Record<string, any>,
  platform: Platform
): { valid: boolean; errors: Record<string, string> } {
  const fields = getAllPlatformFields(platform);
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = data[field.id];
    const result = validateField(value, field);

    if (!result.valid && result.error) {
      errors[field.id] = result.error;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
