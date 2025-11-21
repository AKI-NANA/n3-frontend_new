// store/useDashboardStore.ts
// 総合ダッシュボード用のZustandストア

import { create } from 'zustand';
import { MessageStats, SourceMall } from '@/types/messaging';

// ダッシュボードのアラート情報
export interface DashboardAlerts {
  urgent: number; // モール緊急通知
  paymentDue: number; // 本日支払期限
  unhandledTasks: number; // 未対応タスク
}

// 今月の実績サマリー
export interface MonthlyKPI {
  totalRevenue: number; // 総売上
  netProfit: number; // 純利益
  orderCount: number; // 受注数
  profitMargin: number; // 利益率 (%)
}

// モール別パフォーマンス
export interface MarketplacePerformance {
  marketplace: SourceMall | string;
  salesCount: number;
  revenue: number;
  profit: number;
  unhandledInquiry: number;
  unshippedOrders: number;
  healthScore?: number; // 健全性スコア (0-100)
}

// 収益チャンネル別データ
export interface RevenueChannel {
  channel: string;
  revenue: number;
  percentage: number;
  color: string; // チャート表示用
}

// 出品・在庫サマリー
export interface InventorySummary {
  activeListings: number; // 稼働中出品数
  totalInventory: number; // 総在庫数
  lowStockItems: number; // 低在庫アイテム
  outOfStockItems: number; // 在庫切れアイテム
  pendingListings: number; // 出品待ち
}

// 外注業務実績
export interface OutsourcePerformance {
  staffName: string;
  messagesHandled: number; // 対応完了メッセージ数
  avgResponseTime: number; // 平均応答時間（分）
  qualityScore?: number; // 品質スコア (0-100)
  tasksCompleted: number; // 完了タスク数
}

// システム健全性チェック
export interface SystemHealth {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  lastCheck: Date;
  message?: string;
}

// ダッシュボード全体のデータ
export interface DashboardData {
  alerts: DashboardAlerts;
  monthlyKPI: MonthlyKPI;
  marketplacePerformance: MarketplacePerformance[];
  revenueChannels: RevenueChannel[];
  inventorySummary: InventorySummary;
  outsourcePerformance: OutsourcePerformance[];
  systemHealth: SystemHealth[];
  messageStats?: MessageStats; // メッセージング統計
  lastUpdated: Date;
}

// ストアの状態
interface DashboardStore {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;

  // アクション
  fetchDashboardData: () => Promise<void>;
  updateAlerts: (alerts: Partial<DashboardAlerts>) => void;
  updateMarketplacePerformance: (marketplace: string, data: Partial<MarketplacePerformance>) => void;
  refreshData: () => Promise<void>;
}

// デフォルトデータ（モック）
const getDefaultDashboardData = (): DashboardData => ({
  alerts: {
    urgent: 0,
    paymentDue: 0,
    unhandledTasks: 0,
  },
  monthlyKPI: {
    totalRevenue: 0,
    netProfit: 0,
    orderCount: 0,
    profitMargin: 0,
  },
  marketplacePerformance: [
    {
      marketplace: 'eBay_US',
      salesCount: 450,
      revenue: 25000,
      profit: 15500,
      unhandledInquiry: 3,
      unshippedOrders: 5,
      healthScore: 85,
    },
    {
      marketplace: 'Amazon_JP',
      salesCount: 88,
      revenue: 8500,
      profit: 2800,
      unhandledInquiry: 0,
      unshippedOrders: 2,
      healthScore: 92,
    },
    {
      marketplace: 'Shopee_TW',
      salesCount: 120,
      revenue: 6000,
      profit: 3200,
      unhandledInquiry: 1,
      unshippedOrders: 0,
      healthScore: 95,
    },
    {
      marketplace: 'Qoo10_JP',
      salesCount: 30,
      revenue: 2500,
      profit: 850,
      unhandledInquiry: 0,
      unshippedOrders: 0,
      healthScore: 88,
    },
  ],
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
  lastUpdated: new Date(),
});

// Zustandストアの作成
export const useDashboardStore = create<DashboardStore>((set, get) => ({
  data: null,
  loading: false,
  error: null,

  fetchDashboardData: async () => {
    set({ loading: true, error: null });

    try {
      // APIからデータを取得
      const response = await fetch('/api/dashboard');

      if (!response.ok) {
        throw new Error(`ダッシュボードデータの取得に失敗しました: ${response.statusText}`);
      }

      const data: DashboardData = await response.json();

      set({
        data,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('ダッシュボードデータ取得エラー:', error);

      // エラー時はデフォルトデータを使用
      set({
        data: getDefaultDashboardData(),
        loading: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      });
    }
  },

  updateAlerts: (alerts: Partial<DashboardAlerts>) => {
    const currentData = get().data;
    if (!currentData) return;

    set({
      data: {
        ...currentData,
        alerts: {
          ...currentData.alerts,
          ...alerts,
        },
      },
    });
  },

  updateMarketplacePerformance: (marketplace: string, data: Partial<MarketplacePerformance>) => {
    const currentData = get().data;
    if (!currentData) return;

    const updatedPerformance = currentData.marketplacePerformance.map((mp) =>
      mp.marketplace === marketplace ? { ...mp, ...data } : mp
    );

    set({
      data: {
        ...currentData,
        marketplacePerformance: updatedPerformance,
      },
    });
  },

  refreshData: async () => {
    await get().fetchDashboardData();
  },
}));

// カスタムフック: ダッシュボードデータを取得
export const useDashboardData = () => {
  const { data, loading, error, fetchDashboardData } = useDashboardStore();

  // 初回マウント時にデータを取得
  React.useEffect(() => {
    if (!data) {
      fetchDashboardData();
    }
  }, [data, fetchDashboardData]);

  return { data, loading, error, refresh: fetchDashboardData };
};

// React のインポート（型チェック用）
import React from 'react';

// 便利な選択フック
export const useDashboardAlerts = () => useDashboardStore((state) => state.data?.alerts);
export const useDashboardKPI = () => useDashboardStore((state) => state.data?.monthlyKPI);
export const useDashboardMarketplaces = () => useDashboardStore((state) => state.data?.marketplacePerformance);
export const useDashboardRevenue = () => useDashboardStore((state) => state.data?.revenueChannels);
export const useDashboardInventory = () => useDashboardStore((state) => state.data?.inventorySummary);
export const useDashboardOutsource = () => useDashboardStore((state) => state.data?.outsourcePerformance);
export const useDashboardSystemHealth = () => useDashboardStore((state) => state.data?.systemHealth);
