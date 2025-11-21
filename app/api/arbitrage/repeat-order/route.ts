/**
 * リピート発注API
 * POST /api/arbitrage/repeat-order
 *
 * 在庫不足商品の自動リピート発注を実行
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRepeatOrderManager } from '@/services/RepeatOrderManager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RepeatOrderRequest {
  dryRun?: boolean
  reorderThreshold?: number
  reorderLotSize?: number
  maxAutoReorderAmount?: number
}

/**
 * POST /api/arbitrage/repeat-order
 *
 * 在庫不足商品のリピート発注を一括実行
 */
export async function POST(request: NextRequest) {
  try {
    const body: RepeatOrderRequest = await request.json()

    console.log('🔄 リピート発注APIが呼び出されました', body)

    const manager = createRepeatOrderManager({
      dryRun: body.dryRun ?? false,
      reorderThreshold: body.reorderThreshold,
      reorderLotSize: body.reorderLotSize,
      maxAutoReorderAmount: body.maxAutoReorderAmount,
    })

    // リピート発注を実行
    const result = await manager.executeReorderForLowStockProducts()

    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: {
        reorderedCount: result.reorderedProducts.length,
        totalReorderAmount: result.totalReorderAmount,
        errors: result.errors,
      },
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ リピート発注APIエラー:', error)

    return NextResponse.json({
      success: false,
      message: `リピート発注失敗: ${error.message}`,
      error: error.message,
    }, { status: 500 })
  }
}
