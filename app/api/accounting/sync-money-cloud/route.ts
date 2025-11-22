// app/api/accounting/sync-money-cloud/route.ts
/**
 * マネークラウド連携API
 */

import { NextRequest, NextResponse } from 'next/server';
import { moneyCloudConnector } from '@/services/accounting/MoneyCloudConnector';
import { expenseClassifier } from '@/services/accounting/ExpenseClassifier';

/**
 * POST: マネークラウドとの同期を実行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const startDate = body.startDate;
    const endDate = body.endDate;

    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'startDate と endDate は必須です',
        },
        { status: 400 }
      );
    }

    console.log(`[API] マネークラウド同期を開始: ${startDate} 〜 ${endDate}`);

    // 1. マネークラウドから取引データを取得
    const syncResult = await moneyCloudConnector.syncTransactions(startDate, endDate);

    if (!syncResult.success) {
      throw new Error(syncResult.errorMessage || '同期に失敗しました');
    }

    console.log(`[API] ${syncResult.syncedCount}件の取引を取得しました`);

    // 2. 取引を自動分類
    const classificationResults = await expenseClassifier.classifyTransactions(
      syncResult.syncedTransactions
    );

    // 3. 分類結果を台帳に保存
    let savedCount = 0;
    for (let i = 0; i < syncResult.syncedTransactions.length; i++) {
      const transaction = syncResult.syncedTransactions[i];
      const classification = classificationResults[i];

      const ledgerId = await expenseClassifier.saveToLedger(transaction, classification);
      if (ledgerId) {
        savedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        syncedCount: syncResult.syncedCount,
        classifiedCount: classificationResults.length,
        savedCount,
        highConfidenceCount: classificationResults.filter(r => r.confidence === 'HIGH').length,
        requiresApprovalCount: classificationResults.filter(r => r.requires_approval).length,
      },
    });
  } catch (error) {
    console.error('[API] マネークラウド同期エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
