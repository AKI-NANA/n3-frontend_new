/**
 * I3-1: 自動仕入れ決済API
 *
 * Puppeteerまたは仕入れ先APIを利用し、Amazon US/EU/AliExpressへの
 * 自動仕入れ・購入ロジックを実装
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { purchaseFromSupplier } from '@/lib/dropship/api-integrations'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, productSku, supplier, quantity, deliveryAddress } = body

    if (!orderId || !productSku || !supplier) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています' },
        { status: 400 }
      )
    }

    console.log(`[ExecutePayment] 自動仕入れ開始: Order=${orderId}, SKU=${productSku}, Supplier=${supplier}`)

    const supabase = createClient()

    // 商品情報を取得
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('sku', productSku)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      )
    }

    // 自動購入を実行
    const purchaseResult = await purchaseFromSupplier(
      supplier,
      product.asin,
      quantity || 1,
      deliveryAddress || process.env.DROPSHIP_WAREHOUSE_ADDRESS || 'Japan Warehouse'
    )

    if (!purchaseResult.success) {
      // 失敗をログに記録
      await supabase.from('arbitrage_orders').insert({
        order_id: orderId,
        product_sku: productSku,
        supplier,
        status: 'failed',
        error_message: purchaseResult.error,
        created_at: new Date().toISOString(),
      })

      return NextResponse.json(
        {
          success: false,
          error: purchaseResult.error,
        },
        { status: 500 }
      )
    }

    // 成功をデータベースに記録
    const { error: insertError } = await supabase.from('arbitrage_orders').insert({
      order_id: orderId,
      product_sku: productSku,
      supplier,
      purchase_id: purchaseResult.purchaseId,
      tracking_number: purchaseResult.trackingNumber,
      status: 'completed',
      quantity,
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error('[ExecutePayment] DB記録エラー:', insertError)
    }

    // 元の注文ステータスを更新
    await supabase
      .from('orders_v2')
      .update({
        fulfillment_status: 'purchased',
        supplier_purchase_id: purchaseResult.purchaseId,
        tracking_number: purchaseResult.trackingNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    console.log(`[ExecutePayment] 自動仕入れ成功: Purchase=${purchaseResult.purchaseId}`)

    return NextResponse.json({
      success: true,
      purchaseId: purchaseResult.purchaseId,
      trackingNumber: purchaseResult.trackingNumber,
      message: '自動仕入れが完了しました',
    })
  } catch (error) {
    console.error('[ExecutePayment] エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}
