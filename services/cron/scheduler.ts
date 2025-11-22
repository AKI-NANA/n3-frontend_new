/**
 * I4: スケジューラー/Cronジョブサービス
 * バックグラウンドで自動実行が必要な全タスクを一元管理
 */

import cron from 'node-cron';
import { getMessageSyncService } from '../mall/messageSyncService';
import { getHealthScoreService } from '../../lib/seo-health-manager/health-score-service';
import { getRiskAnalyzer } from '../orders/RiskAnalyzer';
import { getAutoReplyEngine } from '../messaging/AutoReplyEngine';
import { createClient } from '@supabase/supabase-js';

// ==========================================
// Supabase クライアント
// ==========================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// ==========================================
// 型定義
// ==========================================

interface CronTask {
  name: string;
  schedule: string; // Cron expression
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  status: 'idle' | 'running' | 'success' | 'error';
}

interface TaskResult {
  taskName: string;
  success: boolean;
  executionTime: number;
  result?: any;
  error?: string;
}

// ==========================================
// Scheduler クラス
// ==========================================

export class Scheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private taskStatus: Map<string, CronTask> = new Map();

  constructor() {
    console.log('📅 Scheduler 初期化中...');
  }

  /**
   * 全タスクを初期化・登録
   */
  initializeAllTasks() {
    console.log('⚙️ 全Cronタスクを登録中...');

    // 1. 資金繰り予測実行（月次）
    this.registerTask(
      'cashflow-forecast',
      '0 0 1 * *', // 毎月1日 00:00
      true,
      this.runCashflowForecast.bind(this)
    );

    // 2. SEO健全性スコア更新（毎日）
    this.registerTask(
      'seo-health-score-update',
      '0 2 * * *', // 毎日 02:00
      true,
      this.updateSEOHealthScores.bind(this)
    );

    // 3. オークションサイクル管理（毎時）
    this.registerTask(
      'auction-cycle-management',
      '0 * * * *', // 毎時00分
      true,
      this.manageAuctionCycles.bind(this)
    );

    // 4. メッセージポーリング（5分ごと）
    this.registerTask(
      'message-polling',
      '*/5 * * * *', // 5分ごと
      true,
      this.pollAllMallMessages.bind(this)
    );

    // 5. 高リスク注文の自動検出（15分ごと）
    this.registerTask(
      'risk-detection',
      '*/15 * * * *', // 15分ごと
      true,
      this.detectHighRiskOrders.bind(this)
    );

    // 6. 緊急度の高いメッセージへのAI自動返信（10分ごと）
    this.registerTask(
      'ai-auto-reply',
      '*/10 * * * *', // 10分ごと
      true,
      this.processAutoReplies.bind(this)
    );

    // 7. データベースクリーンアップ（毎日深夜）
    this.registerTask(
      'database-cleanup',
      '0 3 * * *', // 毎日 03:00
      true,
      this.cleanupDatabase.bind(this)
    );

    console.log(`✅ ${this.tasks.size} 個のCronタスクを登録完了`);
  }

  /**
   * タスクを登録
   */
  private registerTask(
    name: string,
    schedule: string,
    enabled: boolean,
    handler: () => Promise<void>
  ) {
    const task = cron.schedule(
      schedule,
      async () => {
        await this.executeTask(name, handler);
      },
      {
        scheduled: enabled,
        timezone: 'Asia/Tokyo',
      }
    );

    this.tasks.set(name, task);

    this.taskStatus.set(name, {
      name,
      schedule,
      enabled,
      status: 'idle',
    });

    console.log(`  ✓ ${name}: ${schedule} ${enabled ? '[有効]' : '[無効]'}`);
  }

  /**
   * タスクを実行
   */
  private async executeTask(name: string, handler: () => Promise<void>) {
    const startTime = Date.now();
    const status = this.taskStatus.get(name);

    if (!status) {
      console.error(`❌ タスク ${name} が見つかりません`);
      return;
    }

    try {
      console.log(`\n🚀 Cronタスク開始: ${name} (${new Date().toISOString()})`);

      status.status = 'running';
      status.lastRun = new Date();

      await handler();

      const executionTime = Date.now() - startTime;

      status.status = 'success';

      console.log(`✅ Cronタスク完了: ${name} (${executionTime}ms)\n`);

      // 実行ログを保存
      await this.logTaskExecution({
        taskName: name,
        success: true,
        executionTime,
      });
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      status.status = 'error';

      console.error(`❌ Cronタスクエラー: ${name} (${executionTime}ms)`);
      console.error(`  エラー詳細: ${error.message}\n`);

      // エラーログを保存
      await this.logTaskExecution({
        taskName: name,
        success: false,
        executionTime,
        error: error.message,
      });
    }
  }

  // ==========================================
  // タスク実装
  // ==========================================

  /**
   * 1. 資金繰り予測実行
   */
  private async runCashflowForecast() {
    console.log('💰 資金繰り予測を実行中...');

    // 今月から6ヶ月先までの予測を生成
    const forecastMonths = 6;
    const today = new Date();

    for (let i = 0; i < forecastMonths; i++) {
      const forecastDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const forecastMonth = forecastDate.toISOString().slice(0, 7); // YYYY-MM

      // 売上予測を計算（過去データから）
      const { data: pastOrders } = await supabase
        .from('orders_v2')
        .select('total_amount, profit_amount')
        .gte('order_date', new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString())
        .lte('order_date', today.toISOString());

      const avgMonthlyRevenue = pastOrders
        ? pastOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0) / 3
        : 0;

      const avgMonthlyProfit = pastOrders
        ? pastOrders.reduce((sum, o) => sum + (o.profit_amount || 0), 0) / 3
        : 0;

      // 支出予測（固定費 + 変動費）
      const fixedCosts = 50000; // 例: 月額固定費
      const variableCosts = avgMonthlyRevenue * 0.3; // 例: 売上の30%

      const expectedRevenue = avgMonthlyRevenue * 1.1; // 10%成長を想定
      const expectedExpenses = fixedCosts + variableCosts;

      const netCashflow = expectedRevenue - expectedExpenses;
      const openingBalance = i === 0 ? 500000 : 0; // 初月のみ期首残高設定
      const closingBalance = openingBalance + netCashflow;

      // 資金ショートリスク判定
      const isShor tageRisk = closingBalance < 100000; // 10万円を下回る場合
      const riskLevel = closingBalance < 0 ? 'critical' : closingBalance < 100000 ? 'high' : 'low';

      // データベースに保存
      await supabase.from('cashflow_forecast').upsert({
        forecast_date: forecastDate.toISOString().slice(0, 10),
        forecast_month: forecastMonth,
        expected_revenue: expectedRevenue,
        confirmed_revenue: i === 0 ? avgMonthlyRevenue : 0,
        expected_expenses: expectedExpenses,
        fixed_costs: fixedCosts,
        variable_costs: variableCosts,
        opening_balance: openingBalance,
        closing_balance: closingBalance,
        net_cashflow: netCashflow,
        is_shortage_risk: isShortageRisk,
        risk_level: riskLevel,
        recommended_actions: isShortageRisk
          ? ['資金調達を検討してください', '支出を見直してください']
          : [],
      });

      console.log(`  ✓ ${forecastMonth}: ¥${closingBalance.toLocaleString()} (${riskLevel})`);
    }

    console.log('✅ 資金繰り予測完了');
  }

  /**
   * 2. SEO健全性スコア更新
   */
  private async updateSEOHealthScores() {
    console.log('📊 SEO健全性スコア更新中...');

    const healthScoreService = getHealthScoreService();

    // 全アクティブリスティングを取得
    const { data: listings } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('status', 'active')
      .limit(50); // 一度に50件まで処理

    if (!listings || listings.length === 0) {
      console.log('  更新対象のリスティングがありません');
      return;
    }

    let updatedCount = 0;

    for (const listing of listings) {
      try {
        const result = await healthScoreService.calculateHealthScore(listing);

        // 結果をデータベースに保存
        await supabase
          .from('marketplace_listings')
          .update({
            health_score: result.healthScore,
            seo_issues: result.seoIssues,
            suggested_title: result.suggestedTitle,
            suggested_improvements: result.suggestedImprovements,
            auto_terminate_recommended: result.autoTerminateRecommended,
            last_optimized_at: new Date().toISOString(),
          })
          .eq('id', listing.id);

        updatedCount++;

        // レート制限対策
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`  ❌ リスティング ${listing.id} の更新エラー:`, error.message);
      }
    }

    console.log(`✅ SEO健全性スコア更新完了: ${updatedCount} 件`);
  }

  /**
   * 3. オークションサイクル管理
   */
  private async manageAuctionCycles() {
    console.log('🔨 オークションサイクル管理中...');

    // 入札なし終了の自動定額切替
    const { data: expiredAuctions } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('listing_type', 'auction')
      .eq('status', 'ended')
      .lt('ended_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // 24時間以上前に終了

    if (expiredAuctions && expiredAuctions.length > 0) {
      console.log(`  ${expiredAuctions.length} 件の終了オークションを処理中...`);

      for (const auction of expiredAuctions) {
        if (auction.sales_count === 0) {
          // 入札なし終了 → 定額出品に切り替え
          console.log(`  🔄 定額切替: ${auction.listing_id}`);

          // 新しい定額リスティングを作成（実際のAPI呼び出しに置き換え）
          // await marketplaceAPI.createFixedPriceListing({...});
        }
      }
    }

    console.log('✅ オークションサイクル管理完了');
  }

  /**
   * 4. メッセージポーリング
   */
  private async pollAllMallMessages() {
    console.log('📬 全モールメッセージポーリング中...');

    const messageSyncService = getMessageSyncService();

    const results = await messageSyncService.pollAllMalls();

    const totalNewMessages = results.reduce((sum, r) => sum + r.newMessages, 0);

    console.log(`✅ メッセージポーリング完了: ${totalNewMessages} 件の新着`);

    // 緊急度判定（AI）
    if (totalNewMessages > 0) {
      const autoReplyEngine = getAutoReplyEngine();

      const { data: unreadMessages } = await supabase
        .from('unified_messages')
        .select('*')
        .eq('status', 'unread')
        .order('received_at', { ascending: false })
        .limit(20);

      if (unreadMessages) {
        for (const msg of unreadMessages) {
          const sentiment = await autoReplyEngine.analyzeSentiment(msg.body);

          await supabase
            .from('unified_messages')
            .update({
              sentiment: sentiment.sentiment,
              urgency_level: sentiment.urgencyLevel,
            })
            .eq('id', msg.id);
        }
      }
    }
  }

  /**
   * 5. 高リスク注文の自動検出
   */
  private async detectHighRiskOrders() {
    console.log('🚨 高リスク注文検出中...');

    const riskAnalyzer = getRiskAnalyzer();

    // 未処理の注文を取得
    const { data: pendingOrders } = await supabase
      .from('orders_v2')
      .select('*')
      .in('status', ['pending', 'paid'])
      .is('risk_score', null)
      .limit(20);

    if (!pendingOrders || pendingOrders.length === 0) {
      console.log('  検出対象の注文がありません');
      return;
    }

    let highRiskCount = 0;

    for (const order of pendingOrders) {
      const result = await riskAnalyzer.analyzeOrder(order);

      await supabase
        .from('orders_v2')
        .update({
          risk_score: result.riskScore,
          risk_factors: result.riskFactors,
          is_high_risk: result.isHighRisk,
        })
        .eq('id', order.id);

      if (result.isHighRisk) {
        highRiskCount++;
        console.log(`  ⚠️ 高リスク注文検出: ${order.order_number} (スコア: ${result.riskScore})`);
      }

      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`✅ 高リスク注文検出完了: ${highRiskCount} 件`);
  }

  /**
   * 6. AI自動返信処理
   */
  private async processAutoReplies() {
    console.log('🤖 AI自動返信処理中...');

    const autoReplyEngine = getAutoReplyEngine();

    // 緊急度が高く、未返信のメッセージを取得
    const { data: urgentMessages } = await supabase
      .from('unified_messages')
      .select('*')
      .in('urgency_level', ['urgent', 'high'])
      .eq('is_replied', false)
      .order('received_at', { ascending: true })
      .limit(10);

    if (!urgentMessages || urgentMessages.length === 0) {
      console.log('  処理対象のメッセージがありません');
      return;
    }

    let repliedCount = 0;

    for (const msg of urgentMessages) {
      const result = await autoReplyEngine.generateReply(msg);

      if (result.success && !result.requiresHuman) {
        // AI提案返信をデータベースに保存
        await supabase
          .from('unified_messages')
          .update({
            ai_suggested_reply: result.suggestedReply,
            requires_human: result.requiresHuman,
          })
          .eq('id', msg.id);

        repliedCount++;
        console.log(`  ✓ AI返信生成: ${msg.marketplace_message_id}`);
      }

      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`✅ AI自動返信処理完了: ${repliedCount} 件`);
  }

  /**
   * 7. データベースクリーンアップ
   */
  private async cleanupDatabase() {
    console.log('🧹 データベースクリーンアップ中...');

    // 90日以上前のアーカイブ済みメッセージを削除
    const { data: deletedMessages } = await supabase
      .from('unified_messages')
      .delete()
      .eq('status', 'archived')
      .lt('received_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    console.log(`  ✓ 古いメッセージを削除: ${deletedMessages?.length || 0} 件`);

    // 古い資金繰り予測データを削除（12ヶ月以上前）
    const { data: deletedForecasts } = await supabase
      .from('cashflow_forecast')
      .delete()
      .lt('forecast_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

    console.log(`  ✓ 古い予測データを削除: ${deletedForecasts?.length || 0} 件`);

    console.log('✅ データベースクリーンアップ完了');
  }

  // ==========================================
  // ユーティリティ
  // ==========================================

  /**
   * タスク実行ログを保存
   */
  private async logTaskExecution(result: TaskResult) {
    try {
      await supabase.from('cron_execution_logs').insert({
        task_name: result.taskName,
        success: result.success,
        execution_time_ms: result.executionTime,
        result: result.result,
        error: result.error,
        executed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('ログ保存エラー:', error);
    }
  }

  /**
   * タスクを手動実行
   */
  async runTaskManually(taskName: string) {
    const status = this.taskStatus.get(taskName);

    if (!status) {
      throw new Error(`タスク ${taskName} が見つかりません`);
    }

    console.log(`🔧 手動実行: ${taskName}`);

    // タスク名に応じて適切なハンドラーを呼び出し
    const handlers: Record<string, () => Promise<void>> = {
      'cashflow-forecast': this.runCashflowForecast.bind(this),
      'seo-health-score-update': this.updateSEOHealthScores.bind(this),
      'auction-cycle-management': this.manageAuctionCycles.bind(this),
      'message-polling': this.pollAllMallMessages.bind(this),
      'risk-detection': this.detectHighRiskOrders.bind(this),
      'ai-auto-reply': this.processAutoReplies.bind(this),
      'database-cleanup': this.cleanupDatabase.bind(this),
    };

    const handler = handlers[taskName];

    if (!handler) {
      throw new Error(`ハンドラーが見つかりません: ${taskName}`);
    }

    await this.executeTask(taskName, handler);
  }

  /**
   * 全タスクのステータスを取得
   */
  getTasksStatus(): CronTask[] {
    return Array.from(this.taskStatus.values());
  }

  /**
   * 全タスクを停止
   */
  stopAllTasks() {
    console.log('⏸️ 全Cronタスクを停止中...');

    this.tasks.forEach((task, name) => {
      task.stop();
      console.log(`  ✓ ${name} 停止`);
    });

    console.log('✅ 全タスク停止完了');
  }

  /**
   * 全タスクを開始
   */
  startAllTasks() {
    console.log('▶️ 全Cronタスクを開始中...');

    this.tasks.forEach((task, name) => {
      task.start();
      console.log(`  ✓ ${name} 開始`);
    });

    console.log('✅ 全タスク開始完了');
  }
}

// ==========================================
// エクスポート
// ==========================================

export default Scheduler;

// シングルトンインスタンス
let schedulerInstance: Scheduler | null = null;

export function getScheduler(): Scheduler {
  if (!schedulerInstance) {
    schedulerInstance = new Scheduler();
  }
  return schedulerInstance;
}

// サーバー起動時に自動実行
if (typeof window === 'undefined') {
  // Node.js環境でのみ実行
  const scheduler = getScheduler();
  scheduler.initializeAllTasks();
  scheduler.startAllTasks();

  console.log('\n✅ Scheduler が起動しました\n');
}
