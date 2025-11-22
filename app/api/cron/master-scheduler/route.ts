/**
 * マスタースケジューラー API
 * GET /api/cron/master-scheduler
 *
 * 全ての定期実行タスクを統合管理
 */

import { NextRequest, NextResponse } from 'next/server'
import { getScheduler } from '@/services/cron/scheduler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/master-scheduler?task={taskId}
 *
 * 特定のタスクまたは全タスクを実行
 */
export async function GET(request: NextRequest) {
  try {
    // セキュリティ: cron secret keyの検証
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ 不正なcronリクエスト')
      return NextResponse.json({
        success: false,
        message: '認証失敗',
      }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const taskId = searchParams.get('task')

    const scheduler = getScheduler()

    console.log('\n🚀 ========================================')
    console.log('   マスタースケジューラー実行')
    console.log('========================================\n')

    if (taskId) {
      // 特定のタスクを実行
      await scheduler.runTask(taskId)

      return NextResponse.json({
        success: true,
        message: `タスク ${taskId} を実行しました`,
      })

    } else {
      // 全タスクを実行
      await scheduler.runAllTasks()

      return NextResponse.json({
        success: true,
        message: '全タスクを実行しました',
      })
    }

  } catch (error: any) {
    console.error('❌ マスタースケジューラーエラー:', error)

    return NextResponse.json({
      success: false,
      message: `スケジューラー失敗: ${error.message}`,
      error: error.message,
    }, { status: 500 })
  }
}
