/**
 * Keepa Token Status API
 * GET /api/keepa/token-status
 */

import { NextRequest, NextResponse } from 'next/server'
import { keepaClient } from '@/lib/keepa/keepa-api-client'

export async function GET(request: NextRequest) {
  try {
    const tokenStatus = await keepaClient.getTokenStatus()

    return NextResponse.json(tokenStatus)
  } catch (error) {
    console.error('Keepa token status API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch token status from Keepa' },
      { status: 500 }
    )
  }
}
