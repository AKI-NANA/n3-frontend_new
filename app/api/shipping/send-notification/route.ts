import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { orderId, marketplace, trackingNumber } = await request.json()

    if (!orderId || !marketplace || !trackingNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'orderId, marketplace, and trackingNumber are required',
        },
        { status: 400 }
      )
    }

    // 実際の実装では、各マーケットプレイスのAPIを呼び出して出荷通知を送信
    // ここではモックとして、ログを記録するだけ
    console.log(`Sending shipment notification for order ${orderId} to ${marketplace}`)
    console.log(`Tracking number: ${trackingNumber}`)

    // マーケットプレイス別の処理
    switch (marketplace) {
      case 'eBay':
        // eBay API呼び出し
        // await sendEbayShipmentNotification(orderId, trackingNumber)
        break
      case 'Shopee':
        // Shopee API呼び出し
        // await sendShopeeShipmentNotification(orderId, trackingNumber)
        break
      case 'BUYMA':
        // BUYMA API呼び出し
        // await sendBuymaShipmentNotification(orderId, trackingNumber)
        break
      default:
        console.log(`Unknown marketplace: ${marketplace}`)
    }

    // 通知履歴をDBに記録
    const { error: logError } = await supabase.from('shipment_notifications').insert({
      order_id: orderId,
      marketplace,
      tracking_number: trackingNumber,
      notification_type: 'shipment',
      status: 'sent',
      sent_at: new Date().toISOString(),
    })

    if (logError) {
      console.error('Error logging notification:', logError)
      // 通知ログの失敗は致命的ではないので続行
    }

    return NextResponse.json({
      success: true,
      message: 'Shipment notification sent successfully',
    })
  } catch (error: any) {
    console.error('Error sending shipment notification:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send shipment notification',
      },
      { status: 500 }
    )
  }
}
