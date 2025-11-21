/**
 * 多販路出品戦略決定API
 * POST /api/strategy/determine-listing
 *
 * Status: '外注処理完了' の全SKUに対して戦略エンジンを実行し、
 * 最適な出品先を決定する
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { determineOptimalListing } from '@/services/ListingStrategyEngine';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Step 1: Status: '外注処理完了' の全SKUを取得
    const { data: skusToProcess, error: fetchError } = await supabase
      .from('products_master')
      .select('id, sku, title')
      .eq('status', '外注処理完了');

    if (fetchError) {
      throw new Error(`商品取得エラー: ${fetchError.message}`);
    }

    if (!skusToProcess || skusToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: '処理対象の商品がありません（Status: 外注処理完了）',
        results: [],
      });
    }

    const results: any[] = [];
    let successCount = 0;
    let noCandidatesCount = 0;
    let errorCount = 0;

    // Step 2: 各SKUに対して戦略エンジンを実行
    for (const product of skusToProcess) {
      try {
        console.log(`🎯 戦略エンジン実行中: SKU ${product.sku}`);

        const decision = await determineOptimalListing(product.id);

        // Step 3: DB更新
        if (decision.status === 'SUCCESS' && decision.recommended_platform) {
          // 戦略決定済として更新
          const { error: updateError } = await supabase
            .from('products_master')
            .update({
              status: '戦略決定済',
              recommended_platform: decision.recommended_platform,
              recommended_account_id: decision.recommended_account_id,
              strategy_score: decision.strategy_score,
              strategy_decision_data: {
                decision_timestamp: decision.decision_timestamp,
                all_candidates: decision.all_candidates,
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', product.id);

          if (updateError) {
            console.error(`❌ DB更新エラー (SKU: ${product.sku}):`, updateError);
            errorCount++;
          } else {
            successCount++;
          }
        } else {
          // 出品不可として更新
          const { error: updateError } = await supabase
            .from('products_master')
            .update({
              status: '出品不可',
              strategy_decision_data: {
                decision_timestamp: decision.decision_timestamp,
                message: decision.message,
                all_candidates: decision.all_candidates,
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', product.id);

          if (updateError) {
            console.error(`❌ DB更新エラー (SKU: ${product.sku}):`, updateError);
            errorCount++;
          } else {
            noCandidatesCount++;
          }
        }

        results.push({
          sku: product.sku,
          title: product.title,
          decision: {
            status: decision.status,
            recommended_platform: decision.recommended_platform,
            recommended_account_id: decision.recommended_account_id,
            strategy_score: decision.strategy_score,
            message: decision.message,
          },
        });
      } catch (error) {
        console.error(`❌ 戦略エンジン実行エラー (SKU: ${product.sku}):`, error);
        errorCount++;
        results.push({
          sku: product.sku,
          title: product.title,
          decision: {
            status: 'ERROR',
            message: error instanceof Error ? error.message : '不明なエラー',
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      count: skusToProcess.length,
      summary: {
        success: successCount,
        no_candidates: noCandidatesCount,
        error: errorCount,
      },
      message: `処理完了: ${successCount}件成功, ${noCandidatesCount}件出品不可, ${errorCount}件エラー`,
      results,
    });
  } catch (error) {
    console.error('❌ Strategy Determination API Error:', error);
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
 * 単一SKUの戦略決定
 * GET /api/strategy/determine-listing?sku_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const skuId = searchParams.get('sku_id');

    if (!skuId) {
      return NextResponse.json(
        {
          success: false,
          error: 'sku_id パラメータが必要です',
        },
        { status: 400 }
      );
    }

    console.log(`🎯 単一SKU戦略エンジン実行: SKU ID ${skuId}`);

    const decision = await determineOptimalListing(skuId);

    return NextResponse.json({
      success: true,
      decision,
    });
  } catch (error) {
    console.error('❌ Strategy Determination API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '処理中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
