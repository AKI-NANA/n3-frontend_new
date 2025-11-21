/**
 * プラットフォーム別CSV生成機能
 * 各モールのフォーマットに合わせてCSVを生成
 */

import type { Platform, TransformedProductData, CSVExportOptions } from './types';

/**
 * CSVヘッダー定義（プラットフォーム別）
 */
const CSV_HEADERS: Record<Platform, string[]> = {
  ebay: [
    'Action',
    'SKU',
    'Title',
    'Description',
    'Category',
    'Price',
    'Quantity',
    'Condition',
    'Image1',
    'Image2',
    'Image3',
    'Image4',
    'Image5',
    'Image6',
    'Image7',
    'Image8',
    'Image9',
    'Image10',
    'Image11',
    'Image12',
  ],
  amazon_us: [
    'SKU',
    'Product Name',
    'Product Description',
    'Brand',
    'ASIN',
    'UPC',
    'Price',
    'Quantity',
    'Condition',
    'Fulfillment',
    'Main Image URL',
    'Other Image URL1',
    'Other Image URL2',
    'Other Image URL3',
    'Other Image URL4',
    'Other Image URL5',
    'Other Image URL6',
    'Other Image URL7',
    'Other Image URL8',
  ],
  amazon_au: [
    'SKU',
    'Product Name',
    'Product Description',
    'Brand',
    'ASIN',
    'Price',
    'Quantity',
    'Condition',
    'Fulfillment',
    'Main Image URL',
    'Other Image URL1',
    'Other Image URL2',
    'Other Image URL3',
    'Other Image URL4',
    'Other Image URL5',
    'Other Image URL6',
    'Other Image URL7',
    'Other Image URL8',
  ],
  amazon_jp: [
    'SKU',
    '商品名',
    '商品説明',
    'ブランド',
    'ASIN',
    'JANコード',
    '価格',
    '在庫数',
    'コンディション',
    'フルフィルメント',
    'メイン画像URL',
    'サブ画像URL1',
    'サブ画像URL2',
    'サブ画像URL3',
    'サブ画像URL4',
    'サブ画像URL5',
    'サブ画像URL6',
    'サブ画像URL7',
    'サブ画像URL8',
  ],
  coupang: [
    'Item ID',
    'SKU',
    '상품명',
    '상품설명',
    '브랜드',
    '원산지',
    '가격',
    '재고수량',
    '배송방법',
    '카테고리',
    '이미지1',
    '이미지2',
    '이미지3',
    '이미지4',
    '이미지5',
    '이미지6',
    '이미지7',
    '이미지8',
    '이미지9',
    '이미지10',
  ],
  qoo10: [
    'SKU',
    'Title',
    'Description',
    'Category',
    'Price',
    'Sale Price',
    'Quantity',
    'Weight (g)',
    'Shipping Method',
    'Image 1',
    'Image 2',
    'Image 3',
    'Image 4',
    'Image 5',
    'Image 6',
    'Image 7',
    'Image 8',
    'Image 9',
    'Image 10',
  ],
  shopee: [
    'SKU',
    'Product Name',
    'Description',
    'Category',
    'Price',
    'Stock',
    'Weight (g)',
    'Condition',
    'Image 1',
    'Image 2',
    'Image 3',
    'Image 4',
    'Image 5',
    'Image 6',
    'Image 7',
    'Image 8',
    'Image 9',
    'Image 10',
  ],
  shopify: [
    'Handle',
    'Title',
    'Body (HTML)',
    'Vendor',
    'Type',
    'Tags',
    'Published',
    'Option1 Name',
    'Option1 Value',
    'Variant SKU',
    'Variant Grams',
    'Variant Inventory Qty',
    'Variant Price',
    'Image Src',
    'Image Position',
  ],
  mercari: [
    'SKU',
    '商品名',
    '説明',
    'カテゴリ',
    '価格',
    'コンディション',
    '配送方法',
    '配送料負担',
    '画像1',
    '画像2',
    '画像3',
    '画像4',
    '画像5',
    '画像6',
    '画像7',
    '画像8',
    '画像9',
    '画像10',
  ],
};

/**
 * CSVを生成
 */
export function generateCSV(options: CSVExportOptions): string {
  const { platform, products, includeHeaders } = options;

  const lines: string[] = [];

  // ヘッダー行
  if (includeHeaders) {
    const headers = CSV_HEADERS[platform];
    lines.push(formatCSVRow(headers));
  }

  // データ行
  for (const product of products) {
    const row = convertProductToCSVRow(product, platform);
    lines.push(formatCSVRow(row));
  }

  return lines.join('\n');
}

/**
 * 商品データをCSV行に変換
 */
function convertProductToCSVRow(
  product: TransformedProductData,
  platform: Platform
): string[] {
  const row: string[] = [];

  switch (platform) {
    case 'ebay':
      row.push(
        'Add', // Action
        product.sku,
        product.title,
        product.description,
        product.category || '',
        product.price.toString(),
        product.stockQuantity.toString(),
        product.platformSpecific.condition || 'New',
        ...product.images.slice(0, 12)
      );
      // 画像が12枚未満の場合、空文字で埋める
      while (row.length < 20) {
        row.push('');
      }
      break;

    case 'amazon_us':
      row.push(
        product.sku,
        product.title,
        product.description,
        product.platformSpecific.brand || '',
        product.platformSpecific.asin || '',
        product.platformSpecific.upc || '',
        product.price.toString(),
        product.stockQuantity.toString(),
        product.platformSpecific.condition || 'New',
        product.platformSpecific.fulfillment_method || 'FBM',
        ...product.images.slice(0, 9)
      );
      while (row.length < 19) {
        row.push('');
      }
      break;

    case 'amazon_au':
      row.push(
        product.sku,
        product.title,
        product.description,
        product.platformSpecific.brand || '',
        product.platformSpecific.asin || '',
        product.price.toString(),
        product.stockQuantity.toString(),
        product.platformSpecific.condition || 'New',
        product.platformSpecific.fulfillment_method || 'FBM',
        ...product.images.slice(0, 9)
      );
      while (row.length < 18) {
        row.push('');
      }
      break;

    case 'amazon_jp':
      row.push(
        product.sku,
        product.title,
        product.description,
        product.platformSpecific.brand || '',
        product.platformSpecific.asin || '',
        product.platformSpecific.jan_code || '',
        product.price.toString(),
        product.stockQuantity.toString(),
        product.platformSpecific.condition || 'New',
        product.platformSpecific.fulfillment_method || 'FBM',
        ...product.images.slice(0, 9)
      );
      while (row.length < 19) {
        row.push('');
      }
      break;

    case 'coupang':
      row.push(
        product.platformSpecific.item_id || product.sku,
        product.sku,
        product.title,
        product.description,
        product.platformSpecific.brand || '',
        product.platformSpecific.origin_country || '',
        product.price.toString(),
        product.stockQuantity.toString(),
        product.platformSpecific.delivery_method || 'Coupang Wing',
        product.category || '',
        ...product.images.slice(0, 10)
      );
      while (row.length < 20) {
        row.push('');
      }
      break;

    case 'qoo10':
      row.push(
        product.sku,
        product.title,
        product.description,
        product.category || '',
        product.price.toString(),
        product.platformSpecific.sale_price?.toString() || product.price.toString(),
        product.stockQuantity.toString(),
        product.platformSpecific.weight_g?.toString() || '0',
        product.platformSpecific.shipping_method || 'Qxpress',
        ...product.images.slice(0, 10)
      );
      while (row.length < 19) {
        row.push('');
      }
      break;

    case 'shopee':
      row.push(
        product.sku,
        product.title,
        product.description,
        product.category || '',
        product.price.toString(),
        product.stockQuantity.toString(),
        product.platformSpecific.weight_g?.toString() || '0',
        product.platformSpecific.condition || 'New',
        ...product.images.slice(0, 10)
      );
      while (row.length < 18) {
        row.push('');
      }
      break;

    case 'shopify':
      // Shopifyは複数行で1商品を表現（画像ごとに行を作成）
      const handle = product.sku.toLowerCase().replace(/[^a-z0-9]/g, '-');
      row.push(
        handle,
        product.title,
        product.description,
        product.platformSpecific.brand || '',
        product.category || '',
        '',
        'TRUE',
        'Title',
        'Default',
        product.sku,
        product.platformSpecific.weight_g?.toString() || '0',
        product.stockQuantity.toString(),
        product.price.toString(),
        product.images[0] || '',
        '1'
      );
      break;

    case 'mercari':
      row.push(
        product.sku,
        product.title,
        product.description,
        product.category || '',
        product.price.toString(),
        product.platformSpecific.condition || 'New',
        product.platformSpecific.shipping_method || 'Mercari',
        product.platformSpecific.shipping_payer || 'Seller',
        ...product.images.slice(0, 10)
      );
      while (row.length < 18) {
        row.push('');
      }
      break;
  }

  return row;
}

/**
 * CSV行をフォーマット（カンマ区切り、エスケープ処理）
 */
function formatCSVRow(values: string[]): string {
  return values
    .map((value) => {
      const stringValue = String(value || '');

      // カンマ、改行、ダブルクォートを含む場合はエスケープ
      if (
        stringValue.includes(',') ||
        stringValue.includes('\n') ||
        stringValue.includes('"')
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }

      return stringValue;
    })
    .join(',');
}

/**
 * CSVをダウンロード可能なBlobに変換
 */
export function csvToBlob(
  csvContent: string,
  encoding: 'utf-8' | 'shift-jis' = 'utf-8'
): Blob {
  if (encoding === 'shift-jis') {
    // Shift-JISエンコーディング（日本語プラットフォーム用）
    // TODO: エンコーディングライブラリの統合が必要
    console.warn(
      '[CSV] Shift-JISエンコーディングは未実装です。UTF-8を使用します。'
    );
  }

  // UTF-8 BOM付き（Excelで文字化けを防ぐ）
  const bom = '\uFEFF';
  return new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * CSVファイル名を生成
 */
export function generateCSVFilename(
  platform: Platform,
  productCount: number
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${platform}_products_${productCount}_${timestamp}.csv`;
}

/**
 * 複数商品のCSVを一括生成してダウンロード
 */
export function downloadCSV(options: CSVExportOptions): void {
  const csvContent = generateCSV(options);
  const blob = csvToBlob(csvContent, options.encoding);
  const filename = generateCSVFilename(options.platform, options.products.length);

  // ダウンロードリンクを作成
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  console.log(
    `[CSV] ${options.platform} 用CSVをダウンロードしました: ${filename}`
  );
}
