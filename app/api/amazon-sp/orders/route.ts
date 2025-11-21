/**
 * Amazon SP-API: Get Orders
 * GET /api/amazon-sp/orders?marketplace=US&days=7
 */

import { NextRequest, NextResponse } from 'next/server'
import { AmazonSPAPIClient } from '@/lib/amazon/sp-api-client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const marketplace = searchParams.get('marketplace') || 'US'
    const days = parseInt(searchParams.get('days') || '7', 10)

    // CreatedAfter日時を計算
    const createdAfter = new Date()
    createdAfter.setDate(createdAfter.getDate() - days)
    const createdAfterISO = createdAfter.toISOString()

    const client = new AmazonSPAPIClient(marketplace as any)

    const response = await client.getOrders(createdAfterISO)

    if (!response.payload) {
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    const orders = response.payload.Orders || []

    // 統計情報
    const stats = {
      totalOrders: orders.length,
      pendingOrders: orders.filter((o: any) => o.OrderStatus === 'Pending').length,
      shippedOrders: orders.filter((o: any) => o.OrderStatus === 'Shipped').length,
      unshippedOrders: orders.filter((o: any) => o.OrderStatus === 'Unshipped').length,
      canceledOrders: orders.filter((o: any) => o.OrderStatus === 'Canceled').length,
      totalRevenue: orders.reduce((sum: number, order: any) => {
        const amount = order.OrderTotal?.Amount ? parseFloat(order.OrderTotal.Amount) : 0
        return sum + amount
      }, 0)
    }

    return NextResponse.json({
      success: true,
      orders,
      stats,
      marketplace,
      period: {
        from: createdAfterISO,
        to: new Date().toISOString(),
        days
      }
    })
  } catch (error: any) {
    console.error('Get orders error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: error.message },
      { status: 500 }
    )
  }
}
