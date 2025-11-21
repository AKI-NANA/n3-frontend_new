/**
 * 検品・承認API
 * POST /api/arbitrage/approve-inspection
 *
 * スタッフによる検品・承認を記録し、多販路出品をトリガー
 */

import { NextRequest, NextResponse } from 'next/server'
import { createInitialPurchaseManager } from '@/executions/InitialPurchaseManager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ApproveInspectionRequest {
  productIds: string[]
  inspectedBy?: string
  notes?: string
}

/**
 * POST /api/arbitrage/approve-inspection
 *
 * 商品の検品・承認を実行
 */
export async function POST(request: NextRequest) {
  try {
    const body: ApproveInspectionRequest = await request.json()

    if (!body.productIds || body.productIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'productIdsが必要です',
      }, { status: 400 })
    }

    console.log('✅ 検品・承認APIが呼び出されました', {
      productIds: body.productIds,
      inspectedBy: body.inspectedBy,
    })

    const manager = createInitialPurchaseManager({ dryRun: false })

    // 検品・承認処理を実行
    const result = await manager.approveInspectedProducts(body.productIds)

    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: {
        approvedCount: result.approvedProducts.length,
        listedCount: result.listedProducts.length,
        errors: result.errors,
      },
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ 検品・承認APIエラー:', error)

    return NextResponse.json({
      success: false,
      message: `検品・承認失敗: ${error.message}`,
      error: error.message,
    }, { status: 500 })
  }
}
