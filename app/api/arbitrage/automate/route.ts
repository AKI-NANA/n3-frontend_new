/**
 * Arbitrage Full Automation API
 * POST /api/arbitrage/automate
 * Body: { marketplace: 'US' | 'JP', minScore?: number, maxItems?: number, shipFromAddress: {...} }
 */

import { NextRequest, NextResponse } from 'next/server'
import { domesticFBAArbitrage } from '@/lib/services/domestic-fba-arbitrage'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      marketplace = 'US',
      minScore = 70,
      maxItems = 10,
      shipFromAddress,
      enableAutoPurchase = false // Phase 1.5: 自動購入オプション
    } = body

    if (!['US', 'JP'].includes(marketplace)) {
      return NextResponse.json(
        { error: 'Invalid marketplace. Must be US or JP.' },
        { status: 400 }
      )
    }

    if (!shipFromAddress) {
      return NextResponse.json(
        { error: 'shipFromAddress is required' },
        { status: 400 }
      )
    }

    console.log(`🤖 Starting full automation for ${marketplace}...`)
    console.log(`🔧 Auto-purchase: ${enableAutoPurchase ? 'ENABLED (Phase 1.5)' : 'DISABLED'}`)
    const startTime = Date.now()

    const result = await domesticFBAArbitrage.runFullAutomation(
      marketplace,
      minScore,
      maxItems,
      shipFromAddress,
      enableAutoPurchase // Phase 1.5パラメータ
    )

    const executionTime = Date.now() - startTime

    // 実行ログをDBに保存
    const supabase = createClient()

    await supabase.from('arbitrage_execution_logs').insert({
      marketplace,
      opportunities_found: result.opportunities?.length || 0,
      purchases_made: result.purchases?.length || 0,
      shipments_created: 0,
      status: result.success ? 'success' : 'failed',
      execution_time_ms: executionTime,
      execution_details: result,
      created_at: new Date().toISOString()
    })

    return NextResponse.json({
      ...result,
      executionTime,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Arbitrage automation error:', error)

    // エラーログをDBに保存
    try {
      const supabase = createClient()
      await supabase.from('arbitrage_execution_logs').insert({
        marketplace: 'US',
        status: 'failed',
        error_message: error.message,
        created_at: new Date().toISOString()
      })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    return NextResponse.json(
      { error: 'Failed to run arbitrage automation', details: error.message },
      { status: 500 }
    )
  }
}
