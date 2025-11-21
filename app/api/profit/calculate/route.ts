/**
 * 統合利益計算API
 *
 * POST /api/profit/calculate
 *
 * 既存の /ebay-pricing を多モール対応にリファクタリングしたAPIエンドポイント。
 * marketplace_settings を参照し、目標利益率から販売価格を逆算する。
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { UnifiedProfitCalculator } from '@/services/UnifiedProfitCalculator';
import type { ProfitCalculationInput } from '@/services/UnifiedProfitCalculator';

/**
 * POST /api/profit/calculate
 *
 * 単一または複数の利益計算を実行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inputs } = body;

    if (!inputs || !Array.isArray(inputs) || inputs.length === 0) {
      return NextResponse.json(
        { error: 'inputs配列が必要です' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const calculator = new UnifiedProfitCalculator(supabase);

    console.log(`[ProfitCalculateAPI] Calculating profit for ${inputs.length} items`);

    // バッチ計算
    const results = await calculator.calculateBatch(inputs as ProfitCalculationInput[]);

    // 統計情報
    const stats = {
      total: results.length,
      canList: results.filter((r) => r.can_list).length,
      cannotList: results.filter((r) => !r.can_list).length,
      avgProfitMargin:
        results.reduce((sum, r) => sum + r.profit_margin, 0) / results.length,
    };

    return NextResponse.json({
      success: true,
      results,
      stats,
    });
  } catch (error) {
    console.error('[ProfitCalculateAPI] Error:', error);
    return NextResponse.json(
      {
        error: '利益計算でエラーが発生しました',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/profit/calculate?sku=XXX&platform=ebay&destination=US
 *
 * 単一SKUの簡易計算
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sku = searchParams.get('sku');
    const platform = searchParams.get('platform') as any;
    const destination = searchParams.get('destination') || 'US';

    if (!sku || !platform) {
      return NextResponse.json(
        { error: 'sku と platform パラメータが必要です' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 商品情報を取得
    const { data: product, error } = await supabase
      .from('products_master')
      .select('sku, price_jpy, weight_g, hts_code, category')
      .eq('sku', sku)
      .single();

    if (error || !product) {
      return NextResponse.json(
        { error: `SKU ${sku} が見つかりません` },
        { status: 404 }
      );
    }

    const calculator = new UnifiedProfitCalculator(supabase);

    const input: ProfitCalculationInput = {
      sku: product.sku,
      cost_jpy: product.price_jpy || 0,
      weight_g: product.weight_g || 500,
      platform,
      destination_country: destination,
      hts_code: product.hts_code,
      category: product.category,
    };

    const result = await calculator.calculate(input);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('[ProfitCalculateAPI] Error:', error);
    return NextResponse.json(
      {
        error: '利益計算でエラーが発生しました',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
