import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * POST /api/shipping/update-tracking
 * T51: トラッキング番号を更新し、ステータスをShippedに変更
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await request.json()

    const { id, tracking_number, notify_customer = false } = body

    if (!id || !tracking_number) {
      return NextResponse.json(
        { error: 'id and tracking_number are required' },
        { status: 400 }
      )
    }

    // トラッキング番号を更新し、ステータスをShippedに変更
    const { data, error } = await supabase
      .from('shipping_queue')
      .update({
        tracking_number,
        queue_status: 'Shipped',
        shipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating tracking number:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 顧客通知が必要な場合（モック実装）
    if (notify_customer) {
      console.log(`📧 [MOCK] Sending shipping notification for order ${data.order_id}`)
      console.log(`   Tracking number: ${tracking_number}`)
      // TODO: 実際のモールAPIと連携する場合はここに実装
      // await sendShippingNotification(data.order_id, tracking_number)
    }

    return NextResponse.json({
      success: true,
      data,
      notification_sent: notify_customer
    })
  } catch (error: any) {
    console.error('Update tracking error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update tracking number' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/shipping/update-tracking
 * 伝票印刷プレビュー用のデータを取得
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'id parameter is required' },
        { status: 400 }
      )
    }

    // 出荷キューデータを取得
    const { data, error } = await supabase
      .from('v_shipping_queue_with_flags')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching shipping data:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // TODO: 受注データと結合して完全な伝票データを生成
    // 現在はモックデータを返す
    const shippingLabel = {
      ...data,
      label_format: 'A4',
      printer_ready: true
    }

    return NextResponse.json(shippingLabel)
  } catch (error: any) {
    console.error('Get shipping label error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get shipping label' },
      { status: 500 }
    )
  }
}
