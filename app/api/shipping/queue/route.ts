import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { data, error } = await supabase
      .from('shipping_queue')
      .select(`
        id,
        order_id,
        queue_status,
        tracking_number,
        is_delayed_risk,
        expected_ship_date,
        delay_reason,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    // データを Kanban ボード形式に変換
    const kanbanData = {
      Pending: [],
      Picking: [],
      Packed: [],
      Shipped: [],
    }

    // モックデータ（実際はDBから取得したデータを変換）
    const mockData = {
      Pending: [
        {
          id: '1',
          orderId: 'OR-1001',
          marketplace: 'eBay',
          product: 'Vintage Watch',
          isSourced: true,
          isDelayedRisk: false,
          expectedDate: '2025-12-01',
        },
        {
          id: '2',
          orderId: 'OR-1002',
          marketplace: 'Shopee',
          product: 'Toy Figure Set',
          isSourced: false,
          isDelayedRisk: true,
          expectedDate: '2025-11-28',
        },
      ],
      Picking: [
        {
          id: '3',
          orderId: 'OR-1003',
          marketplace: 'BUYMA',
          product: 'Luxury Handbag',
          isSourced: true,
          isDelayedRisk: false,
          expectedDate: '2025-11-26',
        },
      ],
      Packed: [],
      Shipped: [],
    }

    return NextResponse.json({
      success: true,
      data: mockData, // 実際はDBデータを変換したkanbanDataを返す
      count: data?.length || 0,
    })
  } catch (error: any) {
    console.error('Error fetching shipping queue:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch shipping queue',
      },
      { status: 500 }
    )
  }
}
