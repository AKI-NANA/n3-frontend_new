/**
 * Arbitrage Monitoring API (for scheduled jobs)
 * GET /api/arbitrage/monitor?marketplace=US
 */

import { NextRequest, NextResponse } from 'next/server'
import { domesticFBAArbitrage } from '@/lib/services/domestic-fba-arbitrage'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const marketplace = (searchParams.get('marketplace') || 'US') as 'US' | 'JP'

    if (!['US', 'JP'].includes(marketplace)) {
      return NextResponse.json(
        { error: 'Invalid marketplace. Must be US or JP.' },
        { status: 400 }
      )
    }

    console.log(`📡 Monitoring ${marketplace} for high-priority opportunities...`)

    const result = await domesticFBAArbitrage.monitorOpportunities(marketplace)

    return NextResponse.json({
      success: true,
      marketplace,
      ...result,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Arbitrage monitoring error:', error)
    return NextResponse.json(
      { error: 'Failed to monitor arbitrage opportunities', details: error.message },
      { status: 500 }
    )
  }
}
