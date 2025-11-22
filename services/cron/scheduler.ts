// scheduler.ts: スケジューラー/Cronジョブサービス (I4)

import { CronJob } from "cron";

// ジョブ実行結果
export interface JobExecutionResult {
  jobId: string;
  status: "SUCCESS" | "FAILED" | "RUNNING";
  startTime: Date;
  endTime?: Date;
  duration?: number; // ミリ秒
  error?: string;
  metadata?: any;
}

// スケジュールジョブ定義
export interface ScheduledJob {
  id: string;
  name: string;
  schedule: string; // Cron式
  handler: () => Promise<void>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  lastResult?: JobExecutionResult;
}

/**
 * スケジューラーサービス
 */
export class Scheduler {
  private jobs: Map<string, { job: CronJob; config: ScheduledJob }>;
  private executionHistory: JobExecutionResult[];
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 100) {
    this.jobs = new Map();
    this.executionHistory = [];
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * ジョブを登録
   */
  registerJob(config: ScheduledJob): void {
    if (this.jobs.has(config.id)) {
      console.warn(`Job ${config.id} is already registered. Skipping.`);
      return;
    }

    const cronJob = new CronJob(
      config.schedule,
      async () => {
        await this.executeJob(config);
      },
      null,
      config.enabled,
      "Asia/Tokyo" // タイムゾーン
    );

    this.jobs.set(config.id, { job: cronJob, config });

    console.log(
      `Registered job: ${config.name} (${config.id}) - Schedule: ${config.schedule}`
    );
  }

  /**
   * ジョブを実行
   */
  private async executeJob(config: ScheduledJob): Promise<void> {
    const result: JobExecutionResult = {
      jobId: config.id,
      status: "RUNNING",
      startTime: new Date(),
    };

    console.log(`[${config.id}] Starting job: ${config.name}`);

    try {
      await config.handler();

      result.status = "SUCCESS";
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();

      console.log(
        `[${config.id}] Job completed successfully in ${result.duration}ms`
      );
    } catch (error) {
      result.status = "FAILED";
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();
      result.error =
        error instanceof Error ? error.message : String(error);

      console.error(`[${config.id}] Job failed:`, error);
    }

    // 実行履歴を保存
    this.addExecutionHistory(result);

    // 設定を更新
    config.lastRun = result.startTime;
    config.lastResult = result;
  }

  /**
   * 実行履歴を追加
   */
  private addExecutionHistory(result: JobExecutionResult): void {
    this.executionHistory.unshift(result);

    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(
        0,
        this.maxHistorySize
      );
    }
  }

  /**
   * ジョブを開始
   */
  startJob(jobId: string): void {
    const entry = this.jobs.get(jobId);
    if (!entry) {
      console.error(`Job ${jobId} not found`);
      return;
    }

    entry.job.start();
    entry.config.enabled = true;
    console.log(`Started job: ${jobId}`);
  }

  /**
   * ジョブを停止
   */
  stopJob(jobId: string): void {
    const entry = this.jobs.get(jobId);
    if (!entry) {
      console.error(`Job ${jobId} not found`);
      return;
    }

    entry.job.stop();
    entry.config.enabled = false;
    console.log(`Stopped job: ${jobId}`);
  }

  /**
   * すべてのジョブを開始
   */
  startAll(): void {
    for (const [jobId, entry] of this.jobs.entries()) {
      if (entry.config.enabled) {
        entry.job.start();
        console.log(`Started job: ${jobId}`);
      }
    }
  }

  /**
   * すべてのジョブを停止
   */
  stopAll(): void {
    for (const [jobId, entry] of this.jobs.entries()) {
      entry.job.stop();
      console.log(`Stopped job: ${jobId}`);
    }
  }

  /**
   * ジョブを手動実行
   */
  async runJobNow(jobId: string): Promise<void> {
    const entry = this.jobs.get(jobId);
    if (!entry) {
      console.error(`Job ${jobId} not found`);
      return;
    }

    await this.executeJob(entry.config);
  }

  /**
   * ジョブのステータス取得
   */
  getJobStatus(jobId: string): ScheduledJob | null {
    const entry = this.jobs.get(jobId);
    return entry ? entry.config : null;
  }

  /**
   * すべてのジョブのステータス取得
   */
  getAllJobStatuses(): ScheduledJob[] {
    return Array.from(this.jobs.values()).map((entry) => entry.config);
  }

  /**
   * 実行履歴取得
   */
  getExecutionHistory(jobId?: string, limit?: number): JobExecutionResult[] {
    let history = this.executionHistory;

    if (jobId) {
      history = history.filter((result) => result.jobId === jobId);
    }

    if (limit) {
      history = history.slice(0, limit);
    }

    return history;
  }
}

// グローバルスケジューラーインスタンス
let globalScheduler: Scheduler | null = null;

/**
 * グローバルスケジューラーの取得
 */
export function getScheduler(): Scheduler {
  if (!globalScheduler) {
    globalScheduler = new Scheduler();
  }
  return globalScheduler;
}

/**
 * I4: 定期実行ジョブの登録
 */
export function registerScheduledJobs(): void {
  const scheduler = getScheduler();

  // I4-1: 毎月1日 00:00 - 資金繰り予測
  scheduler.registerJob({
    id: "cashflow-forecast",
    name: "Monthly Cashflow Forecast",
    schedule: "0 0 1 * *", // 毎月1日 00:00
    enabled: true,
    handler: async () => {
      console.log("Running cashflow forecast...");
      // cashflowPredictor.runCashflowForecast() を呼び出し
      // 実際の実装では適切なサービスをインポートして実行
    },
  });

  // I4-2: 毎日 02:00 - SEO健全性スコア更新
  scheduler.registerJob({
    id: "health-score-update",
    name: "Daily Health Score Update",
    schedule: "0 2 * * *", // 毎日 02:00
    enabled: true,
    handler: async () => {
      console.log("Updating health scores for all listings...");
      // healthScoreService.updateAllListings() を呼び出し
      // I2-2のAI改善提案もトリガー
    },
  });

  // I4-3: 毎時 - オークションサイクル管理
  scheduler.registerJob({
    id: "auction-cycle-manager",
    name: "Hourly Auction Cycle Processing",
    schedule: "0 * * * *", // 毎時
    enabled: true,
    handler: async () => {
      console.log("Processing expired auctions...");
      // auctionCycleManager.processExpiredAuctions() を呼び出し
      // 0ドル終了の自動定額切替、在庫ロス時の即時終了を実行
    },
  });

  // I4-4: 5分ごと - メッセージポーリング
  scheduler.registerJob({
    id: "message-polling",
    name: "Message Polling from All Malls",
    schedule: "*/5 * * * *", // 5分ごと
    enabled: true,
    handler: async () => {
      console.log("Polling messages from all marketplaces...");
      // messageSyncService.pollAllMalls() を呼び出し
      // 新着メッセージ検知次第、I2-1のAI緊急度判定をトリガー
    },
  });

  // I4-5: 毎日 01:00 - 在庫同期
  scheduler.registerJob({
    id: "inventory-sync",
    name: "Daily Global Inventory Sync",
    schedule: "0 1 * * *", // 毎日 01:00
    enabled: true,
    handler: async () => {
      console.log("Running global inventory sync across 8 malls...");
      // inventorySyncService.runGlobalSync() を呼び出し
      // 全8モール間の在庫と価格を同期
    },
  });

  // 追加の便利なジョブ

  // 毎日 03:00 - データベースクリーンアップ
  scheduler.registerJob({
    id: "database-cleanup",
    name: "Daily Database Cleanup",
    schedule: "0 3 * * *", // 毎日 03:00
    enabled: true,
    handler: async () => {
      console.log("Running database cleanup...");
      // 古いログやキャッシュデータの削除
    },
  });

  // 毎週月曜 00:00 - 週次レポート生成
  scheduler.registerJob({
    id: "weekly-report",
    name: "Weekly Performance Report",
    schedule: "0 0 * * 1", // 毎週月曜 00:00
    enabled: true,
    handler: async () => {
      console.log("Generating weekly performance report...");
      // 週次パフォーマンスレポートの生成
    },
  });

  // 15分ごと - トークンリフレッシュチェック
  scheduler.registerJob({
    id: "token-refresh-check",
    name: "OAuth Token Refresh Check",
    schedule: "*/15 * * * *", // 15分ごと
    enabled: true,
    handler: async () => {
      console.log("Checking OAuth tokens for expiration...");
      // TokenRefreshManager でトークンの有効期限をチェック
    },
  });

  console.log("All scheduled jobs registered successfully");
}

/**
 * スケジューラーを起動
 */
export function startScheduler(): void {
  registerScheduledJobs();
  const scheduler = getScheduler();
  scheduler.startAll();
  console.log("Scheduler started successfully");
}

/**
 * スケジューラーを停止
 */
export function stopScheduler(): void {
  const scheduler = getScheduler();
  scheduler.stopAll();
  console.log("Scheduler stopped");
}

// 開発環境ではスケジューラーを自動起動しない
// if (process.env.NODE_ENV === "production") {
//   startScheduler();
// }
