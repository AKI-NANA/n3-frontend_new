// services/cron/scheduler.ts

/**
 * I4: スケジューラー/Cronジョブサービス
 * バックグラウンドタスク自動実行管理
 *
 * このモジュールは、すべての定期実行タスクを一元管理し、
 * 自動運用の基盤を提供します。
 */

// ============================================================================
// 型定義
// ============================================================================

/**
 * ジョブステータス
 */
export type JobStatus = "idle" | "running" | "success" | "failed";

/**
 * ジョブ実行結果
 */
export interface JobExecutionResult {
  jobName: string;
  status: JobStatus;
  startedAt: Date;
  completedAt: Date;
  executionTime: number; // ミリ秒
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * ジョブ設定
 */
export interface JobConfig {
  name: string;
  description: string;
  schedule: string; // Cron形式 (例: "0 */6 * * *" = 6時間ごと)
  enabled: boolean;
  priority: "high" | "medium" | "low";
  timeout: number; // ミリ秒
  retryCount: number;
  handler: () => Promise<void>;
}

/**
 * ジョブ実行状況
 */
export interface JobInfo {
  name: string;
  description: string;
  schedule: string;
  enabled: boolean;
  status: JobStatus;
  lastRun?: Date;
  nextRun?: Date;
  lastResult?: JobExecutionResult;
}

// ============================================================================
// Scheduler クラス
// ============================================================================

/**
 * バックグラウンドタスクスケジューラー
 */
export class Scheduler {
  private jobs: Map<string, JobConfig> = new Map();
  private jobStatuses: Map<string, JobStatus> = new Map();
  private lastExecutionResults: Map<string, JobExecutionResult> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  // ==========================================================================
  // ジョブ登録
  // ==========================================================================

  /**
   * すべての定期実行ジョブを登録
   */
  registerAllJobs(): void {
    console.log("\n⚙️ [Scheduler] Registering all jobs...");

    // ジョブ1: 資金繰り予測実行（毎日 0:00）
    this.registerJob({
      name: "cashflow-forecast",
      description: "資金繰り予測を実行し、リスクレベルを計算",
      schedule: "0 0 * * *", // 毎日0時
      enabled: true,
      priority: "high",
      timeout: 300000, // 5分
      retryCount: 3,
      handler: () => this.runCashflowForecast(),
    });

    // ジョブ2: SEO健全性スコア更新（毎日 3:00）
    this.registerJob({
      name: "seo-health-update",
      description: "全リスティングのSEO健全性スコアを更新",
      schedule: "0 3 * * *", // 毎日3時
      enabled: true,
      priority: "medium",
      timeout: 600000, // 10分
      retryCount: 2,
      handler: () => this.updateAllListings(),
    });

    // ジョブ3: オークションサイクル管理（1時間ごと）
    this.registerJob({
      name: "auction-cycle-management",
      description: "期限切れオークションを処理し、再出品を管理",
      schedule: "0 * * * *", // 毎時0分
      enabled: true,
      priority: "medium",
      timeout: 180000, // 3分
      retryCount: 2,
      handler: () => this.processExpiredAuctions(),
    });

    // ジョブ4: メッセージポーリング（15分ごと）
    this.registerJob({
      name: "message-polling",
      description: "全マーケットプレイスから新着メッセージを取得",
      schedule: "*/15 * * * *", // 15分ごと
      enabled: true,
      priority: "high",
      timeout: 120000, // 2分
      retryCount: 3,
      handler: () => this.pollAllMalls(),
    });

    // ジョブ5: 受注リスク分析（30分ごと）
    this.registerJob({
      name: "order-risk-analysis",
      description: "新規受注のリスクを分析し、アラートを送信",
      schedule: "*/30 * * * *", // 30分ごと
      enabled: true,
      priority: "high",
      timeout: 180000, // 3分
      retryCount: 2,
      handler: () => this.analyzeOrderRisks(),
    });

    // ジョブ6: 裁定取引機会検出（6時間ごと）
    this.registerJob({
      name: "arbitrage-opportunity-detection",
      description: "Amazon⇄楽天の裁定取引機会を検出",
      schedule: "0 */6 * * *", // 6時間ごと
      enabled: true,
      priority: "low",
      timeout: 300000, // 5分
      retryCount: 1,
      handler: () => this.detectArbitrageOpportunities(),
    });

    // ジョブ7: 在庫・価格同期（1時間ごと）
    this.registerJob({
      name: "inventory-price-sync",
      description: "全マーケットプレイスの在庫と価格を同期",
      schedule: "30 * * * *", // 毎時30分
      enabled: true,
      priority: "medium",
      timeout: 240000, // 4分
      retryCount: 2,
      handler: () => this.syncInventoryAndPrices(),
    });

    // ジョブ8: デッドリスティング検出（毎日 6:00）
    this.registerJob({
      name: "dead-listing-detection",
      description: "パフォーマンスの低いリスティングを検出",
      schedule: "0 6 * * *", // 毎日6時
      enabled: true,
      priority: "low",
      timeout: 180000, // 3分
      retryCount: 1,
      handler: () => this.detectDeadListings(),
    });

    console.log(`   ✅ Registered ${this.jobs.size} jobs`);
  }

  /**
   * 個別ジョブを登録
   */
  private registerJob(config: JobConfig): void {
    this.jobs.set(config.name, config);
    this.jobStatuses.set(config.name, "idle");
  }

  // ==========================================================================
  // スケジューラー起動/停止
  // ==========================================================================

  /**
   * スケジューラーを起動
   */
  start(): void {
    if (this.isRunning) {
      console.warn("⚠️ [Scheduler] Scheduler is already running");
      return;
    }

    console.log("\n🚀 [Scheduler] Starting scheduler...");

    this.isRunning = true;

    // すべての有効なジョブをスケジュール
    for (const [jobName, config] of this.jobs.entries()) {
      if (config.enabled) {
        this.scheduleJob(jobName, config);
      }
    }

    console.log("   ✅ Scheduler started successfully");
  }

  /**
   * スケジューラーを停止
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn("⚠️ [Scheduler] Scheduler is not running");
      return;
    }

    console.log("\n🛑 [Scheduler] Stopping scheduler...");

    this.isRunning = false;

    // すべてのインターバルをクリア
    for (const [jobName, interval] of this.intervals.entries()) {
      clearInterval(interval);
      console.log(`   Stopped job: ${jobName}`);
    }

    this.intervals.clear();

    console.log("   ✅ Scheduler stopped");
  }

  // ==========================================================================
  // ジョブスケジューリング
  // ==========================================================================

  /**
   * ジョブをスケジュール
   */
  private scheduleJob(jobName: string, config: JobConfig): void {
    // Cron形式のスケジュールを解析して実行間隔を計算
    // 簡易版: 実際には`node-cron`などのライブラリを使用
    const intervalMs = this.parseSchedule(config.schedule);

    if (intervalMs === 0) {
      console.warn(`⚠️ [Scheduler] Invalid schedule for job: ${jobName}`);
      return;
    }

    // 定期実行を設定
    const interval = setInterval(() => {
      this.executeJob(jobName, config);
    }, intervalMs);

    this.intervals.set(jobName, interval);

    console.log(`   ✅ Scheduled job: ${jobName} (every ${intervalMs / 1000}s)`);
  }

  /**
   * Cron形式のスケジュールを解析（簡易版）
   */
  private parseSchedule(schedule: string): number {
    // 簡易的な解析（実際にはnode-cronやcronパーサーを使用）
    if (schedule === "*/15 * * * *") return 15 * 60 * 1000; // 15分
    if (schedule === "*/30 * * * *") return 30 * 60 * 1000; // 30分
    if (schedule === "0 * * * *") return 60 * 60 * 1000; // 1時間
    if (schedule === "30 * * * *") return 60 * 60 * 1000; // 1時間
    if (schedule === "0 */6 * * *") return 6 * 60 * 60 * 1000; // 6時間
    if (schedule === "0 0 * * *") return 24 * 60 * 60 * 1000; // 24時間
    if (schedule === "0 3 * * *") return 24 * 60 * 60 * 1000; // 24時間
    if (schedule === "0 6 * * *") return 24 * 60 * 60 * 1000; // 24時間

    return 0; // 無効なスケジュール
  }

  // ==========================================================================
  // ジョブ実行
  // ==========================================================================

  /**
   * ジョブを実行
   */
  private async executeJob(jobName: string, config: JobConfig): Promise<void> {
    const currentStatus = this.jobStatuses.get(jobName);

    // すでに実行中の場合はスキップ
    if (currentStatus === "running") {
      console.log(`⏭️ [Scheduler] Job ${jobName} is already running, skipping...`);
      return;
    }

    const startedAt = new Date();
    this.jobStatuses.set(jobName, "running");

    console.log(`\n▶️ [Scheduler] Executing job: ${jobName}`);

    try {
      // タイムアウト付きでジョブを実行
      await Promise.race([
        config.handler(),
        this.timeout(config.timeout),
      ]);

      const completedAt = new Date();
      const executionTime = completedAt.getTime() - startedAt.getTime();

      const result: JobExecutionResult = {
        jobName,
        status: "success",
        startedAt,
        completedAt,
        executionTime,
      };

      this.jobStatuses.set(jobName, "success");
      this.lastExecutionResults.set(jobName, result);

      console.log(`   ✅ Job completed: ${jobName} (${executionTime}ms)`);

      // 実行ログをデータベースに保存
      await this.saveExecutionLog(result);
    } catch (error) {
      const completedAt = new Date();
      const executionTime = completedAt.getTime() - startedAt.getTime();

      const result: JobExecutionResult = {
        jobName,
        status: "failed",
        startedAt,
        completedAt,
        executionTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };

      this.jobStatuses.set(jobName, "failed");
      this.lastExecutionResults.set(jobName, result);

      console.error(`   ❌ Job failed: ${jobName} (${executionTime}ms)`, error);

      // エラーログをデータベースに保存
      await this.saveExecutionLog(result);

      // リトライ処理（簡易版）
      if (config.retryCount > 0) {
        console.log(`   🔄 Retrying job: ${jobName}...`);
        // TODO: リトライロジックの実装
      }
    } finally {
      // ステータスをidleに戻す
      setTimeout(() => {
        this.jobStatuses.set(jobName, "idle");
      }, 5000);
    }
  }

  /**
   * タイムアウトPromise
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Job execution timeout")), ms);
    });
  }

  // ==========================================================================
  // ジョブハンドラー（各タスクの実装）
  // ==========================================================================

  /**
   * ジョブ1: 資金繰り予測実行
   */
  private async runCashflowForecast(): Promise<void> {
    console.log("   💰 Running cashflow forecast...");

    // TODO: 実際の資金繰り予測ロジックを呼び出す
    // import { CashflowForecastService } from '../cashflow/CashflowForecastService';
    // await CashflowForecastService.generateForecast();

    // モック実装
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("   ✅ Cashflow forecast completed");
  }

  /**
   * ジョブ2: SEO健全性スコア更新
   */
  private async updateAllListings(): Promise<void> {
    console.log("   📊 Updating SEO health scores...");

    // TODO: すべてのリスティングのSEO健全性スコアを更新
    // import { getHealthScoreService } from '../../lib/seo-health-manager/health-score-service';
    // const healthScoreService = getHealthScoreService();
    // await healthScoreService.analyzeBatch(allListings);

    // モック実装
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("   ✅ SEO health scores updated");
  }

  /**
   * ジョブ3: オークションサイクル管理
   */
  private async processExpiredAuctions(): Promise<void> {
    console.log("   🔨 Processing expired auctions...");

    // TODO: 期限切れオークションの処理
    // import { AuctionCycleManager } from '../auction/AuctionCycleManager';
    // await AuctionCycleManager.processExpired();

    // モック実装
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log("   ✅ Expired auctions processed");
  }

  /**
   * ジョブ4: メッセージポーリング
   */
  private async pollAllMalls(): Promise<void> {
    console.log("   📬 Polling messages from all marketplaces...");

    // TODO: すべてのマーケットプレイスからメッセージを取得
    // import { getMessageSyncService } from '../mall/messageSyncService';
    // const messageSyncService = getMessageSyncService();
    // await messageSyncService.syncAllMarketplaces();

    // モック実装
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log("   ✅ Messages polled");
  }

  /**
   * ジョブ5: 受注リスク分析
   */
  private async analyzeOrderRisks(): Promise<void> {
    console.log("   🔍 Analyzing order risks...");

    // TODO: 新規受注のリスクを分析
    // import { getRiskAnalyzer } from '../orders/RiskAnalyzer';
    // const riskAnalyzer = getRiskAnalyzer();
    // await riskAnalyzer.assessBatch(newOrders);

    // モック実装
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("   ✅ Order risks analyzed");
  }

  /**
   * ジョブ6: 裁定取引機会検出
   */
  private async detectArbitrageOpportunities(): Promise<void> {
    console.log("   💡 Detecting arbitrage opportunities...");

    // TODO: Amazon⇄楽天の裁定取引機会を検出
    // import { getDataFetcher } from '../arbitrage/dataFetcher';
    // const dataFetcher = getDataFetcher();
    // await dataFetcher.findArbitrageOpportunities('商品キーワード');

    // モック実装
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("   ✅ Arbitrage opportunities detected");
  }

  /**
   * ジョブ7: 在庫・価格同期
   */
  private async syncInventoryAndPrices(): Promise<void> {
    console.log("   🔄 Syncing inventory and prices...");

    // TODO: すべてのマーケットプレイスで在庫・価格を同期
    // import { InventorySyncEngine } from '../inventory/InventorySyncEngine';
    // await InventorySyncEngine.syncAll();

    // モック実装
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log("   ✅ Inventory and prices synced");
  }

  /**
   * ジョブ8: デッドリスティング検出
   */
  private async detectDeadListings(): Promise<void> {
    console.log("   💀 Detecting dead listings...");

    // TODO: パフォーマンスの低いリスティングを検出
    // import { getHealthScoreService } from '../../lib/seo-health-manager/health-score-service';
    // const healthScoreService = getHealthScoreService();
    // const results = await healthScoreService.analyzeBatch(allListings);
    // const deadListings = results.filter(r => r.isDeadListing);

    // モック実装
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("   ✅ Dead listings detected");
  }

  // ==========================================================================
  // データベース操作
  // ==========================================================================

  /**
   * 実行ログをデータベースに保存
   */
  private async saveExecutionLog(result: JobExecutionResult): Promise<void> {
    // TODO: Supabaseのcron_execution_logsテーブルに保存
    // import { createClient } from '../../lib/supabase';
    // const supabase = createClient();
    // await supabase.from('cron_execution_logs').insert({
    //   job_name: result.jobName,
    //   status: result.status,
    //   execution_time: result.executionTime,
    //   error_message: result.error,
    //   started_at: result.startedAt.toISOString(),
    //   completed_at: result.completedAt.toISOString(),
    // });
  }

  // ==========================================================================
  // ジョブ情報取得
  // ==========================================================================

  /**
   * すべてのジョブ情報を取得
   */
  getAllJobsInfo(): JobInfo[] {
    const jobsInfo: JobInfo[] = [];

    for (const [jobName, config] of this.jobs.entries()) {
      const status = this.jobStatuses.get(jobName) || "idle";
      const lastResult = this.lastExecutionResults.get(jobName);

      jobsInfo.push({
        name: config.name,
        description: config.description,
        schedule: config.schedule,
        enabled: config.enabled,
        status,
        lastRun: lastResult?.completedAt,
        lastResult,
      });
    }

    return jobsInfo;
  }

  /**
   * 特定のジョブ情報を取得
   */
  getJobInfo(jobName: string): JobInfo | null {
    const config = this.jobs.get(jobName);
    if (!config) return null;

    const status = this.jobStatuses.get(jobName) || "idle";
    const lastResult = this.lastExecutionResults.get(jobName);

    return {
      name: config.name,
      description: config.description,
      schedule: config.schedule,
      enabled: config.enabled,
      status,
      lastRun: lastResult?.completedAt,
      lastResult,
    };
  }
}

// ============================================================================
// エクスポート: シングルトンインスタンス
// ============================================================================

let schedulerInstance: Scheduler | null = null;

/**
 * Schedulerのシングルトンインスタンスを取得
 */
export function getScheduler(): Scheduler {
  if (!schedulerInstance) {
    schedulerInstance = new Scheduler();
  }
  return schedulerInstance;
}

/**
 * スケジューラーを初期化して起動
 */
export function initializeScheduler(): Scheduler {
  const scheduler = getScheduler();
  scheduler.registerAllJobs();
  scheduler.start();
  return scheduler;
}
