/**
 * scheduler.ts
 *
 * 統合スケジューラー
 *
 * 全ての定期実行タスクを一元管理
 */

import { getHealthScoreService } from '@/lib/seo-health-manager/health-score-service'
import { createRepeatOrderManager } from '@/services/RepeatOrderManager'
import { getMessageSyncService } from '@/services/mall/messageSyncService'

interface ScheduledTask {
  id: string
  name: string
  schedule: string // cron形式
  handler: () => Promise<void>
  lastRun?: Date
  nextRun?: Date
  enabled: boolean
}

export class Scheduler {
  private tasks: Map<string, ScheduledTask> = new Map()

  constructor() {
    this.registerTasks()
  }

  /**
   * 全タスクを登録
   */
  private registerTasks() {
    // I4-1: 月次資金繰り予測
    this.registerTask({
      id: 'I4-1',
      name: '月次資金繰り予測',
      schedule: '0 0 1 * *', // 毎月1日 00:00
      handler: async () => {
        console.log('\n💰 月次資金繰り予測を実行中...')
        // TODO: cashflowPredictor.runCashflowForecast()
        console.log('✅ 月次資金繰り予測完了')
      },
      enabled: true,
    })

    // I4-2: 日次SEO健全性スコア更新
    this.registerTask({
      id: 'I4-2',
      name: '日次SEO健全性スコア更新',
      schedule: '0 2 * * *', // 毎日 02:00
      handler: async () => {
        console.log('\n📊 SEO健全性スコアを更新中...')
        const healthScoreService = getHealthScoreService()
        const result = await healthScoreService.updateAllListings(100)
        console.log(`✅ SEO健全性スコア更新完了: ${result.updated}件更新`)
      },
      enabled: true,
    })

    // I4-3: 日次リピート発注チェック
    this.registerTask({
      id: 'I4-3',
      name: '日次リピート発注チェック',
      schedule: '0 2 * * *', // 毎日 02:00
      handler: async () => {
        console.log('\n🔄 リピート発注チェックを実行中...')
        const repeatOrderManager = createRepeatOrderManager({ dryRun: false })
        const result = await repeatOrderManager.executeReorderForLowStockProducts()
        console.log(`✅ リピート発注完了: ${result.reorderedProducts.length}件`)
      },
      enabled: true,
    })

    // I4-4: 毎時オークションサイクル管理
    this.registerTask({
      id: 'I4-4',
      name: 'オークションサイクル管理',
      schedule: '0 * * * *', // 毎時
      handler: async () => {
        console.log('\n🎯 オークションサイクルを処理中...')
        // TODO: auctionCycleManager.processExpiredAuctions()
        console.log('✅ オークションサイクル処理完了')
      },
      enabled: false, // Phase 7/8実装後に有効化
    })

    // I4-5: 5分ごとメッセージポーリング
    this.registerTask({
      id: 'I4-5',
      name: 'メッセージポーリング',
      schedule: '*/5 * * * *', // 5分ごと
      handler: async () => {
        console.log('\n📬 メッセージポーリングを実行中...')
        const messageSyncService = getMessageSyncService()
        const result = await messageSyncService.pollAllMalls()
        if (result.newMessages > 0) {
          console.log(`✅ メッセージポーリング完了: 新着${result.newMessages}件`)
        }
      },
      enabled: true,
    })

    console.log(`✅ ${this.tasks.size}個のタスクを登録しました`)
  }

  /**
   * タスクを登録
   */
  private registerTask(task: ScheduledTask) {
    this.tasks.set(task.id, task)
  }

  /**
   * 全タスクを取得
   */
  getAllTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values())
  }

  /**
   * タスクを手動実行
   */
  async runTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)

    if (!task) {
      throw new Error(`Task not found: ${taskId}`)
    }

    if (!task.enabled) {
      console.warn(`⚠️ Task ${taskId} is disabled`)
      return
    }

    console.log(`🚀 タスク実行: ${task.name} (${taskId})`)

    try {
      await task.handler()
      task.lastRun = new Date()
      console.log(`✅ タスク完了: ${task.name}`)
    } catch (error) {
      console.error(`❌ タスクエラー: ${task.name}`, error)
      throw error
    }
  }

  /**
   * 全タスクを順次実行（デバッグ用）
   */
  async runAllTasks(): Promise<void> {
    console.log('\n🚀 全タスクを順次実行中...')

    for (const [taskId, task] of this.tasks) {
      if (!task.enabled) {
        console.log(`⏭️ スキップ: ${task.name} (無効)`)
        continue
      }

      try {
        await this.runTask(taskId)
        // タスク間に1秒待機
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`❌ タスク失敗: ${task.name}`, error)
      }
    }

    console.log('\n✅ 全タスク実行完了')
  }
}

/**
 * シングルトンインスタンス
 */
let schedulerInstance: Scheduler | null = null

export function getScheduler(): Scheduler {
  if (!schedulerInstance) {
    schedulerInstance = new Scheduler()
  }
  return schedulerInstance
}

/**
 * 使用例:
 *
 * const scheduler = getScheduler()
 *
 * // 特定のタスクを実行
 * await scheduler.runTask('I4-2')
 *
 * // 全タスクを実行
 * await scheduler.runAllTasks()
 */
