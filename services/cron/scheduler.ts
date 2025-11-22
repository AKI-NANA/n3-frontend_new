// ============================================
// スケジューラー/Cronジョブサービス
// 定期実行タスク管理
// ============================================

import { createClient } from '@supabase/supabase-js';

interface ScheduledTask {
  name: string;
  schedule: string; // cron表記
  handler: () => Promise<void>;
  enabled: boolean;
  last_run?: Date;
  next_run?: Date;
}

interface TaskExecutionLog {
  task_name: string;
  started_at: Date;
  completed_at?: Date;
  status: 'running' | 'completed' | 'failed';
  error_message?: string;
  execution_time_ms?: number;
}

const executionLogs: TaskExecutionLog[] = [];

/**
 * 資金繰り予測の実行（月初/週初）
 * Phase 4: CashFlowForecaster連携
 */
async function runCashflowForecast(): Promise<void> {
  console.log('[Scheduler] Running cashflow forecast...');

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // 今日から30日間の予測を生成
    const forecasts = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(today.getDate() + i);

      // 簡易的な予測計算（実際はより複雑なロジック）
      const forecast = {
        forecast_date: forecastDate.toISOString().split('T')[0],
        forecast_type: 'daily',
        beginning_balance_jpy: 1000000 + Math.random() * 500000,
        expected_revenue_jpy: Math.random() * 300000,
        expected_sourcing_cost_jpy: Math.random() * 200000,
        credit_card_payment_jpy: i % 10 === 0 ? Math.random() * 500000 : 0,
        other_expenses_jpy: Math.random() * 50000,
        net_cashflow_jpy: 0,
        ending_balance_jpy: 0,
        is_payment_risk: false,
        safety_buffer_jpy: 200000,
        alert_level: 'safe',
      };

      // 計算
      forecast.net_cashflow_jpy =
        forecast.expected_revenue_jpy -
        forecast.expected_sourcing_cost_jpy -
        forecast.credit_card_payment_jpy -
        forecast.other_expenses_jpy;
      forecast.ending_balance_jpy =
        forecast.beginning_balance_jpy + forecast.net_cashflow_jpy;

      // リスク判定
      if (forecast.ending_balance_jpy < forecast.safety_buffer_jpy) {
        forecast.is_payment_risk = true;
        forecast.alert_level = 'critical';
      } else if (forecast.ending_balance_jpy < forecast.safety_buffer_jpy * 1.5) {
        forecast.alert_level = 'warning';
      }

      forecasts.push(forecast);
    }

    // データベースに保存
    const { error } = await supabase.from('cashflow_forecast').upsert(forecasts, {
      onConflict: 'forecast_date',
    });

    if (error) {
      throw error;
    }

    console.log(`[Scheduler] Cashflow forecast completed: ${forecasts.length} days forecasted`);
  } catch (error) {
    console.error('[Scheduler] Cashflow forecast failed:', error);
    throw error;
  }
}

/**
 * SEOスコア更新（毎日2:00）
 * Phase 7: HealthScoreService連携
 */
async function updateAllListingsHealthScores(): Promise<void> {
  console.log('[Scheduler] Updating all listing health scores...');

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // 全リスティングを取得
    const { data: products, error: fetchError } = await supabase
      .from('product_master')
      .select('id, sku, ebay_listing_id')
      .not('ebay_listing_id', 'is', null);

    if (fetchError) {
      throw fetchError;
    }

    if (!products || products.length === 0) {
      console.log('[Scheduler] No listings to update');
      return;
    }

    // 各リスティングのスコアを計算
    const healthScores = products.map((product) => {
      // ランダムなモックデータ（実際はeBay APIから取得）
      const daysSinceLastSale = Math.floor(Math.random() * 120);
      const totalViews = Math.floor(Math.random() * 1000);
      const totalSales = Math.floor(Math.random() * 15);
      const conversionRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;

      // スコア計算
      let score = 50;
      if (daysSinceLastSale <= 7) score += 30;
      else if (daysSinceLastSale <= 30) score += 20;
      else if (daysSinceLastSale <= 60) score += 10;

      if (conversionRate >= 3.0) score += 20;
      else if (conversionRate >= 1.0) score += 10;

      const isDeadListing = score < 30 || daysSinceLastSale > 90;

      return {
        product_id: product.id,
        ebay_listing_id: product.ebay_listing_id,
        health_score: Math.min(score, 100),
        days_since_last_sale: daysSinceLastSale,
        total_views_90d: totalViews,
        total_sales_90d: totalSales,
        conversion_rate_90d: conversionRate,
        avg_daily_views: totalViews / 90,
        search_appearance_rate: Math.random() * 100,
        click_through_rate: Math.random() * 5,
        watch_count: Math.floor(Math.random() * 50),
        is_dead_listing: isDeadListing,
        dead_listing_reason: isDeadListing ? '90日間販売なし' : null,
        recommended_action: isDeadListing ? 'end' : score < 60 ? 'revise' : 'keep',
      };
    });

    // データベースに保存
    const { error: upsertError } = await supabase
      .from('listing_health_scores')
      .upsert(healthScores, { onConflict: 'product_id' });

    if (upsertError) {
      throw upsertError;
    }

    const deadCount = healthScores.filter((s) => s.is_dead_listing).length;
    console.log(
      `[Scheduler] Health scores updated: ${healthScores.length} listings, ${deadCount} dead listings detected`
    );
  } catch (error) {
    console.error('[Scheduler] Health score update failed:', error);
    throw error;
  }
}

/**
 * オークション終了検知（毎時）
 * Phase 7: AuctionAnchorService連携
 */
async function checkExpiredAuctions(): Promise<void> {
  console.log('[Scheduler] Checking expired auctions...');

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // 終了したオークションを取得
    const { data: expiredAuctions, error: fetchError } = await supabase
      .from('auction_anchors')
      .select('*')
      .eq('auction_status', 'active')
      .lt('next_auction_scheduled_at', new Date().toISOString());

    if (fetchError) {
      throw fetchError;
    }

    if (!expiredAuctions || expiredAuctions.length === 0) {
      console.log('[Scheduler] No expired auctions found');
      return;
    }

    // 各オークションの終了処理
    for (const auction of expiredAuctions) {
      // 入札状況を確認（モック）
      const hasBids = Math.random() > 0.5;

      if (!hasBids && auction.auto_convert_to_fixed) {
        // 入札なし → 定額出品に切り替え
        await supabase
          .from('auction_anchors')
          .update({
            auction_status: 'converted_to_fixed',
            converted_at: new Date().toISOString(),
            last_auction_ended_at: new Date().toISOString(),
          })
          .eq('id', auction.id);

        console.log(`[Scheduler] Auction ${auction.id} converted to fixed price`);
      } else if (!hasBids) {
        // 入札なし → 再出品
        await supabase
          .from('auction_anchors')
          .update({
            auction_status: 'ended_no_bids',
            last_auction_ended_at: new Date().toISOString(),
            next_auction_scheduled_at: new Date(Date.now() + 86400000).toISOString(), // 翌日
          })
          .eq('id', auction.id);

        console.log(`[Scheduler] Auction ${auction.id} ended with no bids, rescheduled`);
      } else {
        // 入札あり → 終了
        await supabase
          .from('auction_anchors')
          .update({
            auction_status: 'ended_with_bids',
            last_auction_ended_at: new Date().toISOString(),
          })
          .eq('id', auction.id);

        console.log(`[Scheduler] Auction ${auction.id} ended successfully`);
      }
    }

    console.log(`[Scheduler] Processed ${expiredAuctions.length} expired auctions`);
  } catch (error) {
    console.error('[Scheduler] Auction check failed:', error);
    throw error;
  }
}

/**
 * 在庫監視（毎日1:00）
 * Phase 7: InventoryService連携
 */
async function checkLowStock(): Promise<void> {
  console.log('[Scheduler] Checking low stock...');

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // 在庫チェックが有効なアンカーを取得
    const { data: anchors, error: fetchError } = await supabase
      .from('auction_anchors')
      .select('*')
      .eq('inventory_check_enabled', true)
      .eq('auction_status', 'active');

    if (fetchError) {
      throw fetchError;
    }

    if (!anchors || anchors.length === 0) {
      console.log('[Scheduler] No active auctions with inventory check');
      return;
    }

    // 各アンカーの在庫をチェック
    for (const anchor of anchors) {
      // 在庫ロスをシミュレート（実際はAPI呼び出し）
      const inventoryLost = Math.random() < 0.1; // 10%の確率で在庫ロス

      if (inventoryLost) {
        const hasBids = anchor.current_bid_count > 0;

        if (!hasBids) {
          // 入札なし → 即時終了
          await supabase
            .from('auction_anchors')
            .update({
              auction_status: 'ended_no_bids',
              inventory_lost_at: new Date().toISOString(),
              auto_ended_for_inventory: true,
            })
            .eq('id', anchor.id);

          console.log(`[Scheduler] Auction ${anchor.id} auto-ended due to inventory loss`);
        } else {
          // 入札あり → アラート送信
          await supabase.from('seo_health_alerts').insert({
            alert_type: 'inventory_lost',
            severity: 'High',
            message: `⚠️ 在庫ロス検出。入札があるため人間の判断が必要です`,
            product_id: anchor.product_id,
            auction_anchor_id: anchor.id,
            action_taken: 'manual_review',
          });

          console.log(`[Scheduler] Inventory loss alert created for auction ${anchor.id}`);
        }
      }
    }

    console.log(`[Scheduler] Checked ${anchors.length} auctions for inventory`);
  } catch (error) {
    console.error('[Scheduler] Low stock check failed:', error);
    throw error;
  }
}

/**
 * タスク実行のラッパー（ログ記録）
 */
async function executeTask(task: ScheduledTask): Promise<void> {
  const log: TaskExecutionLog = {
    task_name: task.name,
    started_at: new Date(),
    status: 'running',
  };

  executionLogs.push(log);

  try {
    await task.handler();

    log.status = 'completed';
    log.completed_at = new Date();
    log.execution_time_ms = log.completed_at.getTime() - log.started_at.getTime();

    task.last_run = new Date();
  } catch (error: any) {
    log.status = 'failed';
    log.error_message = error.message;
    log.completed_at = new Date();

    console.error(`[Scheduler] Task ${task.name} failed:`, error);
  }
}

/**
 * スケジュールされたタスクの定義
 */
export const scheduledTasks: ScheduledTask[] = [
  {
    name: 'cashflow_forecast',
    schedule: '0 0 1 * *', // 月初0時（cron表記）
    handler: runCashflowForecast,
    enabled: true,
  },
  {
    name: 'seo_score_update',
    schedule: '0 2 * * *', // 毎日2時
    handler: updateAllListingsHealthScores,
    enabled: true,
  },
  {
    name: 'auction_check',
    schedule: '0 * * * *', // 毎時
    handler: checkExpiredAuctions,
    enabled: true,
  },
  {
    name: 'inventory_check',
    schedule: '0 1 * * *', // 毎日1時
    handler: checkLowStock,
    enabled: true,
  },
];

/**
 * スケジューラーの起動（Vercel Cron / AWS EventBridge連携）
 */
export async function runScheduler(taskName?: string): Promise<void> {
  const tasksToRun = taskName
    ? scheduledTasks.filter((t) => t.name === taskName && t.enabled)
    : scheduledTasks.filter((t) => t.enabled);

  for (const task of tasksToRun) {
    await executeTask(task);
  }
}

/**
 * 実行ログの取得
 */
export function getExecutionLogs(): TaskExecutionLog[] {
  return executionLogs.slice(-100); // 直近100件
}
