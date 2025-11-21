/**
 * POST /api/ebay/blocklist/approve
 * 報告を承認
 */

import { NextRequest, NextResponse } from 'next/server'
import { BuyerReportService } from '@/lib/services/ebay-blocklist-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reportId, reviewedBy, reviewNotes } = body

    if (!reportId || !reviewedBy) {
      return NextResponse.json(
        { error: 'Report ID and reviewer ID are required' },
        { status: 400 }
      )
    }

    const success = await BuyerReportService.approveReport(
      reportId,
      reviewedBy,
      reviewNotes
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to approve report' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Report approved and buyer added to blocklist',
    })
  } catch (error) {
    console.error('Failed to approve report:', error)
    return NextResponse.json(
      {
        error: 'Failed to approve report',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
