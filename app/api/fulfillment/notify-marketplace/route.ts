/**
 * モール発送通知API
 * POST /api/fulfillment/notify-marketplace
 *
 * 発送完了後、モールAPIに自社名義で発送通知を送信
 */

import { NextRequest, NextResponse } from 'next/server'
import { createFulfillmentManager, type ShipmentInstruction } from '@/services/FulfillmentManager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface NotifyMarketplaceRequest {
  orderId: string
  trackingNumber: string
  shippingCarrier: string
}

/**
 * POST /api/fulfillment/notify-marketplace
 *
 * モールAPIに発送通知を送信（自社名義で上書き）
 */
export async function POST(request: NextRequest) {
  try {
    const body: NotifyMarketplaceRequest = await request.json()

    if (!body.orderId || !body.trackingNumber || !body.shippingCarrier) {
      return NextResponse.json({
        success: false,
        message: '必須パラメータが不足しています',
      }, { status: 400 })
    }

    console.log('📤 モール発送通知APIが呼び出されました', {
      orderId: body.orderId,
      trackingNumber: body.trackingNumber,
    })

    const manager = createFulfillmentManager({
      businessName: process.env.BUSINESS_NAME || '事業者名（未設定）',
      warehouseAddress: process.env.WAREHOUSE_ADDRESS || '倉庫住所（未設定）',
      warehouseContactPhone: process.env.WAREHOUSE_PHONE || '連絡先（未設定）',
      enforceBlankPackaging: true,
      enforceOwnInvoice: true,
      dryRun: false,
    })

    // 発送指示書をデータベースから取得（簡易実装）
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    const { data: instructionData, error } = await supabase
      .from('shipment_instructions')
      .select('*')
      .eq('order_id', body.orderId)
      .single()

    if (error || !instructionData) {
      throw new Error(`発送指示書が見つかりません: ${body.orderId}`)
    }

    const instruction: ShipmentInstruction = {
      orderId: instructionData.order_id,
      marketplace: instructionData.marketplace,
      productId: instructionData.product_id,
      sku: instructionData.sku,
      productName: instructionData.product_name,
      quantity: instructionData.quantity,
      shippingAddress: instructionData.shipping_address,
      packagingInstructions: instructionData.packaging_instructions,
      status: instructionData.status,
      createdAt: instructionData.created_at,
    }

    // モールAPIに自社名義で通知
    await manager.notifyMarketplaceWithOwnInfo(
      instruction,
      body.trackingNumber,
      body.shippingCarrier
    )

    return NextResponse.json({
      success: true,
      message: 'モールAPIに発送通知を送信しました',
      data: {
        orderId: body.orderId,
        trackingNumber: body.trackingNumber,
        shippingCarrier: body.shippingCarrier,
      },
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ モール発送通知APIエラー:', error)

    return NextResponse.json({
      success: false,
      message: `モール発送通知失敗: ${error.message}`,
      error: error.message,
    }, { status: 500 })
  }
}
