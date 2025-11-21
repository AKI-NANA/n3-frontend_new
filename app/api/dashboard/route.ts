// app/api/dashboard/route.ts
// 総合ダッシュボード用APIエンドポイント

import { NextResponse } from 'next/server';
import { DashboardData } from '@/store/useDashboardStore';
import { getUnansweredMessageCount, getMessageStats } from '@/services/messaging/KpiController';

export async function GET(request: Request) {
  try {
    console.log('[Dashboard API] データ取得リクエストを受信');

    // 💡 実際のSupabase接続とデータ集計
    // ここでは、各種データソースから情報を集約します

    // 1. メッセージング統計を取得
    const { totalUncompleted, emergencyAlerts } = await getUnansweredMessageCount();
    const messageStats = await getMessageStats();

    // 2. 今月のKPIを集計（💡 実際のDB集計が必要）
    // const supabase = createClient();
    // const { data: orders } = await supabase
    //   .from('orders')
    //   .select('*')
    //   .gte('order_date', startOfMonth)
    //   .lte('order_date', endOfMonth);

    // 3. モール別パフォーマンスを集計
    const marketplacePerformance = Object.entries(messageStats.by_mall).map(
      ([mall, stats]) => ({
        marketplace: mall,
        salesCount: Math.floor(Math.random() * 500), // 💡 実際のデータに置き換え
        revenue: Math.floor(Math.random() * 50000),
        profit: Math.floor(Math.random() * 20000),
        unhandledInquiry: stats.unanswered,
        unshippedOrders: Math.floor(Math.random() * 10),
        healthScore: Math.floor(85 + Math.random() * 15),
      })
    );

    // ダッシュボードデータを構築
    const dashboardData: DashboardData = {
      alerts: {
        urgent: emergencyAlerts,
        paymentDue: 2, // 💡 実際のデータに置き換え
        unhandledTasks: totalUncompleted,
      },
      monthlyKPI: {
        totalRevenue: 42000, // 💡 実際のデータに置き換え
        netProfit: 22350,
        orderCount: 688,
        profitMargin: 53.2,
      },
      marketplacePerformance,
      revenueChannels: [
        { channel: 'eBay', revenue: 25000, percentage: 59.5, color: '#3b82f6' },
        { channel: 'Shopee', revenue: 6000, percentage: 14.3, color: '#f97316' },
        { channel: 'Amazon', revenue: 8500, percentage: 20.2, color: '#eab308' },
        { channel: 'Qoo10', revenue: 2500, percentage: 6.0, color: '#22c55e' },
      ],
      inventorySummary: {
        activeListings: 4321,
        totalInventory: 5678,
        lowStockItems: 45,
        outOfStockItems: 12,
        pendingListings: 234,
      },
      outsourcePerformance: [
        {
          staffName: 'スタッフA',
          messagesHandled: 128,
          avgResponseTime: 45,
          qualityScore: 92,
          tasksCompleted: 85,
        },
        {
          staffName: 'スタッフB',
          messagesHandled: 95,
          avgResponseTime: 62,
          qualityScore: 88,
          tasksCompleted: 67,
        },
        {
          staffName: 'スタッフC',
          messagesHandled: 73,
          avgResponseTime: 38,
          qualityScore: 95,
          tasksCompleted: 52,
        },
      ],
      systemHealth: [
        {
          component: 'Supabase接続',
          status: 'healthy',
          lastCheck: new Date(),
          message: '正常に接続されています',
        },
        {
          component: 'eBay API',
          status: 'healthy',
          lastCheck: new Date(),
          message: 'トークン有効期限: 2025-12-31',
        },
        {
          component: 'Amazon API',
          status: 'warning',
          lastCheck: new Date(),
          message: 'トークンの更新が必要です',
        },
        {
          component: 'Shopee API',
          status: 'healthy',
          lastCheck: new Date(),
          message: '正常に接続されています',
        },
      ],
      messageStats,
      lastUpdated: new Date(),
    };

    console.log('[Dashboard API] データ取得成功');

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('[Dashboard API] エラー:', error);

    return NextResponse.json(
      {
        error: 'ダッシュボードデータの取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'refresh':
        // ダッシュボードデータを強制的に再取得
        // キャッシュのクリアなどを実行
        return NextResponse.json({ success: true, message: 'データを更新しました' });

      default:
        return NextResponse.json(
          { error: '不明なアクション' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Dashboard API] POST エラー:', error);
    return NextResponse.json(
      {
        error: 'リクエストの処理に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
