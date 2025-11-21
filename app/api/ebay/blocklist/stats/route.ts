/**
 * GET /api/ebay/blocklist/stats
 * 統計情報を取得
 */

import { NextRequest, NextResponse } from 'next/server'
import { BlocklistStatsService } from '@/lib/services/ebay-blocklist-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const stats = await BlocklistStatsService.getStats(userId || undefined)

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Failed to get stats:', error)
    return NextResponse.json(
      {
        error: 'Failed to get stats',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
