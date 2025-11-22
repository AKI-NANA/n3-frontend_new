import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * GET /api/shipping/queue
 * 出荷キュー一覧を取得（遅延フラグ付き）
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // フィルター用

    // ビューから取得（遅延フラグを含む）
    let query = supabase.from('v_shipping_queue_with_flags').select('*')

    if (status) {
      query = query.eq('queue_status', status)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching shipping queue:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Get shipping queue error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get shipping queue' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/shipping/queue
 * 新規出荷キューを作成
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await request.json()

    const { order_id, queue_status = 'Pending', shipping_method_id } = body

    if (!order_id) {
      return NextResponse.json(
        { error: 'order_id is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('shipping_queue')
      .insert({
        order_id,
        queue_status,
        shipping_method_id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating shipping queue:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Create shipping queue error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create shipping queue' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/shipping/queue
 * 出荷キューのステータスを更新（D&D時に呼び出される）
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await request.json()

    const { id, queue_status, picker_user_id } = body

    if (!id || !queue_status) {
      return NextResponse.json(
        { error: 'id and queue_status are required' },
        { status: 400 }
      )
    }

    const updateData: any = {
      queue_status,
      updated_at: new Date().toISOString()
    }

    if (picker_user_id) {
      updateData.picker_user_id = picker_user_id
    }

    // Shippedステータスに変更された場合、出荷日時を記録
    if (queue_status === 'Shipped') {
      updateData.shipped_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('shipping_queue')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating shipping queue:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Update shipping queue error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update shipping queue' },
      { status: 500 }
    )
  }
}
