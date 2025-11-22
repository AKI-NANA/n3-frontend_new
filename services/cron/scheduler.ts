/**
 * 統一スケジューラ - 全ての定期タスクを一元管理
 */

import { runDailyCheck } from './RepeatOrderManager'
import { updateAllListings } from './healthScoreService'
import { processExpiredAuctions } from './auctionCycleManager'
import { pollAllMalls } from './messageSyncService'
import { trackInventoryBatch } from '@/services/InventoryTracker'
import { runInventorySyncWorker } from '@/services/InventorySyncWorker'

export interface ScheduledTask {
  id: string
  name: string
  description: string
  schedule: string
  handler: () => Promise<any>
  enabled: boolean
}

/**
 * スケジュールタスクの定義
 */
export const SCHEDULED_TASKS: ScheduledTask[] = [
  // I4-1: 自動仕入れ（毎日2時）
  {
    id: 'repeat-order-daily',
    name: '自動仕入れチェック',
    description: 'ハイブリッド無在庫戦略: 在庫閾値（3個以下）の商品を検知し、自動仕入れをトリガー',
    schedule: '0 2 * * *',
    handler: runDailyCheck,
    enabled: true,
  },

  // I4-2: SEO健全性スコア更新（毎日2時）
  {
    id: 'health-score-daily',
    name: 'SEO健全性スコア更新',
    description: 'AI改善提案を含む、全商品のSEO健全性スコアを更新',
    schedule: '0 2 * * *',
    handler: updateAllListings,
    enabled: true,
  },

  // I4-3: 在庫追従 - 通常頻度（毎日2時）
  {
    id: 'inventory-tracking-normal',
    name: '在庫追従（通常頻度）',
    description: '通常頻度の商品在庫を追従し、URL自動切替を実行',
    schedule: '0 2 * * *',
    handler: async () => {
      return await trackInventoryBatch({
        max_items: 200,
        check_frequency: '通常',
        delay_min_seconds: 30,
        delay_max_seconds: 120,
      })
    },
    enabled: true,
  },

  // I4-3: 在庫追従 - 高頻度（30分ごと）
  {
    id: 'inventory-tracking-high',
    name: '在庫追従（高頻度）',
    description: '高頻度設定の商品（Shopeeセール中など）の在庫を追従',
    schedule: '*/30 * * * *',
    handler: async () => {
      return await trackInventoryBatch({
        max_items: 50,
        check_frequency: '高頻度',
        delay_min_seconds: 10,
        delay_max_seconds: 30,
      })
    },
    enabled: true,
  },

  // I4-4: オークション終了処理（毎時）
  {
    id: 'auction-cycle-hourly',
    name: 'オークション終了処理',
    description: 'オークション終了品の自動再出品/定額切替',
    schedule: '0 * * * *',
    handler: processExpiredAuctions,
    enabled: true,
  },

  // I4-5: メッセージポーリング（5分ごと）
  {
    id: 'message-poll-5min',
    name: 'メッセージポーリング',
    description: '各モールからメッセージを取得し、AI緊急度判定を実行',
    schedule: '*/5 * * * *',
    handler: pollAllMalls,
    enabled: true,
  },

  // 在庫同期ワーカー（5分ごと）
  {
    id: 'inventory-sync-worker',
    name: '在庫同期ワーカー',
    description: 'inventory_sync_queue を処理し、各モールに在庫・価格を同期',
    schedule: '*/5 * * * *',
    handler: async () => {
      return await runInventorySyncWorker({
        maxItems: 50,
        delayMs: 1000,
      })
    },
    enabled: true,
  },
]

/**
 * タスクを手動実行
 */
export async function executeTask(taskId: string): Promise<any> {
  const task = SCHEDULED_TASKS.find((t) => t.id === taskId)

  if (!task) {
    throw new Error(`タスクが見つかりません: ${taskId}`)
  }

  if (!task.enabled) {
    throw new Error(`タスクは無効化されています: ${taskId}`)
  }

  console.log(`[Scheduler] タスク実行: ${task.name}`)

  const startTime = Date.now()

  try {
    const result = await task.handler()
    const duration = Date.now() - startTime

    console.log(`[Scheduler] タスク完了: ${task.name} (${duration}ms)`)

    return {
      success: true,
      task: task.name,
      result,
      duration,
    }
  } catch (error: any) {
    const duration = Date.now() - startTime

    console.error(`[Scheduler] タスク失敗: ${task.name}`, error)

    return {
      success: false,
      task: task.name,
      error: error.message,
      duration,
    }
  }
}

/**
 * スケジュールに基づいてタスクを実行（Node-cron用）
 */
export function setupScheduler() {
  if (typeof window !== 'undefined') {
    console.warn('[Scheduler] スケジューラはサーバーサイドでのみ実行できます')
    return
  }

  try {
    const cron = require('node-cron')

    for (const task of SCHEDULED_TASKS) {
      if (!task.enabled) {
        console.log(`[Scheduler] スキップ（無効）: ${task.name}`)
        continue
      }

      cron.schedule(task.schedule, async () => {
        console.log(`[Scheduler] スケジュール実行: ${task.name}`)
        await executeTask(task.id)
      })

      console.log(`[Scheduler] 登録: ${task.name} (${task.schedule})`)
    }

    console.log(`[Scheduler] ${SCHEDULED_TASKS.filter((t) => t.enabled).length}件のタスクを登録しました`)
  } catch (error) {
    console.error('[Scheduler] node-cronのインストールが必要です:', error)
    console.info('npm install node-cron @types/node-cron')
  }
}

/**
 * 全タスクの状態を取得
 */
export function getSchedulerStatus() {
  return {
    total_tasks: SCHEDULED_TASKS.length,
    enabled_tasks: SCHEDULED_TASKS.filter((t) => t.enabled).length,
    disabled_tasks: SCHEDULED_TASKS.filter((t) => !t.enabled).length,
    tasks: SCHEDULED_TASKS.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      schedule: t.schedule,
      enabled: t.enabled,
    })),
  }
}
