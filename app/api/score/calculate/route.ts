/**
 * スコア計算API
 * POST /api/score/calculate
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateBulkScores } from '@/lib/scoring/calculator_v9';
import { getScoreSettings, getDefaultSettings } from '@/lib/scoring/settings';
import {
  ProductMaster,
  ScoreCalculateRequest,
  ScoreCalculateResponse,
} from '@/lib/scoring/types';

export async function POST(request: NextRequest) {
  try {
    console.log('=== スコア計算API開始 ===');
    
    const body: ScoreCalculateRequest = await request.json();
    console.log('1. リクエストボディ:', JSON.stringify(body, null, 2));
    
    const { productIds, settingId } = body;

    // ✅ Supabaseクライアントをawaitで取得
    const supabase = await createClient();
    console.log('1.5. Supabaseクライアント初期化完了');

    // 設定を取得
    console.log('2. 設定取得中... settingId:', settingId);
    const settings = settingId
      ? await getScoreSettings(settingId)
      : await getScoreSettings();

    if (!settings) {
      console.error('❌ 設定が見つかりません');
      return NextResponse.json(
        {
          success: false,
          error: '設定が見つかりません',
          updated: 0,
          results: [],
        } as ScoreCalculateResponse,
        { status: 404 }
      );
    }
    
    console.log('3. 設定取得成功:', {
      weight_profit: settings.weight_profit,
      weight_competition: settings.weight_competition
    });

    // 商品データを取得
    console.log('4. 商品データ取得中...', productIds ? `${productIds.length}件指定` : '全件');
    
    let query = supabase
      .from('products_master')
      .select(
        `
        id, sku, title, title_en, english_title, condition,
        price_jpy, purchase_price_jpy, ddp_price_usd,
        profit_amount_usd, profit_margin, profit_margin_percent,
        listing_score, score_calculated_at, score_details,
        sm_analyzed_at, sm_profit_margin, sm_competitor_count,
        sm_lowest_price, sm_average_price, sm_profit_amount_usd,
        sm_competitors, sm_jp_sellers, sm_sales_count,
        research_sold_count,
        release_date, msrp_jpy, discontinued_at,
        listing_data, scraped_data, images, image_urls, primary_image_url,
        created_at, updated_at
      `
      );

    if (productIds && productIds.length > 0) {
      console.log('5. 特定IDでフィルタリング:', productIds);
      query = query.in('id', productIds);
    }

    const { data: products, error: fetchError } = await query;
    
    console.log('6. 商品データ取得結果:', {
      件数: products?.length || 0,
      エラー: fetchError ? fetchError.message : 'なし',
      最初の商品: products?.[0] ? {
        id: products[0].id,
        sku: products[0].sku,
        profit_amount_usd: products[0].profit_amount_usd,
        profit_margin: products[0].profit_margin
      } : null
    });

    if (fetchError) {
      console.error('Error fetching products:', fetchError);
      return NextResponse.json(
        {
          success: false,
          error: `商品取得エラー: ${fetchError.message}`,
          updated: 0,
          results: [],
        } as ScoreCalculateResponse,
        { status: 500 }
      );
    }

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        results: [],
      } as ScoreCalculateResponse);
    }

    // スコア計算
    console.log('7. スコア計算開始... calculator_v9使用');
    
    let results;
    try {
      results = calculateBulkScores(
        products as ProductMaster[],
        settings
      );
      
      console.log('8. スコア計算結果:', {
        件数: results.length,
        最初の結果: results[0] ? {
          id: results[0].id,
          sku: results[0].sku,
          score: results[0].score,
          details: {
            profit_score: results[0].details.profit_score,
            competition_score: results[0].details.competition_score
          }
        } : null
      });
    } catch (calcError: any) {
      console.error('❌ スコア計算エラー:', calcError);
      console.error('  エラーメッセージ:', calcError.message);
      console.error('  スタック:', calcError.stack);
      throw calcError;
    }

    // データベースに保存
    console.log('9. DB保存開始...');
    const updates = results.map((result) => ({
      id: result.id,
      listing_score: result.score,
      score_details: result.details,
      score_calculated_at: new Date().toISOString(),
    }));
    
    console.log('10. 保存データ:', {
      件数: updates.length,
      最初: updates[0]
    });

    // ✅ upsertではなくupdateを使用（1件ずつ更新）
    const updateResults = await Promise.allSettled(
      updates.map(async (update) => {
        const { error } = await supabase
          .from('products_master')
          .update({
            listing_score: update.listing_score,
            score_details: update.score_details,
            score_calculated_at: update.score_calculated_at,
          })
          .eq('id', update.id);
        
        if (error) {
          console.error(`❌ ID=${update.id} 更新失敗:`, error);
          throw error;
        }
        
        console.log(`✅ ID=${update.id} 更新成功`);
      })
    );
    
    const failedUpdates = updateResults.filter(r => r.status === 'rejected');
    
    if (failedUpdates.length > 0) {
      console.error('❌ 一部の更新が失敗:', failedUpdates);
      const firstError = (failedUpdates[0] as PromiseRejectedResult).reason;
      return NextResponse.json(
        {
          success: false,
          error: `スコア更新エラー: ${firstError.message}`,
          updated: updates.length - failedUpdates.length,
          results,
        } as ScoreCalculateResponse,
        { status: 500 }
      );
    }
    
    console.log('✅ DB保存成功!');
    console.log('=== スコア計算API完了 ===');

    return NextResponse.json({
      success: true,
      updated: results.length,
      results,
    } as ScoreCalculateResponse);
  } catch (error) {
    console.error('Score calculation error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'スコア計算中にエラーが発生しました',
        updated: 0,
        results: [],
      } as ScoreCalculateResponse,
      { status: 500 }
    );
  }
}
