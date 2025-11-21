/**
 * B-1: 商品データ取得と重複排除エンジン API
 * POST /api/scraper/process-products
 *
 * スケジューラ実行時に呼び出される
 * スクレイピング結果を受け取り、重複チェックして登録・更新する
 */

import { NextRequest, NextResponse } from 'next/server';
import { ProductDeduplicationService, ScrapedProductData } from '@/services/ProductDeduplicationService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { products } = body;

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        {
          success: false,
          error: 'productsフィールドが必要です（配列形式）',
        },
        { status: 400 }
      );
    }

    // バッチ処理: 複数商品を一括で重複チェック＆登録
    const results = await ProductDeduplicationService.processBatch(products);

    // 統計情報を集計
    const stats = {
      total: results.length,
      created: results.filter((r) => r.action === 'created').length,
      updated: results.filter((r) => r.action === 'updated').length,
      skipped: results.filter((r) => r.action === 'skipped').length,
      duplicates: results.filter((r) => r.is_duplicate).length,
    };

    return NextResponse.json({
      success: true,
      message: `${stats.total}件の商品を処理しました`,
      stats,
      results,
    });
  } catch (error) {
    console.error('❌ Scraper API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '処理中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}

/**
 * 単一商品の重複チェック
 * POST /api/scraper/process-products?single=true
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const external_url = searchParams.get('external_url');
    const asin_sku = searchParams.get('asin_sku');

    if (!external_url && !asin_sku) {
      return NextResponse.json(
        {
          success: false,
          error: 'external_url または asin_sku が必要です',
        },
        { status: 400 }
      );
    }

    const testData: ScrapedProductData = {
      external_url: external_url || 'https://test.example.com/product/123',
      asin_sku: asin_sku || null,
      title: 'Test Product',
      price: 1000,
      category: 'Test',
      condition: 'New',
    };

    const result = await ProductDeduplicationService.processScrapedProduct(testData);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('❌ Scraper API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '処理中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
