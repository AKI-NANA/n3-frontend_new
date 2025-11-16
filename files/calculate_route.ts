/**
 * スコア計算API
 * POST /api/score/calculate
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateBulkScores } from '@/lib/scoring/calculator';
import { getScoreSettings, getDefaultSettings } from '@/lib/scoring/settings';
import {
  ProductMaster,
  ScoreCalculateRequest,
  ScoreCalculateResponse,
} from '@/lib/scoring/types';

export async function POST(request: NextRequest) {
  try {
    const body: ScoreCalculateRequest = await request.json();
    const { productIds, settingId } = body;

    const supabase = createClient();

    // 設定を取得
    const settings = settingId
      ? await getScoreSettings(settingId)
      : await getScoreSettings();

    if (!settings) {
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

    // 商品データを取得
    let query = supabase
      .from('products_master')
      .select(
        `
        id, sku, title, title_en, condition,
        price_jpy, acquired_price_jpy,
        listing_score, score_calculated_at, score_details,
        sm_analyzed_at, sm_profit_margin, sm_competitors, sm_min_price_usd,
        listing_data, created_at, updated_at
      `
      );

    if (productIds && productIds.length > 0) {
      query = query.in('id', productIds);
    }

    const { data: products, error: fetchError } = await query;

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
    const results = calculateBulkScores(
      products as ProductMaster[],
      settings
    );

    // データベースに保存
    const updates = results.map((result) => ({
      id: result.id,
      listing_score: result.score,
      score_details: result.details,
      score_calculated_at: new Date().toISOString(),
    }));

    // バッチ更新（Supabaseのupsert機能を使用）
    const { error: updateError } = await supabase
      .from('products_master')
      .upsert(updates, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });

    if (updateError) {
      console.error('Error updating scores:', updateError);
      return NextResponse.json(
        {
          success: false,
          error: `スコア更新エラー: ${updateError.message}`,
          updated: 0,
          results,
        } as ScoreCalculateResponse,
        { status: 500 }
      );
    }

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
