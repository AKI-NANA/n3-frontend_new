/**
 * 統一スケジューラ手動実行API
 */

import { NextRequest, NextResponse } from 'next/server'
import { executeTask, SCHEDULED_TASKS } from '@/services/cron/scheduler'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { task_id } = body

    if (!task_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'task_id is required',
        },
        { status: 400 }
      )
    }

    console.log(`[API] スケジューラタスク実行: ${task_id}`)

    const result = await executeTask(task_id)

    return NextResponse.json({
      success: result.success,
      task_id,
      result: result.result,
      duration: result.duration,
      error: result.error,
    })
  } catch (error: any) {
    console.error('[API] スケジューラ実行エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const task_id = searchParams.get('task_id')

  if (!task_id) {
    // 全タスク一覧を返す
    return NextResponse.json({
      success: true,
      tasks: SCHEDULED_TASKS.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        schedule: t.schedule,
        enabled: t.enabled,
      })),
    })
  }

  // 特定タスクの実行
  try {
    const result = await executeTask(task_id)

    return NextResponse.json({
      success: result.success,
      task_id,
      result: result.result,
      duration: result.duration,
      error: result.error,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}
