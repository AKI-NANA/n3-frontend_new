// app/api/inventory-monitoring/status/[logId]/route.ts
// 実行ステータスを取得

import { NextRequest, NextResponse } from 'next/server'
import { getExecutionStatus } from '@/lib/inventory-monitoring/batch-job'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ logId: string }> }
) {
  try {
    const logId = params.logId

    const status = await getExecutionStatus(logId)

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'ログが見つかりません' },
        { status: 404 }
      )
    }

    // 進捗率を計算
    const progress =
      status.target_count > 0
        ? Math.round((status.processed_count / status.target_count) * 100)
        : 0

    return NextResponse.json({
      success: true,
      status: status.status,
      progress,
      data: status,
    })
  } catch (error: any) {
    console.error('❌ ステータス取得エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'ステータス取得に失敗しました',
      },
      { status: 500 }
    )
  }
}
