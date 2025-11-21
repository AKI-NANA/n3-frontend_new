/**
 * Shopee出品データ変換API
 * eBayのデータをShopee用に変換
 */

import { NextRequest, NextResponse } from 'next/server';
import { translateProductListing } from '@/lib/shopee/translator';
import { getExchangeRate, convertJPYTo } from '@/lib/shopee/exchangeRates';
import { calculateShopeePrice } from '@/lib/mappers/shopee/profitCalculator';
import { getShopeeCategoryForCountry, getDefaultShopeeCategory } from '@/lib/shopee/categoryMapping';
import type { ShopeeCountryCode } from '@/lib/shopee/translator';

export interface TransformListingRequest {
  productId: string;
  targetCountry: ShopeeCountryCode;

  // products_masterから取得するデータ
  englishTitle: string;
  englishDescription: string;
  priceJpy: number;
  weightG?: number;

  // オプション設定
  targetProfitRate?: number;
  domesticShippingJpy?: number;
  ebayCategory?: string;
}

export interface TransformListingResponse {
  success: boolean;
  data?: {
    // 翻訳済みデータ
    title: string;
    description: string;

    // カテゴリ情報
    categoryId: number;
    categoryPath: string[];
    requiredAttributes: string[];

    // 価格計算結果
    priceLocal: number;
    currency: string;
    profitRate: number;

    // 配送情報
    weightKg: number;

    // メタ情報
    translationProvider: string;
    exchangeRateProvider: string;
    lastCalculated: string;
  };
  error?: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TransformListingRequest = await request.json();

    // 必須パラメータチェック
    if (!body.productId || !body.targetCountry || !body.englishTitle || !body.priceJpy) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters',
          message: 'productId, targetCountry, englishTitle, priceJpy は必須です',
        } as TransformListingResponse,
        { status: 400 }
      );
    }

    console.log(`[Shopee Transform] 変換開始: ${body.productId} → ${body.targetCountry}`);

    // ========================================
    // 1. 翻訳処理
    // ========================================
    const translation = await translateProductListing(
      body.englishTitle,
      body.englishDescription || '',
      body.targetCountry
    );

    console.log(`[Shopee Transform] 翻訳完了: ${translation.title.provider}`);

    // ========================================
    // 2. カテゴリマッピング
    // ========================================
    let categoryInfo;

    if (body.ebayCategory) {
      categoryInfo = getShopeeCategoryForCountry(body.ebayCategory, body.targetCountry);
    }

    // カテゴリが見つからない場合はデフォルト
    if (!categoryInfo) {
      console.warn(`[Shopee Transform] カテゴリマッピングが見つかりません、デフォルトを使用`);
      categoryInfo = getDefaultShopeeCategory(body.targetCountry);
    }

    console.log(`[Shopee Transform] カテゴリ: ${categoryInfo.categoryPath.join(' > ')}`);

    // ========================================
    // 3. 為替レート取得
    // ========================================
    const exchangeRate = await getExchangeRate(categoryInfo.currency || 'USD');

    console.log(
      `[Shopee Transform] 為替レート: 1 JPY = ${exchangeRate.rate} ${exchangeRate.to}`
    );

    // ========================================
    // 4. 価格計算
    // ========================================
    const weightKg = body.weightG ? body.weightG / 1000 : 0.5; // デフォルト500g
    const domesticShippingJpy = body.domesticShippingJpy || 800; // デフォルト800円
    const targetProfitRate = body.targetProfitRate || 0.25; // デフォルト25%

    let priceResult;
    try {
      priceResult = calculateShopeePrice({
        priceJpy: body.priceJpy,
        domesticShippingJpy,
        targetCountry: body.targetCountry as 'TW' | 'TH',
        targetProfitRate,
        productWeightKg: weightKg,
        exchangeRateJpyToTarget: exchangeRate.rate,
      });

      console.log(`[Shopee Transform] 価格計算完了: ${priceResult.finalSalesPrice} ${priceResult.currency}`);
    } catch (error: any) {
      console.error('[Shopee Transform] 価格計算エラー:', error.message);

      // フォールバック: 単純な計算
      const simplePriceLocal = convertJPYTo(
        body.priceJpy * (1 + targetProfitRate),
        exchangeRate.rate
      );

      priceResult = {
        finalSalesPrice: simplePriceLocal,
        currency: exchangeRate.to,
        profitRate: targetProfitRate,
        details: {
          totalCostTarget: 0,
          slsCost: 0,
          platformFees: 0,
        },
      };
    }

    // ========================================
    // 5. レスポンス生成
    // ========================================
    const response: TransformListingResponse = {
      success: true,
      data: {
        title: translation.title.translatedText,
        description: translation.description.translatedText,

        categoryId: categoryInfo.categoryId,
        categoryPath: categoryInfo.categoryPath,
        requiredAttributes: categoryInfo.requiredAttributes || [],

        priceLocal: priceResult.finalSalesPrice,
        currency: priceResult.currency,
        profitRate: priceResult.profitRate,

        weightKg,

        translationProvider: translation.title.provider,
        exchangeRateProvider: exchangeRate.provider,
        lastCalculated: new Date().toISOString(),
      },
    };

    console.log(`[Shopee Transform] 変換完了: ${body.productId}`);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Shopee Transform API] エラー:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        message: '変換処理中にエラーが発生しました',
      } as TransformListingResponse,
      { status: 500 }
    );
  }
}
