import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { orderId, newStatus } = await request.json()

    if (!orderId || !newStatus) {
      return NextResponse.json(
        {
          success: false,
          error: 'orderId and newStatus are required',
        },
        { status: 400 }
      )
    }

    // ステータスの検証
    const validStatuses = ['Pending', 'Picking', 'Packed', 'Shipped']
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid status',
        },
        { status: 400 }
      )
    }

    // データベース更新
    const { data, error } = await supabase
      .from('shipping_queue')
      .update({
        queue_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .select()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data?.[0] || null,
      message: `Status updated to ${newStatus}`,
    })
  } catch (error: any) {
    console.error('Error updating shipping status:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update shipping status',
      },
      { status: 500 }
    )
  }
}
