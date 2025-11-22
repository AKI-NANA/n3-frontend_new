// 📁 格納パス: store/useDashboardStore.ts
// 依頼内容: 総合ダッシュボードのデータを管理するZustandストア

import { create } from "zustand";

// ========== 型定義 ==========

// アラートデータの型
export interface DashboardAlerts {
  urgent: number; // モール緊急通知件数
  paymentDue: number; // 本日支払期限タスク件数
  unhandledTasks: number; // 未対応タスク件数
}

// KPIデータの型
export interface DashboardKPIs {
  totalSales: number; // 今月の売上合計
  totalProfit: number; // 今月の純利益合計
  profitMargin: number; // 利益率 (%)
  inventoryValuation: number; // 在庫評価額
  salesChange: number; // 前月比増減率 (%)
  profitChange: number; // 前月比純利益増減率 (%)
}

// モール別パフォーマンスデータの型
export interface MarketplacePerformance {
  marketplace: string;
  salesCount: number; // 販売個数
  profit: number; // 純利益
  unhandledInquiry: number; // 未対応問い合わせ件数
  unshippedOrders: number; // 未出荷件数
}

// 在庫サマリーデータの型
export interface InventorySummary {
  todayListing: number; // 本日出品予定数
  criticalStock: number; // 危険在庫アラート件数（在庫1個以下）
  unfulfilledOrders: number; // 未仕入れ受注件数
  valuation: number; // 在庫評価額
}

// 外注業務実績データの型
export interface OutsourceSummary {
  yesterdayShipping: number; // 昨日の出荷処理件数
  yesterdayInquiry: number; // 昨日の問い合わせ完了件数
}

// システム健全性チェックデータの型
export interface SystemHealthStatus {
  name: string;
  status: "ok" | "error" | "warning";
  lastSync?: string; // 最終同期時刻
}

// ダッシュボードストアの型定義
interface DashboardStore {
  // データ
  alerts: DashboardAlerts;
  kpis: DashboardKPIs;
  marketplacePerformance: MarketplacePerformance[];
  inventory: InventorySummary;
  outsource: OutsourceSummary;
  systemHealth: SystemHealthStatus[];

  // 状態管理
  loading: boolean;
  error: string | null;
  lastUpdate: string | null;

  // アクション
  fetchDashboardData: () => Promise<void>;
  refreshAlerts: () => Promise<void>;
  refreshKPIs: () => Promise<void>;
  refreshMarketplaceData: () => Promise<void>;
  refreshInventory: () => Promise<void>;
  refreshOutsource: () => Promise<void>;
  refreshSystemHealth: () => Promise<void>;
}

// ========== モックデータ ==========

const MOCK_ALERTS: DashboardAlerts = {
  urgent: 2, // 緊急対応が必要なモール通知
  paymentDue: 3, // 本日期限の支払いタスク
  unhandledTasks: 8, // 未対応の問い合わせや未出荷の受注
};

const MOCK_KPIS: DashboardKPIs = {
  totalSales: 2850000, // 今月の売上合計（円）
  totalProfit: 520000, // 今月の純利益合計（円）
  profitMargin: 18.2, // 利益率
  inventoryValuation: 15600000, // 在庫評価額（円）
  salesChange: 12.5, // 前月比 +12.5%
  profitChange: 8.3, // 前月比純利益 +8.3%
};

const MOCK_MARKETPLACE_PERFORMANCE: MarketplacePerformance[] = [
  {
    marketplace: "eBay",
    salesCount: 450,
    profit: 155000,
    unhandledInquiry: 3,
    unshippedOrders: 5,
  },
  {
    marketplace: "Shopee",
    salesCount: 120,
    profit: 32000,
    unhandledInquiry: 1,
    unshippedOrders: 0,
  },
  {
    marketplace: "Amazon",
    salesCount: 88,
    profit: 28000,
    unhandledInquiry: 0,
    unshippedOrders: 2,
  },
  {
    marketplace: "Qoo10",
    salesCount: 30,
    profit: 8500,
    unhandledInquiry: 0,
    unshippedOrders: 0,
  },
];

const MOCK_INVENTORY: InventorySummary = {
  todayListing: 45, // 本日出品予定のSKU数
  criticalStock: 12, // 在庫が1個以下の出品中SKU数
  unfulfilledOrders: 3, // 受注済みだが仕入れ未完了の件数
  valuation: 15600000, // 在庫評価額（円）
};

const MOCK_OUTSOURCE: OutsourceSummary = {
  yesterdayShipping: 150, // 昨日の出荷処理完了件数
  yesterdayInquiry: 25, // 昨日の問い合わせ対応完了件数
};

const MOCK_SYSTEM_HEALTH: SystemHealthStatus[] = [
  { name: "eBay API", status: "ok", lastSync: "30秒前" },
  { name: "Shopee API", status: "ok", lastSync: "1分前" },
  { name: "Amazon API", status: "ok", lastSync: "2分前" },
  { name: "Qoo10 API", status: "warning", lastSync: "15分前" },
  { name: "Supabase DB", status: "ok", lastSync: "10秒前" },
];

// ========== Zustandストア ==========

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  // 初期データ（モック）
  alerts: MOCK_ALERTS,
  kpis: MOCK_KPIS,
  marketplacePerformance: MOCK_MARKETPLACE_PERFORMANCE,
  inventory: MOCK_INVENTORY,
  outsource: MOCK_OUTSOURCE,
  systemHealth: MOCK_SYSTEM_HEALTH,

  loading: false,
  error: null,
  lastUpdate: null,

  // 全データを一括取得
  fetchDashboardData: async () => {
    set({ loading: true, error: null });
    try {
      // 実際には各APIエンドポイントから並行してデータを取得
      await Promise.all([
        get().refreshAlerts(),
        get().refreshKPIs(),
        get().refreshMarketplaceData(),
        get().refreshInventory(),
        get().refreshOutsource(),
        get().refreshSystemHealth(),
      ]);

      set({
        loading: false,
        lastUpdate: new Date().toISOString()
      });
    } catch (e) {
      set({
        error: "ダッシュボードデータの取得に失敗しました。",
        loading: false
      });
    }
  },

  // アラートデータの更新
  refreshAlerts: async () => {
    try {
      // 実際には /api/dashboard/alerts から取得
      const response = await fetch("/api/dashboard/alerts");
      if (!response.ok) throw new Error("Failed to fetch alerts");
      const data = await response.json();
      set({ alerts: data });
    } catch (e) {
      console.error("Alert fetch error:", e);
      // エラー時はモックデータを使用
      set({ alerts: MOCK_ALERTS });
    }
  },

  // KPIデータの更新
  refreshKPIs: async () => {
    try {
      // 実際には /api/dashboard/kpis から取得
      const response = await fetch("/api/dashboard/kpis");
      if (!response.ok) throw new Error("Failed to fetch KPIs");
      const data = await response.json();
      set({ kpis: data });
    } catch (e) {
      console.error("KPI fetch error:", e);
      set({ kpis: MOCK_KPIS });
    }
  },

  // モール別パフォーマンスデータの更新
  refreshMarketplaceData: async () => {
    try {
      // 実際には /api/dashboard/marketplace から取得
      const response = await fetch("/api/dashboard/marketplace");
      if (!response.ok) throw new Error("Failed to fetch marketplace data");
      const data = await response.json();
      set({ marketplacePerformance: data });
    } catch (e) {
      console.error("Marketplace data fetch error:", e);
      set({ marketplacePerformance: MOCK_MARKETPLACE_PERFORMANCE });
    }
  },

  // 在庫サマリーの更新
  refreshInventory: async () => {
    try {
      // 実際には /api/dashboard/inventory から取得
      const response = await fetch("/api/dashboard/inventory");
      if (!response.ok) throw new Error("Failed to fetch inventory");
      const data = await response.json();
      set({ inventory: data });
    } catch (e) {
      console.error("Inventory fetch error:", e);
      set({ inventory: MOCK_INVENTORY });
    }
  },

  // 外注業務実績の更新
  refreshOutsource: async () => {
    try {
      // 実際には /api/dashboard/outsource から取得
      const response = await fetch("/api/dashboard/outsource");
      if (!response.ok) throw new Error("Failed to fetch outsource data");
      const data = await response.json();
      set({ outsource: data });
    } catch (e) {
      console.error("Outsource data fetch error:", e);
      set({ outsource: MOCK_OUTSOURCE });
    }
  },

  // システム健全性チェックの更新
  refreshSystemHealth: async () => {
    try {
      // 実際には /api/dashboard/system-health から取得
      const response = await fetch("/api/dashboard/system-health");
      if (!response.ok) throw new Error("Failed to fetch system health");
      const data = await response.json();
      set({ systemHealth: data });
    } catch (e) {
      console.error("System health fetch error:", e);
      set({ systemHealth: MOCK_SYSTEM_HEALTH });
    }
  },
}));

// ダッシュボードデータ取得用のカスタムフック
export const useDashboardData = () => {
  const {
    alerts,
    kpis,
    marketplacePerformance,
    inventory,
    outsource,
    systemHealth,
    loading,
    error,
    lastUpdate,
    fetchDashboardData,
  } = useDashboardStore();

  return {
    alerts,
    kpis,
    marketplacePerformance,
    inventory,
    outsource,
    systemHealth,
    loading,
    error,
    lastUpdate,
    fetchDashboardData,
  };
};
