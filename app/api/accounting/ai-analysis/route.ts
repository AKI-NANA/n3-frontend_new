// app/api/accounting/ai-analysis/route.ts
/**
 * AI経営分析結果の取得・実行API
 */

import { NextRequest, NextResponse } from 'next/server';
import { managementPolicyGenerator } from '@/services/ai_pipeline/ManagementPolicyGenerator';
import { supabase } from '@/lib/supabase';

/**
 * GET: 最新のAI分析結果を取得
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '1', 10);

    const { data, error } = await supabase
      .from('ai_analysis_results')
      .select('*')
      .order('analysis_date', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`AI分析結果取得エラー: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('[API] AI分析結果取得エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}

/**
 * POST: AI分析を手動で実行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const period = (body.period || 'WEEKLY') as 'WEEKLY' | 'MONTHLY';

    console.log(`[API] AI分析を実行します (期間: ${period})`);

    const result = await managementPolicyGenerator.runPeriodicAnalysis(period);

    if (!result) {
      throw new Error('AI分析の実行に失敗しました');
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[API] AI分析実行エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
