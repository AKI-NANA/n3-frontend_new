/**
 * Shopee CSV生成API
 * 変換済みデータをShopeeの国別CSVフォーマットで出力
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ShopeeCountryCode } from '@/lib/shopee/translator';

export interface ShopeeListingData {
  sku: string;
  title: string;
  description: string;
  categoryId: number;
  price: number;
  stock: number;
  weight: number; // kg
  length?: number; // cm
  width?: number; // cm
  height?: number; // cm
  images: string[]; // 画像URL配列
  brand?: string;
  condition?: string;
  attributes?: Record<string, string>;
}

export interface GenerateCSVRequest {
  targetCountry: ShopeeCountryCode;
  products: ShopeeListingData[];
}

export interface GenerateCSVResponse {
  success: boolean;
  data?: {
    csv: string;
    fileName: string;
    rowCount: number;
  };
  error?: string;
  message?: string;
}

/**
 * Shopee国別CSVヘッダー定義
 */
const CSV_HEADERS: Record<ShopeeCountryCode, string[]> = {
  TW: [
    'category_id',
    'item_name',
    'description',
    'item_sku',
    'parent_sku',
    'variation_name',
    'variation_sku',
    'price',
    'stock',
    'weight',
    'length',
    'width',
    'height',
    'image_1',
    'image_2',
    'image_3',
    'image_4',
    'image_5',
    'image_6',
    'image_7',
    'image_8',
    'image_9',
    'brand',
    'condition',
  ],
  TH: [
    'category_id',
    'item_name',
    'description',
    'item_sku',
    'parent_sku',
    'variation_name',
    'variation_sku',
    'price',
    'stock',
    'weight',
    'length',
    'width',
    'height',
    'image_1',
    'image_2',
    'image_3',
    'image_4',
    'image_5',
    'image_6',
    'image_7',
    'image_8',
    'image_9',
    'brand',
    'condition',
  ],
  SG: [
    'category_id',
    'item_name',
    'description',
    'item_sku',
    'parent_sku',
    'variation_name',
    'variation_sku',
    'price',
    'stock',
    'weight',
    'length',
    'width',
    'height',
    'image_1',
    'image_2',
    'image_3',
    'image_4',
    'image_5',
    'image_6',
    'image_7',
    'image_8',
    'image_9',
    'brand',
    'condition',
  ],
  MY: [
    'category_id',
    'item_name',
    'description',
    'item_sku',
    'parent_sku',
    'variation_name',
    'variation_sku',
    'price',
    'stock',
    'weight',
    'length',
    'width',
    'height',
    'image_1',
    'image_2',
    'image_3',
    'image_4',
    'image_5',
    'image_6',
    'image_7',
    'image_8',
    'image_9',
    'brand',
    'condition',
  ],
  PH: [
    'category_id',
    'item_name',
    'description',
    'item_sku',
    'parent_sku',
    'variation_name',
    'variation_sku',
    'price',
    'stock',
    'weight',
    'length',
    'width',
    'height',
    'image_1',
    'image_2',
    'image_3',
    'image_4',
    'image_5',
    'image_6',
    'image_7',
    'image_8',
    'image_9',
    'brand',
    'condition',
  ],
  VN: [
    'category_id',
    'item_name',
    'description',
    'item_sku',
    'parent_sku',
    'variation_name',
    'variation_sku',
    'price',
    'stock',
    'weight',
    'length',
    'width',
    'height',
    'image_1',
    'image_2',
    'image_3',
    'image_4',
    'image_5',
    'image_6',
    'image_7',
    'image_8',
    'image_9',
    'brand',
    'condition',
  ],
  ID: [
    'category_id',
    'item_name',
    'description',
    'item_sku',
    'parent_sku',
    'variation_name',
    'variation_sku',
    'price',
    'stock',
    'weight',
    'length',
    'width',
    'height',
    'image_1',
    'image_2',
    'image_3',
    'image_4',
    'image_5',
    'image_6',
    'image_7',
    'image_8',
    'image_9',
    'brand',
    'condition',
  ],
  BR: [
    'category_id',
    'item_name',
    'description',
    'item_sku',
    'parent_sku',
    'variation_name',
    'variation_sku',
    'price',
    'stock',
    'weight',
    'length',
    'width',
    'height',
    'image_1',
    'image_2',
    'image_3',
    'image_4',
    'image_5',
    'image_6',
    'image_7',
    'image_8',
    'image_9',
    'brand',
    'condition',
  ],
  MX: [
    'category_id',
    'item_name',
    'description',
    'item_sku',
    'parent_sku',
    'variation_name',
    'variation_sku',
    'price',
    'stock',
    'weight',
    'length',
    'width',
    'height',
    'image_1',
    'image_2',
    'image_3',
    'image_4',
    'image_5',
    'image_6',
    'image_7',
    'image_8',
    'image_9',
    'brand',
    'condition',
  ],
};

/**
 * CSV文字列をエスケープ
 */
function escapeCSV(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // カンマ、改行、ダブルクォートが含まれる場合はダブルクォートで囲む
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Shopee商品データをCSV行に変換
 */
function productToCSVRow(
  product: ShopeeListingData,
  headers: string[]
): string {
  const row: Record<string, any> = {
    category_id: product.categoryId,
    item_name: product.title,
    description: product.description,
    item_sku: product.sku,
    parent_sku: '', // バリエーションなしの場合は空
    variation_name: '', // バリエーションなしの場合は空
    variation_sku: product.sku, // 子SKU
    price: product.price.toFixed(2),
    stock: product.stock,
    weight: product.weight.toFixed(2),
    length: product.length || '',
    width: product.width || '',
    height: product.height || '',
    brand: product.brand || '',
    condition: product.condition || 'New',
  };

  // 画像URL (最大9枚)
  for (let i = 0; i < 9; i++) {
    row[`image_${i + 1}`] = product.images[i] || '';
  }

  // ヘッダー順に値を取得
  const values = headers.map((header) => escapeCSV(row[header] || ''));

  return values.join(',');
}

/**
 * Shopee CSV生成
 */
function generateShopeeCSV(
  products: ShopeeListingData[],
  country: ShopeeCountryCode
): string {
  const headers = CSV_HEADERS[country];

  if (!headers) {
    throw new Error(`Unsupported country: ${country}`);
  }

  // ヘッダー行
  const csvLines = [headers.join(',')];

  // データ行
  for (const product of products) {
    csvLines.push(productToCSVRow(product, headers));
  }

  return csvLines.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateCSVRequest = await request.json();

    // 必須パラメータチェック
    if (!body.targetCountry || !body.products || body.products.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters',
          message: 'targetCountry と products は必須です',
        } as GenerateCSVResponse,
        { status: 400 }
      );
    }

    console.log(
      `[Shopee CSV] CSV生成開始: ${body.targetCountry}, ${body.products.length}件`
    );

    // CSV生成
    const csv = generateShopeeCSV(body.products, body.targetCountry);

    // ファイル名生成
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const fileName = `shopee_${body.targetCountry}_${timestamp}.csv`;

    console.log(`[Shopee CSV] CSV生成完了: ${fileName}`);

    const response: GenerateCSVResponse = {
      success: true,
      data: {
        csv,
        fileName,
        rowCount: body.products.length,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Shopee CSV API] エラー:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        message: 'CSV生成中にエラーが発生しました',
      } as GenerateCSVResponse,
      { status: 500 }
    );
  }
}
