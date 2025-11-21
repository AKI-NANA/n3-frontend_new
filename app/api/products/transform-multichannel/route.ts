/**
 * 多販路変換API
 * products_masterのデータを各プラットフォーム向けに変換
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type {
  Platform,
  ProductTransformInput,
  TransformedProductData,
  SourceProductData,
} from '@/lib/multichannel/types';
import { getPlatformConfig, getRequiredFields } from '@/lib/multichannel/platformConfigs';
import { translateProductContent } from '@/lib/multichannel/translator';
import { adjustImageList } from '@/lib/multichannel/imageProcessor';
import { calculatePlatformPrice } from '@/lib/pricing/PlatformPricing';

/**
 * POST /api/products/transform-multichannel
 * 商品データをプラットフォーム向けに変換
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sku, targetPlatform, targetCountry } = body as {
      sku: string;
      targetPlatform: Platform;
      targetCountry: string;
    };

    // バリデーション
    if (!sku || !targetPlatform) {
      return NextResponse.json(
        { error: 'sku と targetPlatform は必須です' },
        { status: 400 }
      );
    }

    // Supabaseクライアント作成
    const supabase = await createClient();

    // 商品データを取得
    const { data: product, error: productError } = await supabase
      .from('products_master')
      .select('*')
      .eq('sku', sku)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: '商品が見つかりません', details: productError },
        { status: 404 }
      );
    }

    // listing_dataも取得（画像や詳細情報用）
    const { data: listingData } = await supabase
      .from('listing_data')
      .select('*')
      .eq('products_master_id', product.id)
      .single();

    // ソースデータを準備
    const sourceData: SourceProductData = {
      id: product.id,
      sku: product.sku,
      title_ja: product.title_ja || listingData?.title || '',
      title_en: product.title_en || listingData?.title || '',
      description_ja: product.description_ja || listingData?.description || '',
      description_en: product.description_en || listingData?.description || '',
      price_jpy: product.price_jpy || 0,
      stock_quantity: product.stock_quantity || 0,
      gallery_images: listingData?.gallery_images || [],
      weight_g: listingData?.weight_g || 0,
      dimensions: {
        length_cm: listingData?.length_cm,
        width_cm: listingData?.width_cm,
        height_cm: listingData?.height_cm,
      },
      category: listingData?.category,
      brand: listingData?.brand,
      origin_country: product.origin_country,
      jan_code: product.jan_code,
      asin: product.asin,
    };

    // 変換を実行
    const transformedData = await transformProduct({
      sku,
      targetPlatform,
      targetCountry: targetCountry || 'US',
      sourceData,
    });

    return NextResponse.json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    console.error('[TransformAPI] エラー:', error);
    return NextResponse.json(
      {
        error: '変換処理中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * 商品データを変換
 */
async function transformProduct(
  input: ProductTransformInput
): Promise<TransformedProductData> {
  const { targetPlatform, targetCountry, sourceData } = input;
  const config = getPlatformConfig(targetPlatform);
  const warnings: string[] = [];

  console.log(
    `[TransformAPI] ${sourceData.sku} を ${targetPlatform} 向けに変換開始`
  );

  // 1. タイトルと説明文の翻訳
  let title = sourceData.title_en || sourceData.title_ja || '';
  let description = sourceData.description_en || sourceData.description_ja || '';

  // ソース言語を判定
  const sourceLanguage = sourceData.title_ja ? 'ja' : 'en';

  const translated = await translateProductContent(
    title || '',
    description || '',
    targetPlatform,
    sourceLanguage
  );

  title = translated.title;
  description = translated.description;

  // 2. 画像の調整
  const imageUrls = sourceData.gallery_images || [];
  const { adjustedUrls, warnings: imageWarnings } = adjustImageList(
    imageUrls,
    targetPlatform
  );
  warnings.push(...imageWarnings);

  // 3. 価格計算
  let price = sourceData.price_jpy;
  let currency = config.currency;

  try {
    const pricingResult = await calculatePlatformPrice({
      costJpy: sourceData.price_jpy,
      weightG: sourceData.weight_g || 500,
      platform: targetPlatform,
      targetCountry,
      category: sourceData.category,
    });

    price = pricingResult.sellingPrice;
    currency = pricingResult.currency;

    if (pricingResult.warnings.length > 0) {
      warnings.push(...pricingResult.warnings);
    }
  } catch (error) {
    console.error('[TransformAPI] 価格計算エラー:', error);
    warnings.push('価格計算に失敗しました。元の価格を使用します。');
  }

  // 4. プラットフォーム固有データの準備
  const platformSpecific = preparePlatformSpecificData(
    targetPlatform,
    sourceData,
    targetCountry
  );

  // 5. 必須フィールドのチェック
  const requiredFields = getRequiredFields(targetPlatform);
  const missingFields = checkRequiredFields(
    { title, description, price, images: adjustedUrls, ...platformSpecific },
    requiredFields
  );

  if (missingFields.length > 0) {
    warnings.push(
      `必須フィールドが不足しています: ${missingFields.join(', ')}`
    );
  }

  const transformedData: TransformedProductData = {
    platform: targetPlatform,
    title,
    description,
    price,
    currency,
    images: adjustedUrls,
    sku: sourceData.sku,
    stockQuantity: sourceData.stock_quantity,
    category: sourceData.category,
    platformSpecific,
    warnings,
  };

  console.log(
    `[TransformAPI] ${sourceData.sku} の変換完了 (警告: ${warnings.length}件)`
  );

  return transformedData;
}

/**
 * プラットフォーム固有データの準備
 */
function preparePlatformSpecificData(
  platform: Platform,
  sourceData: SourceProductData,
  targetCountry: string
): Record<string, any> {
  const specific: Record<string, any> = {};

  switch (platform) {
    case 'amazon_jp':
    case 'amazon_us':
    case 'amazon_au':
      specific.jan_code = sourceData.jan_code;
      specific.asin = sourceData.asin;
      specific.brand = sourceData.brand || 'Generic';
      specific.fulfillment_method = 'FBM'; // デフォルトはFBM
      specific.condition = 'New';
      specific.origin_country = sourceData.origin_country;
      break;

    case 'coupang':
      // Coupangは韓国語が必須
      specific.item_id = sourceData.sku; // 独自のItem ID
      specific.origin_country = sourceData.origin_country || 'JP';
      specific.brand = sourceData.brand || 'Generic';
      specific.delivery_method = 'Coupang Wing';
      break;

    case 'qoo10':
      specific.sale_price = 0; // セール価格は別途設定
      specific.shipping_method = 'Qxpress';
      specific.weight_g = sourceData.weight_g;
      break;

    case 'shopee':
      specific.weight_g = sourceData.weight_g;
      specific.shipping_method = 'SLS';
      specific.condition = 'New';
      break;

    case 'shopify':
      specific.weight_g = sourceData.weight_g;
      specific.variants = [
        {
          sku: sourceData.sku,
          price: sourceData.price_jpy,
          inventory: sourceData.stock_quantity,
        },
      ];
      break;

    case 'ebay':
      specific.condition = 'New';
      specific.shipping_service = 'Standard';
      specific.return_policy = '30 days';
      break;

    case 'mercari':
      specific.condition = 'New';
      specific.shipping_method = 'Mercari';
      specific.shipping_payer = 'Seller';
      break;
  }

  return specific;
}

/**
 * 必須フィールドのチェック
 */
function checkRequiredFields(
  data: Record<string, any>,
  requiredFields: string[]
): string[] {
  const missing: string[] = [];

  for (const field of requiredFields) {
    // ネストされたフィールドをチェック（例: "platformSpecific.brand"）
    const value = getNestedValue(data, field);

    if (
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    ) {
      missing.push(field);
    }
  }

  return missing;
}

/**
 * ネストされた値を取得
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * GET /api/products/transform-multichannel?sku=xxx&platform=yyy
 * クエリパラメータでも対応
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sku = searchParams.get('sku');
    const targetPlatform = searchParams.get('platform') as Platform;
    const targetCountry = searchParams.get('country') || 'US';

    if (!sku || !targetPlatform) {
      return NextResponse.json(
        { error: 'sku と platform パラメータは必須です' },
        { status: 400 }
      );
    }

    // POSTメソッドと同じ処理を実行
    return POST(
      new NextRequest(request.url, {
        method: 'POST',
        body: JSON.stringify({ sku, targetPlatform, targetCountry }),
      })
    );
  } catch (error) {
    console.error('[TransformAPI] GETエラー:', error);
    return NextResponse.json(
      {
        error: 'エラーが発生しました',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
