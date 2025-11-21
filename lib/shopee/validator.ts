/**
 * Shopee出品データ検証システム
 * 必須項目チェックと画像規格バリデーション
 */

import type { ShopeeCountryCode } from './translator';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ShopeeListingValidationInput {
  title: string;
  description: string;
  categoryId: number;
  price: number;
  stock: number;
  weight: number;
  images: string[];
  brand?: string;
  condition?: string;
  sku: string;
  targetCountry: ShopeeCountryCode;
  requiredAttributes?: string[];
  providedAttributes?: Record<string, string>;
}

/**
 * Shopee画像規格 (国別)
 */
const IMAGE_REQUIREMENTS: Record<
  ShopeeCountryCode,
  {
    minImages: number;
    maxImages: number;
    minResolution: { width: number; height: number };
    maxFileSize: number; // MB
    allowedRatios: string[];
  }
> = {
  TW: {
    minImages: 1,
    maxImages: 9,
    minResolution: { width: 800, height: 800 },
    maxFileSize: 5,
    allowedRatios: ['1:1'],
  },
  TH: {
    minImages: 1,
    maxImages: 9,
    minResolution: { width: 800, height: 800 },
    maxFileSize: 5,
    allowedRatios: ['1:1'],
  },
  SG: {
    minImages: 1,
    maxImages: 9,
    minResolution: { width: 800, height: 800 },
    maxFileSize: 5,
    allowedRatios: ['1:1', '3:4'],
  },
  MY: {
    minImages: 1,
    maxImages: 9,
    minResolution: { width: 800, height: 800 },
    maxFileSize: 5,
    allowedRatios: ['1:1', '3:4'],
  },
  PH: {
    minImages: 1,
    maxImages: 9,
    minResolution: { width: 800, height: 800 },
    maxFileSize: 5,
    allowedRatios: ['1:1'],
  },
  VN: {
    minImages: 1,
    maxImages: 9,
    minResolution: { width: 800, height: 800 },
    maxFileSize: 5,
    allowedRatios: ['1:1'],
  },
  ID: {
    minImages: 1,
    maxImages: 9,
    minResolution: { width: 800, height: 800 },
    maxFileSize: 5,
    allowedRatios: ['1:1'],
  },
  BR: {
    minImages: 1,
    maxImages: 9,
    minResolution: { width: 800, height: 800 },
    maxFileSize: 5,
    allowedRatios: ['1:1'],
  },
  MX: {
    minImages: 1,
    maxImages: 9,
    minResolution: { width: 800, height: 800 },
    maxFileSize: 5,
    allowedRatios: ['1:1'],
  },
};

/**
 * タイトル長制限 (国別)
 */
const TITLE_LENGTH_LIMITS: Record<ShopeeCountryCode, number> = {
  TW: 120,
  TH: 120,
  SG: 120,
  MY: 120,
  PH: 120,
  VN: 120,
  ID: 120,
  BR: 120,
  MX: 120,
};

/**
 * 説明文長制限 (国別)
 */
const DESCRIPTION_LENGTH_LIMITS: Record<ShopeeCountryCode, number> = {
  TW: 5000,
  TH: 5000,
  SG: 5000,
  MY: 5000,
  PH: 5000,
  VN: 5000,
  ID: 5000,
  BR: 5000,
  MX: 5000,
};

/**
 * 基本情報バリデーション
 */
function validateBasicInfo(
  input: ShopeeListingValidationInput
): ValidationError[] {
  const errors: ValidationError[] = [];

  // タイトルチェック
  if (!input.title || input.title.trim().length === 0) {
    errors.push({
      field: 'title',
      message: 'タイトルは必須です',
      severity: 'error',
    });
  } else {
    const maxLength = TITLE_LENGTH_LIMITS[input.targetCountry];
    if (input.title.length > maxLength) {
      errors.push({
        field: 'title',
        message: `タイトルは${maxLength}文字以内にしてください (現在: ${input.title.length}文字)`,
        severity: 'error',
      });
    }
  }

  // 説明文チェック
  if (!input.description || input.description.trim().length === 0) {
    errors.push({
      field: 'description',
      message: '説明文は必須です',
      severity: 'error',
    });
  } else {
    const maxLength = DESCRIPTION_LENGTH_LIMITS[input.targetCountry];
    if (input.description.length > maxLength) {
      errors.push({
        field: 'description',
        message: `説明文は${maxLength}文字以内にしてください (現在: ${input.description.length}文字)`,
        severity: 'error',
      });
    }
  }

  // カテゴリチェック
  if (!input.categoryId || input.categoryId <= 0) {
    errors.push({
      field: 'categoryId',
      message: 'カテゴリは必須です',
      severity: 'error',
    });
  }

  // 価格チェック
  if (!input.price || input.price <= 0) {
    errors.push({
      field: 'price',
      message: '価格は0より大きい値を設定してください',
      severity: 'error',
    });
  }

  // 在庫チェック
  if (input.stock === undefined || input.stock < 0) {
    errors.push({
      field: 'stock',
      message: '在庫数は0以上の値を設定してください',
      severity: 'error',
    });
  }

  // 重量チェック
  if (!input.weight || input.weight <= 0) {
    errors.push({
      field: 'weight',
      message: '重量は0より大きい値を設定してください',
      severity: 'error',
    });
  }

  // SKUチェック
  if (!input.sku || input.sku.trim().length === 0) {
    errors.push({
      field: 'sku',
      message: 'SKUは必須です',
      severity: 'error',
    });
  }

  return errors;
}

/**
 * 画像バリデーション
 */
function validateImages(
  input: ShopeeListingValidationInput
): ValidationError[] {
  const errors: ValidationError[] = [];
  const requirements = IMAGE_REQUIREMENTS[input.targetCountry];

  // 画像枚数チェック
  if (!input.images || input.images.length === 0) {
    errors.push({
      field: 'images',
      message: `最低${requirements.minImages}枚の画像が必要です`,
      severity: 'error',
    });
  } else if (input.images.length < requirements.minImages) {
    errors.push({
      field: 'images',
      message: `画像は最低${requirements.minImages}枚必要です (現在: ${input.images.length}枚)`,
      severity: 'error',
    });
  } else if (input.images.length > requirements.maxImages) {
    errors.push({
      field: 'images',
      message: `画像は最大${requirements.maxImages}枚までです (現在: ${input.images.length}枚)`,
      severity: 'warning',
    });
  }

  // 画像URL形式チェック
  input.images.forEach((url, index) => {
    if (!url || !url.startsWith('http')) {
      errors.push({
        field: `images[${index}]`,
        message: `画像${index + 1}のURLが不正です`,
        severity: 'error',
      });
    }
  });

  return errors;
}

/**
 * カテゴリ属性バリデーション
 */
function validateAttributes(
  input: ShopeeListingValidationInput
): ValidationError[] {
  const errors: ValidationError[] = [];

  // 必須属性チェック
  if (input.requiredAttributes && input.requiredAttributes.length > 0) {
    input.requiredAttributes.forEach((attr) => {
      const value = input.providedAttributes?.[attr];

      if (!value || value.trim().length === 0) {
        errors.push({
          field: `attributes.${attr}`,
          message: `カテゴリ必須属性 "${attr}" が入力されていません`,
          severity: 'error',
        });
      }
    });
  }

  // ブランドチェック (推奨)
  if (!input.brand || input.brand.trim().length === 0) {
    errors.push({
      field: 'brand',
      message: 'ブランド名の入力を推奨します',
      severity: 'warning',
    });
  }

  // 商品状態チェック (推奨)
  if (!input.condition || input.condition.trim().length === 0) {
    errors.push({
      field: 'condition',
      message: '商品状態の入力を推奨します',
      severity: 'warning',
    });
  }

  return errors;
}

/**
 * Shopee出品データ総合バリデーション
 */
export function validateShopeeListingData(
  input: ShopeeListingValidationInput
): ValidationResult {
  console.log(`[Shopee Validator] 検証開始: ${input.sku} (${input.targetCountry})`);

  // 各種バリデーション実行
  const allErrors = [
    ...validateBasicInfo(input),
    ...validateImages(input),
    ...validateAttributes(input),
  ];

  // エラーと警告を分離
  const errors = allErrors.filter((e) => e.severity === 'error');
  const warnings = allErrors.filter((e) => e.severity === 'warning');

  const isValid = errors.length === 0;

  console.log(`[Shopee Validator] 検証結果: ${isValid ? '✓ 合格' : '✗ 不合格'}`);
  console.log(`  - エラー: ${errors.length}件`);
  console.log(`  - 警告: ${warnings.length}件`);

  if (errors.length > 0) {
    console.log('  - エラー詳細:');
    errors.forEach((e) => console.log(`    - [${e.field}] ${e.message}`));
  }

  return {
    isValid,
    errors,
    warnings,
  };
}

/**
 * バッチバリデーション (複数商品)
 */
export function validateMultipleListings(
  listings: ShopeeListingValidationInput[]
): Record<string, ValidationResult> {
  console.log(`[Shopee Validator] バッチ検証開始: ${listings.length}件`);

  const results: Record<string, ValidationResult> = {};

  listings.forEach((listing) => {
    results[listing.sku] = validateShopeeListingData(listing);
  });

  const validCount = Object.values(results).filter((r) => r.isValid).length;
  const invalidCount = listings.length - validCount;

  console.log(`[Shopee Validator] バッチ検証完了:`);
  console.log(`  - 合格: ${validCount}件`);
  console.log(`  - 不合格: ${invalidCount}件`);

  return results;
}
