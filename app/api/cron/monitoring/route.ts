/**
 * Cron Job: 定期的な在庫監視
 * Vercel Cron Jobsまたは外部スケジューラーから呼び出される
 */

import { NextRequest, NextResponse } from 'next/server'
import { runScheduledMonitoring } from '@/lib/inventory-monitoring/real-time-monitor'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5分

/**
 * GET: スケジュール監視実行
 * 認証トークンによる保護
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      return NextResponse.json(
        { error: 'CRON_SECRET not configured' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🕐 Cron Job: Starting scheduled monitoring...')

    // 監視実行
    const result = await runScheduledMonitoring()

    console.log('✅ Cron Job: Monitoring completed')
    console.log(`  - Processed: ${result.processed}`)
    console.log(`  - Changes: ${result.changes}`)
    console.log(`  - Errors: ${result.errors}`)

    return NextResponse.json({
      success: true,
      logId: result.logId,
      processed: result.processed,
      changes: result.changes,
      errors: result.errors,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Cron Job Error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
