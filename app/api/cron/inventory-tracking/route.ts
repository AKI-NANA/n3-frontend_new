/**
 * Vercel Cron Jobs用のエンドポイント
 * 在庫追従スケジューラ
 */

import { NextRequest, NextResponse } from 'next/server'
import { executeScheduledTracking, TRACKING_SCHEDULES } from '@/lib/scheduler/inventory-tracking-scheduler'

export async function GET(request: NextRequest) {
  // Vercel Cron Secretで認証（本番環境）
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const { searchParams } = new URL(request.url)
  const type = (searchParams.get('type') || 'NORMAL_FREQUENCY') as keyof typeof TRACKING_SCHEDULES

  if (!TRACKING_SCHEDULES[type]) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${Object.keys(TRACKING_SCHEDULES).join(', ')}` },
      { status: 400 }
    )
  }

  try {
    console.log(`[Cron] 在庫追従スケジューラ実行: ${type}`)
    const result = await executeScheduledTracking(type)

    return NextResponse.json({
      success: true,
      type,
      schedule: TRACKING_SCHEDULES[type].description,
      result,
    })
  } catch (error: any) {
    console.error(`[Cron] 在庫追従スケジューラエラー:`, error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
