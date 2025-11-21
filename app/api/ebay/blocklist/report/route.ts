/**
 * POST /api/ebay/blocklist/report
 * バイヤーを報告
 */

import { NextRequest, NextResponse } from 'next/server'
import { BuyerReportService } from '@/lib/services/ebay-blocklist-service'
import { ReportBuyerForm } from '@/types/ebay-blocklist'

export async function POST(request: NextRequest) {
  try {
    // ユーザー認証を確認
    // const session = await getServerSession()
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }
    // const userId = session.user.id

    const body = await request.json()
    const { userId, ...formData } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // バリデーション
    if (!formData.buyer_username || !formData.reason) {
      return NextResponse.json(
        { error: 'Buyer username and reason are required' },
        { status: 400 }
      )
    }

    const reportForm: ReportBuyerForm = {
      buyer_username: formData.buyer_username,
      reason: formData.reason,
      severity: formData.severity || 'medium',
      evidence: formData.evidence,
    }

    const report = await BuyerReportService.createReport(reportForm, userId)

    if (!report) {
      return NextResponse.json(
        { error: 'Failed to create report' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      report,
    })
  } catch (error) {
    console.error('Failed to create report:', error)
    return NextResponse.json(
      {
        error: 'Failed to create report',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ebay/blocklist/report
 * ペンディング中の報告を取得
 */
export async function GET(request: NextRequest) {
  try {
    const reports = await BuyerReportService.getPendingReports()

    return NextResponse.json({
      reports,
      total: reports.length,
    })
  } catch (error) {
    console.error('Failed to get reports:', error)
    return NextResponse.json(
      {
        error: 'Failed to get reports',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
