/**
 * 初期ロット仕入れAPI
 * POST /api/arbitrage/initial-purchase
 *
 * P-4スコアリングに基づき、高ポテンシャル商品の初期ロット仕入れを実行
 */

import { NextRequest, NextResponse } from 'next/server'
import { createInitialPurchaseManager } from '@/executions/InitialPurchaseManager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface InitialPurchaseRequest {
  dryRun?: boolean
  arbitrageThreshold?: number
  initialLotSize?: number
  maxAutoOrderAmount?: number
}

/**
 * POST /api/arbitrage/initial-purchase
 *
 * 初期ロット仕入れを実行
 */
export async function POST(request: NextRequest) {
  try {
    const body: InitialPurchaseRequest = await request.json()

    console.log('🚀 初期ロット仕入れAPIが呼び出されました', body)

    // InitialPurchaseManagerのインスタンスを作成
    const manager = createInitialPurchaseManager({
      dryRun: body.dryRun ?? false,
      arbitrageThreshold: body.arbitrageThreshold,
      initialLotSize: body.initialLotSize,
      maxAutoOrderAmount: body.maxAutoOrderAmount,
    })

    // 初期ロット仕入れフローを実行
    const result = await manager.executeInitialPurchaseFlow()

    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: {
        selectedProductsCount: result.selectedProducts.length,
        orderedProductsCount: result.orderedProducts.length,
        totalOrderAmount: result.totalOrderAmount,
        errors: result.errors,
      },
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ 初期ロット仕入れAPIエラー:', error)

    return NextResponse.json({
      success: false,
      message: `初期ロット仕入れ失敗: ${error.message}`,
      error: error.message,
    }, { status: 500 })
  }
}

/**
 * GET /api/arbitrage/initial-purchase
 *
 * 初期ロット仕入れ対象商品を取得（プレビュー）
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const threshold = parseInt(searchParams.get('threshold') || '70')

    console.log('🔍 初期ロット仕入れ対象商品を取得', { threshold })

    const manager = createInitialPurchaseManager({
      dryRun: true,
      arbitrageThreshold: threshold,
    })

    // 商品選定のみ実行（発注はしない）
    const selectedProducts = await manager.selectHighPotentialProducts()

    return NextResponse.json({
      success: true,
      message: `${selectedProducts.length}件の対象商品を発見`,
      data: {
        products: selectedProducts.map(p => ({
          id: p.id,
          sku: p.sku,
          title: p.title,
          arbitrageScore: p.arbitrage_score,
          cost: p.cost,
          supplierUrl: p.supplier_source_url,
          status: p.arbitrage_status,
        })),
        count: selectedProducts.length,
      },
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ 商品取得エラー:', error)

    return NextResponse.json({
      success: false,
      message: `商品取得失敗: ${error.message}`,
      error: error.message,
    }, { status: 500 })
  }
}
