/**
 * Amazon受注Webhook
 * POST /api/webhooks/amazon
 *
 * Amazon SP-APIからの受注通知を受信し、在庫更新とリピート発注をトリガー
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRepeatOrderManager } from '@/services/RepeatOrderManager'
import { createClient } from '@/lib/supabase/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface AmazonOrderWebhook {
  orderId: string
  items: Array<{
    sku: string
    productId: string
    quantity: number
    price: number
  }>
  buyer: {
    name: string
    email?: string
  }
  shippingAddress: {
    name: string
    postalCode: string
    address: string
    phone?: string
  }
  orderDate: string
}

/**
 * POST /api/webhooks/amazon
 *
 * Amazon受注を処理
 */
export async function POST(request: NextRequest) {
  try {
    const body: AmazonOrderWebhook = await request.json()

    console.log('📦 Amazon受注Webhookを受信', {
      orderId: body.orderId,
      itemsCount: body.items.length,
    })

    const supabase = createClient()
    const manager = createRepeatOrderManager({ dryRun: false })

    // 各商品を処理
    for (const item of body.items) {
      try {
        // 1. 受注を記録（marketplace_ordersテーブル）
        await supabase.from('marketplace_orders').insert({
          order_id: body.orderId,
          marketplace: 'amazon_jp',
          product_id: item.productId,
          sku: item.sku,
          quantity: item.quantity,
          sale_price: item.price,
          order_status: 'confirmed',
          customer_name: body.buyer.name,
          shipping_address: body.shippingAddress,
          ordered_at: body.orderDate,
        })

        // 2. 在庫更新とリピート発注チェック
        const result = await manager.handleOrderReceived(
          'amazon_jp',
          body.orderId,
          item.productId,
          item.quantity
        )

        console.log(`✅ ${item.sku}: 受注処理完了`, {
          remainingInventory: result.remainingInventory,
          reorderTriggered: result.reorderTriggered,
        })

        // 3. 発送指示書を作成
        const createShipmentResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/fulfillment/create-shipment`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: body.orderId,
              marketplace: 'amazon_jp',
              productId: item.productId,
              quantity: item.quantity,
              shippingAddress: body.shippingAddress,
            }),
          }
        )

        if (!createShipmentResponse.ok) {
          console.error(`❌ ${item.sku}: 発送指示書作成失敗`)
        }

      } catch (error: any) {
        console.error(`❌ ${item.sku}: 処理エラー`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Amazon受注を処理しました: ${body.orderId}`,
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ Amazon受注Webhookエラー:', error)

    return NextResponse.json({
      success: false,
      message: `受注処理失敗: ${error.message}`,
      error: error.message,
    }, { status: 500 })
  }
}
