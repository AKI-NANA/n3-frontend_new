/**
 * Amazon SP-API: Create FBA Inbound Shipment
 * POST /api/amazon-sp/fba/create-shipment
 */

import { NextRequest, NextResponse } from 'next/server'
import { AmazonSPAPIClient } from '@/lib/amazon/sp-api-client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      marketplace = 'US',
      items,
      shipFromAddress,
      shipmentName
    } = body

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'items array is required and must not be empty' },
        { status: 400 }
      )
    }

    if (!shipFromAddress) {
      return NextResponse.json(
        { error: 'shipFromAddress is required' },
        { status: 400 }
      )
    }

    const client = new AmazonSPAPIClient(marketplace)

    // Step 1: Create inbound shipment plan
    const planResponse = await client.createInboundShipmentPlan(
      items,
      shipFromAddress
    )

    if (!planResponse.payload?.InboundShipmentPlans || planResponse.payload.InboundShipmentPlans.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create shipment plan', details: planResponse },
        { status: 500 }
      )
    }

    const plans = planResponse.payload.InboundShipmentPlans

    // Step 2: For each plan, create the actual shipment
    const shipments = []

    for (const plan of plans) {
      const shipmentId = plan.ShipmentId
      const destinationFC = plan.DestinationFulfillmentCenterId

      const shipmentResponse = await client.createInboundShipment(
        shipmentId,
        shipmentName || `Shipment ${shipmentId}`,
        destinationFC,
        plan.Items.map((item: any) => ({
          sellerSKU: item.SellerSKU,
          quantity: item.Quantity
        })),
        shipFromAddress
      )

      shipments.push({
        shipmentId,
        destinationFC,
        status: shipmentResponse.payload?.ShipmentStatus,
        items: plan.Items
      })
    }

    return NextResponse.json({
      success: true,
      plans,
      shipments,
      message: `Created ${shipments.length} FBA inbound shipment(s)`
    })
  } catch (error: any) {
    console.error('Create FBA shipment error:', error)
    return NextResponse.json(
      { error: 'Failed to create FBA shipment', details: error.message },
      { status: 500 }
    )
  }
}
