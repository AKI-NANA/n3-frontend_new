// app/api/inventory-monitoring/execute/route.ts
// 在庫監視バッチを実行

import { NextRequest, NextResponse } from 'next/server'
import { executeMonitoringBatch } from '@/lib/inventory-monitoring/batch-job'
import type { BatchExecutionOptions } from '@/lib/inventory-monitoring/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      type = 'manual',
      max_items = 50,
      delay_min = 30,
      delay_max = 120,
      product_ids,
    } = body as Partial<BatchExecutionOptions>

    console.log(`📊 在庫監視バッチ実行開始: ${type}`)

    // バッチ実行（バックグラウンド）
    const logId = await executeMonitoringBatch({
      type,
      max_items,
      delay_min,
      delay_max,
      product_ids,
    })

    return NextResponse.json({
      success: true,
      log_id: logId,
      message: 'バッチ実行を開始しました',
    })
  } catch (error: any) {
    console.error('❌ バッチ実行エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'バッチ実行に失敗しました',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Inventory Monitoring Execute API',
    methods: ['POST'],
  })
}
