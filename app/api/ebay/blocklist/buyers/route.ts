/**
 * GET /api/ebay/blocklist/buyers
 * 承認済みブロックバイヤーを取得
 */

import { NextRequest, NextResponse } from 'next/server'
import { BlockedBuyerService } from '@/lib/services/ebay-blocklist-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'approved'

    let buyers
    if (status === 'pending') {
      buyers = await BlockedBuyerService.getPendingBuyers()
    } else if (status === 'approved') {
      buyers = await BlockedBuyerService.getApprovedBuyers()
    } else {
      buyers = await BlockedBuyerService.getApprovedBuyers()
    }

    return NextResponse.json({
      buyers,
      total: buyers.length,
    })
  } catch (error) {
    console.error('Failed to get buyers:', error)
    return NextResponse.json(
      {
        error: 'Failed to get buyers',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
