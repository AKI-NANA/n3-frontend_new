/**
 * Arbitrage Opportunity Scanner API
 * POST /api/arbitrage/scan
 * Body: { marketplace: 'US' | 'JP', minScore?: number, maxResults?: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { domesticFBAArbitrage } from '@/lib/services/domestic-fba-arbitrage'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      marketplace = 'US',
      minScore = 40,
      maxResults = 50
    } = body

    if (!['US', 'JP'].includes(marketplace)) {
      return NextResponse.json(
        { error: 'Invalid marketplace. Must be US or JP.' },
        { status: 400 }
      )
    }

    console.log(`🔍 Scanning ${marketplace} marketplace for arbitrage opportunities...`)
    const startTime = Date.now()

    const opportunities = await domesticFBAArbitrage.scanOpportunities(
      marketplace,
      minScore,
      maxResults
    )

    const executionTime = Date.now() - startTime

    // 統計情報
    const stats = {
      total: opportunities.length,
      excellent: opportunities.filter(o => o.recommendation === 'excellent').length,
      good: opportunities.filter(o => o.recommendation === 'good').length,
      moderate: opportunities.filter(o => o.recommendation === 'moderate').length,
      avgProfit: opportunities.length > 0
        ? opportunities.reduce((sum, o) => sum + o.estimatedProfit, 0) / opportunities.length
        : 0,
      totalEstimatedProfit: opportunities.reduce((sum, o) => sum + o.estimatedProfit, 0)
    }

    return NextResponse.json({
      success: true,
      marketplace,
      opportunities,
      stats,
      executionTime,
      message: `Found ${opportunities.length} opportunities in ${executionTime}ms`
    })
  } catch (error: any) {
    console.error('Arbitrage scan error:', error)
    return NextResponse.json(
      { error: 'Failed to scan arbitrage opportunities', details: error.message },
      { status: 500 }
    )
  }
}
