/**
 * スケジューラー/Cronジョブサービス
 * I4: 定期的な自動実行タスクの一元管理
 *
 * 実行タスク:
 * - 資金繰り予測実行（毎月1日 00:00）
 * - SEO健全性スコア更新（毎日 02:00）
 * - オークションサイクル管理（毎時）
 * - メッセージポーリング（5分ごと）
 */

import { updateAllListings } from '@/lib/seo-health-manager/health-score-service';
import AuctionCycleManager from '@/lib/services/auction-cycle-manager';

/**
 * ジョブ実行結果
 */
export interface JobResult {
  jobName: string;
  success: boolean;
  executedAt: Date;
  duration: number; // milliseconds
  message?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * ジョブスケジュール設定
 */
export interface JobSchedule {
  name: string;
  schedule: string; // cron format
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

/**
 * ジョブリスト
 */
export const SCHEDULED_JOBS: JobSchedule[] = [
  {
    name: 'cashflow-forecast',
    schedule: '0 0 1 * *', // 毎月1日 00:00
    enabled: true,
  },
  {
    name: 'seo-health-update',
    schedule: '0 2 * * *', // 毎日 02:00
    enabled: true,
  },
  {
    name: 'auction-cycle-management',
    schedule: '0 * * * *', // 毎時
    enabled: true,
  },
  {
    name: 'message-polling',
    schedule: '*/5 * * * *', // 5分ごと
    enabled: true,
  },
];

/**
 * 資金繰り予測実行ジョブ
 * 毎月1日 00:00に実行
 */
async function runCashflowForecast(): Promise<JobResult> {
  const startTime = Date.now();
  const jobName = 'cashflow-forecast';

  try {
    console.log(`[${jobName}] 資金繰り予測を開始します...`);

    // 資金繰り予測ロジック実行
    // 実際の実装では、以下のようなロジックを呼び出す:
    // const forecast = await cashflowPredictor.runCashflowForecast();
    // await saveForecastToDatabase(forecast);

    // モック実装
    const forecastData = {
      month: new Date().toISOString().slice(0, 7),
      totalRevenue: 150000,
      totalCosts: 80000,
      netCashflow: 70000,
    };

    const duration = Date.now() - startTime;

    console.log(`[${jobName}] 完了しました (${duration}ms)`);

    return {
      jobName,
      success: true,
      executedAt: new Date(),
      duration,
      message: '資金繰り予測が正常に実行されました',
      metadata: forecastData,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${jobName}] エラーが発生しました:`, error);

    return {
      jobName,
      success: false,
      executedAt: new Date(),
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * SEO健全性スコア更新ジョブ
 * 毎日 02:00に実行
 */
async function runSEOHealthUpdate(): Promise<JobResult> {
  const startTime = Date.now();
  const jobName = 'seo-health-update';

  try {
    console.log(`[${jobName}] SEO健全性スコア更新を開始します...`);

    // SEO健全性スコア更新ロジック実行
    const result = await updateAllListings();

    const duration = Date.now() - startTime;

    // 低スコアリスティングのアラート
    if (result.lowScoreCount > 0) {
      console.warn(
        `⚠️ [${jobName}] ${result.lowScoreCount}件の低スコアリスティングが検出されました`
      );
      // 実際にはメール通知やSlack通知を送信
    }

    console.log(`[${jobName}] 完了しました (${duration}ms)`);

    return {
      jobName,
      success: true,
      executedAt: new Date(),
      duration,
      message: `${result.updated}/${result.total} リスティングを更新しました`,
      metadata: result,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${jobName}] エラーが発生しました:`, error);

    return {
      jobName,
      success: false,
      executedAt: new Date(),
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * オークションサイクル管理ジョブ
 * 毎時実行
 */
async function runAuctionCycleManagement(): Promise<JobResult> {
  const startTime = Date.now();
  const jobName = 'auction-cycle-management';

  try {
    console.log(`[${jobName}] オークションサイクル管理を開始します...`);

    // オークションサイクル管理ロジック実行
    const manager = new AuctionCycleManager({
      catawikiToken: process.env.CATAWIKI_ACCESS_TOKEN,
      bonanzaConfig: {
        apiKey: process.env.BONANZA_API_KEY || '',
        certName: process.env.BONANZA_CERT_NAME || '',
        devId: process.env.BONANZA_DEV_ID || '',
        token: process.env.BONANZA_TOKEN,
      },
    });

    const result = await manager.processEndedAuctions({
      strategy: 'fixed-price', // デフォルト: 固定価格に変換
      priceAdjustment: -10, // 10%値下げ
      autoRelist: true,
    });

    const duration = Date.now() - startTime;

    console.log(
      `[${jobName}] 完了しました: ${result.succeeded}/${result.processed} 成功 (${duration}ms)`
    );

    return {
      jobName,
      success: true,
      executedAt: new Date(),
      duration,
      message: `${result.processed}件のオークションを処理しました`,
      metadata: result,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${jobName}] エラーが発生しました:`, error);

    return {
      jobName,
      success: false,
      executedAt: new Date(),
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * メッセージポーリングジョブ
 * 5分ごとに実行
 */
async function runMessagePolling(): Promise<JobResult> {
  const startTime = Date.now();
  const jobName = 'message-polling';

  try {
    console.log(`[${jobName}] メッセージポーリングを開始します...`);

    // 全モールからメッセージを取得
    // 実際の実装では、以下のようなロジックを呼び出す:
    // const messages = await messageSyncService.pollAllMalls();
    // await saveMessagesToDatabase(messages);
    // await classifyUrgency(messages);

    // モック実装
    const polledMessages = {
      ebay: 5,
      amazon: 3,
      etsy: 2,
      bonanza: 1,
      total: 11,
      urgent: 2,
    };

    const duration = Date.now() - startTime;

    if (polledMessages.urgent > 0) {
      console.warn(
        `🔴 [${jobName}] ${polledMessages.urgent}件の緊急メッセージが検出されました`
      );
      // 実際には緊急通知を送信
    }

    console.log(`[${jobName}] 完了しました (${duration}ms)`);

    return {
      jobName,
      success: true,
      executedAt: new Date(),
      duration,
      message: `${polledMessages.total}件のメッセージを取得しました`,
      metadata: polledMessages,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${jobName}] エラーが発生しました:`, error);

    return {
      jobName,
      success: false,
      executedAt: new Date(),
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * ジョブ実行関数マッピング
 */
const JOB_FUNCTIONS: Record<string, () => Promise<JobResult>> = {
  'cashflow-forecast': runCashflowForecast,
  'seo-health-update': runSEOHealthUpdate,
  'auction-cycle-management': runAuctionCycleManagement,
  'message-polling': runMessagePolling,
};

/**
 * 指定されたジョブを実行
 */
export async function executeJob(jobName: string): Promise<JobResult> {
  const jobFunction = JOB_FUNCTIONS[jobName];

  if (!jobFunction) {
    return {
      jobName,
      success: false,
      executedAt: new Date(),
      duration: 0,
      error: `Job "${jobName}" not found`,
    };
  }

  return await jobFunction();
}

/**
 * すべての有効なジョブを実行
 * （主にテスト用）
 */
export async function executeAllJobs(): Promise<JobResult[]> {
  const results: JobResult[] = [];

  for (const job of SCHEDULED_JOBS) {
    if (job.enabled) {
      const result = await executeJob(job.name);
      results.push(result);
    }
  }

  return results;
}

/**
 * Cronスケジュールの解析（簡易版）
 * 実際の本番環境では node-cron などのライブラリを使用
 */
export function parseCronSchedule(schedule: string): {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
} {
  const parts = schedule.split(' ');

  if (parts.length !== 5) {
    throw new Error('Invalid cron schedule format');
  }

  return {
    minute: parts[0],
    hour: parts[1],
    dayOfMonth: parts[2],
    month: parts[3],
    dayOfWeek: parts[4],
  };
}

/**
 * 次回実行時刻を計算（簡易版）
 */
export function calculateNextRun(schedule: string): Date {
  // 実際の実装では cron-parser などを使用
  const now = new Date();
  const next = new Date(now);

  // 簡易実装: 常に1時間後を返す
  next.setHours(next.getHours() + 1);

  return next;
}

/**
 * ジョブの健全性チェック
 */
export function checkSchedulerHealth(): {
  healthy: boolean;
  enabledJobs: number;
  totalJobs: number;
  issues: string[];
} {
  const issues: string[] = [];
  const enabledJobs = SCHEDULED_JOBS.filter((j) => j.enabled).length;

  if (enabledJobs === 0) {
    issues.push('有効なジョブがありません');
  }

  // 環境変数チェック
  if (!process.env.CATAWIKI_ACCESS_TOKEN) {
    issues.push('CATAWIKI_ACCESS_TOKENが設定されていません');
  }

  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    issues.push('NEXT_PUBLIC_GEMINI_API_KEYが設定されていません');
  }

  return {
    healthy: issues.length === 0,
    enabledJobs,
    totalJobs: SCHEDULED_JOBS.length,
    issues,
  };
}

/**
 * スケジューラーの初期化
 * （Next.jsのAPI Routeや外部Cronサービスから呼び出される）
 */
export function initializeScheduler(): void {
  console.log('📅 スケジューラーを初期化しています...');

  for (const job of SCHEDULED_JOBS) {
    if (job.enabled) {
      const nextRun = calculateNextRun(job.schedule);
      job.nextRun = nextRun;
      console.log(`  ✓ ${job.name}: 次回実行 ${nextRun.toISOString()}`);
    }
  }

  const health = checkSchedulerHealth();
  if (!health.healthy) {
    console.warn('⚠️ スケジューラーに問題があります:');
    health.issues.forEach((issue) => console.warn(`  - ${issue}`));
  } else {
    console.log(`✅ スケジューラー初期化完了 (${health.enabledJobs}/${health.totalJobs} ジョブ有効)`);
  }
}

export default {
  executeJob,
  executeAllJobs,
  checkSchedulerHealth,
  initializeScheduler,
  SCHEDULED_JOBS,
};
