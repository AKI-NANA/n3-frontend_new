// app/api/accounting/expense-breakdown/route.ts
/**
 * 経費内訳取得API
 */

import { NextRequest, NextResponse } from 'next/server';
import { managementPolicyGenerator } from '@/services/ai_pipeline/ManagementPolicyGenerator';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const period = searchParams.get('period') as 'WEEKLY' | 'MONTHLY' | null;

    let start: string;
    let end: string;

    if (startDate && endDate) {
      start = startDate;
      end = endDate;
    } else if (period) {
      const today = new Date();
      end = today.toISOString().split('T')[0];

      if (period === 'WEEKLY') {
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        start = weekAgo.toISOString().split('T')[0];
      } else {
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        start = monthAgo.toISOString().split('T')[0];
      }
    } else {
      const today = new Date();
      end = today.toISOString().split('T')[0];
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      start = monthAgo.toISOString().split('T')[0];
    }

    const expenseBreakdown = await managementPolicyGenerator.getExpenseBreakdown(start, end);

    return NextResponse.json({
      success: true,
      data: expenseBreakdown,
    });
  } catch (error) {
    console.error('[API] 経費内訳取得エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
