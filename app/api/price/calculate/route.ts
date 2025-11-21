/**
 * 共通価格計算API
 *
 * POST /api/price/calculate
 *
 * DDP/DDUを動的に切り替え可能な価格計算エンドポイント
 * すべてのモール（eBay、Shopee、Coupang等）で共通利用
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { PriceCalculator } from '@/services/PriceCalculator';
import type {
  PriceCalculationData,
  MarketplaceSettings,
} from '@/services/PriceCalculator';

/**
 * POST /api/price/calculate
 *
 * 単一または複数の価格計算を実行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'items配列が必要です' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const calculator = new PriceCalculator(supabase);

    console.log(`[PriceCalculateAPI] Calculating prices for ${items.length} items`);

    // バッチ計算
    const results = await calculator.calculateBatch(items);

    // 統計情報
    const stats = {
      total: results.length,
      profitable: results.filter((r) => r.is_profitable).length,
      unprofitable: results.filter((r) => !r.is_profitable).length,
      avgProfitRate:
        results.reduce((sum, r) => sum + r.profit_rate, 0) / results.length,
      avgFinalPrice:
        results.reduce((sum, r) => sum + r.final_price_usd, 0) / results.length,
    };

    return NextResponse.json({
      success: true,
      results,
      stats,
    });
  } catch (error) {
    console.error('[PriceCalculateAPI] Error:', error);
    return NextResponse.json(
      {
        error: '価格計算でエラーが発生しました',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/price/calculate?sku=XXX&platform=ebay&isDdpRequired=true
 *
 * 単一SKUの簡易計算
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sku = searchParams.get('sku');
    const platform = searchParams.get('platform');
    const isDdpRequired = searchParams.get('isDdpRequired') === 'true';

    if (!sku || !platform) {
      return NextResponse.json(
        { error: 'sku と platform パラメータが必要です' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 商品情報を取得
    const { data: product, error: productError } = await supabase
      .from('products_master')
      .select('sku, price_jpy, weight_g, hts_code, category')
      .eq('sku', sku)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: `SKU ${sku} が見つかりません` },
        { status: 404 }
      );
    }

    // マーケットプレイス設定を取得
    const { data: settings, error: settingsError } = await supabase
      .from('marketplace_settings')
      .select('*')
      .eq('platform', platform)
      .eq('is_active', true)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: `プラットフォーム ${platform} の設定が見つかりません` },
        { status: 404 }
      );
    }

    // 価格計算データを準備
    const data: PriceCalculationData = {
      item_cost: product.price_jpy || 0,
      shipping_cost_base: 2000, // TODO: 送料ルールから取得
      target_profit_rate: 0.15, // 15%
      hs_code: product.hts_code,
      weight_g: product.weight_g || 500,
    };

    const marketplaceSettings: MarketplaceSettings = {
      platform: settings.platform,
      account_id: settings.account_id,
      country_code: settings.country_code || 'US',
      fee_rate: settings.commission_rate / 100,
      payment_fee_rate: settings.payment_fee_rate / 100,
      fixed_fee: settings.fixed_fee,
      currency: 'USD',
    };

    const calculator = new PriceCalculator(supabase);
    const result = await calculator.calculateFinalPrice(
      data,
      marketplaceSettings,
      isDdpRequired
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('[PriceCalculateAPI] Error:', error);
    return NextResponse.json(
      {
        error: '価格計算でエラーが発生しました',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
