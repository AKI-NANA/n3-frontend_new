import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { orderId, trackingNumber } = await request.json()

    if (!orderId || !trackingNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'orderId and trackingNumber are required',
        },
        { status: 400 }
      )
    }

    // データベース更新
    const { data, error } = await supabase
      .from('shipping_queue')
      .update({
        tracking_number: trackingNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .select()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data?.[0] || null,
      message: 'Tracking number updated successfully',
    })
  } catch (error: any) {
    console.error('Error updating tracking number:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update tracking number',
      },
      { status: 500 }
    )
  }
}
