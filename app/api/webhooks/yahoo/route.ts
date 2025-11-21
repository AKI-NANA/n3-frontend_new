/**
 * Yahoo!ショッピング受注Webhook
 * POST /api/webhooks/yahoo
 *
 * Yahoo!ショッピングからの受注通知を受信し、在庫更新とリピート発注をトリガー
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRepeatOrderManager } from '@/services/RepeatOrderManager'
import { createClient } from '@/lib/supabase/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface YahooOrderWebhook {
  OrderId: string
  OrderTime: string
  Item: Array<{
    ItemId: string
    SKU: string
    Quantity: number
    Price: number
  }>
  Ship: {
    Name: string
    ZipCode: string
    Address: string
    Tel?: string
  }
}

/**
 * POST /api/webhooks/yahoo
 *
 * Yahoo!ショッピング受注を処理
 */
export async function POST(request: NextRequest) {
  try {
    const body: YahooOrderWebhook = await request.json()

    console.log('📦 Yahoo!ショッピング受注Webhookを受信', {
      orderId: body.OrderId,
      itemsCount: body.Item.length,
    })

    const supabase = createClient()
    const manager = createRepeatOrderManager({ dryRun: false })

    // 各商品を処理
    for (const item of body.Item) {
      try {
        // SKUから商品情報を取得
        const { data: product } = await supabase
          .from('products_master')
          .select('id')
          .eq('sku', item.SKU)
          .single()

        if (!product) {
          console.error(`❌ 商品が見つかりません: ${item.SKU}`)
          continue
        }

        // 1. 受注を記録
        await supabase.from('marketplace_orders').insert({
          order_id: body.OrderId,
          marketplace: 'yahoo_jp',
          product_id: product.id,
          sku: item.SKU,
          quantity: item.Quantity,
          sale_price: item.Price,
          order_status: 'confirmed',
          customer_name: body.Ship.Name,
          shipping_address: {
            name: body.Ship.Name,
            postalCode: body.Ship.ZipCode,
            address: body.Ship.Address,
            phone: body.Ship.Tel,
          },
          ordered_at: body.OrderTime,
        })

        // 2. 在庫更新とリピート発注チェック
        const result = await manager.handleOrderReceived(
          'yahoo_jp',
          body.OrderId,
          product.id,
          item.Quantity
        )

        console.log(`✅ ${item.SKU}: 受注処理完了`, {
          remainingInventory: result.remainingInventory,
          reorderTriggered: result.reorderTriggered,
        })

        // 3. 発送指示書を作成
        await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/fulfillment/create-shipment`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: body.OrderId,
              marketplace: 'yahoo_jp',
              productId: product.id,
              quantity: item.Quantity,
              shippingAddress: {
                name: body.Ship.Name,
                postalCode: body.Ship.ZipCode,
                address: body.Ship.Address,
                phone: body.Ship.Tel,
              },
            }),
          }
        )

      } catch (error: any) {
        console.error(`❌ ${item.SKU}: 処理エラー`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Yahoo!ショッピング受注を処理しました: ${body.OrderId}`,
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ Yahoo!ショッピング受注Webhookエラー:', error)

    return NextResponse.json({
      success: false,
      message: `受注処理失敗: ${error.message}`,
      error: error.message,
    }, { status: 500 })
  }
}
