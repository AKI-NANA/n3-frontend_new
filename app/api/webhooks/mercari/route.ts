/**
 * メルカリ受注Webhook
 * POST /api/webhooks/mercari
 *
 * メルカリからの受注通知を受信し、在庫更新とリピート発注をトリガー
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRepeatOrderManager } from '@/services/RepeatOrderManager'
import { createClient } from '@/lib/supabase/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface MercariOrderWebhook {
  transactionId: string
  itemId: string
  sku?: string
  buyerName: string
  shippingAddress: {
    name: string
    postalCode: string
    prefecture: string
    city: string
    addressLine: string
    phone?: string
  }
  purchasedAt: string
}

/**
 * POST /api/webhooks/mercari
 *
 * メルカリ受注を処理
 */
export async function POST(request: NextRequest) {
  try {
    const body: MercariOrderWebhook = await request.json()

    console.log('📦 メルカリ受注Webhookを受信', {
      transactionId: body.transactionId,
      itemId: body.itemId,
    })

    const supabase = createClient()
    const manager = createRepeatOrderManager({ dryRun: false })

    // SKUまたはitemIdから商品情報を取得
    let query = supabase.from('products_master').select('id, sku')

    if (body.sku) {
      query = query.eq('sku', body.sku)
    } else {
      query = query.eq('mercari_c2c_listing_id', body.itemId)
    }

    const { data: product } = await query.single()

    if (!product) {
      console.error(`❌ 商品が見つかりません: ${body.sku || body.itemId}`)
      return NextResponse.json({
        success: false,
        message: '商品が見つかりません',
      }, { status: 404 })
    }

    // 1. 受注を記録
    await supabase.from('marketplace_orders').insert({
      order_id: body.transactionId,
      marketplace: 'mercari_c2c',
      product_id: product.id,
      sku: product.sku,
      quantity: 1,
      order_status: 'confirmed',
      customer_name: body.buyerName,
      shipping_address: {
        name: body.shippingAddress.name,
        postalCode: body.shippingAddress.postalCode,
        address: `${body.shippingAddress.prefecture}${body.shippingAddress.city}${body.shippingAddress.addressLine}`,
        phone: body.shippingAddress.phone,
      },
      ordered_at: body.purchasedAt,
    })

    // 2. 在庫更新とリピート発注チェック
    const result = await manager.handleOrderReceived(
      'mercari_c2c',
      body.transactionId,
      product.id,
      1
    )

    console.log(`✅ ${product.sku}: 受注処理完了`, {
      remainingInventory: result.remainingInventory,
      reorderTriggered: result.reorderTriggered,
    })

    // 3. 発送指示書を作成（メルカリは即日発送優先）
    await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/fulfillment/create-shipment`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: body.transactionId,
          marketplace: 'mercari_c2c',
          productId: product.id,
          quantity: 1,
          shippingAddress: {
            name: body.shippingAddress.name,
            postalCode: body.shippingAddress.postalCode,
            address: `${body.shippingAddress.prefecture}${body.shippingAddress.city}${body.shippingAddress.addressLine}`,
            phone: body.shippingAddress.phone,
          },
        }),
      }
    )

    return NextResponse.json({
      success: true,
      message: `メルカリ受注を処理しました: ${body.transactionId}`,
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ メルカリ受注Webhookエラー:', error)

    return NextResponse.json({
      success: false,
      message: `受注処理失敗: ${error.message}`,
      error: error.message,
    }, { status: 500 })
  }
}
