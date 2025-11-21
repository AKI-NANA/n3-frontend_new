/**
 * 在庫追従システムのスケジューラ
 * 定期的にバッチ処理を実行
 */

// Node-cronの使用を想定
// ※ 本番環境では、Vercel Cron Jobs、AWS EventBridge、またはNode-cronを使用

/**
 * スケジュール設定
 */
export const TRACKING_SCHEDULES = {
  // 通常頻度: 毎日2時に実行
  NORMAL_FREQUENCY: {
    cron: '0 2 * * *',
    description: '通常頻度チェック（毎日2時）',
    frequency: '通常' as const,
    maxItems: 200,
    delayMin: 30,
    delayMax: 120,
  },

  // 高頻度: 30分ごとに実行
  HIGH_FREQUENCY: {
    cron: '*/30 * * * *',
    description: '高頻度チェック（30分ごと）',
    frequency: '高頻度' as const,
    maxItems: 50,
    delayMin: 10,
    delayMax: 30,
  },
}

/**
 * バッチ実行関数（スケジューラから呼び出される）
 */
export async function executeScheduledTracking(scheduleType: keyof typeof TRACKING_SCHEDULES) {
  const schedule = TRACKING_SCHEDULES[scheduleType]

  console.log(`[スケジューラ] ${schedule.description} 開始`)

  try {
    const params = new URLSearchParams({
      check_frequency: schedule.frequency,
      max_items: schedule.maxItems.toString(),
      delay_min: schedule.delayMin.toString(),
      delay_max: schedule.delayMax.toString(),
    })

    // APIを呼び出し
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${apiUrl}/api/inventory-tracking/execute?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()

    console.log(`[スケジューラ] ${schedule.description} 完了`)
    console.log(`  処理: ${result.result.total_processed}件`)
    console.log(`  成功: ${result.result.successful}件`)
    console.log(`  失敗: ${result.result.failed}件`)
    console.log(`  変動: ${result.result.changes_detected}件`)
    console.log(`  切替: ${result.result.sources_switched}件`)
    console.log(`  在庫切れ: ${result.result.all_out_of_stock_count}件`)

    return result
  } catch (error) {
    console.error(`[スケジューラ] ${schedule.description} エラー:`, error)
    throw error
  }
}

/**
 * Node-cronを使用する場合のスケジュール設定例
 *
 * ※ このコードは参考用です。実際の環境に応じて適切なスケジューラを使用してください。
 *
 * @example
 * ```typescript
 * import cron from 'node-cron'
 * import { setupInventoryTrackingScheduler } from '@/lib/scheduler/inventory-tracking-scheduler'
 *
 * // スケジューラを起動
 * setupInventoryTrackingScheduler()
 * ```
 */
export function setupInventoryTrackingScheduler() {
  // 動的importでnode-cronを読み込み（サーバーサイドでのみ使用）
  if (typeof window !== 'undefined') {
    console.warn('スケジューラはサーバーサイドでのみ実行できます')
    return
  }

  try {
    // node-cronがインストールされている場合のみ実行
    const cron = require('node-cron')

    // 通常頻度スケジュール
    cron.schedule(TRACKING_SCHEDULES.NORMAL_FREQUENCY.cron, async () => {
      try {
        await executeScheduledTracking('NORMAL_FREQUENCY')
      } catch (error) {
        console.error('[スケジューラ] 通常頻度チェック失敗:', error)
      }
    })

    // 高頻度スケジュール
    cron.schedule(TRACKING_SCHEDULES.HIGH_FREQUENCY.cron, async () => {
      try {
        await executeScheduledTracking('HIGH_FREQUENCY')
      } catch (error) {
        console.error('[スケジューラ] 高頻度チェック失敗:', error)
      }
    })

    console.log('[スケジューラ] 在庫追従スケジューラが起動しました')
    console.log(`  通常頻度: ${TRACKING_SCHEDULES.NORMAL_FREQUENCY.cron}`)
    console.log(`  高頻度: ${TRACKING_SCHEDULES.HIGH_FREQUENCY.cron}`)
  } catch (error) {
    console.error('[スケジューラ] node-cronのインストールが必要です:', error)
    console.info('npm install node-cron @types/node-cron')
  }
}

/**
 * Vercel Cron Jobsを使用する場合のAPI Route例
 *
 * ファイル: app/api/cron/inventory-tracking/route.ts
 *
 * @example
 * ```typescript
 * import { NextRequest, NextResponse } from 'next/server'
 * import { executeScheduledTracking } from '@/lib/scheduler/inventory-tracking-scheduler'
 *
 * export async function GET(request: NextRequest) {
 *   // Vercel Cron Secretで認証
 *   const authHeader = request.headers.get('authorization')
 *   if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 *   }
 *
 *   const { searchParams } = new URL(request.url)
 *   const type = searchParams.get('type') || 'NORMAL_FREQUENCY'
 *
 *   try {
 *     const result = await executeScheduledTracking(type as any)
 *     return NextResponse.json(result)
 *   } catch (error: any) {
 *     return NextResponse.json({ error: error.message }, { status: 500 })
 *   }
 * }
 * ```
 *
 * vercel.json:
 * ```json
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/inventory-tracking?type=NORMAL_FREQUENCY",
 *       "schedule": "0 2 * * *"
 *     },
 *     {
 *       "path": "/api/cron/inventory-tracking?type=HIGH_FREQUENCY",
 *       "schedule": "* /30 * * * *"
 *     }
 *   ]
 * }
 * ```
 */
