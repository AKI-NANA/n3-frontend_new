/**
 * Amazon SP-API: Get FBA Inventory
 * GET /api/amazon-sp/inventory?marketplace=US
 */

import { NextRequest, NextResponse } from 'next/server'
import { AmazonSPAPIClient } from '@/lib/amazon/sp-api-client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const marketplace = searchParams.get('marketplace') || 'US'

    const client = new AmazonSPAPIClient(marketplace as any)

    const response = await client.getFBAInventorySummaries()

    if (!response.payload) {
      return NextResponse.json(
        { error: 'Failed to fetch inventory' },
        { status: 500 }
      )
    }

    const inventories = response.payload.inventorySummaries || []

    // グループ化と集計
    const summary = {
      totalSKUs: inventories.length,
      totalFulfillableQuantity: inventories.reduce((sum: number, item: any) =>
        sum + (item.inventoryDetails?.fulfillableQuantity || 0), 0),
      totalInboundQuantity: inventories.reduce((sum: number, item: any) =>
        sum + (item.inventoryDetails?.inboundWorkingQuantity || 0) +
              (item.inventoryDetails?.inboundShippedQuantity || 0) +
              (item.inventoryDetails?.inboundReceivingQuantity || 0), 0),
      totalReservedQuantity: inventories.reduce((sum: number, item: any) =>
        sum + (item.inventoryDetails?.reservedQuantity?.totalReservedQuantity || 0), 0)
    }

    return NextResponse.json({
      success: true,
      inventory: inventories,
      summary,
      marketplace
    })
  } catch (error: any) {
    console.error('Get FBA inventory error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch FBA inventory', details: error.message },
      { status: 500 }
    )
  }
}
