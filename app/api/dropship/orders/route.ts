/**
 * 無在庫輸入受注API
 *
 * GET /api/dropship/orders - アクティブな受注を取得
 * POST /api/dropship/orders - 新規受注を作成（手動テスト用）
 */

import { NextRequest, NextResponse } from 'next/server'
import { getActiveOrders, createOrder } from '@/lib/dropship/db'
import { executeDropshipOrderFlow } from '@/lib/dropship/order-processor'
import { getDropshipProducts } from '@/lib/dropship/db'

export async function GET() {
  try {
    const { data: orders, error } = await getActiveOrders()

    if (error) {
      return NextResponse.json(
        { error: '受注取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      orders: orders || [],
      count: orders?.length || 0,
    })
  } catch (error) {
    console.error('[Orders API] エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, marketplace, quantity = 1, customerAddress } = body

    if (!productId || !marketplace) {
      return NextResponse.json(
        { error: 'productIdとmarketplaceが必要です' },
        { status: 400 }
      )
    }

    // 商品を取得
    const { data: products, error: fetchError } = await getDropshipProducts()

    if (fetchError || !products) {
      return NextResponse.json(
        { error: '商品取得に失敗しました' },
        { status: 500 }
      )
    }

    const product = products.find(p => p.id === productId)

    if (!product) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      )
    }

    // 受注を作成
    const orderId = `ORDER_${Date.now()}`

    const order = {
      order_id: orderId,
      marketplace: marketplace as 'Amazon_JP' | 'eBay_JP',
      product_id: productId,
      sku: product.sku,
      quantity,
      customer_address: customerAddress || 'Tokyo, Japan',
      order_date: new Date(),
      fulfillment_status: 'order_received',
    }

    const { data: createdOrder, error: createError } = await createOrder(order)

    if (createError) {
      return NextResponse.json(
        { error: '受注作成に失敗しました' },
        { status: 500 }
      )
    }

    // 受注処理フローを実行（非同期）
    executeDropshipOrderFlow(
      {
        orderId: order.order_id,
        marketplace: order.marketplace,
        productId: order.product_id,
        sku: order.sku,
        quantity: order.quantity,
        customerAddress: order.customer_address || '',
        orderDate: order.order_date,
      },
      product,
      'YOUR_WAREHOUSE_ADDRESS_IN_JAPAN' // 実際の倉庫住所を設定
    ).catch(error => {
      console.error('[Orders API] 受注処理フローエラー:', error)
    })

    return NextResponse.json({
      success: true,
      order: createdOrder,
      message: '受注を作成し、処理フローを開始しました',
    })
  } catch (error) {
    console.error('[Orders API] エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}
