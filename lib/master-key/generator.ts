/**
 * Master Key生成システム
 *
 * 商品の全分析データを圧縮したマスターキーを生成
 * 50+のフィールドを含む包括的なビジネスインテリジェンスデータ
 *
 * フォーマット: MK_ + LZ圧縮JSON
 */

import * as LZString from 'lz-string';

/**
 * マスターキーデータ構造（50+フィールド）
 */
export interface MasterKeyData {
  // === 基本情報 ===
  platform: string; // 'yahoo_auction', 'paypay_fleamarket', 'mercari', etc.
  marketplace: string; // 'ebay', 'shopee', 'amazon-global', etc.
  category_l1: string; // カテゴリ階層レベル1
  category_l2: string; // カテゴリ階層レベル2
  category_l3: string; // カテゴリ階層レベル3
  category_id: string; // マーケットプレイス側のカテゴリID
  brand: string; // ブランド名
  model: string; // モデル番号
  manufacturer: string; // メーカー

  // === 商品情報 ===
  condition: string; // 'new', 'used_like_new', 'used_good', etc.
  release_year: number | null; // 発売年
  origin_country: string; // 製造国
  is_authentic: boolean; // 真正品フラグ
  warranty_months: number; // 保証期間（月）

  // === 価格情報 ===
  cost_jpy: number; // 仕入れ価格（円）
  cost_usd: number; // 仕入れ価格（ドル）
  price_jpy: number; // 販売価格（円）
  price_usd: number; // 販売価格（ドル）
  profit_jpy: number; // 利益（円）
  profit_usd: number; // 利益（ドル）
  profit_margin_percent: number; // 利益率（%）
  shipping_cost_jpy: number; // 送料（円）
  shipping_cost_usd: number; // 送料（ドル）

  // === 物理情報 ===
  weight_kg: number | null; // 重量（kg）
  length_cm: number | null; // 長さ（cm）
  width_cm: number | null; // 幅（cm）
  height_cm: number | null; // 高さ（cm）
  volume_cm3: number | null; // 体積（cm³）
  package_type: string; // 'small_packet', 'box', 'pallet', etc.

  // === 通関情報 ===
  hts_code: string; // HSコード
  tariff_rate_percent: number; // 関税率（%）
  restricted_countries: string[]; // 輸出制限国
  requires_license: boolean; // ライセンス必要フラグ
  customs_description: string; // 通関用商品説明

  // === パフォーマンス指標 ===
  turnover_days: number | null; // 回転日数
  sold_count: number; // 販売数
  view_count: number; // 閲覧数
  conversion_rate_percent: number; // 成約率（%）
  avg_days_to_sell: number | null; // 平均販売日数
  restock_count: number; // 再入荷回数
  return_rate_percent: number; // 返品率（%）

  // === 戦略情報 ===
  target_market: string[]; // ターゲット市場 ['US', 'UK', 'AU', etc.]
  best_season: string; // 'spring', 'summer', 'fall', 'winter', 'year_round'
  demographics: string[]; // ['male', 'female', 'kids', 'elderly', etc.]
  price_tier: string; // 'budget', 'mid', 'premium', 'luxury'
  competition_level: string; // 'low', 'medium', 'high'

  // === 商品特性 ===
  is_limited_edition: boolean; // 限定品フラグ
  is_collectible: boolean; // コレクタブルフラグ
  is_seasonal: boolean; // 季節商品フラグ
  is_trending: boolean; // トレンド商品フラグ
  is_fragile: boolean; // 壊れやすいフラグ
  requires_special_handling: boolean; // 特別な取扱い必要フラグ

  // === メタデータ ===
  created_at: string; // マスターキー作成日時
  updated_at: string; // 最終更新日時
  version: number; // データバージョン
  source_platform_id: string; // 仕入元プラットフォームのID
  listing_platform_ids: string[]; // 出品先プラットフォームのID配列
}

/**
 * 空のマスターキーデータを生成
 */
export function createEmptyMasterKeyData(): MasterKeyData {
  return {
    // 基本情報
    platform: '',
    marketplace: '',
    category_l1: '',
    category_l2: '',
    category_l3: '',
    category_id: '',
    brand: '',
    model: '',
    manufacturer: '',

    // 商品情報
    condition: '',
    release_year: null,
    origin_country: '',
    is_authentic: true,
    warranty_months: 0,

    // 価格情報
    cost_jpy: 0,
    cost_usd: 0,
    price_jpy: 0,
    price_usd: 0,
    profit_jpy: 0,
    profit_usd: 0,
    profit_margin_percent: 0,
    shipping_cost_jpy: 0,
    shipping_cost_usd: 0,

    // 物理情報
    weight_kg: null,
    length_cm: null,
    width_cm: null,
    height_cm: null,
    volume_cm3: null,
    package_type: '',

    // 通関情報
    hts_code: '',
    tariff_rate_percent: 0,
    restricted_countries: [],
    requires_license: false,
    customs_description: '',

    // パフォーマンス指標
    turnover_days: null,
    sold_count: 0,
    view_count: 0,
    conversion_rate_percent: 0,
    avg_days_to_sell: null,
    restock_count: 0,
    return_rate_percent: 0,

    // 戦略情報
    target_market: [],
    best_season: 'year_round',
    demographics: [],
    price_tier: 'mid',
    competition_level: 'medium',

    // 商品特性
    is_limited_edition: false,
    is_collectible: false,
    is_seasonal: false,
    is_trending: false,
    is_fragile: false,
    requires_special_handling: false,

    // メタデータ
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: 1,
    source_platform_id: '',
    listing_platform_ids: [],
  };
}

/**
 * マスターキーを生成
 * @param data マスターキーデータ
 * @returns 圧縮されたマスターキー文字列（MK_プレフィックス付き）
 */
export function generateMasterKey(data: Partial<MasterKeyData>): string {
  // デフォルト値とマージ
  const fullData = {
    ...createEmptyMasterKeyData(),
    ...data,
    updated_at: new Date().toISOString(),
  };

  // JSONに変換
  const json = JSON.stringify(fullData);

  // LZ圧縮
  const compressed = LZString.compressToBase64(json);

  // プレフィックス付きで返す
  return `MK_${compressed}`;
}

/**
 * マスターキーをデコード
 * @param masterKey マスターキー文字列
 * @returns デコードされたデータ（失敗時はnull）
 */
export function decodeMasterKey(masterKey: string): MasterKeyData | null {
  try {
    // プレフィックス確認
    if (!masterKey.startsWith('MK_')) {
      console.error('Invalid master key format: missing MK_ prefix');
      return null;
    }

    // プレフィックスを除去
    const compressed = masterKey.substring(3);

    // LZ解凍
    const json = LZString.decompressFromBase64(compressed);

    if (!json) {
      console.error('Failed to decompress master key');
      return null;
    }

    // JSONパース
    const data = JSON.parse(json) as MasterKeyData;

    return data;
  } catch (error) {
    console.error('Error decoding master key:', error);
    return null;
  }
}

/**
 * マスターキーの有効性を検証
 */
export function validateMasterKey(masterKey: string): boolean {
  const decoded = decodeMasterKey(masterKey);
  return decoded !== null && decoded.version > 0;
}

/**
 * 商品データからマスターキーを自動生成
 * @param product 商品データ
 * @returns マスターキー
 */
export function generateMasterKeyFromProduct(product: any): string {
  const data: Partial<MasterKeyData> = {
    // 基本情報
    platform: product.source || 'yahoo_auction',
    marketplace: 'ebay', // デフォルト
    category_l1: product.scraped_data?.category_path?.split(' > ')[0] || '',
    category_l2: product.scraped_data?.category_path?.split(' > ')[1] || '',
    category_l3: product.scraped_data?.category_path?.split(' > ')[2] || '',
    category_id: product.ebay_api_data?.category_id || '',
    brand: product.scraped_data?.brand || '',
    model: product.scraped_data?.model || '',

    // 商品情報
    condition: product.scraped_data?.condition || 'used_good',

    // 価格情報
    cost_jpy: product.scraped_data?.cost_price_jpy || product.price_jpy || 0,
    price_jpy: product.price_jpy || 0,
    price_usd: product.price_usd || 0,
    profit_jpy: (product.price_jpy || 0) - (product.scraped_data?.cost_price_jpy || 0),
    profit_margin_percent:
      product.price_jpy > 0
        ? (((product.price_jpy - (product.scraped_data?.cost_price_jpy || 0)) / product.price_jpy) * 100)
        : 0,

    // 物理情報（スクレイピングデータから）
    weight_kg: product.scraped_data?.weight_kg || null,
    length_cm: product.scraped_data?.length_cm || null,
    width_cm: product.scraped_data?.width_cm || null,
    height_cm: product.scraped_data?.height_cm || null,

    // メタデータ
    source_platform_id: product.item_id || '',
    version: 1,
  };

  return generateMasterKey(data);
}

/**
 * マスターキーの圧縮率を計算
 */
export function getCompressionStats(data: Partial<MasterKeyData>): {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
} {
  const json = JSON.stringify({ ...createEmptyMasterKeyData(), ...data });
  const masterKey = generateMasterKey(data);

  const originalSize = new Blob([json]).size;
  const compressedSize = new Blob([masterKey]).size;
  const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(2);

  return {
    originalSize,
    compressedSize,
    compressionRatio: parseFloat(compressionRatio),
  };
}

/**
 * マスターキー分析用のサマリーを生成
 */
export function getMasterKeySummary(masterKey: string): {
  isValid: boolean;
  data: MasterKeyData | null;
  fieldCount: number;
  filledFieldCount: number;
  completeness: number;
  size: number;
} {
  const data = decodeMasterKey(masterKey);
  const isValid = data !== null;

  if (!data) {
    return {
      isValid: false,
      data: null,
      fieldCount: 0,
      filledFieldCount: 0,
      completeness: 0,
      size: 0,
    };
  }

  // フィールド数をカウント
  const allFields = Object.keys(data);
  const fieldCount = allFields.length;

  // 値が入っているフィールドをカウント
  const filledFieldCount = allFields.filter((key) => {
    const value = data[key as keyof MasterKeyData];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value !== '';
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'boolean') return true; // booleanは常にカウント
    return value !== null;
  }).length;

  const completeness = Math.round((filledFieldCount / fieldCount) * 100);
  const size = new Blob([masterKey]).size;

  return {
    isValid,
    data,
    fieldCount,
    filledFieldCount,
    completeness,
    size,
  };
}

// デフォルトエクスポート
export default {
  generateMasterKey,
  decodeMasterKey,
  validateMasterKey,
  generateMasterKeyFromProduct,
  createEmptyMasterKeyData,
  getCompressionStats,
  getMasterKeySummary,
};
