/**
 * 発送指示作成API
 * POST /api/fulfillment/create-shipment
 *
 * 受注情報から発送指示書を生成し、倉庫スタッフに通知
 */

import { NextRequest, NextResponse } from 'next/server'
import { createFulfillmentManager } from '@/services/FulfillmentManager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface CreateShipmentRequest {
  orderId: string
  marketplace: 'amazon_jp' | 'yahoo_jp' | 'mercari_c2c' | 'qoo10'
  productId: string
  quantity: number
  shippingAddress: {
    name: string
    postalCode: string
    address: string
    phone?: string
  }
}

/**
 * POST /api/fulfillment/create-shipment
 *
 * 発送指示書を作成
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateShipmentRequest = await request.json()

    if (!body.orderId || !body.marketplace || !body.productId || !body.shippingAddress) {
      return NextResponse.json({
        success: false,
        message: '必須パラメータが不足しています',
      }, { status: 400 })
    }

    console.log('📦 発送指示作成APIが呼び出されました', {
      orderId: body.orderId,
      marketplace: body.marketplace,
    })

    // 環境変数から事業者情報を取得
    const manager = createFulfillmentManager({
      businessName: process.env.BUSINESS_NAME || '事業者名（未設定）',
      warehouseAddress: process.env.WAREHOUSE_ADDRESS || '倉庫住所（未設定）',
      warehouseContactPhone: process.env.WAREHOUSE_PHONE || '連絡先（未設定）',
      enforceBlankPackaging: true,
      enforceOwnInvoice: true,
      dryRun: false,
    })

    // 発送指示書を生成
    const instruction = await manager.createShipmentInstruction(
      body.orderId,
      body.marketplace,
      body.productId,
      body.quantity,
      body.shippingAddress
    )

    // 倉庫スタッフへ通知
    await manager.sendShipmentInstructionToWarehouse(instruction)

    return NextResponse.json({
      success: true,
      message: '発送指示書を作成し、倉庫スタッフに通知しました',
      data: {
        orderId: instruction.orderId,
        sku: instruction.sku,
        status: instruction.status,
        packagingInstructions: instruction.packagingInstructions,
      },
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ 発送指示作成APIエラー:', error)

    return NextResponse.json({
      success: false,
      message: `発送指示作成失敗: ${error.message}`,
      error: error.message,
    }, { status: 500 })
  }
}
