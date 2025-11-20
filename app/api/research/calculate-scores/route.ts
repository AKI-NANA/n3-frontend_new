/**
 * リサーチ結果のスコア計算API
 *
 * POST /api/research/calculate-scores
 *
 * リクエスト:
 * {
 *   ebay_item_ids?: string[];
 *   use_ai_supplier_price?: boolean; // AI特定価格を使うか
 * }
 *
 * レスポンス:
 * {
 *   success: boolean;
 *   updated: number;
 *   results: Array<{ ebay_item_id: string; provisional_score: number; final_score?: number }>;
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { ResearchResult, ScoreDetails } from '@/lib/research/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ebay_item_ids, use_ai_supplier_price = false } = body;

    console.log('📊 リサーチ結果スコア計算開始:', { ebay_item_ids, use_ai_supplier_price });

    let query = supabase.from('research_results').select('*');

    if (ebay_item_ids && ebay_item_ids.length > 0) {
      query = query.in('ebay_item_id', ebay_item_ids);
    }

    const { data: researchResults, error } = await query;

    if (error) {
      console.error('❌ リサーチ結果取得エラー:', error);
      throw error;
    }

    if (!researchResults || researchResults.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        results: [],
      });
    }

    const results = [];

    for (const researchResult of researchResults) {
      try {
        // 暫定スコアの計算（仕入れ先未定）
        const provisionalScore = calculateProvisionalScore(researchResult);

        let finalScore = provisionalScore;
        let supplierCandidate = null;

        // AI特定価格を使う場合
        if (use_ai_supplier_price && researchResult.ai_supplier_candidate_id) {
          const { data: candidate } = await supabase
            .from('supplier_candidates')
            .select('*')
            .eq('id', researchResult.ai_supplier_candidate_id)
            .single();

          if (candidate) {
            supplierCandidate = candidate;
            finalScore = calculateFinalScore(researchResult, candidate);
          }
        }

        // スコア詳細の計算
        const scoreDetails = calculateScoreDetails(researchResult, supplierCandidate);

        // DBを更新
        await supabase
          .from('research_results')
          .update({
            provisional_score: provisionalScore,
            final_score: finalScore,
            score_details: scoreDetails,
            research_status: use_ai_supplier_price ? 'SCORED' : researchResult.research_status,
          })
          .eq('ebay_item_id', researchResult.ebay_item_id);

        results.push({
          ebay_item_id: researchResult.ebay_item_id,
          provisional_score: provisionalScore,
          final_score: finalScore,
          score_details: scoreDetails,
        });
      } catch (error) {
        console.error(`❌ ${researchResult.ebay_item_id} のスコア計算エラー:`, error);
      }
    }

    console.log(`✅ スコア計算完了: ${results.length}件`);

    return NextResponse.json({
      success: true,
      updated: results.length,
      results,
    });
  } catch (error) {
    console.error('❌ スコア計算APIエラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * 暫定スコアの計算（仕入れ先が未定の場合）
 */
function calculateProvisionalScore(result: any): number {
  let score = 0;

  // S (売上数): 20% - 最大20,000点
  const salesScore = calculateSalesScore(result.sold_count || 0);
  score += salesScore * 0.2;

  // C (競合): 15% - 最大15,000点
  const competitionScore = calculateCompetitionScore(result.competitor_count || 0);
  score += competitionScore * 0.15;

  // R (リスク): 25% - 最大25,000点（仮値）
  const riskScore = 12500; // 中間値
  score += riskScore * 0.25;

  // T (トレンド): 10% - 最大10,000点
  const trendScore = calculateTrendScore(result.sold_count || 0);
  score += trendScore * 0.1;

  // P (利益性): 30% - 仕入れ先未定のため0点
  // （暫定スコアでは利益性は計算できない）

  return Math.round(score);
}

/**
 * 最終スコアの計算（AI特定価格を含む）
 */
function calculateFinalScore(result: any, supplierCandidate: any): number {
  let score = 0;

  // P (利益性): 30% - 最大30,000点
  const profitScore = calculateProfitScore(result, supplierCandidate);
  score += profitScore * 0.3;

  // S (売上数): 20%
  const salesScore = calculateSalesScore(result.sold_count || 0);
  score += salesScore * 0.2;

  // C (競合): 15%
  const competitionScore = calculateCompetitionScore(result.competitor_count || 0);
  score += competitionScore * 0.15;

  // R (リスク): 25%
  const riskScore = calculateRiskScore(result, supplierCandidate);
  score += riskScore * 0.25;

  // T (トレンド): 10%
  const trendScore = calculateTrendScore(result.sold_count || 0);
  score += trendScore * 0.1;

  return Math.round(score);
}

/**
 * 利益性スコア（P）の計算
 */
function calculateProfitScore(result: any, supplierCandidate: any): number {
  if (!supplierCandidate) return 0;

  const totalCostJpy = supplierCandidate.total_cost_jpy || 0;
  const exchangeRate = 150; // JPY/USD レート（設定から取得すべき）

  // eBayでの販売価格（USD）
  const salePriceUsd = result.price_usd || 0;
  const salePriceJpy = salePriceUsd * exchangeRate;

  // 利益額（JPY）
  const profitJpy = salePriceJpy - totalCostJpy;

  // 利益率
  const profitMargin = totalCostJpy > 0 ? (profitJpy / totalCostJpy) * 100 : 0;

  // 利益額スコア（0-1000点）
  let profitAmountScore = 0;
  if (profitJpy >= 10000) {
    profitAmountScore = 1000;
  } else if (profitJpy >= 1000) {
    profitAmountScore = 200 + ((Math.log(profitJpy) - Math.log(1000)) / (Math.log(10000) - Math.log(1000))) * 800;
  } else if (profitJpy > 0) {
    profitAmountScore = 200;
  }

  // 利益率スコア（0-1000点）
  const profitMarginScore = Math.min(1000, profitMargin * 20);

  // 加重平均（利益額70%, 利益率30%）
  return profitAmountScore * 0.7 + profitMarginScore * 0.3;
}

/**
 * 売上数スコア（S/T）の計算
 */
function calculateSalesScore(soldCount: number): number {
  if (soldCount === 0) return 0;
  // 50件販売で1000点満点
  return Math.min(1000, (Math.log(soldCount) / Math.log(50)) * 1000);
}

/**
 * 競合スコア（C）の計算
 */
function calculateCompetitionScore(competitorCount: number): number {
  // 競合が少ないほど高スコア
  return Math.max(0, 1000 - competitorCount * 10);
}

/**
 * リスクスコア（R）の計算
 */
function calculateRiskScore(result: any, supplierCandidate: any): number {
  let riskScore = 1000;

  // 信頼度スコアが低い場合はペナルティ
  if (supplierCandidate && supplierCandidate.confidence_score < 0.7) {
    const penalty = (0.7 - supplierCandidate.confidence_score) * 500;
    riskScore -= penalty;
  }

  // 在庫切れの場合はペナルティ
  if (supplierCandidate && supplierCandidate.stock_status === 'out_of_stock') {
    riskScore -= 300;
  }

  return Math.max(0, riskScore);
}

/**
 * トレンドスコア（T）の計算
 */
function calculateTrendScore(soldCount: number): number {
  // 売上数ベース
  return calculateSalesScore(soldCount);
}

/**
 * スコア詳細の計算
 */
function calculateScoreDetails(result: any, supplierCandidate: any): ScoreDetails {
  return {
    profit_score: supplierCandidate ? Math.round(calculateProfitScore(result, supplierCandidate)) : 0,
    competition_score: Math.round(calculateCompetitionScore(result.competitor_count || 0)),
    trend_score: Math.round(calculateTrendScore(result.sold_count || 0)),
    scarcity_score: 0, // 希少性は別途計算
    reliability_score: supplierCandidate
      ? Math.round(calculateRiskScore(result, supplierCandidate))
      : 0,
    final_score: supplierCandidate
      ? Math.round(calculateFinalScore(result, supplierCandidate))
      : Math.round(calculateProvisionalScore(result)),
  };
}

/**
 * GET: 特定のリサーチ結果のスコアを取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ebayItemId = searchParams.get('ebay_item_id');

    if (!ebayItemId) {
      return NextResponse.json(
        { success: false, error: 'ebay_item_id is required' },
        { status: 400 }
      );
    }

    const { data: result, error } = await supabase
      .from('research_results')
      .select('provisional_score, final_score, score_details')
      .eq('ebay_item_id', ebayItemId)
      .single();

    if (error) {
      console.error('❌ スコア取得エラー:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('❌ GETエラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
